import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  TELEGRAM_QUEUE,
  TelegramJobs,
  SendTelegramJobData,
  TELEGRAM_MAX_ATTEMPTS,
} from '../../queue/queue.constants';

/** A single update from Telegram's getUpdates long-polling endpoint. */
export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number; type: string; username?: string; first_name?: string };
  };
}

/**
 * Low-level Telegram Bot API wrapper, mirroring MailService. Reminder messages
 * are enqueued onto the `telegram` BullMQ queue so business flows never block on
 * the network; TelegramProcessor performs delivery with retries. Direct sends
 * (e.g. the `/start` link confirmation) and long-poll reads go through the
 * `sendMessage` / `getUpdates` helpers. With no `TELEGRAM_BOT_TOKEN` configured
 * the service degrades to logging only (like SMTP-less mail).
 */
@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private token?: string;
  private botUsernameValue?: string;

  constructor(
    private readonly config: ConfigService,
    @InjectQueue(TELEGRAM_QUEUE) private readonly queue: Queue<SendTelegramJobData>,
  ) {}

  onModuleInit(): void {
    this.token = this.config.get<string>('TELEGRAM_BOT_TOKEN') || undefined;
    this.botUsernameValue = this.config.get<string>('TELEGRAM_BOT_USERNAME') || undefined;
    if (!this.token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured — Telegram messages will be logged only.');
    }
  }

  isConfigured(): boolean {
    return Boolean(this.token);
  }

  get botUsername(): string | undefined {
    return this.botUsernameValue;
  }

  /** Queue a message for asynchronous, retried delivery. */
  async enqueue(chatId: string, text: string): Promise<void> {
    await this.queue.add(
      TelegramJobs.SEND,
      { chatId, text },
      { attempts: TELEGRAM_MAX_ATTEMPTS, backoff: { type: 'exponential', delay: 5_000 } },
    );
  }

  /**
   * Direct Bot API sendMessage. Used by the queue processor and for instant
   * link confirmations. Throws on transport/API error so Bull can retry.
   */
  async sendMessage(chatId: string, text: string): Promise<void> {
    if (!this.token) {
      this.logger.log(`[telegram:logged] chatId=${chatId} text="${text}"`);
      return;
    }
    const res = await this.api('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });
    if (!res.ok) {
      throw new Error(`Telegram sendMessage failed: ${res.status} ${await res.text()}`);
    }
    this.logger.log(`[telegram:sent] chatId=${chatId}`);
  }

  /** Long-poll for updates since `offset`. Returns [] when unconfigured. */
  async getUpdates(offset: number, timeoutSec = 25): Promise<TelegramUpdate[]> {
    if (!this.token) return [];
    const res = await this.api('getUpdates', {
      offset,
      timeout: timeoutSec,
      allowed_updates: ['message'],
    });
    if (!res.ok) {
      throw new Error(`Telegram getUpdates failed: ${res.status}`);
    }
    const body = (await res.json()) as { ok: boolean; result: TelegramUpdate[] };
    return body.ok ? body.result : [];
  }

  private api(method: string, payload: unknown): Promise<Response> {
    return fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
}
