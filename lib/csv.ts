/** Quote every text cell and neutralise spreadsheet formulas (CSV injection). */
export function csvCell(value: string | number | undefined | null): string {
  if (typeof value === 'number') return String(value);
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(
  headers: string[],
  rows: Array<Array<string | number | undefined | null>>
): string {
  return [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n');
}
