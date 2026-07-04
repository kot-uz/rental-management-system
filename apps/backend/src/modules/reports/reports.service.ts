import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toCsv } from './csv.util';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async apartmentsCsv(orgId: string): Promise<string> {
    const rows = await this.prisma.apartment.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return toCsv(
      ['Address', 'Unit', 'Status', 'Rooms', 'Area (m²)', 'Created'],
      rows.map((a) => [
        a.address,
        a.unitNumber ?? '',
        a.status,
        a.rooms ?? '',
        a.areaSqm?.toString() ?? '',
        a.createdAt.toISOString().slice(0, 10),
      ]),
    );
  }

  async rentCsv(orgId: string): Promise<string> {
    const rows = await this.prisma.rentPeriod.findMany({
      where: { orgId },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      include: {
        lease: {
          include: {
            apartment: { select: { address: true, unitNumber: true } },
            parties: {
              where: { isPrimary: true },
              include: { tenant: { select: { firstName: true, lastName: true } } },
            },
          },
        },
      },
    });
    return toCsv(
      ['Period', 'Apartment', 'Tenant', 'Expected', 'Paid', 'Status', 'Due'],
      rows.map((p) => {
        const apt = p.lease.apartment;
        const tenant = p.lease.parties[0]?.tenant;
        return [
          `${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`,
          apt ? `${apt.address}${apt.unitNumber ? ` ${apt.unitNumber}` : ''}` : '',
          tenant ? `${tenant.firstName} ${tenant.lastName}` : '',
          p.expectedAmount.toString(),
          p.paidAmount.toString(),
          p.status,
          p.dueDate.toISOString().slice(0, 10),
        ];
      }),
    );
  }

  async repairsCsv(orgId: string): Promise<string> {
    const rows = await this.prisma.repair.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { apartment: { select: { address: true, unitNumber: true } } },
    });
    return toCsv(
      ['Title', 'Apartment', 'Severity', 'Status', 'Cost (actual)', 'Created'],
      rows.map((r) => [
        r.title,
        r.apartment ? `${r.apartment.address}${r.apartment.unitNumber ? ` ${r.apartment.unitNumber}` : ''}` : '',
        r.severity,
        r.status,
        r.costActual?.toString() ?? '',
        r.createdAt.toISOString().slice(0, 10),
      ]),
    );
  }
}
