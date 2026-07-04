import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { notFound } from '../../shared/errors/domain.error';

/** Days-before-expiry at which a `document.expiring` event fires (once each). */
const EXPIRY_THRESHOLDS = [30, 7, 1];

const FILE_SELECT = {
  id: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  status: true,
} as const;

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private files: FilesService,
    private webhooks: WebhooksService,
  ) {}

  async create(
    orgId: string,
    userId: string,
    file: Express.Multer.File,
    dto: CreateDocumentDto,
  ) {
    const asset = await this.files.upload(file, orgId, dto.ownerId, dto.ownerType, 'document');
    return this.prisma.document.create({
      data: {
        orgId,
        ownerType: dto.ownerType,
        ownerId: dto.ownerId,
        fileId: asset.id,
        title: dto.title,
        documentType: dto.documentType ?? 'OTHER',
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdBy: userId,
      },
      include: { file: { select: FILE_SELECT } },
    });
  }

  findAll(orgId: string, ownerType?: string, ownerId?: string) {
    const where: Prisma.DocumentWhereInput = {
      orgId,
      deletedAt: null,
      ...(ownerType && { ownerType }),
      ...(ownerId && { ownerId }),
    };
    return this.prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { file: { select: FILE_SELECT } },
    });
  }

  async findOne(id: string, orgId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, orgId, deletedAt: null },
      include: { file: { select: FILE_SELECT } },
    });
    if (!doc) throw notFound('Document', id);
    return doc;
  }

  /** Short-lived signed URL for the underlying file. */
  async getUrl(id: string, orgId: string): Promise<string> {
    const doc = await this.findOne(id, orgId);
    return this.files.getSignedUrl(doc.fileId, orgId);
  }

  async update(id: string, orgId: string, dto: UpdateDocumentDto) {
    await this.findOne(id, orgId);
    return this.prisma.document.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.documentType !== undefined && { documentType: dto.documentType }),
        ...(dto.expiresAt !== undefined && {
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        }),
        version: { increment: 1 },
      },
      include: { file: { select: FILE_SELECT } },
    });
  }

  /** Soft-delete the document and remove the backing file. */
  async remove(id: string, orgId: string): Promise<void> {
    const doc = await this.findOne(id, orgId);
    await this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.files.delete(doc.fileId, orgId).catch((err) =>
      this.logger.warn(`Failed to delete file ${doc.fileId} for document ${id}: ${err.message}`),
    );
  }

  // ─── Expiry tracking ──────────────────────────────────────────────────────

  /**
   * Daily sweep: emit `document.expiring` for documents that hit one of the
   * threshold marks (30/7/1 days out). Date-equality keeps it to one event per
   * threshold rather than firing every day inside the window.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkExpiringDocuments(): Promise<void> {
    for (const days of EXPIRY_THRESHOLDS) {
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      start.setUTCDate(start.getUTCDate() + days);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);

      const docs = await this.prisma.document.findMany({
        where: { deletedAt: null, expiresAt: { gte: start, lt: end } },
      });

      for (const doc of docs) {
        await this.webhooks.dispatch(doc.orgId, 'document.expiring', {
          documentId: doc.id,
          ownerType: doc.ownerType,
          ownerId: doc.ownerId,
          title: doc.title,
          documentType: doc.documentType,
          expiresAt: doc.expiresAt,
          daysUntilExpiry: days,
        });
      }
      if (docs.length) {
        this.logger.log(`document.expiring: ${docs.length} document(s) at ${days}d threshold`);
      }
    }
  }
}
