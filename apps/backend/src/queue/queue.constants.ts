/** BullMQ queue + job name constants. Centralised so producers and processors
 * can't drift on string literals. */
export const FILE_PROCESSING_QUEUE = 'file-processing';

export const FileJobs = {
  PROCESS_IMAGE: 'process-image',
} as const;

export interface ProcessImageJobData {
  fileId: string;
}

export const WEBHOOK_DELIVERY_QUEUE = 'webhook-delivery';

export const WebhookJobs = {
  DELIVER: 'deliver',
} as const;

export interface DeliverWebhookJobData {
  deliveryId: string;
}

/**
 * Retry schedule for webhook deliveries (docs/api/webhooks.md §2.6):
 * 5s, 30s, 5min, 30min, 2h, 6h, 24h — 7 attempts, then dead-letter (FAILED).
 * Indexed by attemptsMade (1 = delay before the 1st retry).
 */
export const WEBHOOK_BACKOFF_MS = [5_000, 30_000, 300_000, 1_800_000, 7_200_000, 21_600_000, 86_400_000];
export const WEBHOOK_MAX_ATTEMPTS = 7;

/**
 * Delay (ms) before the next webhook retry. `attemptsMade` is 1-based (1 = the
 * delay before the first retry). Clamps to the last schedule entry for any
 * attempt beyond the table so late retries don't fall back to 0.
 */
export function webhookBackoff(attemptsMade: number): number {
  return WEBHOOK_BACKOFF_MS[attemptsMade - 1] ?? WEBHOOK_BACKOFF_MS[WEBHOOK_BACKOFF_MS.length - 1];
}

export const MAIL_QUEUE = 'mail';

export const MailJobs = {
  SEND: 'send',
} as const;

export interface SendMailJobData {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export const MAIL_MAX_ATTEMPTS = 3;

export const TELEGRAM_QUEUE = 'telegram';

export const TelegramJobs = {
  SEND: 'send',
} as const;

export interface SendTelegramJobData {
  chatId: string;
  text: string;
}

export const TELEGRAM_MAX_ATTEMPTS = 3;
