import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LockPeriodDto } from './dto/lock-period.dto';
import { periodLocked, notFound } from '../../shared/errors/domain.error';

const ym = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.lockedPeriod.findMany({
      where: { orgId },
      orderBy: { yearMonth: 'desc' },
    });
  }

  /** Lock a period (idempotent — re-locking clears any prior unlock). */
  lock(orgId: string, userId: string, dto: LockPeriodDto) {
    return this.prisma.lockedPeriod.upsert({
      where: { orgId_yearMonth: { orgId, yearMonth: dto.yearMonth } },
      create: { orgId, yearMonth: dto.yearMonth, lockedByUserId: userId, note: dto.note },
      update: {
        lockedAt: new Date(),
        lockedByUserId: userId,
        unlockedAt: null,
        unlockedByUserId: null,
        note: dto.note,
      },
    });
  }

  async unlock(orgId: string, userId: string, yearMonth: string) {
    const period = await this.prisma.lockedPeriod.findUnique({
      where: { orgId_yearMonth: { orgId, yearMonth } },
    });
    if (!period) throw notFound('LockedPeriod', yearMonth);
    return this.prisma.lockedPeriod.update({
      where: { id: period.id },
      data: { unlockedAt: new Date(), unlockedByUserId: userId },
    });
  }

  async isLocked(orgId: string, year: number, month: number): Promise<boolean> {
    const period = await this.prisma.lockedPeriod.findUnique({
      where: { orgId_yearMonth: { orgId, yearMonth: ym(year, month) } },
    });
    return !!period && period.unlockedAt === null;
  }

  /**
   * Guard for money-entity writes: throws CONFLICT_002 if the period covering
   * `date` is locked. Call before persisting payments etc.
   */
  async assertNotLocked(orgId: string, date: Date): Promise<void> {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    if (await this.isLocked(orgId, year, month)) {
      throw periodLocked(year, month);
    }
  }
}
