import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface SearchResult {
  type: 'apartment' | 'tenant' | 'repair' | 'contractor';
  id: string;
  title: string;
  subtitle?: string;
}

const PER_TYPE_LIMIT = 5;

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  /** Org-scoped global search across the primary entities. */
  async search(orgId: string, query: string): Promise<SearchResult[]> {
    const q = query.trim();
    if (q.length < 2) return [];

    const like: Prisma.StringFilter = { contains: q, mode: 'insensitive' };

    const [apartments, tenants, repairs, contractors] = await Promise.all([
      this.prisma.apartment.findMany({
        where: {
          orgId,
          deletedAt: null,
          OR: [{ address: like }, { unitNumber: like }, { notes: like }],
        },
        take: PER_TYPE_LIMIT,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.findMany({
        where: {
          orgId,
          deletedAt: null,
          OR: [{ firstName: like }, { lastName: like }, { phone: like }, { idNumber: like }],
        },
        take: PER_TYPE_LIMIT,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.repair.findMany({
        where: {
          orgId,
          deletedAt: null,
          OR: [{ title: like }, { description: like }, { location: like }],
        },
        take: PER_TYPE_LIMIT,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contractor.findMany({
        where: {
          orgId,
          deletedAt: null,
          OR: [{ name: like }, { specialty: like }, { phone: like }],
        },
        take: PER_TYPE_LIMIT,
        orderBy: { name: 'asc' },
      }),
    ]);

    return [
      ...apartments.map<SearchResult>((a) => ({
        type: 'apartment',
        id: a.id,
        title: a.unitNumber ? `${a.address} · ${a.unitNumber}` : a.address,
        subtitle: a.status,
      })),
      ...tenants.map<SearchResult>((t) => ({
        type: 'tenant',
        id: t.id,
        title: `${t.firstName} ${t.lastName}`,
        subtitle: t.phone,
      })),
      ...repairs.map<SearchResult>((r) => ({
        type: 'repair',
        id: r.id,
        title: r.title,
        subtitle: r.status,
      })),
      ...contractors.map<SearchResult>((c) => ({
        type: 'contractor',
        id: c.id,
        title: c.name,
        subtitle: c.specialty ?? undefined,
      })),
    ];
  }
}
