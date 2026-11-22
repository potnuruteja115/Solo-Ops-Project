import {
  AnalyticsReport,
  CategoryTotal,
  ClientRevenue,
  LedgerEntry,
  MonthlyPnl,
} from '@/types';

const monthOf = (iso: string) => iso.slice(0, 7);

/** The last `count` month keys (YYYY-MM) ending at the month of `asOf`. */
export function lastMonths(asOf: string, count: number): string[] {
  const [y, m] = asOf.split('-').map(Number);
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    keys.push(d.toISOString().slice(0, 7));
  }
  return keys;
}

export function buildMonthlyPnl(entries: LedgerEntry[], asOf: string, count = 6): MonthlyPnl[] {
  return lastMonths(asOf, count).map((month) => {
    const inMonth = entries.filter((e) => monthOf(e.date) === month);
    const invoices = inMonth.filter((e) => e.type === 'invoice');
    const expenses = inMonth.filter((e) => e.type === 'expense');
    const invoiced = invoices.reduce((s, e) => s + e.amount, 0);
    const spent = expenses.reduce((s, e) => s + e.amount, 0);
    return {
      month,
      invoiced,
      collected: invoices.filter((e) => e.status === 'paid').reduce((s, e) => s + e.amount, 0),
      expenses: spent,
      net: invoiced - spent,
      gstOutput: invoices.reduce((s, e) => s + (e.totalAmount - e.amount), 0),
      gstInput: expenses.reduce((s, e) => s + (e.totalAmount - e.amount), 0),
    };
  });
}

export function buildExpenseCategories(entries: LedgerEntry[]): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const e of entries.filter((x) => x.type === 'expense')) {
    totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function buildRevenueByClient(entries: LedgerEntry[]): ClientRevenue[] {
  const totals = new Map<string, number>();
  for (const e of entries.filter((x) => x.type === 'invoice')) {
    totals.set(e.partyName, (totals.get(e.partyName) ?? 0) + e.amount);
  }
  const all = [...totals.values()].reduce((s, v) => s + v, 0);
  return [...totals.entries()]
    .map(([partyName, amount]) => ({
      partyName,
      amount,
      share: all > 0 ? Math.round((amount / all) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function buildAnalytics(entries: LedgerEntry[], asOf: string): AnalyticsReport {
  const invoices = entries.filter((e) => e.type === 'invoice');
  const expenses = entries.filter((e) => e.type === 'expense');
  const totalInvoiced = invoices.reduce((s, e) => s + e.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const revenueByClient = buildRevenueByClient(entries);
  const top = revenueByClient[0];
  const topShare = top?.share ?? 0;

  return {
    asOf,
    kpis: {
      totalInvoiced,
      totalExpenses,
      netProfit: totalInvoiced - totalExpenses,
      marginPct: totalInvoiced > 0 ? Math.round(((totalInvoiced - totalExpenses) / totalInvoiced) * 100) : 0,
      avgInvoice: invoices.length ? Math.round(totalInvoiced / invoices.length) : 0,
    },
    monthly: buildMonthlyPnl(entries, asOf),
    expensesByCategory: buildExpenseCategories(entries),
    revenueByClient,
    concentration: {
      topShare,
      topClient: top?.partyName ?? '',
      level: topShare >= 50 ? 'high' : topShare >= 35 ? 'moderate' : 'low',
    },
  };
}
