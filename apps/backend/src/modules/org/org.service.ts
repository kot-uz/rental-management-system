import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateOrgSettingsDto } from './dto/update-org-settings.dto';
import { notFound } from '../../shared/errors/domain.error';

const SETTINGS_SELECT = {
  id: true,
  name: true,
  timezone: true,
  currency: true,
  locale: true,
  rentDueDay: true,
  lateFeeGraceDays: true,
  lateFeePercent: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class OrgService {
  constructor(private prisma: PrismaService) {}

  async get(orgId: string) {
    const org = await this.prisma.org.findFirst({
      where: { id: orgId, deletedAt: null },
      select: SETTINGS_SELECT,
    });
    if (!org) throw notFound('Org', orgId);
    return org;
  }

  async update(orgId: string, dto: UpdateOrgSettingsDto) {
    await this.get(orgId);
    return this.prisma.org.update({
      where: { id: orgId },
      data: dto,
      select: SETTINGS_SELECT,
    });
  }
}
