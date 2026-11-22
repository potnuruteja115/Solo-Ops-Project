import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySession } from '@/lib/auth';

/**
 * Route protection. Pages redirect to the login screen and API routes answer 401
 * unless a valid session cookie is present. `/api/auth` and `/demo` stay public.
 */
export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  if (pathname === '/api/auth') return NextResponse.next();

  const session = verifySession(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (session) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  // Old "?demo=true" links keep working by starting a demo session.
  if (searchParams.get('demo') === 'true') {
    const url = req.nextUrl.clone();
    url.pathname = '/demo';
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  const login = req.nextUrl.clone();
  login.pathname = '/login';
  login.search = '';
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/app/:path*', '/overview/:path*', '/settings/:path*', '/api/:path*'],
};
