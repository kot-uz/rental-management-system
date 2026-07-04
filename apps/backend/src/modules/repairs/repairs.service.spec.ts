import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RepairStatus } from '@prisma/client';
import { RepairsService } from './repairs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { TagsService } from '../tags/tags.service';

function build(opts: {
  apartment?: unknown;
  repairCreate?: jest.Mock;
  repairUpdate?: jest.Mock;
} = {}) {
  const repairCreate =
    opts.repairCreate ??
    jest.fn().mockResolvedValue({
      id: 'rep-1',
      apartmentId: 'apt-1',
      title: 'Leak',
      severity: 'HIGH',
      status: 'OPEN',
      createdAt: new Date('2026-06-01T00:00:00Z'),
    });
  const repairUpdate = opts.repairUpdate ?? jest.fn().mockImplementation(({ data }) =>
    Promise.resolve({ id: 'rep-1', apartmentId: 'apt-1', title: 'Leak', costActual: null, ...data }),
  );
  const apartment = 'apartment' in opts ? opts.apartment : { id: 'apt-1' };
  const prisma = {
    apartment: { findFirst: jest.fn().mockResolvedValue(apartment) },
    repair: { create: repairCreate, update: repairUpdate },
  } as unknown as PrismaService;

  const dispatch = jest.fn().mockResolvedValue(undefined);
  const webhooks = { dispatch } as unknown as WebhooksService;
  const tags = {} as unknown as TagsService;

  return { svc: new RepairsService(prisma, webhooks, tags), repairCreate, repairUpdate, dispatch };
}

describe('RepairsService.create', () => {
  it('throws NotFound when the apartment does not exist', async () => {
    const { svc, repairCreate } = build({ apartment: null });
    await expect(svc.create('org-1', { apartmentId: 'nope', title: 'x' } as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repairCreate).not.toHaveBeenCalled();
  });

  it('creates the repair and dispatches repair.created', async () => {
    const { svc, dispatch } = build();
    await svc.create('org-1', { apartmentId: 'apt-1', title: 'Leak' } as never);
    expect(dispatch).toHaveBeenCalledWith('org-1', 'repair.created', expect.objectContaining({
      repairId: 'rep-1',
      apartmentId: 'apt-1',
      title: 'Leak',
      status: 'OPEN',
    }));
  });
});

describe('RepairsService.transition', () => {
  const spyFindOne = (svc: RepairsService, status: RepairStatus) =>
    jest.spyOn(svc, 'findOne').mockResolvedValue({ id: 'rep-1', status } as never);

  it('rejects an illegal transition (OPEN → COMPLETED) without updating', async () => {
    const { svc, repairUpdate } = build();
    spyFindOne(svc, 'OPEN');
    await expect(svc.transition('rep-1', 'org-1', 'COMPLETED')).rejects.toBeInstanceOf(BadRequestException);
    expect(repairUpdate).not.toHaveBeenCalled();
  });

  it('rejects any transition out of a terminal state (COMPLETED)', async () => {
    const { svc } = build();
    spyFindOne(svc, 'COMPLETED');
    await expect(svc.transition('rep-1', 'org-1', 'IN_PROGRESS')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('IN_PROGRESS → COMPLETED sets completedAt and dispatches repair.resolved', async () => {
    const repairUpdate = jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({ id: 'rep-1', apartmentId: 'apt-1', title: 'Leak', costActual: 250, ...data }),
    );
    const { svc, dispatch } = build({ repairUpdate });
    spyFindOne(svc, 'IN_PROGRESS');
    await svc.transition('rep-1', 'org-1', 'COMPLETED');
    expect(repairUpdate.mock.calls[0][0].data.status).toBe('COMPLETED');
    expect(repairUpdate.mock.calls[0][0].data.completedAt).toBeInstanceOf(Date);
    expect(dispatch).toHaveBeenCalledWith('org-1', 'repair.resolved', expect.objectContaining({
      repairId: 'rep-1',
      actualCostMinor: 25000, // 250 * 100
    }));
  });

  it('reports a null actual cost as null in repair.resolved', async () => {
    const { svc, dispatch } = build(); // default repairUpdate keeps costActual: null
    spyFindOne(svc, 'WAITING');
    await svc.transition('rep-1', 'org-1', 'COMPLETED');
    expect(dispatch.mock.calls[0][2]).toMatchObject({ actualCostMinor: null });
  });

  it('IN_PROGRESS → CANCELED sets canceledAt and does NOT dispatch repair.resolved', async () => {
    const { svc, repairUpdate, dispatch } = build();
    spyFindOne(svc, 'IN_PROGRESS');
    await svc.transition('rep-1', 'org-1', 'CANCELED');
    expect(repairUpdate.mock.calls[0][0].data.canceledAt).toBeInstanceOf(Date);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
