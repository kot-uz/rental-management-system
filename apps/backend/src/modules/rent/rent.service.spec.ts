import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RentService } from './rent.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { AccountingService } from '../accounting/accounting.service';

type PeriodRow = {
  id: string;
  orgId: string;
  leaseId: string;
  status: string;
  paidAmount: number;
  expectedAmount: number;
};

function build(period: PeriodRow | null, opts: { assertThrows?: Error } = {}) {
  const paymentCreate = jest
    .fn()
    .mockImplementation(({ data }) => Promise.resolve({ id: 'pay-1', method: data.method, paymentDate: data.paymentDate }));
  const periodUpdate = jest.fn().mockResolvedValue({});
  const tx = { payment: { create: paymentCreate }, rentPeriod: { update: periodUpdate } };

  const prisma = {
    rentPeriod: { findFirst: jest.fn().mockResolvedValue(period) },
    $transaction: jest.fn().mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx)),
  } as unknown as PrismaService;

  const dispatch = jest.fn().mockResolvedValue(undefined);
  const webhooks = { dispatch } as unknown as WebhooksService;

  const assertNotLocked = opts.assertThrows
    ? jest.fn().mockRejectedValue(opts.assertThrows)
    : jest.fn().mockResolvedValue(undefined);
  const accounting = { assertNotLocked } as unknown as AccountingService;

  return {
    svc: new RentService(prisma, webhooks, accounting),
    paymentCreate,
    periodUpdate,
    dispatch,
    assertNotLocked,
  };
}

const period = (over: Partial<PeriodRow> = {}): PeriodRow => ({
  id: 'rp-1',
  orgId: 'org-1',
  leaseId: 'lease-1',
  status: 'UNPAID',
  paidAmount: 0,
  expectedAmount: 1000,
  ...over,
});

const dto = (amount: number) => ({ amount, paymentDate: '2026-06-15', method: 'CASH' as const });

describe('RentService.recordPayment', () => {
  it('throws NotFound when the period is missing (and never touches the lock guard)', async () => {
    const { svc, assertNotLocked } = build(null);
    await expect(svc.recordPayment('rp-x', 'org-1', 'u1', dto(100))).rejects.toBeInstanceOf(NotFoundException);
    expect(assertNotLocked).not.toHaveBeenCalled();
  });

  it('rejects a payment against a VOIDED period', async () => {
    const { svc } = build(period({ status: 'VOIDED' }));
    await expect(svc.recordPayment('rp-1', 'org-1', 'u1', dto(100))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('propagates the locked-period error before creating any payment', async () => {
    const locked = new Error('period locked');
    const { svc, paymentCreate, dispatch } = build(period(), { assertThrows: locked });
    await expect(svc.recordPayment('rp-1', 'org-1', 'u1', dto(100))).rejects.toBe(locked);
    expect(paymentCreate).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('marks the period PAID when the payment clears the expected amount', async () => {
    const { svc, periodUpdate } = build(period({ expectedAmount: 1000, paidAmount: 0 }));
    await svc.recordPayment('rp-1', 'org-1', 'u1', dto(1000));
    expect(periodUpdate.mock.calls[0][0].data).toMatchObject({ status: 'PAID', paidAmount: 1000 });
    expect(periodUpdate.mock.calls[0][0].data.version).toEqual({ increment: 1 });
  });

  it('marks the period PARTIAL when some but not all is paid (accumulates prior paidAmount)', async () => {
    const { svc, periodUpdate } = build(period({ expectedAmount: 1000, paidAmount: 200 }));
    await svc.recordPayment('rp-1', 'org-1', 'u1', dto(300));
    expect(periodUpdate.mock.calls[0][0].data).toMatchObject({ status: 'PARTIAL', paidAmount: 500 });
  });

  it('keeps the existing status for a zero-amount payment', async () => {
    const { svc, periodUpdate } = build(period({ status: 'OVERDUE', expectedAmount: 1000, paidAmount: 0 }));
    await svc.recordPayment('rp-1', 'org-1', 'u1', dto(0));
    expect(periodUpdate.mock.calls[0][0].data.status).toBe('OVERDUE');
  });

  it('dispatches rent.payment.created with minor-unit amounts and the new status', async () => {
    const { svc, dispatch } = build(period({ expectedAmount: 1000, paidAmount: 200 }));
    await svc.recordPayment('rp-1', 'org-1', 'u1', dto(300));
    expect(dispatch).toHaveBeenCalledWith('org-1', 'rent.payment.created', expect.objectContaining({
      paymentId: 'pay-1',
      rentPeriodId: 'rp-1',
      leaseId: 'lease-1',
      amountMinor: 30000,
      paidMinor: 50000,
      balanceMinor: 50000,
      rentPeriodStatus: 'PARTIAL',
    }));
  });

  it('clamps the reported balance to zero on an overpayment', async () => {
    const { svc, dispatch } = build(period({ expectedAmount: 1000, paidAmount: 0 }));
    await svc.recordPayment('rp-1', 'org-1', 'u1', dto(1500));
    const payload = dispatch.mock.calls[0][2];
    expect(payload.rentPeriodStatus).toBe('PAID');
    expect(payload.balanceMinor).toBe(0);
  });
});
