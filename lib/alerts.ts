import { AppAlert } from '@/types';
import type { StoreState } from '@/lib/store';
import { buildCollectionsQueue, daysBetween } from '@/lib/analytics';
import { buildRevenueByClient, lastMonths } from '@/lib/pnl';
import { effectivePromiseStatus } from '@/lib/promises';
import { nextRunDate } from '@/lib/recurring';

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 } as const;
const inr = (n: number) => `INR ${n.toLocaleString('en-IN')}`;

/** Derives actionable alerts from the books. Pure, so it can be tested for any date. */
export function buildAlerts(state: StoreState, asOf: string): AppAlert[] {
  const alerts: AppAlert[] = [];
  const queue = buildCollectionsQueue(state.entries, state.clients, asOf, state.promises);

  for (const q of queue) {
    const id = q.entry.id.toUpperCase();
    if (q.daysOverdue > 0) {
      alerts.push({
        id: `overdue-${q.entry.id}`,
        severity: q.daysOverdue >= 14 ? 'critical' : 'warning',
        title: `${id} is ${q.daysOverdue} days overdue`,
        detail: `${q.entry.partyName} owes ${inr(q.entry.totalAmount)}. Suggested tone: ${q.recommendedTone}.`,
        tab: 'receivables',
        clientId: q.entry.clientId,
      });
    } else if (q.dueInDays <= 3) {
      alerts.push({
        id: `due-${q.entry.id}`,
        severity: 'info',
        title: `${id} is due ${q.dueInDays === 0 ? 'today' : `in ${q.dueInDays} days`}`,
        detail: `${q.entry.partyName}, ${inr(q.entry.totalAmount)}. A friendly reminder now helps.`,
        tab: 'receivables',
        clientId: q.entry.clientId,
      });
    }
  }

  for (const p of state.promises.filter((x) => x.owner === 'client' && x.dueDate)) {
    const status = effectivePromiseStatus(p, asOf);
    const client = state.clients.find((c) => c.id === p.clientId)?.company ?? 'Client';
    const sinceDue = daysBetween(p.dueDate!, asOf);
    if (status === 'broken' && p.status === 'pending' && sinceDue <= 7) {
      alerts.push({
        id: `promise-broken-${p.id}`,
        severity: 'critical',
        title: `${client} broke a promise`,
        detail: `"${p.text}" was due ${p.dueDate}.`,
        tab: 'intel',
        clientId: p.clientId,
      });
    } else if (status === 'pending' && sinceDue <= 0 && sinceDue >= -2) {
      alerts.push({
        id: `promise-due-${p.id}`,
        severity: 'warning',
        title: `${client} promise due ${sinceDue === 0 ? 'today' : 'soon'}`,
        detail: `"${p.text}" (due ${p.dueDate}). Check whether it was kept.`,
        tab: 'intel',
        clientId: p.clientId,
      });
    }
  }

  // GSTR-3B is due on the 20th for the previous month.
  const day = Number(asOf.slice(8, 10));
  if (day <= 20) {
    const prev = lastMonths(asOf, 2)[0];
    const inPrev = state.entries.filter((e) => e.date.startsWith(prev));
    const output = inPrev.filter((e) => e.type === 'invoice').reduce((s, e) => s + e.totalAmount - e.amount, 0);
    const input = inPrev.filter((e) => e.type === 'expense').reduce((s, e) => s + e.totalAmount - e.amount, 0);
    const net = output - input;
    if (net > 0 && 20 - day <= 7) {
      alerts.push({
        id: `gst-${prev}`,
        severity: 20 - day <= 2 ? 'critical' : 'warning',
        title: `GSTR-3B due in ${20 - day} days`,
        detail: `Net GST payable for ${prev} is ${inr(net)}. Set it aside from incoming payments.`,
        tab: 'tax',
      });
    }
  }

  const top = buildRevenueByClient(state.entries)[0];
  if (top && top.share >= 50) {
    alerts.push({
      id: 'concentration',
      severity: 'warning',
      title: `${top.share}% of revenue is from ${top.partyName}`,
      detail: 'High client concentration is a cash-flow risk. Consider diversifying.',
      tab: 'analytics',
    });
  }

  const dueTemplates = state.recurring.filter((t) => {
    const next = nextRunDate(t);
    return t.active && next !== null && next <= asOf;
  });
  if (dueTemplates.length > 0) {
    alerts.push({
      id: 'recurring-due',
      severity: 'info',
      title: `${dueTemplates.length} recurring invoice${dueTemplates.length > 1 ? 's' : ''} ready`,
      detail: 'Generate them from the Recurring tab.',
      tab: 'recurring',
    });
  }

  return alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
