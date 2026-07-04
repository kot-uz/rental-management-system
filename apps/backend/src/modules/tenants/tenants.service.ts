import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, dto: CreateTenantDto) {
    return this.prisma.tenant.create({ data: { ...dto, orgId } });
  }

  async findAll(orgId: string, search?: string) {
    const where: Prisma.TenantWhereInput = {
      orgId,
      deletedAt: null,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    return this.prisma.tenant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        leaseParties: {
          include: {
            lease: {
              select: {
                id: true,
                status: true,
                apartmentId: true,
                apartment: { select: { address: true, unitNumber: true } },
              },
            },
          },
          where: { lease: { status: 'ACTIVE' } },
          take: 1,
        },
      },
    });
  }

  async findOne(id: string, orgId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, orgId, deletedAt: null },
      include: {
        leaseParties: {
          include: {
            lease: {
              include: {
                apartment: true,
              },
            },
          },
          orderBy: { lease: { createdAt: 'desc' } },
        },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(id: string, orgId: string, dto: UpdateTenantDto) {
    await this.findOne(id, orgId);
    return this.prisma.tenant.update({ where: { id }, data: dto });
  }

  async remove(id: string, orgId: string): Promise<void> {
    await this.findOne(id, orgId);
    const activeLease = await this.prisma.leaseParty.findFirst({
      where: { tenantId: id, lease: { status: 'ACTIVE' } },
    });
    if (activeLease) {
      throw new BadRequestException('Cannot delete tenant with an active lease');
    }
    await this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
