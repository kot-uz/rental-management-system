import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { TerminateLeaseDto } from './dto/terminate-lease.dto';
import { Prisma } from '@prisma/client';
import * as dayjs from 'dayjs';

@Injectable()
export class LeasesService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, dto: CreateLeaseDto) {
    const start = dayjs(dto.startDate);
    const end = dayjs(dto.endDate);

    if (!start.isBefore(end)) {
      throw new BadRequestException('startDate must be before endDate');
    }

    const overlapping = await this.prisma.lease.findFirst({
      where: {
        apartmentId: dto.apartmentId,
        orgId,
        status: 'ACTIVE',
        startDate: { lte: new Date(dto.endDate) },
        endDate: { gte: new Date(dto.startDate) },
      },
    });
    if (overlapping) {
      throw new ConflictException('Apartment already has an active lease in this period');
    }

    const apartment = await this.prisma.apartment.findFirst({
      where: { id: dto.apartmentId, orgId, deletedAt: null },
    });
    if (!apartment) throw new NotFoundException('Apartment not found');

    const primaryTenant = await this.prisma.tenant.findFirst({
      where: { id: dto.primaryTenantId, orgId, deletedAt: null },
    });
    if (!primaryTenant) throw new NotFoundException('Primary tenant not found');

    const lease = await this.prisma.$transaction(async (tx) => {
      const created = await tx.lease.create({
        data: {
          orgId,
          apartmentId: dto.apartmentId,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          monthlyRent: dto.monthlyRent,
          currency: dto.currency ?? 'USD',
          depositAmount: dto.depositAmount,
          depositBalance: dto.depositAmount,
          rentDueDay: dto.rentDueDay ?? 1,
        },
      });

      const partyData: Prisma.LeasePartyCreateManyInput[] = [
        { leaseId: created.id, tenantId: dto.primaryTenantId, isPrimary: true },
        ...(dto.additionalTenantIds ?? []).map((tid) => ({
          leaseId: created.id,
          tenantId: tid,
          isPrimary: false,
        })),
      ];
      await tx.leaseParty.createMany({ data: partyData });

      await tx.apartment.update({
        where: { id: dto.apartmentId },
        data: { status: 'OCCUPIED' },
      });

      return created;
    });

    return this.findOne(lease.id, orgId);
  }

  async findAll(orgId: string, apartmentId?: string, status?: string) {
    return this.prisma.lease.findMany({
      where: {
        orgId,
        ...(apartmentId && { apartmentId }),
        ...(status && { status: status as 'ACTIVE' | 'EXPIRED' | 'TERMINATED' }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        apartment: { select: { id: true, address: true, unitNumber: true } },
        parties: {
          include: { tenant: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
  }

  async findOne(id: string, orgId: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { id, orgId },
      include: {
        apartment: true,
        parties: { include: { tenant: true } },
        rentPeriods: { orderBy: { periodYear: 'desc' }, take: 12 },
        deductions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!lease) throw new NotFoundException('Lease not found');
    return lease;
  }

  async terminate(id: string, orgId: string, dto: TerminateLeaseDto) {
    const lease = await this.prisma.lease.findFirst({
      where: { id, orgId, status: 'ACTIVE' },
    });
    if (!lease) throw new NotFoundException('Active lease not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lease.update({
        where: { id },
        data: {
          status: 'TERMINATED',
          terminatedAt: new Date(),
          terminationNote: dto.terminationNote,
          penaltyAmount: dto.penaltyAmount,
        },
      });

      const hasOtherActive = await tx.lease.findFirst({
        where: { apartmentId: lease.apartmentId, status: 'ACTIVE', id: { not: id } },
      });
      if (!hasOtherActive) {
        await tx.apartment.update({
          where: { id: lease.apartmentId },
          data: { status: 'VACANT' },
        });
      }

      return updated;
    });
  }

  async addDeduction(leaseId: string, orgId: string, amount: number, reason: string) {
    const lease = await this.prisma.lease.findFirst({ where: { id: leaseId, orgId } });
    if (!lease) throw new NotFoundException('Lease not found');

    const newBalance = Number(lease.depositBalance) - amount;
    if (newBalance < 0) {
      throw new BadRequestException('Deduction exceeds remaining deposit balance');
    }

    return this.prisma.$transaction(async (tx) => {
      const deduction = await tx.depositDeduction.create({
        data: { leaseId, amount, reason },
      });
      await tx.lease.update({
        where: { id: leaseId },
        data: { depositBalance: newBalance },
      });
      return deduction;
    });
  }

  /**
   * Final disposition of the security deposit: records how much is returned to
   * the tenant and derives the status. The non-returned remainder of the
   * balance is treated as forfeited. Settles once.
   */
  async settleDeposit(leaseId: string, orgId: string, returnAmount: number, note?: string) {
    const lease = await this.prisma.lease.findFirst({ where: { id: leaseId, orgId } });
    if (!lease) throw new NotFoundException('Lease not found');
    if (lease.depositSettledAt) {
      throw new ConflictException('Deposit already settled');
    }

    const balance = Number(lease.depositBalance);
    if (returnAmount < 0 || returnAmount > balance) {
      throw new BadRequestException('Return amount must be between 0 and the remaining balance');
    }

    let status: 'RETURNED' | 'PARTIALLY_RETURNED' | 'FORFEITED';
    if (returnAmount === 0) {
      status = 'FORFEITED';
    } else if (returnAmount === balance) {
      status = 'RETURNED';
    } else {
      status = 'PARTIALLY_RETURNED';
    }

    return this.prisma.lease.update({
      where: { id: leaseId },
      data: {
        depositStatus: status,
        depositReturnedAmount: returnAmount,
        depositSettledAt: new Date(),
        depositSettlementNote: note,
      },
    });
  }
}
