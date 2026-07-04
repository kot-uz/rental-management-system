import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { notFound } from '../../shared/errors/domain.error';
import {
  WEBHOOK_DELIVERY_QUEUE,
  WebhookJobs,
  DeliverWebhookJobData,
  WEBHOOK_MAX_ATTEMPTS,
} from '../../queue/queue.constants';

/** Public projection — never expose the signing secret on reads. */
const ENDPOINT_SELECT = {
  id: true,
  url: true,
  events: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue(WEBHOOK_DELIVERY_QUEUE)
    private deliveryQueue: Queue<DeliverWebhookJobData>,
  ) {}

  // ─── Registration CRUD ─────────────────────────────────────────────────────

  create(orgId: string, dto: CreateWebhookDto) {
    return this.prisma.webhookEndpoint.create({
      data: {
        orgId,
        url: dto.url,
        events: dto.events,
        secret: dto.secret,
        isActive: dto.active ?? true,
      },
      select: ENDPOINT_SELECT,
    });
  }

  findAll(orgId: string) {
    return this.prisma.webhookEndpoint.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: ENDPOINT_SELECT,
    });
  }

  async findOne(id: string, orgId: string) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({
      where: { id, orgId, deletedAt: null },
      select: ENDPOINT_SELECT,
    });
    if (!endpoint) throw notFound('WebhookEndpoint', id);
    return endpoint;
  }

  async update(id: string, orgId: string, dto: UpdateWebhookDto) {
    await this.findOne(id, orgId);
    return this.prisma.webhookEndpoint.update({
      where: { id },
      data: {
        ...(dto.url !== undefined && { url: dto.url }),
        ...(dto.events !== undefined && { events: dto.events }),
        ...(dto.secret !== undefined && { secret: dto.secret }),
        ...(dto.active !== undefined && { isActive: dto.active }),
      },
      select: ENDPOINT_SELECT,
    });
  }

  async remove(id: string, orgId: string): Promise<void> {
    await this.findOne(id, orgId);
    await this.prisma.webhookEndpoint.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async getDeliveries(id: string, orgId: string) {
    await this.findOne(id, orgId);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.prisma.webhookDelivery.findMany({
      where: { endpointId: id, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        eventId: true,
        eventType: true,
        status: true,
        attempts: true,
        responseStatus: true,
        error: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /** Sends a synthetic `ping` to a single endpoint to verify connectivity. */
  async test(id: string, orgId: string) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({
      where: { id, orgId, deletedAt: null },
    });
    if (!endpoint) throw notFound('WebhookEndpoint', id);
    const delivery = await this.enqueue(endpoint.id, orgId, 'ping', {
      message: 'This is a test event from RentManager.',
    });
    return { deliveryId: delivery.id, eventId: delivery.eventId };
  }

  // ─── Emission ───────────────────────────────────────────────────────────────

  /**
   * Fan-out a domain event to every active endpoint in the org subscribed to it.
   * Fire-and-forget: failures here must never break the originating request.
   */
  async dispatch(orgId: string, eventType: string, data: unknown): Promise<void> {
    try {
      const endpoints = await this.prisma.webhookEndpoint.findMany({
        where: { orgId, deletedAt: null, isActive: true, events: { has: eventType } },
        select: { id: true },
      });
      await Promise.all(
        endpoints.map((e) => this.enqueue(e.id, orgId, eventType, data)),
      );
    } catch (err) {
      this.logger.error(`dispatch(${eventType}) failed: ${(err as Error).message}`);
    }
  }

  private async enqueue(endpointId: string, orgId: string, eventType: string, data: unknown) {
    const eventId = `evt_${crypto.randomUUID()}`;
    const payload = {
      id: eventId,
      event: eventType,
      orgId,
      createdAt: new Date().toISOString(),
      data,
    };
    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        orgId,
        endpointId,
        eventId,
        eventType,
        payload: payload as unknown as Prisma.InputJsonValue,
        status: 'PENDING',
      },
    });
    await this.deliveryQueue.add(
      WebhookJobs.DELIVER,
      { deliveryId: delivery.id },
      { attempts: WEBHOOK_MAX_ATTEMPTS, backoff: { type: 'webhook' } },
    );
    return delivery;
  }

  // ─── Delivery (called by the processor) ──────────────────────────────────────

  /**
   * Performs one HTTP delivery attempt. Throws on non-2xx / timeout so Bull
   * retries per the webhook backoff schedule.
   */
  async deliver(deliveryId: string, attemptNumber: number): Promise<void> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { endpoint: true },
    });
    if (!delivery || delivery.status === 'SUCCESS') return;

    const raw = JSON.stringify(delivery.payload);
    const signature = crypto
      .createHmac('sha256', delivery.endpoint.secret)
      .update(raw)
      .digest('hex');

    let responseStatus: number | null = null;
    try {
      const res = await fetch(delivery.endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Id': delivery.eventId,
        },
        body: raw,
        signal: AbortSignal.timeout(10_000),
      });
      responseStatus = res.status;

      if (res.ok) {
        await this.prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: { status: 'SUCCESS', attempts: attemptNumber, responseStatus, error: null },
        });
        return;
      }
      throw new Error(`Non-2xx response: ${res.status}`);
    } catch (err) {
      const message = (err as Error).message;
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: { attempts: attemptNumber, responseStatus, error: message },
      });
      throw err;
    }
  }

  /** Dead-letter: called once Bull exhausts all retries. */
  async markFailed(deliveryId: string, error: string): Promise<void> {
    await this.prisma.webhookDelivery
      .update({ where: { id: deliveryId }, data: { status: 'FAILED', error } })
      .catch(() => undefined);
  }
}
