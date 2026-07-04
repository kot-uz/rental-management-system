import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { Prisma } from '@prisma/client';
import * as dayjs from 'dayjs';
import { WebhooksService } from '../webhooks/webhooks.service';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class RentService {
  constructor(
    private prisma: PrismaService,
    private webhooks: WebhooksService,
    private accounting: AccountingService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateMonthlyPeriods(): Promise<void> {
    const now = dayjs();
    const year = now.year();
    const month = now.month() + 1;

    const activeLeases = await this.prisma.lease.findMany({
      where: { status: 'ACTIVE' },
    });

    for (const lease of activeLeases) {
      const dueDay = Math.min(lease.rentDueDay, dayjs(`${year}-${month}-01`).daysInMonth());
      const dueDate = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`).toDate();

      await this.prisma.rentPeriod.upsert({
        where: { leaseId_periodYear_periodMonth: { leaseId: lease.id, periodYear: year, periodMonth: month } },
        create: {
          orgId: lease.orgId,
          leaseId: lease.id,
          periodYear: year,
          periodMonth: month,
          dueDate,
          expectedAmount: lease.monthlyRent,
          status: 'UNPAID',
        },
        update: {},
      });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async markOverdue(): Promise<void> {
    const today = dayjs().startOf('day').toDate();
    await this.prisma.rentPeriod.updateMany({
      where: {
        status: { in: ['UNPAID', 'PARTIAL'] },
        dueDate: { lt: today },
      },
      data: { status: 'OVERDUE' },
    });
  }

  async findByLease(leaseId: string, orgId: string) {
    const lease = await this.prisma.lease.findFirst({ where: { id: leaseId, orgId } });
    if (!lease) throw new NotFoundException('Lease not found');

    return this.prisma.rentPeriod.findMany({
      where: { leaseId },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      include: { payments: true },
    });
  }

  async findByOrg(orgId: string, status?: string) {
    return this.prisma.rentPeriod.findMany({
      where: {
        orgId,
        ...(status && { status: status as Prisma.EnumRentPeriodStatusFilter }),
      },
      orderBy: [{ dueDate: 'asc' }],
      include: {
        lease: {
          include: {
            apartment: { select: { address: true, unitNumber: true } },
            parties: {
              where: { isPrimary: true },
              include: { tenant: { select: { firstName: true, lastName: true } } },
            },
          },
        },
      },
      take: 100,
    });
  }

  async recordPayment(periodId: string, orgId: string, userId: string, dto: RecordPaymentDto) {
    const period = await this.prisma.rentPeriod.findFirst({
      where: { id: periodId, orgId },
    });
    if (!period) throw new NotFoundException('Rent period not found');
    if (period.status === 'VOIDED') {
      throw new BadRequestException('Cannot record payment for voided period');
    }
    // Block money writes into a locked accounting month (CONFLICT_002).
    await this.accounting.assertNotLocked(orgId, new Date(dto.paymentDate));

    const newPaid = Number(period.paidAmount) + dto.amount;
    const expected = Number(period.expectedAmount);

    let newStatus: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'VOIDED';
    if (newPaid >= expected) {
      newStatus = 'PAID';
    } else if (newPaid > 0) {
      newStatus = 'PARTIAL';
    } else {
      newStatus = period.status as typeof newStatus;
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          orgId,
          rentPeriodId: periodId,
          amount: dto.amount,
          paymentDate: new Date(dto.paymentDate),
          method: dto.method ?? 'CASH',
          note: dto.note,
          proofFileId: dto.proofFileId,
          recordedBy: userId,
        },
      });

      await tx.rentPeriod.update({
        where: { id: periodId },
        data: {
          paidAmount: newPaid,
          status: newStatus,
          version: { increment: 1 },
        },
      });

      return created;
    });

    await this.webhooks.dispatch(orgId, 'rent.payment.created', {
      paymentId: payment.id,
      rentPeriodId: periodId,
      leaseId: period.leaseId,
      amountMinor: Math.round(dto.amount * 100),
      method: payment.method,
      paidAt: payment.paymentDate,
      rentPeriodStatus: newStatus,
      paidMinor: Math.round(newPaid * 100),
      balanceMinor: Math.round(Math.max(expected - newPaid, 0) * 100),
    });

    return payment;
  }

  async getOverdue(orgId: string) {
    return this.prisma.rentPeriod.findMany({
      where: { orgId, status: 'OVERDUE' },
      include: {
        lease: {
          include: {
            apartment: { select: { address: true, unitNumber: true } },
            parties: {
              where: { isPrimary: true },
              include: { tenant: { select: { firstName: true, lastName: true, phone: true } } },
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }
}
