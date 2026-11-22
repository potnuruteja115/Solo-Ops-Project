import { NextResponse } from 'next/server';
import { isValidISODate, todayISO } from '@/lib/analytics';
import { buildAnalytics } from '@/lib/pnl';
import { getStoreState } from '@/lib/store';

export async function GET(req: Request) {
  const requested = new URL(req.url).searchParams.get('asOf');
  const asOf = isValidISODate(requested) ? requested : todayISO();
  return NextResponse.json(buildAnalytics(getStoreState().entries, asOf));
}
