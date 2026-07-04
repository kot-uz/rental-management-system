import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as dayjs from 'dayjs';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(orgId: string) {
    const now = dayjs();
    const monthStart = now.startOf('month').toDate();
    const monthEnd = now.endOf('month').toDate();
    const todayStart = now.startOf('day').toDate();
    const todayEnd = now.endOf('day').toDate();
    const soonEnd = now.add(3, 'day').endOf('day').toDate();

    const [
      apartmentStats,
      overdueRent,
      monthlyIncome,
      activeLeases,
      openRepairs,
      unpaidUtilities,
      dueToday,
      dueSoon,
    ] = await Promise.all([
      this.prisma.apartment.groupBy({
        by: ['status'],
        where: { orgId, deletedAt: null },
        _count: true,
      }),
      this.prisma.rentPeriod.aggregate({
        where: { orgId, status: 'OVERDUE' },
        _sum: { expectedAmount: true },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: {
          orgId,
          paymentDate: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.lease.count({ where: { orgId, status: 'ACTIVE' } }),
      this.prisma.repair.count({
        where: { orgId, status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] }, deletedAt: null },
      }),
      this.prisma.utilityRecord.aggregate({
        where: { orgId, status: 'UNPAID' },
        _sum: { amount: true },
        _count: true,
      }),
      // Rent due today (not yet paid).
      this.prisma.rentPeriod.count({
        where: {
          orgId,
          status: { in: ['UNPAID', 'PARTIAL'] },
          dueDate: { gte: todayStart, lte: todayEnd },
        },
      }),
      // Rent due within the next 3 days, today included (not yet paid).
      this.prisma.rentPeriod.count({
        where: {
          orgId,
          status: { in: ['UNPAID', 'PARTIAL'] },
          dueDate: { gte: todayStart, lte: soonEnd },
        },
      }),
    ]);

    const statusMap = Object.fromEntries(
      apartmentStats.map((s) => [s.status, s._count]),
    );

    return {
      apartments: {
        total: Object.values(statusMap).reduce((a, b) => a + b, 0),
        occupied: statusMap['OCCUPIED'] ?? 0,
        vacant: statusMap['VACANT'] ?? 0,
        archived: statusMap['ARCHIVED'] ?? 0,
      },
      rent: {
        overdueCount: overdueRent._count,
        overdueAmount: Number(overdueRent._sum.expectedAmount ?? 0),
        monthlyCollected: Number(monthlyIncome._sum.amount ?? 0),
        dueTodayCount: dueToday,
        dueSoonCount: dueSoon,
      },
      leases: { active: activeLeases },
      repairs: { open: openRepairs },
      utilities: {
        unpaidCount: unpaidUtilities._count,
        unpaidAmount: Number(unpaidUtilities._sum.amount ?? 0),
      },
    };
  }

  async getMonthlyRevenue(orgId: string, months = 12) {
    const results = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = dayjs().subtract(i, 'month');
      const start = date.startOf('month').toDate();
      const end = date.endOf('month').toDate();

      const [collected, repairCost] = await Promise.all([
        this.prisma.payment.aggregate({
          where: { orgId, paymentDate: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        this.prisma.repair.aggregate({
          where: {
            orgId,
            completedAt: { gte: start, lte: end },
            costActual: { not: null },
          },
          _sum: { costActual: true },
        }),
      ]);

      results.push({
        year: date.year(),
        month: date.month() + 1,
        label: date.format('MMM YYYY'),
        income: Number(collected._sum.amount ?? 0),
        repairExpenses: Number(repairCost._sum.costActual ?? 0),
        profit: Number(collected._sum.amount ?? 0) - Number(repairCost._sum.costActual ?? 0),
      });
    }
    return results;
  }

  async getApartmentProfitability(orgId: string) {
    const apartments = await this.prisma.apartment.findMany({
      where: { orgId, deletedAt: null },
      include: {
        leases: {
          where: { status: 'ACTIVE' },
          include: {
            rentPeriods: {
              where: { status: 'PAID' },
              include: { payments: true },
            },
          },
        },
        repairs: {
          where: { deletedAt: null, costActual: { not: null } },
          select: { costActual: true },
        },
      },
    });

    return apartments.map((apt) => {
      const totalRent = apt.leases.flatMap((l) =>
        l.rentPeriods.flatMap((rp) => rp.payments.map((p) => Number(p.amount))),
      ).reduce((a, b) => a + b, 0);

      const totalRepairs = apt.repairs.reduce(
        (sum, r) => sum + Number(r.costActual ?? 0),
        0,
      );

      return {
        id: apt.id,
        address: apt.address,
        unitNumber: apt.unitNumber,
        status: apt.status,
        totalRentCollected: totalRent,
        totalRepairCost: totalRepairs,
        netProfit: totalRent - totalRepairs,
      };
    });
  }
}
