import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { Prisma } from '@prisma/client';
import { TagsService } from '../tags/tags.service';

@Injectable()
export class ApartmentsService {
  constructor(
    private prisma: PrismaService,
    private tags: TagsService,
  ) {}

  async create(orgId: string, dto: CreateApartmentDto) {
    return this.prisma.apartment.create({
      data: { ...dto, orgId },
    });
  }

  async findAll(orgId: string, search?: string, status?: string, tagId?: string) {
    // Resolve the tag filter to a concrete id set; an empty set must yield no
    // rows (sentinel id) rather than being dropped from the where clause.
    let tagIds: string[] | undefined;
    if (tagId) {
      tagIds = await this.tags.entityIdsForTag(orgId, tagId, 'apartment');
      if (tagIds.length === 0) tagIds = ['__none__'];
    }

    const where: Prisma.ApartmentWhereInput = {
      orgId,
      deletedAt: null,
      ...(tagIds && { id: { in: tagIds } }),
      ...(status && { status: status as Prisma.EnumApartmentStatusFilter }),
      ...(search && {
        OR: [
          { address: { contains: search, mode: 'insensitive' } },
          { unitNumber: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const apartments = await this.prisma.apartment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        leases: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            monthlyRent: true,
            endDate: true,
            parties: {
              where: { isPrimary: true },
              include: { tenant: { select: { firstName: true, lastName: true } } },
            },
          },
          take: 1,
        },
      },
    });

    return apartments;
  }

  async findOne(id: string, orgId: string) {
    const apartment = await this.prisma.apartment.findFirst({
      where: { id, orgId, deletedAt: null },
      include: {
        leases: {
          where: { status: 'ACTIVE' },
          include: {
            parties: { include: { tenant: true } },
          },
        },
        repairs: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
    if (!apartment) throw new NotFoundException('Apartment not found');
    return apartment;
  }

  async update(id: string, orgId: string, dto: UpdateApartmentDto) {
    await this.findOne(id, orgId);
    return this.prisma.apartment.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, orgId: string): Promise<void> {
    const apt = await this.findOne(id, orgId);
    const activeLease = await this.prisma.lease.findFirst({
      where: { apartmentId: id, status: 'ACTIVE' },
    });
    if (activeLease) {
      throw new BadRequestException('Cannot delete apartment with an active lease');
    }
    await this.prisma.apartment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getStats(orgId: string) {
    const [total, occupied, vacant] = await Promise.all([
      this.prisma.apartment.count({ where: { orgId, deletedAt: null } }),
      this.prisma.apartment.count({ where: { orgId, deletedAt: null, status: 'OCCUPIED' } }),
      this.prisma.apartment.count({ where: { orgId, deletedAt: null, status: 'VACANT' } }),
    ]);
    return { total, occupied, vacant };
  }
}
