import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { WebhooksService } from './webhooks.service';
import {
  WEBHOOK_DELIVERY_QUEUE,
  WebhookJobs,
  DeliverWebhookJobData,
  WEBHOOK_MAX_ATTEMPTS,
} from '../../queue/queue.constants';

@Processor(WEBHOOK_DELIVERY_QUEUE)
export class WebhookDeliveryProcessor {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);

  constructor(private readonly webhooks: WebhooksService) {}

  @Process(WebhookJobs.DELIVER)
  async handleDeliver(job: Job<DeliverWebhookJobData>): Promise<void> {
    await this.webhooks.deliver(job.data.deliveryId, job.attemptsMade + 1);
  }

  @OnQueueFailed()
  async onFailed(job: Job<DeliverWebhookJobData>, err: Error): Promise<void> {
    // attemptsMade is incremented before this fires; at the cap it's terminal.
    if (job.attemptsMade >= WEBHOOK_MAX_ATTEMPTS) {
      this.logger.error(
        `Webhook delivery ${job.data.deliveryId} dead-lettered after ${job.attemptsMade} attempts: ${err.message}`,
      );
      await this.webhooks.markFailed(job.data.deliveryId, err.message);
    } else {
      this.logger.warn(
        `Webhook delivery ${job.data.deliveryId} attempt ${job.attemptsMade} failed; will retry: ${err.message}`,
      );
    }
  }
}
