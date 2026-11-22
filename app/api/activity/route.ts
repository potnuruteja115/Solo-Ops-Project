import { NextResponse } from 'next/server';
import { getStoreState } from '@/lib/store';

export async function GET(req: Request) {
  const raw = Number(new URL(req.url).searchParams.get('limit'));
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 200) : 50;
  return NextResponse.json({ events: getStoreState().activity.slice(0, limit) });
}
