import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { MailService } from './mail.service';
import {
  MAIL_QUEUE,
  MailJobs,
  SendMailJobData,
  MAIL_MAX_ATTEMPTS,
} from '../../queue/queue.constants';

@Processor(MAIL_QUEUE)
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mail: MailService) {}

  @Process(MailJobs.SEND)
  async handleSend(job: Job<SendMailJobData>): Promise<void> {
    await this.mail.deliver(job.data);
  }

  @OnQueueFailed()
  onFailed(job: Job<SendMailJobData>, err: Error): void {
    if (job.attemptsMade >= MAIL_MAX_ATTEMPTS) {
      // Dead-letter: SMTP exhausted retries — fall back to logging so the
      // content (e.g. a reset link) isn't lost.
      this.logger.warn(
        `[mail:failed] to=${job.data.to} subject="${job.data.subject}" after ${job.attemptsMade} attempts — ${err.message}. ${job.data.text}`,
      );
    } else {
      this.logger.warn(
        `[mail:retry] to=${job.data.to} attempt ${job.attemptsMade} failed: ${err.message}`,
      );
    }
  }
}
