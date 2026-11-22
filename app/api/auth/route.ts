import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  hashPassword,
  signSession,
  verifyPassword,
  verifySession,
} from '@/lib/auth';
import { getStoreState, saveStoreState } from '@/lib/store';

export async function GET(req: Request) {
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  const token = match ? match.slice(SESSION_COOKIE_NAME.length + 1) : null;
  const session = verifySession(token);

  if (!session) {
    return NextResponse.json({ authenticated: false, session: null });
  }
  return NextResponse.json({ authenticated: true, session });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body?.action || 'login';
    const state = getStoreState();

    if (action === 'logout') {
      const res = NextResponse.json({ success: true });
      res.cookies.set(SESSION_COOKIE_NAME, '', {
        httpOnly: true,
        path: '/',
        maxAge: 0,
      });
      return res;
    }

    if (action === 'demo') {
      const demoUser = state.users[0];
      const token = signSession({
        userId: demoUser.id,
        name: demoUser.name,
        email: demoUser.email,
        businessName: demoUser.businessName,
        gstin: demoUser.gstin,
        upiId: demoUser.upiId,
        isDemo: true,
      });
      const res = NextResponse.json({
        success: true,
        session: {
          userId: demoUser.id,
          name: demoUser.name,
          email: demoUser.email,
          businessName: demoUser.businessName,
          gstin: demoUser.gstin,
          upiId: demoUser.upiId,
          isDemo: true,
        },
      });
      res.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    }

    if (action === 'register') {
      const name = String(body?.name || '').trim();
      const email = String(body?.email || '').trim().toLowerCase();
      const password = String(body?.password || '');
      const businessName = String(body?.businessName || 'SoloOps Studio').trim();
      const gstin = String(body?.gstin || '').trim();
      const upiId = String(body?.upiId || 'soloops@upi').trim();

      if (!name || !email || password.length < 6) {
        return NextResponse.json(
          { error: 'Name, valid email, and password (min 6 chars) are required.' },
          { status: 400 }
        );
      }

      const existing = state.users.find((u) => u.email.toLowerCase() === email);
      if (existing) {
        return NextResponse.json(
          { error: 'An account with this email already exists.' },
          { status: 409 }
        );
      }

      const newUser = {
        id: `user-${Date.now()}`,
        name,
        email,
        passwordHash: hashPassword(password),
        businessName,
        gstin,
        upiId,
        currency: 'INR' as const,
        createdAt: new Date().toISOString(),
      };

      saveStoreState({
        ...state,
        users: [newUser, ...state.users],
      });

      const token = signSession({
        userId: newUser.id,
        name: newUser.name,
        email: newUser.email,
        businessName: newUser.businessName,
        gstin: newUser.gstin,
        upiId: newUser.upiId,
        isDemo: false,
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _omit, ...safeUser } = newUser;
      const res = NextResponse.json({ success: true, user: safeUser });
      res.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    }

    // Default: login
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const user = state.users.find((u) => u.email.toLowerCase() === email);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const valid = verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const token = signSession({
      userId: user.id,
      name: user.name,
      email: user.email,
      businessName: user.businessName,
      gstin: user.gstin,
      upiId: user.upiId,
      isDemo: user.email === 'demo@soloops.app',
    });

    const res = NextResponse.json({
      success: true,
      session: {
        userId: user.id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        gstin: user.gstin,
        upiId: user.upiId,
        isDemo: user.email === 'demo@soloops.app',
      },
    });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: String((err as { message?: string })?.message || 'Authentication failed') },
      { status: 500 }
    );
  }
}
