import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRepairDto } from './dto/create-repair.dto';
import { UpdateRepairDto } from './dto/update-repair.dto';
import { RepairStatus } from '@prisma/client';
import { WebhooksService } from '../webhooks/webhooks.service';
import { TagsService } from '../tags/tags.service';

const VALID_TRANSITIONS: Record<RepairStatus, RepairStatus[]> = {
  OPEN: ['IN_PROGRESS', 'CANCELED'],
  IN_PROGRESS: ['WAITING', 'COMPLETED', 'CANCELED'],
  WAITING: ['IN_PROGRESS', 'COMPLETED', 'CANCELED'],
  COMPLETED: [],
  CANCELED: [],
};

@Injectable()
export class RepairsService {
  constructor(
    private prisma: PrismaService,
    private webhooks: WebhooksService,
    private tags: TagsService,
  ) {}

  async create(orgId: string, dto: CreateRepairDto) {
    const apartment = await this.prisma.apartment.findFirst({
      where: { id: dto.apartmentId, orgId, deletedAt: null },
    });
    if (!apartment) throw new NotFoundException('Apartment not found');

    const repair = await this.prisma.repair.create({ data: { ...dto, orgId } });
    await this.webhooks.dispatch(orgId, 'repair.created', {
      repairId: repair.id,
      apartmentId: repair.apartmentId,
      title: repair.title,
      severity: repair.severity,
      status: repair.status,
      createdAt: repair.createdAt,
    });
    return repair;
  }

  async findAll(orgId: string, apartmentId?: string, status?: string, tagId?: string) {
    let tagIds: string[] | undefined;
    if (tagId) {
      tagIds = await this.tags.entityIdsForTag(orgId, tagId, 'repair');
      if (tagIds.length === 0) tagIds = ['__none__'];
    }

    return this.prisma.repair.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(tagIds && { id: { in: tagIds } }),
        ...(apartmentId && { apartmentId }),
        ...(status && { status: status as RepairStatus }),
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      include: {
        apartment: { select: { address: true, unitNumber: true } },
        comments: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
    });
  }

  async findOne(id: string, orgId: string) {
    const repair = await this.prisma.repair.findFirst({
      where: { id, orgId, deletedAt: null },
      include: {
        apartment: true,
        comments: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!repair) throw new NotFoundException('Repair not found');
    return repair;
  }

  async update(id: string, orgId: string, dto: UpdateRepairDto) {
    await this.findOne(id, orgId);
    return this.prisma.repair.update({ where: { id }, data: dto });
  }

  async transition(id: string, orgId: string, newStatus: RepairStatus) {
    const repair = await this.findOne(id, orgId);
    const allowed = VALID_TRANSITIONS[repair.status as RepairStatus] ?? [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${repair.status} to ${newStatus}`,
      );
    }

    const data: Partial<{ status: RepairStatus; completedAt: Date; canceledAt: Date }> = {
      status: newStatus,
    };
    if (newStatus === 'COMPLETED') data.completedAt = new Date();
    if (newStatus === 'CANCELED') data.canceledAt = new Date();

    const updated = await this.prisma.repair.update({ where: { id }, data });

    if (newStatus === 'COMPLETED') {
      await this.webhooks.dispatch(orgId, 'repair.resolved', {
        repairId: updated.id,
        apartmentId: updated.apartmentId,
        title: updated.title,
        resolvedAt: updated.completedAt,
        actualCostMinor:
          updated.costActual != null ? Math.round(Number(updated.costActual) * 100) : null,
      });
    }
    return updated;
  }

  async addComment(repairId: string, orgId: string, userId: string, body: string) {
    await this.findOne(repairId, orgId);
    return this.prisma.repairComment.create({ data: { repairId, userId, body } });
  }

  async remove(id: string, orgId: string): Promise<void> {
    await this.findOne(id, orgId);
    await this.prisma.repair.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
