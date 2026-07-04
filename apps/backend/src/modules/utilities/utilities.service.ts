import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUtilityDto } from './dto/create-utility.dto';
import { UtilityStatus } from '@prisma/client';

export class UpdateUtilityDto {
  status?: UtilityStatus;
  amount?: number;
  receiptFileId?: string;
  notes?: string;
}

@Injectable()
export class UtilitiesService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, dto: CreateUtilityDto) {
    const apartment = await this.prisma.apartment.findFirst({
      where: { id: dto.apartmentId, orgId, deletedAt: null },
    });
    if (!apartment) throw new NotFoundException('Apartment not found');

    return this.prisma.utilityRecord.create({ data: { ...dto, orgId } });
  }

  async findAll(orgId: string, apartmentId?: string, type?: string, status?: string) {
    return this.prisma.utilityRecord.findMany({
      where: {
        orgId,
        ...(apartmentId && { apartmentId }),
        ...(type && { type: type as 'ELECTRICITY' | 'GAS' | 'WATER' | 'INTERNET' | 'GARBAGE' | 'HEATING' | 'CUSTOM' }),
        ...(status && { status: status as UtilityStatus }),
      },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      include: {
        apartment: { select: { address: true, unitNumber: true } },
      },
    });
  }

  async findOne(id: string, orgId: string) {
    const record = await this.prisma.utilityRecord.findFirst({
      where: { id, orgId },
      include: { apartment: { select: { address: true, unitNumber: true } } },
    });
    if (!record) throw new NotFoundException('Utility record not found');
    return record;
  }

  async update(id: string, orgId: string, dto: UpdateUtilityDto) {
    await this.findOne(id, orgId);
    return this.prisma.utilityRecord.update({ where: { id }, data: dto });
  }

  async markPaid(id: string, orgId: string) {
    await this.findOne(id, orgId);
    return this.prisma.utilityRecord.update({
      where: { id },
      data: { status: 'PAID' },
    });
  }

  async remove(id: string, orgId: string): Promise<void> {
    await this.findOne(id, orgId);
    await this.prisma.utilityRecord.delete({ where: { id } });
  }
}
