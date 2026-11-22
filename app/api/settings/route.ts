import { NextResponse } from 'next/server';
import { appendActivity } from '@/lib/activity';
import { SESSION_COOKIE_NAME, sessionFromRequest, signSession } from '@/lib/auth';
import { validateGstin } from '@/lib/gstin';
import { getStoreState, saveStoreState } from '@/lib/store';
import { UserProfile } from '@/types';

type PublicUser = Omit<UserProfile, 'passwordHash'>;

function publicUser(user: UserProfile): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _omit, ...rest } = user;
  return rest;
}

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function currentUser(req: Request) {
  const state = getStoreState();
  const session = sessionFromRequest(req);
  const user = state.users.find((u) => u.id === session?.userId);
  return { state, user, session };
}

export async function GET(req: Request) {
  const { user } = currentUser(req);
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  return NextResponse.json({ user: publicUser(user) });
}

export async function PATCH(req: Request) {
  const { state, user, session } = currentUser(req);
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const next: UserProfile = { ...user };

  if (body.name !== undefined) {
    const v = String(body.name).trim();
    if (v.length < 1 || v.length > 80) return bad('Name must be 1 to 80 characters.');
    next.name = v;
  }
  if (body.businessName !== undefined) {
    const v = String(body.businessName).trim();
    if (v.length < 1 || v.length > 80) return bad('Business name must be 1 to 80 characters.');
    next.businessName = v;
  }
  if (body.gstin !== undefined) {
    const v = String(body.gstin).trim().toUpperCase();
    if (v) {
      const check = validateGstin(v);
      if (!check.valid) return bad(check.reason || 'Invalid GSTIN.');
    }
    next.gstin = v;
  }
  if (body.upiId !== undefined) {
    const v = String(body.upiId).trim();
    if (v && !/^[\w.\-]{2,64}@[a-zA-Z]{2,32}$/.test(v)) return bad('UPI ID must look like name@bank.');
    next.upiId = v;
  }
  if (body.invoicePrefix !== undefined) {
    const v = String(body.invoicePrefix).trim().toUpperCase();
    if (!/^[A-Z0-9-]{1,8}$/.test(v)) return bad('Invoice prefix must be 1 to 8 letters, digits or dashes.');
    next.invoicePrefix = v;
  }
  const numeric = (key: 'defaultTaxRate' | 'paymentTermsDays' | 'lateFeePercent', min: number, max: number) => {
    if (body[key] === undefined) return null;
    const n = Number(body[key]);
    if (!Number.isFinite(n) || n < min || n > max) return `${key} must be between ${min} and ${max}.`;
    next[key] = n;
    return null;
  };
  const numberError =
    numeric('defaultTaxRate', 0, 28) || numeric('paymentTermsDays', 0, 180) || numeric('lateFeePercent', 0, 10);
  if (numberError) return bad(numberError);

  const users = state.users.map((u) => (u.id === user.id ? next : u));
  saveStoreState(appendActivity({ ...state, users }, 'settings', 'Updated business settings'));

  // Keep the session cookie in step with the profile.
  const res = NextResponse.json({ user: publicUser(next) });
  res.cookies.set(
    SESSION_COOKIE_NAME,
    signSession({
      userId: next.id,
      name: next.name,
      email: next.email,
      businessName: next.businessName,
      gstin: next.gstin,
      upiId: next.upiId,
      isDemo: session?.isDemo,
    }),
    { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 }
  );
  return res;
}
