import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../shared/mail/mail.service';
import { ErrorCodes } from '../../shared/errors/error-codes';

/** Reads the canonical error envelope out of an HttpException. */
const codeOf = (e: unknown) =>
  (e as { getResponse: () => { code: string } }).getResponse().code;
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** Runs `fn`, returning the thrown error; fails if it does not throw. */
async function caught(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    await fn();
  } catch (e) {
    return e;
  }
  throw new Error('expected the call to reject, but it resolved');
}

type UserRow = Record<string, unknown> & { id: string; passwordHash: string };

function buildService(overrides: {
  user?: Partial<Record<keyof PrismaService['user'], jest.Mock>>;
  passwordResetToken?: Record<string, jest.Mock>;
  refreshToken?: Record<string, jest.Mock>;
}) {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn(),
      ...(overrides.user ?? {}),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      ...(overrides.passwordResetToken ?? {}),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      ...(overrides.refreshToken ?? {}),
    },
    $transaction: jest.fn().mockResolvedValue([]),
  } as unknown as PrismaService;

  const jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') } as unknown as JwtService;
  const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
  const mail = { sendPasswordReset: jest.fn().mockResolvedValue(undefined) } as unknown as MailService;

  return { svc: new AuthService(prisma, jwt, config, mail), prisma, jwt, config, mail };
}

const activeUser = (over: Partial<UserRow> = {}): UserRow => ({
  id: 'user-1',
  email: 'owner@demo.com',
  passwordHash: bcrypt.hashSync('password123', 4),
  firstName: 'Sherlock',
  lastName: 'Holmes',
  role: 'OWNER',
  orgId: 'org-1',
  isActive: true,
  deletedAt: null,
  failedLoginAttempts: 0,
  lockedUntil: null,
  ...over,
});

describe('AuthService — login & lockout', () => {
  it('rejects an unknown email with AUTH_001 (and runs a dummy hash)', async () => {
    const compareSpy = jest.spyOn(bcrypt, 'compare');
    const { svc, prisma } = buildService({ user: { findUnique: jest.fn().mockResolvedValue(null) } });
    expect(codeOf(await caught(() => svc.login({ email: 'nobody@x.com', password: 'p' })))).toBe(
      ErrorCodes.AUTH_001,
    );
    // dummy compare keeps timing constant, no failed-attempt write for unknown user
    expect(compareSpy).toHaveBeenCalled();
    expect((prisma.user.update as jest.Mock)).not.toHaveBeenCalled();
    compareSpy.mockRestore();
  });

  it('rejects an inactive user with AUTH_001', async () => {
    const { svc } = buildService({
      user: { findUnique: jest.fn().mockResolvedValue(activeUser({ isActive: false })) },
    });
    expect(
      codeOf(await caught(() => svc.login({ email: 'owner@demo.com', password: 'password123' }))),
    ).toBe(ErrorCodes.AUTH_001);
  });

  it('rejects a currently-locked account with AUTH_002 + lockedUntil detail', async () => {
    const lockedUntil = new Date(Date.now() + 10 * 60_000);
    const { svc } = buildService({
      user: { findUnique: jest.fn().mockResolvedValue(activeUser({ lockedUntil })) },
    });
    try {
      await svc.login({ email: 'owner@demo.com', password: 'password123' });
      throw new Error('expected throw');
    } catch (err) {
      const res = (err as { getResponse: () => { code: string; detail: { lockedUntil: Date } } }).getResponse();
      expect(res.code).toBe(ErrorCodes.AUTH_002);
      expect(res.detail.lockedUntil).toBe(lockedUntil);
    }
  });

  it('on a wrong password increments the failed-attempt counter (below threshold)', async () => {
    const update = jest.fn().mockResolvedValue({});
    const { svc } = buildService({
      user: { findUnique: jest.fn().mockResolvedValue(activeUser({ failedLoginAttempts: 2 })), update },
    });
    expect(codeOf(await caught(() => svc.login({ email: 'owner@demo.com', password: 'WRONG' })))).toBe(
      ErrorCodes.AUTH_001,
    );
    expect(update.mock.calls[0][0].data).toMatchObject({ failedLoginAttempts: 3 });
    expect(update.mock.calls[0][0].data.lockedUntil).toBeUndefined();
  });

  it('locks the account on the 5th consecutive failure (resets counter, sets lockedUntil)', async () => {
    const update = jest.fn().mockResolvedValue({});
    const { svc } = buildService({
      user: { findUnique: jest.fn().mockResolvedValue(activeUser({ failedLoginAttempts: 4 })), update },
    });
    expect(codeOf(await caught(() => svc.login({ email: 'owner@demo.com', password: 'WRONG' })))).toBe(
      ErrorCodes.AUTH_001,
    );
    const data = update.mock.calls[0][0].data;
    expect(data.failedLoginAttempts).toBe(0);
    expect(data.lockedUntil).toBeInstanceOf(Date);
    expect(data.lockedUntil.getTime()).toBeGreaterThan(Date.now());
  });

  it('on success clears a non-zero counter and returns a sanitized user', async () => {
    const update = jest.fn().mockResolvedValue({});
    const { svc, prisma } = buildService({
      user: { findUnique: jest.fn().mockResolvedValue(activeUser({ failedLoginAttempts: 3 })), update },
    });
    const result = await svc.login({ email: 'owner@demo.com', password: 'password123' });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { failedLoginAttempts: 0, lockedUntil: null } }),
    );
    expect(result.user).toEqual({
      id: 'user-1',
      email: 'owner@demo.com',
      firstName: 'Sherlock',
      lastName: 'Holmes',
      role: 'OWNER',
      orgId: 'org-1',
      telegram: null,
    });
    // password hash is never leaked
    expect(result.user as Record<string, unknown>).not.toHaveProperty('passwordHash');
    expect(result.accessToken).toBe('signed.jwt.token');
    expect((prisma.refreshToken.create as jest.Mock)).toHaveBeenCalled();
  });
});

describe('AuthService — password reset tokens', () => {
  it('requestPasswordReset is a no-op for an unknown/inactive email (no enumeration)', async () => {
    const { svc, prisma, mail } = buildService({
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    });
    await expect(svc.requestPasswordReset('ghost@x.com')).resolves.toBeUndefined();
    expect((prisma.passwordResetToken.create as jest.Mock)).not.toHaveBeenCalled();
    expect((mail.sendPasswordReset as jest.Mock)).not.toHaveBeenCalled();
  });

  it('stores a SHA-256 hash (never the raw token) and emails the raw token link', async () => {
    const create = jest.fn().mockResolvedValue({});
    const { svc, mail } = buildService({
      user: { findUnique: jest.fn().mockResolvedValue(activeUser()) },
      passwordResetToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create,
      },
    });
    await svc.requestPasswordReset('owner@demo.com');

    const stored = create.mock.calls[0][0].data;
    const emailedLink = (mail.sendPasswordReset as jest.Mock).mock.calls[0][1] as string;
    const rawToken = new URL(emailedLink).searchParams.get('token')!;

    expect(rawToken).toMatch(/^[0-9a-f]{64}$/); // 32 random bytes hex
    expect(stored.tokenHash).toBe(sha256(rawToken)); // stored = hash(raw)
    expect(stored.tokenHash).not.toBe(rawToken); // never the raw value
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('invalidates outstanding tokens before issuing a new one', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const { svc } = buildService({
      user: { findUnique: jest.fn().mockResolvedValue(activeUser()) },
      passwordResetToken: { updateMany, create: jest.fn().mockResolvedValue({}) },
    });
    await svc.requestPasswordReset('owner@demo.com');
    expect(updateMany.mock.calls[0][0]).toMatchObject({
      where: { userId: 'user-1', usedAt: null },
    });
  });

  it('resetPassword rejects an unknown token with AUTH_004', async () => {
    const { svc } = buildService({
      passwordResetToken: { findUnique: jest.fn().mockResolvedValue(null) },
    });
    expect(codeOf(await caught(() => svc.resetPassword('badtoken', 'newpass123')))).toBe(
      ErrorCodes.AUTH_004,
    );
  });

  it('resetPassword rejects an already-used token with AUTH_004 (single-use)', async () => {
    const { svc } = buildService({
      passwordResetToken: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't1',
          userId: 'user-1',
          usedAt: new Date(),
          expiresAt: new Date(Date.now() + 60_000),
        }),
      },
    });
    expect(codeOf(await caught(() => svc.resetPassword('rawtoken', 'newpass123')))).toBe(
      ErrorCodes.AUTH_004,
    );
  });

  it('resetPassword rejects an expired token with AUTH_003', async () => {
    const { svc } = buildService({
      passwordResetToken: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't1',
          userId: 'user-1',
          usedAt: null,
          expiresAt: new Date(Date.now() - 60_000),
        }),
      },
    });
    expect(codeOf(await caught(() => svc.resetPassword('rawtoken', 'newpass123')))).toBe(
      ErrorCodes.AUTH_003,
    );
  });

  it('resetPassword looks the token up by its SHA-256 hash', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 't1',
      userId: 'user-1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const { svc } = buildService({ passwordResetToken: { findUnique } });
    await svc.resetPassword('my-raw-token', 'newpass123');
    expect(findUnique).toHaveBeenCalledWith({ where: { tokenHash: sha256('my-raw-token') } });
  });

  it('resetPassword marks token used, rehashes password and revokes sessions (one transaction)', async () => {
    const $transaction = jest.fn().mockResolvedValue([]);
    const base = buildService({
      passwordResetToken: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't1',
          userId: 'user-1',
          usedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
        }),
      },
    });
    (base.prisma as unknown as { $transaction: jest.Mock }).$transaction = $transaction;
    await base.svc.resetPassword('my-raw-token', 'newpass123');
    expect($transaction).toHaveBeenCalledTimes(1);
    expect($transaction.mock.calls[0][0]).toHaveLength(3); // mark used + update user + revoke sessions
  });
});

describe('AuthService — register & changePassword', () => {
  it('register rejects a duplicate email with ConflictException', async () => {
    const { svc } = buildService({
      user: { findUnique: jest.fn().mockResolvedValue(activeUser()) },
    });
    await expect(
      svc.register({
        email: 'owner@demo.com',
        password: 'password123',
        orgName: 'X',
        firstName: 'A',
        lastName: 'B',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('changePassword rejects a wrong current password with AUTH_001', async () => {
    const { svc } = buildService({
      user: { findUnique: jest.fn().mockResolvedValue(activeUser()) },
    });
    expect(codeOf(await caught(() => svc.changePassword('user-1', 'WRONG', 'newpass123')))).toBe(
      ErrorCodes.AUTH_001,
    );
  });

  it('changePassword updates hash and revokes sessions on a correct current password', async () => {
    const $transaction = jest.fn().mockResolvedValue([]);
    const base = buildService({
      user: { findUnique: jest.fn().mockResolvedValue(activeUser()) },
    });
    (base.prisma as unknown as { $transaction: jest.Mock }).$transaction = $transaction;
    await base.svc.changePassword('user-1', 'password123', 'newpass123');
    expect($transaction).toHaveBeenCalledTimes(1);
    expect($transaction.mock.calls[0][0]).toHaveLength(2); // update user + revoke sessions
  });
});

describe('AuthService — refresh hashing (bcrypt-72-byte-truncation regression)', () => {
  // Two distinct refresh tokens for the same user share a >72-byte prefix
  // (header + start of payload). bcrypt would truncate and treat them as equal;
  // the SHA-256 hashing must keep them distinct.
  const sharedPrefix = 'x'.repeat(100);
  const tokenA = `${sharedPrefix}-AAAA`;
  const tokenB = `${sharedPrefix}-BBBB`;

  function buildForRefresh(storedHash: string) {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const update = jest.fn().mockResolvedValue({});
    const create = jest.fn().mockResolvedValue({});
    const prisma = {
      refreshToken: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'rt-1',
          family: 'fam-1',
          tokenHash: storedHash,
          user: { id: 'user-1', email: 'owner@demo.com', orgId: 'org-1', role: 'OWNER' },
        }),
        update,
        updateMany,
        create,
      },
    } as unknown as PrismaService;
    const jwt = {
      verifyAsync: jest.fn().mockResolvedValue({ family: 'fam-1' }),
      signAsync: jest.fn().mockResolvedValue('new.signed.token'),
    } as unknown as JwtService;
    const config = { get: jest.fn().mockReturnValue('refresh-secret') } as unknown as ConfigService;
    const mail = { sendPasswordReset: jest.fn() } as unknown as MailService;
    return { svc: new AuthService(prisma, jwt, config, mail), updateMany, create };
  }

  it('treats two tokens with a shared 72-byte prefix as DIFFERENT (reuse → AUTH_005)', async () => {
    // Stored hash is of tokenB; presenting tokenA must NOT match.
    const { svc, updateMany } = buildForRefresh(sha256(tokenB));
    expect(codeOf(await caught(() => svc.refresh(tokenA)))).toBe(ErrorCodes.AUTH_005);
    expect(updateMany).toHaveBeenCalled(); // family revoked on reuse
  });

  it('accepts the exact token whose SHA-256 hash is stored (rotates)', async () => {
    const { svc, create } = buildForRefresh(sha256(tokenB));
    const tokens = await svc.refresh(tokenB);
    expect(tokens).toMatchObject({ accessToken: expect.any(String), refreshToken: expect.any(String) });
    expect(create).toHaveBeenCalled(); // new refresh token persisted
  });
});
