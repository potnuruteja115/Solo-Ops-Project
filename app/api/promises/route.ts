import { NextResponse } from 'next/server';
import { isValidISODate, todayISO } from '@/lib/analytics';
import { promiseStats, withEffectivePromiseStatus } from '@/lib/promises';
import { appendActivity } from '@/lib/activity';
import { getStoreState, saveStoreState } from '@/lib/store';
import { PaymentPromise, PromiseOwner, PromiseStatus } from '@/types';

const STATUSES: PromiseStatus[] = ['pending', 'kept', 'broken'];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');
  const asOf = todayISO();
  const state = getStoreState();

  const scopedPromises = clientId
    ? state.promises.filter((p) => p.clientId === clientId)
    : state.promises;
  const scopedNotes = clientId
    ? state.notes.filter((n) => n.clientId === clientId)
    : state.notes;

  return NextResponse.json({
    promises: withEffectivePromiseStatus(scopedPromises, asOf).sort((a, b) =>
      (b.sourceDate || '').localeCompare(a.sourceDate || '')
    ),
    notes: [...scopedNotes].sort((a, b) => b.date.localeCompare(a.date)),
    stats: promiseStats(scopedPromises, asOf),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const clientId = String(body?.clientId || '');
  const text = String(body?.text || '').trim();
  const owner: PromiseOwner = body?.owner === 'us' ? 'us' : 'client';

  if (!clientId || !text) {
    return NextResponse.json({ error: 'clientId and text are required.' }, { status: 400 });
  }
  const state = getStoreState();
  if (!state.clients.some((c) => c.id === clientId)) {
    return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
  }

  const promise: PaymentPromise = {
    id: `prm-${Date.now().toString().slice(-7)}`,
    clientId,
    owner,
    text,
    dueDate: isValidISODate(body?.dueDate) ? body.dueDate : null,
    status: 'pending',
    entryId: body?.entryId ? String(body.entryId) : undefined,
    sourceDate: todayISO(),
  };
  saveStoreState(
    appendActivity({ ...state, promises: [promise, ...state.promises] }, 'promise', `Recorded promise: ${text}`, promise.id)
  );
  return NextResponse.json({ promise }, { status: 201 });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id || '');
  const status = body?.status as PromiseStatus;
  if (!id || !STATUSES.includes(status)) {
    return NextResponse.json(
      { error: 'id and a valid status (pending, kept, broken) are required.' },
      { status: 400 }
    );
  }
  const state = getStoreState();
  if (!state.promises.some((p) => p.id === id)) {
    return NextResponse.json({ error: 'Promise not found.' }, { status: 404 });
  }
  const promises = state.promises.map((p) => (p.id === id ? { ...p, status } : p));
  const updated = promises.find((p) => p.id === id)!;
  saveStoreState(appendActivity({ ...state, promises }, 'promise', `Promise marked ${status}: ${updated.text}`, id));
  return NextResponse.json({ promise: updated });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get('id') || '';
  const state = getStoreState();
  saveStoreState({ ...state, promises: state.promises.filter((p) => p.id !== id) });
  return NextResponse.json({ success: true });
}
