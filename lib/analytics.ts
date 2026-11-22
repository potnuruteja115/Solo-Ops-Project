import {
  AgingBucket,
  CashForecastPoint,
  ClientProfile,
  CollectionItem,
  EntryStatus,
  FollowUpTone,
  LedgerEntry,
  PaymentPromise,
  ReceivablesReport,
} from '@/types';
import { adjustedReliability } from '@/lib/promises';

const DAY_MS = 86_400_000;

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function isValidISODate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

/** An unpaid invoice whose due date has passed is overdue, whatever was stored. */
export function effectiveStatus(entry: LedgerEntry, asOf: string): EntryStatus {
  if (
    entry.type === 'invoice' &&
    entry.status !== 'paid' &&
    entry.dueDate &&
    daysBetween(entry.dueDate, asOf) > 0
  ) {
    return 'overdue';
  }
  return entry.status;
}

export function withEffectiveStatus(
  entries: LedgerEntry[],
  asOf: string = todayISO()
): LedgerEntry[] {
  return entries.map((e) => {
    const status = effectiveStatus(e, asOf);
    return status === e.status ? e : { ...e, status };
  });
}

function findClient(entry: LedgerEntry, clients: ClientProfile[]) {
  return clients.find(
    (c) =>
      c.id === entry.clientId ||
      c.company.toLowerCase() === entry.partyName.toLowerCase()
  );
}

function reliabilityFor(
  entry: LedgerEntry,
  clients: ClientProfile[],
  promises: PaymentPromise[],
  asOf: string
): number {
  const client = findClient(entry, clients);
  if (!client) return 70;
  return adjustedReliability(
    client.reliabilityScore,
    promises.filter((p) => p.clientId === client.id),
    asOf
  );
}

function unpaidInvoices(entries: LedgerEntry[]) {
  return entries.filter((e) => e.type === 'invoice' && e.status !== 'paid');
}

export function buildAging(entries: LedgerEntry[], asOf: string): AgingBucket[] {
  const buckets: AgingBucket[] = [
    { key: 'current', label: 'Not yet due', count: 0, amount: 0 },
    { key: 'd1_30', label: '1 to 30 days', count: 0, amount: 0 },
    { key: 'd31_60', label: '31 to 60 days', count: 0, amount: 0 },
    { key: 'd61_90', label: '61 to 90 days', count: 0, amount: 0 },
    { key: 'd90_plus', label: 'Over 90 days', count: 0, amount: 0 },
  ];
  for (const e of unpaidInvoices(entries)) {
    const overdue = daysBetween(e.dueDate || e.date, asOf);
    const idx =
      overdue <= 0 ? 0 : overdue <= 30 ? 1 : overdue <= 60 ? 2 : overdue <= 90 ? 3 : 4;
    buckets[idx].count += 1;
    buckets[idx].amount += e.totalAmount;
  }
  return buckets;
}

function recommendTone(daysOverdue: number, reliability: number): FollowUpTone {
  if (daysOverdue >= 30 || (daysOverdue > 0 && reliability < 50)) return 'urgent';
  if (daysOverdue >= 7 || (daysOverdue > 0 && reliability < 70)) return 'firm';
  return 'polite';
}

export function buildCollectionsQueue(
  entries: LedgerEntry[],
  clients: ClientProfile[],
  asOf: string,
  promises: PaymentPromise[] = [],
  lateFeePercent = 1.5
): CollectionItem[] {
  return unpaidInvoices(entries)
    .map((entry) => {
      const due = entry.dueDate || entry.date;
      const daysOverdue = Math.max(0, daysBetween(due, asOf));
      const dueInDays = Math.max(0, daysBetween(asOf, due));
      const reliabilityScore = reliabilityFor(entry, clients, promises, asOf);
      const priorityScore = Math.round(
        (entry.totalAmount / 1000) *
          (1 + daysOverdue / 10) *
          (1 + (100 - reliabilityScore) / 50)
      );
      const lateFee = Math.round(entry.totalAmount * (lateFeePercent / 100) * (daysOverdue / 30));
      const recommendedTone = recommendTone(daysOverdue, reliabilityScore);
      const reason =
        daysOverdue > 0
          ? `${daysOverdue} days overdue, client reliability ${reliabilityScore}/100`
          : `Due in ${dueInDays} days, client reliability ${reliabilityScore}/100`;
      return {
        entry,
        daysOverdue,
        dueInDays,
        reliabilityScore,
        priorityScore,
        lateFee,
        recommendedTone,
        reason,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Expected inflow = invoice total x client reliability, landing at the due date
 * plus a delay that grows as reliability falls (up to 30 days).
 */
export function buildCashForecast(
  entries: LedgerEntry[],
  clients: ClientProfile[],
  asOf: string,
  promises: PaymentPromise[] = []
): CashForecastPoint[] {
  const horizons: Array<30 | 60 | 90> = [30, 60, 90];
  const inflows = unpaidInvoices(entries).map((e) => {
    const reliability = reliabilityFor(e, clients, promises, asOf);
    const untilDue = Math.max(0, daysBetween(asOf, e.dueDate || e.date));
    const delay = Math.round(((100 - reliability) / 100) * 30);
    return { day: untilDue + delay, value: e.totalAmount * (reliability / 100) };
  });
  const outflows = entries
    .filter((e) => e.type === 'expense' && e.status !== 'paid')
    .map((e) => ({
      day: Math.max(0, daysBetween(asOf, e.dueDate || e.date)),
      value: e.totalAmount,
    }));

  return horizons.map((h) => {
    const expectedInflow = Math.round(
      inflows.filter((i) => i.day <= h).reduce((s, i) => s + i.value, 0)
    );
    const pendingOutflow = Math.round(
      outflows.filter((o) => o.day <= h).reduce((s, o) => s + o.value, 0)
    );
    return {
      horizonDays: h,
      expectedInflow,
      pendingOutflow,
      net: expectedInflow - pendingOutflow,
    };
  });
}

export function buildReceivablesReport(
  entries: LedgerEntry[],
  clients: ClientProfile[],
  asOf: string = todayISO(),
  promises: PaymentPromise[] = [],
  lateFeePercent = 1.5
): ReceivablesReport {
  const aging = buildAging(entries, asOf);
  const queue = buildCollectionsQueue(entries, clients, asOf, promises, lateFeePercent);
  const forecast = buildCashForecast(entries, clients, asOf, promises);

  const invoices = entries.filter((e) => e.type === 'invoice');
  const billed = invoices.reduce((s, e) => s + e.totalAmount, 0);
  const collected = invoices
    .filter((e) => e.status === 'paid')
    .reduce((s, e) => s + e.totalAmount, 0);

  return {
    asOf,
    summary: {
      totalOutstanding: aging.reduce((s, b) => s + b.amount, 0),
      totalOverdue: aging.slice(1).reduce((s, b) => s + b.amount, 0),
      collectionEfficiency: billed > 0 ? Math.round((collected / billed) * 100) : 0,
      expectedNext30: forecast[0].expectedInflow,
      accruedLateFees: queue.reduce((s, q) => s + q.lateFee, 0),
    },
    aging,
    queue,
    forecast,
  };
}
