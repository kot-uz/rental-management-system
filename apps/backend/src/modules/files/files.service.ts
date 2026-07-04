import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import {
  FILE_PROCESSING_QUEUE,
  FileJobs,
  ProcessImageJobData,
} from '../../queue/queue.constants';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
const MAX_SIZE_BYTES = 20 * 1024 * 1024;

@Injectable()
export class FilesService {
  private s3: S3Client;
  private bucket: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    @InjectQueue(FILE_PROCESSING_QUEUE) private fileQueue: Queue<ProcessImageJobData>,
  ) {
    this.bucket = config.get<string>('MINIO_BUCKET') ?? 'rental-files';
    this.s3 = new S3Client({
      endpoint: `http://${config.get('MINIO_ENDPOINT')}:${config.get('MINIO_PORT')}`,
      region: 'us-east-1',
      credentials: {
        accessKeyId: config.get<string>('MINIO_ROOT_USER') ?? '',
        secretAccessKey: config.get<string>('MINIO_ROOT_PASSWORD') ?? '',
      },
      forcePathStyle: true,
    });
  }

  async upload(
    file: Express.Multer.File,
    orgId: string,
    ownerId: string,
    ownerType: string,
    purpose?: string,
  ) {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} not allowed`);
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('File size exceeds 20 MB limit');
    }

    const ext = file.originalname.split('.').pop() ?? 'bin';
    const s3Key = `${orgId}/${ownerType}/${ownerId}/${uuidv4()}.${ext}`;
    const isImage = file.mimetype.startsWith('image/');

    // Store the original immediately so the upload request returns fast. Images
    // start PENDING and get optimised (resize + thumbnail) by a background
    // worker; everything else is LIVE right away.
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const asset = await this.prisma.fileAsset.create({
      data: {
        orgId,
        ownerId,
        ownerType,
        s3Key,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        status: isImage ? 'PENDING' : 'LIVE',
        purpose,
      },
    });

    if (isImage) {
      await this.fileQueue.add(FileJobs.PROCESS_IMAGE, { fileId: asset.id });
    }

    return asset;
  }

  /**
   * Background step: re-fetch the original image, produce an optimised web
   * variant (replaces s3Key) plus a 300×300 thumbnail, then flip the asset to
   * LIVE. Invoked by FileProcessingProcessor — never on the request path.
   */
  async processImage(fileId: string): Promise<void> {
    const asset = await this.prisma.fileAsset.findUnique({ where: { id: fileId } });
    if (!asset || asset.status === 'DELETED') return;

    const original = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: asset.s3Key }),
    );
    const sourceBuffer = Buffer.from(await original.Body!.transformToByteArray());

    const webBuffer = await sharp(sourceBuffer)
      .resize({ width: 2048, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const thumbBuffer = await sharp(sourceBuffer)
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 70 })
      .toBuffer();

    const thumbS3Key = `${asset.orgId}/${asset.ownerType}/${asset.ownerId}/thumb_${uuidv4()}.jpg`;

    await Promise.all([
      this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: asset.s3Key,
          Body: webBuffer,
          ContentType: 'image/jpeg',
        }),
      ),
      this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: thumbS3Key,
          Body: thumbBuffer,
          ContentType: 'image/jpeg',
        }),
      ),
    ]);

    await this.prisma.fileAsset.update({
      where: { id: fileId },
      data: { status: 'LIVE', thumbS3Key, sizeBytes: webBuffer.length },
    });
  }

  async getSignedUrl(fileId: string, orgId: string): Promise<string> {
    const asset = await this.prisma.fileAsset.findFirst({
      where: { id: fileId, orgId, status: 'LIVE' },
    });
    if (!asset) throw new NotFoundException('File not found');

    const command = new GetObjectCommand({ Bucket: this.bucket, Key: asset.s3Key });
    return getSignedUrl(this.s3, command, { expiresIn: 900 });
  }

  async getThumbUrl(fileId: string, orgId: string): Promise<string | null> {
    const asset = await this.prisma.fileAsset.findFirst({
      where: { id: fileId, orgId, status: 'LIVE' },
    });
    if (!asset || !asset.thumbS3Key) return null;

    const command = new GetObjectCommand({ Bucket: this.bucket, Key: asset.thumbS3Key });
    return getSignedUrl(this.s3, command, { expiresIn: 900 });
  }

  async delete(fileId: string, orgId: string): Promise<void> {
    const asset = await this.prisma.fileAsset.findFirst({
      where: { id: fileId, orgId },
    });
    if (!asset) throw new NotFoundException('File not found');

    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: asset.s3Key }));
    if (asset.thumbS3Key) {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: asset.thumbS3Key }));
    }

    await this.prisma.fileAsset.update({
      where: { id: fileId },
      data: { status: 'DELETED' },
    });
  }

  async getByOwner(ownerId: string, ownerType: string, orgId: string) {
    return this.prisma.fileAsset.findMany({
      where: { ownerId, ownerType, orgId, status: 'LIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }
}
