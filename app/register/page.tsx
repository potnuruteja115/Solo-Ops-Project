'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

function getPasswordStrength(pw: string): {
  label: string;
  color: string;
  width: string;
} {
  if (!pw) return { label: '', color: 'bg-transparent', width: 'w-0' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) {
    return { label: 'Weak', color: 'bg-[#b8623f]', width: 'w-1/3' };
  }
  if (score <= 3) {
    return { label: 'Fair', color: 'bg-[#c9973e]', width: 'w-2/3' };
  }
  return { label: 'Strong', color: 'bg-[#5f7262]', width: 'w-full' };
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [gstin, setGstin] = useState('');
  const [upiId, setUpiId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          name,
          email,
          password,
          businessName: businessName || `${name} Studio`,
          gstin,
          upiId: upiId || 'studio@upi',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Registration failed.');
        return;
      }
      router.push('/app');
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
              Step {step} of 2
            </p>
            <h1 className="font-heading mt-1.5 text-2xl font-bold text-[#2a2622]">
              {step === 1 ? 'Create your account' : 'Set up your studio billing'}
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-[#5c554e]">
              {step === 1
                ? 'Start with your personal credentials to access your SoloOps ledger.'
                : 'Add your studio name, GSTIN, and UPI ID for compliant invoices and QR payments.'}
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#7d9080]/40 bg-[#7d9080]/15 px-3 py-1.5 text-[11px] font-semibold text-[#47594a]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Passwords are salted &amp; hashed with bcrypt
            </div>
            <p className="text-xs text-[#5c554e]">
              Already registered?{' '}
              <Link href="/login" className="font-bold text-[#b8623f] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 p-7">
          {step === 1 ? (
            <>
              <div>
                <label
                  htmlFor="reg-name"
                  className="mb-1 block text-xs font-semibold text-[#2a2622]"
                >
                  Full Name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Potnuru Teja"
                  className="clay-input w-full px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="mb-1 block text-xs font-semibold text-[#2a2622]"
                >
                  Work Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teja@studio.in"
                  className="clay-input w-full px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-password"
                  className="mb-1 block text-xs font-semibold text-[#2a2622]"
                >
                  Password (min 6 characters)
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
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

                {password && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#d8cfc0]">
                      <div
                        className={`h-full rounded-full transition-all duration-200 ${strength.color} ${strength.width}`}
                      />
                    </div>
                    <span className="font-mono text-[10px] font-semibold text-[#5c554e]">
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="reg-confirm-password"
                  className="mb-1 block text-xs font-semibold text-[#2a2622]"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="reg-confirm-password"
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="clay-input w-full px-3.5 py-2.5 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-2.5 top-2.5 rounded-lg p-0.5 text-[#5c554e] transition hover:text-[#2a2622]"
                    aria-label={
                      showConfirmPass
                        ? 'Hide confirm password'
                        : 'Show confirm password'
                    }
                    title={
                      showConfirmPass
                        ? 'Hide confirm password'
                        : 'Show confirm password'
                    }
                  >
                    {showConfirmPass ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!name.trim() || !email.trim() || password.length < 6) {
                    setError(
                      'Please complete all fields with at least a 6-character password.'
                    );
                    return;
                  }
                  if (password !== confirmPassword) {
                    setError('Passwords do not match.');
                    return;
                  }
                  setError('');
                  setStep(2);
                }}
                className="clay-btn-primary flex w-full items-center justify-center gap-2 py-2.5 text-xs"
              >
                <span>Continue to Business Setup</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#2a2622]">
                  Studio / Business Name
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Teja Digital Labs"
                  className="clay-input w-full px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#2a2622]">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="37AABCT1234F1Z5"
                  className="clay-input w-full font-mono px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#2a2622]">
                  UPI ID for Invoice QR
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="tejadigitallabs@okicici"
                  className="clay-input w-full font-mono px-3.5 py-2.5 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="clay-btn-secondary flex items-center gap-1 px-4 py-2.5 text-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="clay-btn-primary flex flex-1 items-center justify-center gap-2 py-2.5 text-xs"
                >
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Create Account</span>
                </button>
              </div>
            </>
          )}
          {error && (
            <p className="rounded-xl border border-[#b8623f]/30 bg-[#b8623f]/10 px-3 py-2 text-xs font-semibold text-[#b8623f]">
              {error}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
