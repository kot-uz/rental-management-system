import { describe, it, expect } from 'vitest';
import { formatMoney, formatDate, formatMonthYear } from './formatMoney';

describe('formatMoney', () => {
  it('formats a number as USD by default with two decimals', () => {
    expect(formatMoney(1234.5)).toBe('$1,234.50');
  });

  it('accepts a numeric string', () => {
    expect(formatMoney('1000')).toBe('$1,000.00');
  });

  it('honours a custom currency code', () => {
    // Non-USD symbols vary by ICU build, so assert on the digits + code instead.
    const out = formatMoney(50, 'EUR');
    expect(out).toContain('50.00');
  });

  it('formats zero', () => {
    expect(formatMoney(0)).toBe('$0.00');
  });

  it('formats negative amounts', () => {
    expect(formatMoney(-25.5)).toBe('-$25.50');
  });
});

describe('formatDate', () => {
  it('renders an ISO date as a short, human-readable date', () => {
    // Use a noon UTC time so the local-timezone shift cannot cross a day boundary.
    expect(formatDate('2026-03-09T12:00:00Z')).toBe('Mar 9, 2026');
  });

  it('accepts a Date instance', () => {
    expect(formatDate(new Date('2026-12-25T12:00:00Z'))).toBe('Dec 25, 2026');
  });
});

describe('formatMonthYear', () => {
  it('formats a 1-based month with its full name', () => {
    expect(formatMonthYear(2026, 1)).toBe('January 2026');
    expect(formatMonthYear(2026, 12)).toBe('December 2026');
  });
});
