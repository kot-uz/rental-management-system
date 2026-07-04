import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { notFound } from '../../shared/errors/domain.error';

const normalize = (name: string) => name.trim().toLowerCase();

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, dto: CreateTagDto) {
    const name = normalize(dto.name);
    await this.assertNameFree(orgId, name);
    return this.prisma.tag.create({ data: { orgId, name, color: dto.color } });
  }

  /** All org tags with how many entities each is attached to. */
  async findAll(orgId: string) {
    const tags = await this.prisma.tag.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { name: 'asc' },
      include: { _count: { select: { assignments: true } } },
    });
    return tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      usageCount: t._count.assignments,
      createdAt: t.createdAt,
    }));
  }

  async update(id: string, orgId: string, dto: UpdateTagDto) {
    await this.findOne(id, orgId);
    const name = dto.name !== undefined ? normalize(dto.name) : undefined;
    if (name) await this.assertNameFree(orgId, name, id);
    return this.prisma.tag.update({
      where: { id },
      data: { ...(name && { name }), ...(dto.color !== undefined && { color: dto.color }) },
    });
  }

  async remove(id: string, orgId: string): Promise<void> {
    await this.findOne(id, orgId);
    await this.prisma.$transaction([
      this.prisma.tagAssignment.deleteMany({ where: { tagId: id } }),
      this.prisma.tag.update({ where: { id }, data: { deletedAt: new Date() } }),
    ]);
  }

  // ─── Assignment ─────────────────────────────────────────────────────────────

  async assign(tagId: string, orgId: string, entityType: string, entityId: string) {
    await this.findOne(tagId, orgId);
    // Idempotent — re-assigning the same tag is a no-op.
    return this.prisma.tagAssignment.upsert({
      where: { tagId_entityType_entityId: { tagId, entityType, entityId } },
      create: { tagId, orgId, entityType, entityId },
      update: {},
    });
  }

  async unassign(tagId: string, orgId: string, entityType: string, entityId: string): Promise<void> {
    await this.findOne(tagId, orgId);
    await this.prisma.tagAssignment.deleteMany({ where: { tagId, entityType, entityId } });
  }

  /** Tags currently attached to a given entity. */
  async forEntity(orgId: string, entityType: string, entityId: string) {
    const rows = await this.prisma.tagAssignment.findMany({
      where: { orgId, entityType, entityId, tag: { deletedAt: null } },
      include: { tag: { select: { id: true, name: true, color: true } } },
      orderBy: { tag: { name: 'asc' } },
    });
    return rows.map((r) => r.tag);
  }

  /** Entity ids of a given type tagged with `tagId` — used by list filters. */
  async entityIdsForTag(orgId: string, tagId: string, entityType: string): Promise<string[]> {
    const rows = await this.prisma.tagAssignment.findMany({
      where: { orgId, tagId, entityType },
      select: { entityId: true },
    });
    return rows.map((r) => r.entityId);
  }

  private async findOne(id: string, orgId: string) {
    const tag = await this.prisma.tag.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!tag) throw notFound('Tag', id);
    return tag;
  }

  private async assertNameFree(orgId: string, name: string, excludeId?: string) {
    const existing = await this.prisma.tag.findFirst({
      where: { orgId, name, deletedAt: null, ...(excludeId && { id: { not: excludeId } }) },
    });
    if (existing) throw new ConflictException(`Tag "${name}" already exists`);
  }
}
