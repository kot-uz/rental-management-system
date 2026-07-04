import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import * as dayjs from 'dayjs';
import { NotificationsGateway } from './notifications.gateway';
import { TelegramService } from '../../shared/telegram/telegram.service';
import { buildRentReminderMessage, RentReminderPhase } from './rent-reminder.messages';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
    private telegram: TelegramService,
  ) {}

  /**
   * Idempotent create. On a genuinely new notification it pushes a
   * `notification:new` event to the recipient's socket room; idempotent
   * re-runs (same key) return the existing row without re-emitting.
   */
  async create(params: {
    orgId: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    refType?: string;
    refId?: string;
    idempotencyKey: string;
  }) {
    const existing = await this.prisma.notification.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) return existing;

    const created = await this.prisma.notification.create({ data: params });
    this.gateway.emitToUser(params.userId, 'notification:new', {
      id: created.id,
      type: created.type,
      title: created.title,
    });
    return created;
  }

  async findForUser(userId: string, orgId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, orgId, ...(unreadOnly && { isRead: false }) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(id: string, userId: string): Promise<void> {
    const n = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!n) throw new NotFoundException('Notification not found');
    await this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
    this.gateway.emitToUser(userId, 'notifications:updated', { type: 'read', notificationId: id });
  }

  async markAllRead(userId: string, orgId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, orgId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    this.gateway.emitToUser(userId, 'notifications:updated', { type: 'read_all' });
  }

  async getUnreadCount(userId: string, orgId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, orgId, isRead: false } });
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendLeaseExpiryAlerts(): Promise<void> {
    const thirtyDaysFromNow = dayjs().add(30, 'day').toDate();
    const today = dayjs().toDate();

    const expiringLeases = await this.prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lte: thirtyDaysFromNow, gte: today },
      },
      include: {
        org: { select: { id: true } },
        parties: {
          where: { isPrimary: true },
          include: { tenant: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    const owners = await this.prisma.user.findMany({
      where: {
        role: 'OWNER',
        deletedAt: null,
        isActive: true,
        orgId: { in: expiringLeases.map((l) => l.orgId) },
      },
    });

    for (const lease of expiringLeases) {
      const daysLeft = dayjs(lease.endDate).diff(dayjs(), 'day');
      const orgOwners = owners.filter((u) => u.orgId === lease.orgId);
      const tenant = lease.parties[0]?.tenant;

      for (const owner of orgOwners) {
        const key = `lease_expiry:${lease.id}:${dayjs().format('YYYY-MM')}`;
        await this.create({
          orgId: lease.orgId,
          userId: owner.id,
          type: 'LEASE_EXPIRING',
          title: 'Lease expiring soon',
          body: `Lease for ${tenant?.firstName ?? 'tenant'} ${tenant?.lastName ?? ''} expires in ${daysLeft} days`,
          refType: 'lease',
          refId: lease.id,
          idempotencyKey: key,
        });
      }
    }
  }

  /**
   * Daily rent reminders. For each unpaid/partial/overdue period whose due date
   * is 3 days out, today, or already past, notify the primary tenant (Telegram)
   * and org owners (in-app + Telegram). Phases: REMINDER_3D / DUE_TODAY /
   * OVERDUE. Telegram delivery is gated by RentReminderLog so re-runs and the
   * recurring overdue state never spam; owner in-app dedups via idempotencyKey.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendRentReminders(): Promise<void> {
    const today = dayjs().startOf('day');
    const windowEnd = today.add(3, 'day').endOf('day').toDate();

    const periods = await this.prisma.rentPeriod.findMany({
      where: {
        status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
        dueDate: { lte: windowEnd },
      },
      include: {
        lease: {
          include: {
            apartment: { select: { address: true, unitNumber: true } },
            parties: {
              where: { isPrimary: true },
              include: {
                tenant: {
                  select: { id: true, firstName: true, lastName: true, telegramChatId: true },
                },
              },
            },
          },
        },
      },
    });
    if (periods.length === 0) return;

    const orgIds = [...new Set(periods.map((p) => p.orgId))];
    const [owners, orgs] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: 'OWNER', deletedAt: null, isActive: true, orgId: { in: orgIds } },
        select: { id: true, orgId: true, telegramChatId: true },
      }),
      this.prisma.org.findMany({
        where: { id: { in: orgIds } },
        select: { id: true, currency: true, locale: true },
      }),
    ]);
    const orgById = new Map(orgs.map((o) => [o.id, o]));

    for (const period of periods) {
      const due = dayjs(period.dueDate).startOf('day');
      const diff = due.diff(today, 'day');
      let phase: RentReminderPhase | null = null;
      if (diff === 3) phase = 'REMINDER_3D';
      else if (diff === 0) phase = 'DUE_TODAY';
      else if (diff < 0) phase = 'OVERDUE';
      if (!phase) continue;

      const org = orgById.get(period.orgId);
      const locale = org?.locale ?? 'en';
      const currency = org?.currency ?? 'USD';
      const tenant = period.lease.parties[0]?.tenant;
      const apt = period.lease.apartment;
      const ctx = {
        tenantName: tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Tenant',
        apartment: apt ? `${apt.address}${apt.unitNumber ? ` · ${apt.unitNumber}` : ''}` : '—',
        amount: `${Number(period.expectedAmount).toFixed(2)} ${currency}`,
        dueDate: due.format('YYYY-MM-DD'),
        daysOverdue: diff < 0 ? -diff : 0,
      };

      // Tenant → Telegram only (tenants have no in-app account).
      if (tenant?.telegramChatId) {
        const msg = buildRentReminderMessage(locale, phase, 'tenant', ctx);
        await this.dispatchTelegram(
          period.orgId,
          period.id,
          phase,
          `tenant:${tenant.id}`,
          tenant.telegramChatId,
          `${msg.title}\n${msg.body}`,
        );
      }

      // Owners → in-app + Telegram.
      const orgOwners = owners.filter((u) => u.orgId === period.orgId);
      const ownerMsg = buildRentReminderMessage(locale, phase, 'owner', ctx);
      for (const owner of orgOwners) {
        await this.create({
          orgId: period.orgId,
          userId: owner.id,
          type: phase === 'OVERDUE' ? 'RENT_OVERDUE' : 'RENT_DUE',
          title: ownerMsg.title,
          body: ownerMsg.body,
          refType: 'rentPeriod',
          refId: period.id,
          idempotencyKey: `rent_${phase}:${period.id}`,
        });
        if (owner.telegramChatId) {
          await this.dispatchTelegram(
            period.orgId,
            period.id,
            phase,
            `user:${owner.id}`,
            owner.telegramChatId,
            `${ownerMsg.title}\n${ownerMsg.body}`,
          );
        }
      }
    }
  }

  /**
   * Sends one Telegram reminder, guarded by a unique RentReminderLog row so the
   * same (period, phase, target) is never delivered twice. Returns silently if
   * already sent.
   */
  private async dispatchTelegram(
    orgId: string,
    rentPeriodId: string,
    phase: RentReminderPhase,
    target: string,
    chatId: string,
    text: string,
  ): Promise<void> {
    try {
      await this.prisma.rentReminderLog.create({
        data: { orgId, rentPeriodId, phase, target },
      });
    } catch {
      // Unique conflict → already sent for this (period, phase, target).
      return;
    }
    await this.telegram.enqueue(chatId, text);
  }
}
