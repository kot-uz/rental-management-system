/** Builds RFC-4180-ish CSV with a header row and proper quoting. */
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))];
  return lines.join('\n');
}

/** Quotes a value only when it contains a quote, comma or newline; doubles inner quotes. */
export function escapeCsv(value: string | number): string {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
