import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthError } from '../../shared/errors/domain.error';
import { ErrorCodes } from '../../shared/errors/error-codes';
import { MailService } from '../../shared/mail/mail.service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const RESET_TOKEN_TTL_MINUTES = 60;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const org = await this.prisma.org.create({
      data: { name: dto.orgName },
    });

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        orgId: org.id,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'OWNER',
      },
    });

    const family = uuidv4();
    const tokens = await this.generateTokens(user.id, user.email, org.id, user.role, family);
    await this.saveRefreshToken(user.id, tokens.refreshToken, family);

    return { ...tokens, user: this.sanitizeUser(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive || user.deletedAt) {
      // Run a dummy hash to keep timing roughly constant for unknown emails.
      await bcrypt.compare(dto.password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinv');
      throw new AuthError(ErrorCodes.AUTH_001);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AuthError(ErrorCodes.AUTH_002, { lockedUntil: user.lockedUntil });
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.registerFailedAttempt(user.id, user.failedLoginAttempts);
      throw new AuthError(ErrorCodes.AUTH_001);
    }

    // Successful login resets the lockout counter.
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    const family = uuidv4();
    const tokens = await this.generateTokens(user.id, user.email, user.orgId, user.role, family);
    await this.saveRefreshToken(user.id, tokens.refreshToken, family);

    return { ...tokens, user: this.sanitizeUser(user) };
  }

  async refresh(rawToken: string) {
    let payload: { family?: string };
    try {
      payload = await this.jwtService.verifyAsync(rawToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new AuthError(ErrorCodes.AUTH_004);
    }

    const family = payload.family;
    if (!family) throw new AuthError(ErrorCodes.AUTH_004);

    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        family,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!stored) {
      await this.revokeFamily(family);
      throw new AuthError(ErrorCodes.AUTH_005);
    }

    const valid = this.refreshTokenMatches(rawToken, stored.tokenHash);
    if (!valid) {
      // Token reuse detected — nuke the whole family.
      await this.revokeFamily(stored.family);
      throw new AuthError(ErrorCodes.AUTH_005);
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const { user } = stored;
    const tokens = await this.generateTokens(user.id, user.email, user.orgId, user.role, family);
    await this.saveRefreshToken(user.id, tokens.refreshToken, family);

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { org: true },
    });
    if (!user) throw new AuthError(ErrorCodes.AUTH_004);
    return this.sanitizeUser(user);
  }

  /**
   * Updates the current user's own profile fields (display name + Telegram
   * handle). Email, role and password are intentionally not editable here.
   */
  async updateProfile(
    userId: string,
    dto: { firstName?: string; lastName?: string; telegram?: string | null },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new AuthError(ErrorCodes.AUTH_004);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.telegram !== undefined && { telegram: dto.telegram || null }),
      },
    });
    return this.sanitizeUser(updated);
  }

  /**
   * Generates a single-use, 1-hour password reset token. Always returns void
   * with no indication of whether the email exists (no user enumeration).
   * The raw token is logged for now; an email job will deliver it in M1.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive || user.deletedAt) return;

    // Invalidate any outstanding tokens for this user.
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:5173';
    await this.mail.sendPasswordReset(email, `${appUrl}/reset-password?token=${rawToken}`);
  }

  /** Completes a password reset using the raw token from the email link. */
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashResetToken(rawToken);
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt) throw new AuthError(ErrorCodes.AUTH_004);
    if (record.expiresAt < new Date()) throw new AuthError(ErrorCodes.AUTH_003);

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
      }),
      // Revoke all sessions — force re-login everywhere after a reset.
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  /** Authenticated password change; verifies the current password first. */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AuthError(ErrorCodes.AUTH_004);

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new AuthError(ErrorCodes.AUTH_001);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  private async registerFailedAttempt(userId: string, current: number): Promise<void> {
    const attempts = current + 1;
    const lock = attempts >= MAX_FAILED_ATTEMPTS;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: lock ? 0 : attempts,
        lockedUntil: lock ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60_000) : undefined,
      },
    });
  }

  private hashResetToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private async generateTokens(
    userId: string,
    email: string,
    orgId: string,
    role: string,
    family: string,
  ) {
    const payload: JwtPayload = { sub: userId, email, orgId, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN') ?? '15m',
      }),
      this.jwtService.signAsync(
        // jti makes every refresh token unique per issuance: without it two
        // rotations within the same second produce a byte-identical token
        // (same payload + 1s-resolution iat), which would defeat reuse detection.
        { ...payload, family, jti: uuidv4() },
        {
          secret: this.config.get('JWT_REFRESH_SECRET'),
          expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') ?? '7d',
        },
      ),
    ]);
    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(
    userId: string,
    rawToken: string,
    family: string,
  ): Promise<void> {
    // Refresh tokens are long, high-entropy JWTs — hash with SHA-256, NOT bcrypt.
    // bcrypt silently truncates input at 72 bytes, so two tokens for the same
    // user (which share a >72-byte prefix) would hash identically, defeating
    // both integrity and reuse detection.
    const tokenHash = this.hashRefreshToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, family, expiresAt },
    });
  }

  private hashRefreshToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  /** Constant-time comparison of a presented token against the stored hash. */
  private refreshTokenMatches(rawToken: string, storedHash: string): boolean {
    const presented = Buffer.from(this.hashRefreshToken(rawToken), 'hex');
    const stored = Buffer.from(storedHash, 'hex');
    return presented.length === stored.length && timingSafeEqual(presented, stored);
  }

  private async revokeFamily(family: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { family },
      data: { revokedAt: new Date() },
    });
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    orgId: string;
    telegram?: string | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      orgId: user.orgId,
      telegram: user.telegram ?? null,
    };
  }
}
