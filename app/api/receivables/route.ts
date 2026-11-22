import { NextResponse } from 'next/server';
import { buildReceivablesReport, isValidISODate, todayISO } from '@/lib/analytics';
import { sessionFromRequest } from '@/lib/auth';
import { getStoreState } from '@/lib/store';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const requested = searchParams.get('asOf');
  const asOf = isValidISODate(requested) ? requested : todayISO();

  const state = getStoreState();
  const session = sessionFromRequest(req);
  const user = state.users.find((u) => u.id === session?.userId) ?? state.users[0];
  return NextResponse.json(
    buildReceivablesReport(state.entries, state.clients, asOf, state.promises, user?.lateFeePercent ?? 1.5)
  );
}
