import { AccountingService } from './accounting.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCodes } from '../../shared/errors/error-codes';

type Period = { id: string; orgId: string; yearMonth: string; unlockedAt: Date | null };

function makePrisma(period: Period | null) {
  return {
    lockedPeriod: {
      findUnique: jest.fn().mockResolvedValue(period),
      findMany: jest.fn().mockResolvedValue(period ? [period] : []),
      upsert: jest.fn().mockResolvedValue(period),
      update: jest.fn().mockResolvedValue(period),
    },
  } as unknown as PrismaService;
}

describe('AccountingService', () => {
  const ORG = 'org-1';
  const USER = 'user-1';

  describe('isLocked', () => {
    it('returns true for a locked (not unlocked) period', async () => {
      const svc = new AccountingService(
        makePrisma({ id: 'p1', orgId: ORG, yearMonth: '2026-06', unlockedAt: null }),
      );
      await expect(svc.isLocked(ORG, 2026, 6)).resolves.toBe(true);
    });

    it('returns false for a period that has been unlocked', async () => {
      const svc = new AccountingService(
        makePrisma({ id: 'p1', orgId: ORG, yearMonth: '2026-06', unlockedAt: new Date() }),
      );
      await expect(svc.isLocked(ORG, 2026, 6)).resolves.toBe(false);
    });

    it('returns false when no period row exists', async () => {
      const svc = new AccountingService(makePrisma(null));
      await expect(svc.isLocked(ORG, 2026, 6)).resolves.toBe(false);
    });

    it('zero-pads the month when building yearMonth', async () => {
      const prisma = makePrisma(null);
      const svc = new AccountingService(prisma);
      await svc.isLocked(ORG, 2026, 3);
      expect((prisma.lockedPeriod.findUnique as jest.Mock)).toHaveBeenCalledWith({
        where: { orgId_yearMonth: { orgId: ORG, yearMonth: '2026-03' } },
      });
    });
  });

  describe('assertNotLocked', () => {
    it('throws CONFLICT_002 carrying {year, month} when the period is locked', async () => {
      const svc = new AccountingService(
        makePrisma({ id: 'p1', orgId: ORG, yearMonth: '2026-06', unlockedAt: null }),
      );
      // 2026-06-15 (UTC) falls in the locked June period.
      await expect(svc.assertNotLocked(ORG, new Date('2026-06-15T00:00:00Z'))).rejects.toMatchObject({
        getStatus: expect.any(Function),
      });
      try {
        await svc.assertNotLocked(ORG, new Date('2026-06-15T00:00:00Z'));
        throw new Error('expected assertNotLocked to throw');
      } catch (err) {
        const e = err as { getResponse: () => Record<string, unknown> };
        expect(e.getResponse()).toMatchObject({
          code: ErrorCodes.CONFLICT_002,
          detail: { period: { year: 2026, month: 6 } },
        });
      }
    });

    it('resolves silently when the period is not locked', async () => {
      const svc = new AccountingService(makePrisma(null));
      await expect(svc.assertNotLocked(ORG, new Date('2026-07-01T00:00:00Z'))).resolves.toBeUndefined();
    });
  });

  describe('lock', () => {
    it('upserts the period (idempotent, clearing any prior unlock)', async () => {
      const prisma = makePrisma(null);
      const svc = new AccountingService(prisma);
      await svc.lock(ORG, USER, { yearMonth: '2026-06', note: 'closing' });
      const call = (prisma.lockedPeriod.upsert as jest.Mock).mock.calls[0][0];
      expect(call.where).toEqual({ orgId_yearMonth: { orgId: ORG, yearMonth: '2026-06' } });
      expect(call.update).toMatchObject({ unlockedAt: null, unlockedByUserId: null, lockedByUserId: USER });
    });
  });

  describe('unlock', () => {
    it('throws ENTITY_001 when the period does not exist', async () => {
      const svc = new AccountingService(makePrisma(null));
      await expect(svc.unlock(ORG, USER, '2026-06')).rejects.toMatchObject({
        getResponse: expect.any(Function),
      });
    });
  });
});
