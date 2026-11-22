import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, signSession } from '@/lib/auth';
import { getStoreState } from '@/lib/store';

const ALLOWED_NEXT = ['/app', '/overview', '/settings'];

/** Starts a demo session and redirects into the product. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const requested = url.searchParams.get('next') || '/app';
  const next = ALLOWED_NEXT.includes(requested) ? requested : '/app';

  const demoUser = getStoreState().users[0];
  const token = signSession({
    userId: demoUser.id,
    name: demoUser.name,
    email: demoUser.email,
    businessName: demoUser.businessName,
    gstin: demoUser.gstin,
    upiId: demoUser.upiId,
    isDemo: true,
  });
  const res = NextResponse.redirect(new URL(`${next}?demo=true`, url));
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
