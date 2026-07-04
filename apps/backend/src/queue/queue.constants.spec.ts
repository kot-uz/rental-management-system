import { webhookBackoff, WEBHOOK_BACKOFF_MS, WEBHOOK_MAX_ATTEMPTS } from './queue.constants';

describe('webhookBackoff (docs/api/webhooks.md §2.6 schedule)', () => {
  it('matches the documented schedule: 5s, 30s, 5m, 30m, 2h, 6h, 24h', () => {
    expect(WEBHOOK_BACKOFF_MS).toEqual([
      5_000, // 5s
      30_000, // 30s
      300_000, // 5m
      1_800_000, // 30m
      7_200_000, // 2h
      21_600_000, // 6h
      86_400_000, // 24h
    ]);
  });

  it('is 1-based: attempt 1 → first delay', () => {
    expect(webhookBackoff(1)).toBe(5_000);
    expect(webhookBackoff(2)).toBe(30_000);
    expect(webhookBackoff(7)).toBe(86_400_000);
  });

  it('clamps past-the-end attempts to the final (24h) delay rather than 0', () => {
    expect(webhookBackoff(8)).toBe(86_400_000);
    expect(webhookBackoff(99)).toBe(86_400_000);
  });

  it('has one delay per non-final attempt (max attempts = schedule length)', () => {
    expect(WEBHOOK_MAX_ATTEMPTS).toBe(WEBHOOK_BACKOFF_MS.length);
  });
});
