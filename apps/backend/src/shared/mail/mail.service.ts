import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as nodemailer from 'nodemailer';
import {
  MAIL_QUEUE,
  MailJobs,
  SendMailJobData,
  MAIL_MAX_ATTEMPTS,
} from '../../queue/queue.constants';

/**
 * Nodemailer wrapper. In dev it targets MailHog; in prod a real SMTP relay.
 * Public methods enqueue onto the `mail` BullMQ queue so transactional flows
 * never block on SMTP; MailProcessor performs the actual delivery with retries.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter?: nodemailer.Transporter;
  private from = 'noreply@rental.local';

  constructor(
    private readonly config: ConfigService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue<SendMailJobData>,
  ) {}

  onModuleInit(): void {
    const host = this.config.get<string>('SMTP_HOST');
    const port = parseInt(this.config.get<string>('SMTP_PORT') ?? '1025', 10);
    this.from = this.config.get<string>('SMTP_FROM') ?? this.from;
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!host) {
      this.logger.warn('SMTP_HOST not configured — emails will be logged only.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
  }

  async sendPasswordReset(to: string, resetLink: string): Promise<void> {
    const subject = 'Reset your password';
    const html = `
      <p>We received a request to reset your password.</p>
      <p><a href="${resetLink}">Click here to choose a new password</a>. This link expires in 1 hour.</p>
      <p>If you did not request this, you can safely ignore this email.</p>`;
    await this.enqueue(to, subject, html, `Reset your password: ${resetLink}`);
  }

  /** Queue an email for asynchronous delivery. */
  private async enqueue(to: string, subject: string, html: string, text: string): Promise<void> {
    await this.mailQueue.add(
      MailJobs.SEND,
      { to, subject, html, text },
      { attempts: MAIL_MAX_ATTEMPTS, backoff: { type: 'exponential', delay: 5_000 } },
    );
  }

  /**
   * Actual SMTP delivery — invoked by MailProcessor only. Throws on failure so
   * Bull retries; the processor logs the fallback once retries are exhausted.
   */
  async deliver({ to, subject, html, text }: SendMailJobData): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[mail:logged] to=${to} subject="${subject}" ${text}`);
      return;
    }
    await this.transporter.sendMail({ from: this.from, to, subject, html, text });
    this.logger.log(`[mail:sent] to=${to} subject="${subject}"`);
  }
}
