import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditEntry {
  orgId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /** Persists an audit entry. Never throws — auditing must not break requests. */
  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          orgId: entry.orgId,
          userId: entry.userId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          before: toJson(entry.before),
          after: toJson(entry.after),
          ip: entry.ip,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to write audit log: ${(err as Error).message}`);
    }
  }

  async list(
    orgId: string,
    opts: { entityType?: string; entityId?: string; limit?: number; offset?: number },
  ) {
    const limit = Math.min(opts.limit ?? 50, 200);
    return this.prisma.auditLog.findMany({
      where: {
        orgId,
        ...(opts.entityType && { entityType: opts.entityType }),
        ...(opts.entityId && { entityId: opts.entityId }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: opts.offset ?? 0,
    });
  }
}

/** Coerce a Prisma entity (with Decimal/Date) into plain JSON for storage. */
function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
