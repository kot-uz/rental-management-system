/** Catalogue of emittable outbound-webhook events (docs/api/webhooks.md §2.2). */
export const WEBHOOK_EVENTS = [
  'rent.payment.created',
  'rent.payment.voided',
  'rent.period.overdue',
  'lease.created',
  'lease.ended',
  'repair.created',
  'repair.resolved',
  'document.expiring',
  'file.processed',
  'export.ready',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
