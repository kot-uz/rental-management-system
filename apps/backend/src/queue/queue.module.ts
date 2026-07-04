import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { webhookBackoff } from './queue.constants';

/**
 * Global BullMQ wiring. Reads REDIS_URL (e.g. redis://:pass@host:6379) and
 * exposes the shared connection so any module can register its own queues.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379');
        return {
          redis: {
            host: url.hostname,
            port: Number(url.port || 6379),
            password: url.password || undefined,
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
          settings: {
            backoffStrategies: {
              // Webhook retry schedule from docs/api/webhooks.md §2.6.
              webhook: (attemptsMade: number) => webhookBackoff(attemptsMade),
            },
          },
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
