import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { LeasesService } from './leases.service';
import { PrismaService } from '../../prisma/prisma.service';

type LeaseRow = {
  id: string;
  orgId: string;
  depositBalance: number;
  depositSettledAt: Date | null;
};

function makePrisma(lease: LeaseRow | null) {
  const update = jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...lease, ...data }));
  return {
    prisma: {
      lease: {
        findFirst: jest.fn().mockResolvedValue(lease),
        update,
      },
    } as unknown as PrismaService,
    update,
  };
}

describe('LeasesService.settleDeposit', () => {
  const ORG = 'org-1';
  const base = (over: Partial<LeaseRow> = {}): LeaseRow => ({
    id: 'lease-1',
    orgId: ORG,
    depositBalance: 1000,
    depositSettledAt: null,
    ...over,
  });

  it('throws NotFound when the lease is missing', async () => {
    const { prisma } = makePrisma(null);
    const svc = new LeasesService(prisma);
    await expect(svc.settleDeposit('x', ORG, 0)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws Conflict when already settled', async () => {
    const { prisma } = makePrisma(base({ depositSettledAt: new Date() }));
    const svc = new LeasesService(prisma);
    await expect(svc.settleDeposit('lease-1', ORG, 500)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a negative return amount', async () => {
    const { prisma } = makePrisma(base());
    const svc = new LeasesService(prisma);
    await expect(svc.settleDeposit('lease-1', ORG, -1)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a return amount above the balance', async () => {
    const { prisma } = makePrisma(base({ depositBalance: 1000 }));
    const svc = new LeasesService(prisma);
    await expect(svc.settleDeposit('lease-1', ORG, 1001)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returnAmount 0 → FORFEITED', async () => {
    const { prisma, update } = makePrisma(base());
    const svc = new LeasesService(prisma);
    await svc.settleDeposit('lease-1', ORG, 0, 'kept for damages');
    expect(update.mock.calls[0][0].data).toMatchObject({
      depositStatus: 'FORFEITED',
      depositReturnedAmount: 0,
      depositSettlementNote: 'kept for damages',
    });
    expect(update.mock.calls[0][0].data.depositSettledAt).toBeInstanceOf(Date);
  });

  it('returnAmount === balance → RETURNED', async () => {
    const { prisma, update } = makePrisma(base({ depositBalance: 1000 }));
    const svc = new LeasesService(prisma);
    await svc.settleDeposit('lease-1', ORG, 1000);
    expect(update.mock.calls[0][0].data).toMatchObject({
      depositStatus: 'RETURNED',
      depositReturnedAmount: 1000,
    });
  });

  it('0 < returnAmount < balance → PARTIALLY_RETURNED', async () => {
    const { prisma, update } = makePrisma(base({ depositBalance: 1000 }));
    const svc = new LeasesService(prisma);
    await svc.settleDeposit('lease-1', ORG, 400);
    expect(update.mock.calls[0][0].data).toMatchObject({
      depositStatus: 'PARTIALLY_RETURNED',
      depositReturnedAmount: 400,
    });
  });

  it('handles a Prisma Decimal-like balance (coerced via Number)', async () => {
    // depositBalance often arrives as a Decimal; Number(...) must coerce it.
    const decimalLike = { toString: () => '1000', valueOf: () => 1000 } as unknown as number;
    const { prisma, update } = makePrisma(base({ depositBalance: decimalLike }));
    const svc = new LeasesService(prisma);
    await svc.settleDeposit('lease-1', ORG, 1000);
    expect(update.mock.calls[0][0].data.depositStatus).toBe('RETURNED');
  });
});
