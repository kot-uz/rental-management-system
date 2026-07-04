import { toCsv, escapeCsv } from './csv.util';

describe('escapeCsv', () => {
  it('leaves plain values untouched', () => {
    expect(escapeCsv('hello')).toBe('hello');
    expect(escapeCsv(42)).toBe('42');
  });

  it('quotes and doubles inner quotes', () => {
    expect(escapeCsv('say "hi"')).toBe('"say ""hi"""');
  });

  it('quotes values containing a comma', () => {
    expect(escapeCsv('Smith, John')).toBe('"Smith, John"');
  });

  it('quotes values containing a newline (CSV injection-via-linebreak guard)', () => {
    expect(escapeCsv('line1\nline2')).toBe('"line1\nline2"');
  });

  it('renders null/undefined as empty string', () => {
    expect(escapeCsv(undefined as unknown as string)).toBe('');
    expect(escapeCsv(null as unknown as string)).toBe('');
  });
});

describe('toCsv', () => {
  it('emits a header row even with no data rows', () => {
    expect(toCsv(['A', 'B'], [])).toBe('A,B');
  });

  it('joins rows with newlines and cells with commas', () => {
    expect(toCsv(['Name', 'Age'], [['Alice', 30], ['Bob', 25]])).toBe('Name,Age\nAlice,30\nBob,25');
  });

  it('escapes cells that need quoting without affecting neighbours', () => {
    const out = toCsv(['Address', 'Note'], [['1 Main St, Apt 2', 'ok']]);
    expect(out).toBe('Address,Note\n"1 Main St, Apt 2",ok');
  });
});
