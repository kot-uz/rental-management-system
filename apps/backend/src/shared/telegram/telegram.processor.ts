import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { TelegramService } from './telegram.service';
import {
  TELEGRAM_QUEUE,
  TelegramJobs,
  SendTelegramJobData,
  TELEGRAM_MAX_ATTEMPTS,
} from '../../queue/queue.constants';

@Processor(TELEGRAM_QUEUE)
export class TelegramProcessor {
  private readonly logger = new Logger(TelegramProcessor.name);

  constructor(private readonly telegram: TelegramService) {}

  @Process(TelegramJobs.SEND)
  async handleSend(job: Job<SendTelegramJobData>): Promise<void> {
    await this.telegram.sendMessage(job.data.chatId, job.data.text);
  }

  @OnQueueFailed()
  onFailed(job: Job<SendTelegramJobData>, err: Error): void {
    if (job.attemptsMade >= TELEGRAM_MAX_ATTEMPTS) {
      this.logger.warn(
        `[telegram:failed] chatId=${job.data.chatId} after ${job.attemptsMade} attempts — ${err.message}. text="${job.data.text}"`,
      );
    } else {
      this.logger.warn(
        `[telegram:retry] chatId=${job.data.chatId} attempt ${job.attemptsMade} failed: ${err.message}`,
      );
    }
  }
}
