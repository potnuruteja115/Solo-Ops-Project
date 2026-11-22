import { NextResponse } from 'next/server';
import { getStoreState, resetStoreState, saveStoreState } from '@/lib/store';
import { withEffectiveStatus } from '@/lib/analytics';
import { appendActivity } from '@/lib/activity';
import { csvCell } from '@/lib/csv';
import { EntryStatus, LedgerEntry } from '@/types';


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format');
  const state = getStoreState();
  const entries = withEffectiveStatus(state.entries);

  if (format === 'csv') {
    const headers = [
      'ID',
      'Type',
      'Party',
      'Description',
      'Category',
      'Date',
      'Due Date',
      'Base Amount (INR)',
      'GST %',
      'Total (INR)',
      'Status',
      'Source Doc ID',
    ];
    const rows = entries.map((e) =>
      [
        e.id,
        e.type,
        e.partyName,
        e.description,
        e.category,
        e.date,
        e.dueDate || '',
        e.amount,
        e.taxRate,
        e.totalAmount,
        e.status,
        e.sourceDocumentId,
      ].map(csvCell)
    );
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="soloops-ledger.csv"',
      },
    });
  }

  return NextResponse.json({ entries, clients: state.clients });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body?.action === 'reset') {
    const reset = resetStoreState();
    return NextResponse.json({ entries: reset.entries, clients: reset.clients });
  }

  const state = getStoreState();
  const amount = Math.max(0, Number(body?.amount) || 0);
  const taxRate = Math.max(0, Number(body?.taxRate) || 0);
  const totalAmount = Math.round(amount + (amount * taxRate) / 100);
  const today = new Date().toISOString().split('T')[0];

  const entry: LedgerEntry = {
    id: `${body?.type === 'expense' ? 'exp' : 'inv'}-${Date.now().toString(36).slice(-5)}`,
    type: body?.type === 'expense' ? 'expense' : 'invoice',
    partyName: String(body?.partyName || 'Client').trim(),
    description: String(body?.description || 'Service delivery').trim(),
    amount,
    taxRate,
    totalAmount,
    status: (['paid', 'pending', 'overdue'].includes(body?.status)
      ? body.status
      : 'pending') as EntryStatus,
    category: String(body?.category || 'Operations'),
    date: String(body?.date || today),
    dueDate: body?.dueDate ? String(body.dueDate) : undefined,
    sourceDate: today,
    sourceDocumentId: `doc-manual-${Date.now().toString().slice(-5)}`,
  };

  const nextEntries = [entry, ...state.entries];
  saveStoreState(
    appendActivity(
      { ...state, entries: nextEntries },
      'entry',
      `Logged ${entry.type} ${entry.id.toUpperCase()} for ${entry.partyName} (INR ${entry.totalAmount.toLocaleString('en-IN')})`,
      entry.id
    )
  );
  return NextResponse.json({ entry, entries: nextEntries }, { status: 201 });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id || '');
  const state = getStoreState();
  const nextEntries = state.entries.map((e) => {
    if (e.id !== id) return e;
    const nextStatus: EntryStatus =
      body?.status && ['paid', 'pending', 'overdue'].includes(body.status)
        ? body.status
        : e.status === 'paid'
        ? 'pending'
        : 'paid';
    return { ...e, status: nextStatus };
  });
  const before = state.entries.find((e) => e.id === id);
  const after = nextEntries.find((e) => e.id === id);
  saveStoreState(
    before && after
      ? appendActivity(
          { ...state, entries: nextEntries },
          after.status === 'paid' ? 'payment' : 'entry',
          `${after.id.toUpperCase()} (${after.partyName}) marked ${after.status}`,
          after.id
        )
      : { ...state, entries: nextEntries }
  );
  return NextResponse.json({ entries: nextEntries });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || '';
  const state = getStoreState();
  const removed = state.entries.find((e) => e.id === id);
  const nextEntries = state.entries.filter((e) => e.id !== id);
  saveStoreState(
    removed
      ? appendActivity(
          { ...state, entries: nextEntries },
          'entry',
          `Deleted ${removed.id.toUpperCase()} (${removed.partyName})`,
          removed.id
        )
      : { ...state, entries: nextEntries }
  );
  return NextResponse.json({ entries: nextEntries });
}
