import { LedgerEntry, RecurringFrequency, RecurringTemplate } from '@/types';

const MAX_RUNS_PER_CALL = 24;

function parseUTC(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function addDays(iso: string, days: number): string {
  const d = parseUTC(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

function addMonthsClamped(iso: string, months: number): string {
  const start = parseUTC(iso);
  const target = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(start.getUTCDate(), lastDay));
  return toISO(target);
}

/** The k-th run date, always computed from the start date so month-end days do not drift. */
export function occurrence(startDate: string, frequency: RecurringFrequency, k: number): string {
  if (frequency === 'weekly') return addDays(startDate, 7 * k);
  return addMonthsClamped(startDate, (frequency === 'monthly' ? 1 : 3) * k);
}

export function nextRunDate(t: RecurringTemplate): string | null {
  const next = occurrence(t.startDate, t.frequency, t.runCount);
  if (t.endDate && next > t.endDate) return null;
  return next;
}

/** Run dates that are due on or before `asOf` and not yet generated. */
export function dueRunDates(t: RecurringTemplate, asOf: string): string[] {
  if (!t.active) return [];
  const dates: string[] = [];
  for (let k = t.runCount; dates.length < MAX_RUNS_PER_CALL; k++) {
    const date = occurrence(t.startDate, t.frequency, k);
    if (date > asOf || (t.endDate && date > t.endDate)) break;
    dates.push(date);
  }
  return dates;
}

export function buildRecurringEntry(
  t: RecurringTemplate,
  partyName: string,
  runIndex: number,
  date: string,
  idPrefix = 'inv'
): LedgerEntry {
  const totalAmount = Math.round(t.amount + (t.amount * t.taxRate) / 100);
  const label = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return {
    id: `${idPrefix}-${t.id.replace(/^rec-/, '')}-${runIndex + 1}`,
    clientId: t.clientId,
    type: 'invoice',
    partyName,
    description: `${t.description} (${label})`,
    amount: t.amount,
    taxRate: t.taxRate,
    totalAmount,
    status: 'pending',
    category: t.category,
    date,
    dueDate: addDays(date, t.termsDays),
    sourceDate: date,
    sourceDocumentId: `recurring-${t.id}-${runIndex + 1}`,
  };
}
