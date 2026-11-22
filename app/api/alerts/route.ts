import { NextResponse } from 'next/server';
import { isValidISODate, todayISO } from '@/lib/analytics';
import { buildAlerts } from '@/lib/alerts';
import { getStoreState } from '@/lib/store';

export async function GET(req: Request) {
  const requested = new URL(req.url).searchParams.get('asOf');
  const asOf = isValidISODate(requested) ? requested : todayISO();
  return NextResponse.json({ asOf, alerts: buildAlerts(getStoreState(), asOf) });
}
