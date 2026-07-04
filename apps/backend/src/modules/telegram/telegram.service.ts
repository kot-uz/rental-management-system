import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { TelegramService } from '../../shared/telegram/telegram.service';

export type LinkSubjectType = 'tenant' | 'user';

/**
 * Owns the Telegram chat_id binding flow. Because the Bot API can't message a
 * user by @username, each tenant/owner must press Start in the bot once. We hand
 * out a one-time deep link (`t.me/<bot>?start=<token>`); a long-poll loop watches
 * for the matching `/start <token>` and stores `message.chat.id` on the subject.
 */
@Injectable()
export class TelegramLinkService {
  private readonly logger = new Logger(TelegramLinkService.name);
  private offset = 0;
  private polling = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  /**
   * Creates a one-time link token for a tenant/user and returns the bot deep
   * link. `configured` is false when the bot env isn't set, so the UI can warn
   * instead of opening a broken link.
   */
  async createLink(orgId: string, subjectType: LinkSubjectType, subjectId: string) {
    await this.assertSubjectInOrg(orgId, subjectType, subjectId);

    const token = randomBytes(16).toString('hex');
    await this.prisma.telegramLinkToken.create({
      data: { orgId, subjectType, subjectId, token },
    });

    const username = this.telegram.botUsername;
    return {
      configured: this.telegram.isConfigured() && Boolean(username),
      url: username ? `https://t.me/${username}?start=${token}` : null,
      token,
    };
  }

  /** Linked-status flags for the current user (and optionally a tenant). */
  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    });
    return {
      botConfigured: this.telegram.isConfigured(),
      linked: Boolean(user?.telegramChatId),
    };
  }

  private async assertSubjectInOrg(orgId: string, type: LinkSubjectType, id: string): Promise<void> {
    if (type === 'tenant') {
      const t = await this.prisma.tenant.findFirst({ where: { id, orgId, deletedAt: null } });
      if (!t) throw new NotFoundException('Tenant not found');
    } else {
      const u = await this.prisma.user.findFirst({ where: { id, orgId, deletedAt: null } });
      if (!u) throw new NotFoundException('User not found');
    }
  }

  /**
   * Long-poll Telegram for `/start <token>` messages and bind chat ids. Runs on
   * a single backend instance; a re-entrancy guard prevents overlapping polls.
   * No-op until the bot token is configured.
   */
  @Interval(5000)
  async poll(): Promise<void> {
    if (this.polling || !this.telegram.isConfigured()) return;
    this.polling = true;
    try {
      const updates = await this.telegram.getUpdates(this.offset);
      for (const u of updates) {
        this.offset = u.update_id + 1;
        const text = u.message?.text;
        const chatId = u.message?.chat?.id;
        if (!text || chatId == null) continue;
        if (text.startsWith('/start')) {
          await this.handleStart(text, String(chatId));
        }
      }
    } catch (err) {
      this.logger.warn(`Telegram poll failed: ${(err as Error).message}`);
    } finally {
      this.polling = false;
    }
  }

  private async handleStart(text: string, chatId: string): Promise<void> {
    const token = text.split(/\s+/)[1];
    if (!token) {
      await this.telegram.sendMessage(chatId, 'Please open the invite link from the app to connect.');
      return;
    }

    const link = await this.prisma.telegramLinkToken.findUnique({ where: { token } });
    if (!link || link.usedAt) {
      await this.telegram.sendMessage(chatId, 'This link is invalid or already used.');
      return;
    }

    if (link.subjectType === 'tenant') {
      await this.prisma.tenant.update({ where: { id: link.subjectId }, data: { telegramChatId: chatId } });
    } else {
      await this.prisma.user.update({ where: { id: link.subjectId }, data: { telegramChatId: chatId } });
    }
    await this.prisma.telegramLinkToken.update({ where: { token }, data: { usedAt: new Date() } });

    await this.telegram.sendMessage(
      chatId,
      '✅ Connected. You will now receive rent reminders here.',
    );
    this.logger.log(`Linked ${link.subjectType}:${link.subjectId} to chatId=${chatId}`);
  }
}
