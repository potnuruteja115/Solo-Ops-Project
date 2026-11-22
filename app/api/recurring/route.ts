import { NextResponse } from 'next/server';
import { appendActivity } from '@/lib/activity';
import { isValidISODate, todayISO } from '@/lib/analytics';
import { buildRecurringEntry, dueRunDates, nextRunDate } from '@/lib/recurring';
import { getStoreState, saveStoreState } from '@/lib/store';
import { RecurringFrequency, RecurringTemplate } from '@/types';

const FREQUENCIES: RecurringFrequency[] = ['weekly', 'monthly', 'quarterly'];
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function GET(req: Request) {
  const requested = new URL(req.url).searchParams.get('asOf');
  const asOf = isValidISODate(requested) ? requested : todayISO();
  const state = getStoreState();
  const templates = state.recurring.map((t) => ({
    ...t,
    company: state.clients.find((c) => c.id === t.clientId)?.company ?? 'Unknown client',
    nextRunDate: nextRunDate(t),
    dueNow: dueRunDates(t, asOf).length,
  }));
  return NextResponse.json({ asOf, templates });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const state = getStoreState();

  if (body?.action === 'run') {
    const asOf = isValidISODate(body?.asOf) ? body.asOf : todayISO();
    const generated = [];
    const templates = state.recurring.map((t) => {
      const dates = dueRunDates(t, asOf);
      if (dates.length === 0) return t;
      const company = state.clients.find((c) => c.id === t.clientId)?.company ?? 'Client';
      dates.forEach((date, i) => generated.push(buildRecurringEntry(t, company, t.runCount + i, date)));
      return { ...t, runCount: t.runCount + dates.length, lastRunDate: dates[dates.length - 1] };
    });
    const existing = new Set(state.entries.map((e) => e.id));
    const fresh = generated.filter((e) => !existing.has(e.id));
    const next = { ...state, recurring: templates, entries: [...fresh, ...state.entries] };
    saveStoreState(
      fresh.length
        ? appendActivity(next, 'recurring', `Generated ${fresh.length} recurring invoice(s)`)
        : next
    );
    return NextResponse.json({ generated: fresh, count: fresh.length });
  }

  const clientId = String(body?.clientId || '');
  const description = String(body?.description || '').trim();
  const amount = Number(body?.amount);
  const taxRate = Number(body?.taxRate ?? 18);
  const frequency = body?.frequency as RecurringFrequency;
  const termsDays = Number(body?.termsDays ?? 10);

  if (!clientId || !description) return bad('clientId and description are required.');
  if (!Number.isFinite(amount) || amount <= 0) return bad('amount must be greater than 0.');
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 28) return bad('taxRate must be between 0 and 28.');
  if (!FREQUENCIES.includes(frequency)) return bad('frequency must be weekly, monthly or quarterly.');
  if (!isValidISODate(body?.startDate)) return bad('startDate must be YYYY-MM-DD.');
  if (body?.endDate && (!isValidISODate(body.endDate) || body.endDate < body.startDate)) {
    return bad('endDate must be YYYY-MM-DD and not before startDate.');
  }
  if (!state.clients.some((c) => c.id === clientId)) return bad('Client not found.', 404);

  const template: RecurringTemplate = {
    id: `rec-${Date.now().toString(36).slice(-6)}`,
    clientId,
    description,
    amount,
    taxRate,
    category: String(body?.category || 'Consulting'),
    frequency,
    startDate: body.startDate,
    endDate: body?.endDate || undefined,
    termsDays: Number.isFinite(termsDays) && termsDays >= 0 ? termsDays : 10,
    active: true,
    runCount: 0,
  };
  saveStoreState(
    appendActivity({ ...state, recurring: [template, ...state.recurring] }, 'recurring', `Created ${frequency} schedule: ${description}`, template.id)
  );
  return NextResponse.json({ template }, { status: 201 });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id || '');
  const state = getStoreState();
  if (!state.recurring.some((t) => t.id === id) || typeof body?.active !== 'boolean') {
    return bad('A valid id and an active flag are required.');
  }
  const recurring = state.recurring.map((t) => (t.id === id ? { ...t, active: body.active } : t));
  saveStoreState(appendActivity({ ...state, recurring }, 'recurring', `${body.active ? 'Resumed' : 'Paused'} schedule ${id}`, id));
  return NextResponse.json({ template: recurring.find((t) => t.id === id) });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get('id') || '';
  const state = getStoreState();
  saveStoreState({ ...state, recurring: state.recurring.filter((t) => t.id !== id) });
  return NextResponse.json({ success: true });
}
