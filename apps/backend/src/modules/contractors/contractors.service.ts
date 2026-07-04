import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContractorDto } from './dto/create-contractor.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';
import { deleteBlocked, notFound } from '../../shared/errors/domain.error';
import { ErrorCodes } from '../../shared/errors/error-codes';

@Injectable()
export class ContractorsService {
  constructor(private prisma: PrismaService) {}

  create(orgId: string, dto: CreateContractorDto) {
    return this.prisma.contractor.create({ data: { ...dto, orgId } });
  }

  findAll(orgId: string, search?: string) {
    const where: Prisma.ContractorWhereInput = {
      orgId,
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { specialty: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    return this.prisma.contractor.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findOne(id: string, orgId: string) {
    const contractor = await this.prisma.contractor.findFirst({
      where: { id, orgId, deletedAt: null },
      include: {
        repairs: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, title: true, status: true, costActual: true, createdAt: true },
        },
      },
    });
    if (!contractor) throw notFound('Contractor', id);
    return contractor;
  }

  async update(id: string, orgId: string, dto: UpdateContractorDto) {
    await this.findOne(id, orgId);
    return this.prisma.contractor.update({ where: { id }, data: dto });
  }

  /** Soft-delete; blocked while non-archived repairs still reference it (ENTITY_004). */
  async remove(id: string, orgId: string): Promise<void> {
    await this.findOne(id, orgId);
    const activeRepairs = await this.prisma.repair.count({
      where: { contractorId: id, deletedAt: null },
    });
    if (activeRepairs > 0) {
      throw deleteBlocked(ErrorCodes.ENTITY_004, { count: activeRepairs });
    }
    await this.prisma.contractor.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
