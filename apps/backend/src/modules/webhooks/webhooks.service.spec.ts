import * as crypto from 'crypto';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Queue } from 'bull';

type Delivery = {
  id: string;
  status: string;
  eventId: string;
  payload: unknown;
  endpoint: { url: string; secret: string };
};

function buildService(delivery: Delivery | null) {
  const update = jest.fn().mockResolvedValue({});
  const prisma = {
    webhookDelivery: {
      findUnique: jest.fn().mockResolvedValue(delivery),
      update,
    },
  } as unknown as PrismaService;
  const queue = { add: jest.fn().mockResolvedValue({}) } as unknown as Queue;
  return { svc: new WebhooksService(prisma, queue), update };
}

const hmac = (secret: string, raw: string) =>
  crypto.createHmac('sha256', secret).update(raw).digest('hex');

const sampleDelivery = (over: Partial<Delivery> = {}): Delivery => ({
  id: 'del-1',
  status: 'PENDING',
  eventId: 'evt-1',
  payload: { event: 'repair.created', data: { id: 'r1' } },
  endpoint: { url: 'https://example.test/hook', secret: 's3cr3t' },
  ...over,
});

describe('WebhooksService.deliver', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  it('no-ops when the delivery is missing', async () => {
    const { svc, update } = buildService(null);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(svc.deliver('nope', 1)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('no-ops when the delivery already succeeded (idempotent)', async () => {
    const { svc, update } = buildService(sampleDelivery({ status: 'SUCCESS' }));
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    await svc.deliver('del-1', 2);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('signs the body with HMAC-SHA256 and marks SUCCESS on a 2xx response', async () => {
    const delivery = sampleDelivery();
    const { svc, update } = buildService(delivery);
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as unknown as typeof fetch;

    await svc.deliver('del-1', 1);

    const [url, opts] = fetchMock.mock.calls[0];
    const rawBody = JSON.stringify(delivery.payload);
    expect(url).toBe('https://example.test/hook');
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe(rawBody);
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(opts.headers['X-Webhook-Id']).toBe('evt-1');
    expect(opts.headers['X-Webhook-Signature']).toBe(`sha256=${hmac('s3cr3t', rawBody)}`);

    expect(update.mock.calls[0][0].data).toMatchObject({
      status: 'SUCCESS',
      attempts: 1,
      responseStatus: 200,
      error: null,
    });
  });

  it('records the attempt/error and re-throws on a non-2xx response (lets Bull retry)', async () => {
    const { svc, update } = buildService(sampleDelivery());
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(svc.deliver('del-1', 3)).rejects.toThrow(/Non-2xx response: 500/);

    const data = update.mock.calls[0][0].data;
    expect(data).toMatchObject({ attempts: 3, responseStatus: 500 });
    expect(data.error).toMatch(/Non-2xx response: 500/);
    expect(data.status).toBeUndefined(); // stays PENDING — a retry is scheduled
  });

  it('records a transport error (no response status) and re-throws on network failure', async () => {
    const { svc, update } = buildService(sampleDelivery());
    const fetchMock = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(svc.deliver('del-1', 1)).rejects.toThrow(/ECONNREFUSED/);
    const data = update.mock.calls[0][0].data;
    expect(data).toMatchObject({ attempts: 1, responseStatus: null });
    expect(data.error).toMatch(/ECONNREFUSED/);
  });
});

describe('WebhooksService.markFailed (dead-letter)', () => {
  it('flips the delivery to FAILED with the error', async () => {
    const { svc, update } = buildService(sampleDelivery());
    await svc.markFailed('del-1', 'exhausted retries');
    expect(update.mock.calls[0][0]).toMatchObject({
      where: { id: 'del-1' },
      data: { status: 'FAILED', error: 'exhausted retries' },
    });
  });

  it('swallows update errors so the failed-hook handler never throws', async () => {
    const update = jest.fn().mockRejectedValue(new Error('db down'));
    const prisma = { webhookDelivery: { update } } as unknown as PrismaService;
    const svc = new WebhooksService(prisma, { add: jest.fn() } as unknown as Queue);
    await expect(svc.markFailed('del-1', 'boom')).resolves.toBeUndefined();
  });
});
