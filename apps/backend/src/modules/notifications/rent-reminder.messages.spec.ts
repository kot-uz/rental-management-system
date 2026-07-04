import { buildRentReminderMessage, RentReminderContext } from './rent-reminder.messages';

const ctx: RentReminderContext = {
  tenantName: 'John Smith',
  apartment: '123 Main St · Apt 1A',
  amount: '1200.00 USD',
  dueDate: '2026-06-05',
  daysOverdue: 4,
};

describe('buildRentReminderMessage', () => {
  it('produces tenant-facing copy for each phase (en)', () => {
    expect(buildRentReminderMessage('en', 'REMINDER_3D', 'tenant', ctx).title).toBe('Rent due soon');
    expect(buildRentReminderMessage('en', 'DUE_TODAY', 'tenant', ctx).title).toBe('Rent due today');
    const overdue = buildRentReminderMessage('en', 'OVERDUE', 'tenant', ctx);
    expect(overdue.title).toBe('Rent overdue');
    expect(overdue.body).toContain('4 day(s) overdue');
  });

  it('interpolates context into the body', () => {
    const body = buildRentReminderMessage('en', 'DUE_TODAY', 'tenant', ctx).body;
    expect(body).toContain('1200.00 USD');
    expect(body).toContain('123 Main St · Apt 1A');
    expect(body).toContain('2026-06-05');
  });

  it('owner copy references the tenant by name', () => {
    const body = buildRentReminderMessage('en', 'DUE_TODAY', 'owner', ctx).body;
    expect(body).toContain('John Smith');
  });

  it('localises to ru and uz', () => {
    expect(buildRentReminderMessage('ru', 'OVERDUE', 'tenant', ctx).title).toBe('Просрочка аренды');
    expect(buildRentReminderMessage('uz', 'DUE_TODAY', 'tenant', ctx).title).toBe('Bugun ijara to‘lovi');
  });

  it('falls back to en for an unknown locale', () => {
    expect(buildRentReminderMessage('de', 'DUE_TODAY', 'tenant', ctx).title).toBe('Rent due today');
  });
});
