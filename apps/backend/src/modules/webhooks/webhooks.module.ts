import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { WebhookDeliveryProcessor } from './webhook-delivery.processor';
import { WEBHOOK_DELIVERY_QUEUE } from '../../queue/queue.constants';

/**
 * Global so domain services (rent, repairs, …) can inject WebhooksService and
 * emit events without importing this module everywhere.
 */
@Global()
@Module({
  imports: [BullModule.registerQueue({ name: WEBHOOK_DELIVERY_QUEUE })],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookDeliveryProcessor],
  exports: [WebhooksService],
})
export class WebhooksModule {}
