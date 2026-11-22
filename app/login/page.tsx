'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('demo@soloops.app');
  const [password, setPassword] = useState('soloops-demo');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Sign in failed.');
        return;
      }
      router.push('/app');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'demo' }),
      });
      router.push('/app?demo=true');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 py-10">
      <div className="mb-4 flex w-full items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5c554e] transition hover:text-[#2a2622]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Home
        </Link>
        <Link href="/">
          <Logo size="sm" />
        </Link>
      </div>

      <div className="clay-card grid w-full grid-cols-1 overflow-hidden md:grid-cols-2">
        <div className="flex flex-col justify-between border-b border-[#d8cfc0] bg-[#e8e2d5]/80 p-7 md:border-b-0 md:border-r">
          <div>
            <Logo size="md" />
            <p className="font-mono mt-5 text-xs font-bold uppercase tracking-wider text-[#b8623f]">
              SoloOps Account
            </p>
            <h1 className="font-heading mt-1.5 text-2xl font-bold text-[#2a2622]">
              Sign in to your back office
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-[#5c554e]">
              Manage client invoices, GST reserves, and payment follow-ups from a single workspace.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <ul className="space-y-2 text-xs text-[#2a2622]">
              <li>· Instant INR invoice and expense parsing</li>
              <li>· Scannable UPI QR code on every tax invoice</li>
              <li>· Portfolio cash-flow risk scoring</li>
            </ul>
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#7d9080]/40 bg-[#7d9080]/15 px-3 py-1.5 text-[11px] font-semibold text-[#47594a]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Protected with bcrypt password hashing
            </div>
          </div>
        </div>

        <div className="p-7">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-1 block text-xs font-semibold text-[#2a2622]"
              >
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="clay-input w-full px-3.5 py-2.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-1 block text-xs font-semibold text-[#2a2622]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="clay-input w-full px-3.5 py-2.5 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-2.5 top-2.5 rounded-lg p-0.5 text-[#5c554e] transition hover:text-[#2a2622]"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  title={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-[#b8623f]/30 bg-[#b8623f]/10 px-3 py-2 text-xs font-semibold text-[#b8623f]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="clay-btn-primary flex w-full items-center justify-center gap-2 py-2.5 text-xs"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Sign In</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          <button
            type="button"
            onClick={handleDemo}
            disabled={loading}
            className="clay-btn-sage mt-3 w-full py-2.5 text-xs"
          >
            Launch Instant Demo Workspace
          </button>

          <p className="mt-5 text-center text-xs text-[#5c554e]">
            New to SoloOps?{' '}
            <Link href="/register" className="font-bold text-[#b8623f] hover:underline">
              Create a new account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
