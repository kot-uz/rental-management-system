export type RentReminderPhase = 'REMINDER_3D' | 'DUE_TODAY' | 'OVERDUE';
export type RentReminderAudience = 'tenant' | 'owner';

export interface RentReminderContext {
  tenantName: string;
  apartment: string;
  amount: string; // already formatted, e.g. "1200.00 USD"
  dueDate: string; // e.g. "2026-06-05"
  daysOverdue: number; // >0 only for OVERDUE
}

type Locale = 'en' | 'ru' | 'uz';

/**
 * Short localized rent-reminder templates. Returns `{ title, body }` so the same
 * builder feeds both in-app notifications (owner) and Telegram (tenant + owner).
 * Falls back to English for any unknown locale.
 */
export function buildRentReminderMessage(
  locale: string,
  phase: RentReminderPhase,
  audience: RentReminderAudience,
  ctx: RentReminderContext,
): { title: string; body: string } {
  const l: Locale = locale === 'ru' || locale === 'uz' ? locale : 'en';
  return TEMPLATES[l][phase][audience](ctx);
}

type Builder = (c: RentReminderContext) => { title: string; body: string };

const TEMPLATES: Record<Locale, Record<RentReminderPhase, Record<RentReminderAudience, Builder>>> = {
  en: {
    REMINDER_3D: {
      tenant: (c) => ({
        title: 'Rent due soon',
        body: `Reminder: your rent of ${c.amount} for ${c.apartment} is due on ${c.dueDate}.`,
      }),
      owner: (c) => ({
        title: 'Rent due soon',
        body: `${c.tenantName}'s rent (${c.amount}, ${c.apartment}) is due on ${c.dueDate}.`,
      }),
    },
    DUE_TODAY: {
      tenant: (c) => ({
        title: 'Rent due today',
        body: `Your rent of ${c.amount} for ${c.apartment} is due today (${c.dueDate}).`,
      }),
      owner: (c) => ({
        title: 'Rent due today',
        body: `${c.tenantName}'s rent (${c.amount}, ${c.apartment}) is due today.`,
      }),
    },
    OVERDUE: {
      tenant: (c) => ({
        title: 'Rent overdue',
        body: `Your rent of ${c.amount} for ${c.apartment} is ${c.daysOverdue} day(s) overdue. Please pay as soon as possible.`,
      }),
      owner: (c) => ({
        title: 'Rent overdue',
        body: `${c.tenantName}'s rent (${c.amount}, ${c.apartment}) is ${c.daysOverdue} day(s) overdue.`,
      }),
    },
  },
  ru: {
    REMINDER_3D: {
      tenant: (c) => ({
        title: 'Скоро оплата аренды',
        body: `Напоминание: аренда ${c.amount} за ${c.apartment} должна быть оплачена ${c.dueDate}.`,
      }),
      owner: (c) => ({
        title: 'Скоро оплата аренды',
        body: `Аренда ${c.tenantName} (${c.amount}, ${c.apartment}) к оплате ${c.dueDate}.`,
      }),
    },
    DUE_TODAY: {
      tenant: (c) => ({
        title: 'Оплата аренды сегодня',
        body: `Аренда ${c.amount} за ${c.apartment} должна быть оплачена сегодня (${c.dueDate}).`,
      }),
      owner: (c) => ({
        title: 'Оплата аренды сегодня',
        body: `Аренда ${c.tenantName} (${c.amount}, ${c.apartment}) к оплате сегодня.`,
      }),
    },
    OVERDUE: {
      tenant: (c) => ({
        title: 'Просрочка аренды',
        body: `Аренда ${c.amount} за ${c.apartment} просрочена на ${c.daysOverdue} дн. Пожалуйста, оплатите как можно скорее.`,
      }),
      owner: (c) => ({
        title: 'Просрочка аренды',
        body: `Аренда ${c.tenantName} (${c.amount}, ${c.apartment}) просрочена на ${c.daysOverdue} дн.`,
      }),
    },
  },
  uz: {
    REMINDER_3D: {
      tenant: (c) => ({
        title: 'Ijara to‘lovi yaqinlashmoqda',
        body: `Eslatma: ${c.apartment} uchun ${c.amount} ijara ${c.dueDate} sanasida to‘lanishi kerak.`,
      }),
      owner: (c) => ({
        title: 'Ijara to‘lovi yaqinlashmoqda',
        body: `${c.tenantName} ijarasi (${c.amount}, ${c.apartment}) ${c.dueDate} sanasida to‘lanadi.`,
      }),
    },
    DUE_TODAY: {
      tenant: (c) => ({
        title: 'Bugun ijara to‘lovi',
        body: `${c.apartment} uchun ${c.amount} ijara bugun (${c.dueDate}) to‘lanishi kerak.`,
      }),
      owner: (c) => ({
        title: 'Bugun ijara to‘lovi',
        body: `${c.tenantName} ijarasi (${c.amount}, ${c.apartment}) bugun to‘lanadi.`,
      }),
    },
    OVERDUE: {
      tenant: (c) => ({
        title: 'Ijara muddati o‘tdi',
        body: `${c.apartment} uchun ${c.amount} ijara ${c.daysOverdue} kunga kechikdi. Iltimos, tezroq to‘lang.`,
      }),
      owner: (c) => ({
        title: 'Ijara muddati o‘tdi',
        body: `${c.tenantName} ijarasi (${c.amount}, ${c.apartment}) ${c.daysOverdue} kunga kechikdi.`,
      }),
    },
  },
};
