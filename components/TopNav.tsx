'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  UserPlus,
  LogOut,
  ShieldCheck,
  Settings,
  Database,
} from 'lucide-react';
import AlertsBell from '@/components/AlertsBell';
import { Logo } from '@/components/Logo';
import { AppAlert } from '@/types';

interface TopNavProps {
  businessName?: string;
  userName?: string;
  onOpenPalette: () => void;
  onOpenNewClient: () => void;
  onFocusDropzone?: () => void;
  /** Called when an alert is chosen. Defaults to opening the matching workspace tab. */
  onNavigateAlert?: (alert: AppAlert) => void;
  /** Changes when the books change so alerts refresh. */
  refreshKey?: string;
}

export default function TopNav({
  businessName,
  userName,
  onOpenPalette,
  onOpenNewClient,
  onFocusDropzone,
  onNavigateAlert,
  refreshKey,
}: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<{ name: string; businessName: string } | null>(null);
  const [status, setStatus] = useState<{ groq: boolean; hindsight: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => active && d?.user && setProfile(d.user))
      .catch(() => {});
    fetch('/api/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => active && d && setStatus(d))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const shownBusiness = businessName ?? profile?.businessName ?? 'Your Studio';
  const shownUser = userName ?? profile?.name ?? '';
  const goToAlert = (a: AppAlert) =>
    onNavigateAlert ? onNavigateAlert(a) : router.push(`/app?tab=${a.tab ?? 'receivables'}${a.clientId ? `&client=${a.clientId}` : ''}`);

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    router.push('/login');
  };

  return (
    <header className="no-print clay-card sticky top-3 z-30 mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3.5">
      <div className="flex items-center gap-3">
        <Link href="/app" aria-label="SoloOps Home">
          <Logo size="md" showText={false} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-heading text-lg font-bold tracking-tight text-[#2a2622]">
              SoloOps
            </span>
            <span className="rounded-full border border-[#d8cfc0] bg-[#e8e2d5] px-2.5 py-0.5 font-mono text-[11px] font-medium text-[#5c554e]">
              {shownBusiness}
            </span>
          </div>
          <p className="text-xs text-[#5c554e]">
            Autonomous One-Person Back Office{shownUser ? ` · ${shownUser}` : ''}
          </p>
        </div>
      </div>

      <nav className="flex items-center gap-1.5" aria-label="Primary Navigation">
        <Link
          href="/app"
          className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
            pathname === '/app'
              ? 'bg-[#2a2622] text-[#fffaf5]'
              : 'text-[#5c554e] hover:bg-[#e8e2d5] hover:text-[#2a2622]'
          }`}
        >
          Workspace
        </Link>
        <Link
          href="/overview"
          className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
            pathname === '/overview'
              ? 'bg-[#2a2622] text-[#fffaf5]'
              : 'text-[#5c554e] hover:bg-[#e8e2d5] hover:text-[#2a2622]'
          }`}
        >
          Risk Overview
        </Link>
        <Link
          href="/settings"
          className={`flex items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
            pathname === '/settings'
              ? 'bg-[#2a2622] text-[#fffaf5]'
              : 'text-[#5c554e] hover:bg-[#e8e2d5] hover:text-[#2a2622]'
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          Settings
        </Link>
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onOpenPalette}
          className="clay-btn-secondary flex items-center gap-2 px-3 py-2 text-xs"
          title="Open Command Palette (Ctrl+K)"
        >
          <Search className="h-3.5 w-3.5 text-[#5c554e]" />
          <span>Command</span>
          <kbd className="rounded bg-[#d8cfc0]/70 px-1.5 py-0.5 font-mono text-[10px]">
            Ctrl+K
          </kbd>
        </button>

        <button
          type="button"
          onClick={onOpenNewClient}
          className="clay-btn-secondary flex items-center gap-1.5 px-3 py-2 text-xs"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>New Client</span>
        </button>

        {onFocusDropzone && (
          <button
            type="button"
            onClick={onFocusDropzone}
            className="clay-btn-primary flex items-center gap-1.5 px-3.5 py-2 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Log Entry</span>
          </button>
        )}

        <span
          className={`hidden items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:inline-flex ${
            status?.groq === false
              ? 'border-[#b8623f]/40 bg-[#b8623f]/10 text-[#9e5031]'
              : 'border-[#7d9080]/40 bg-[#7d9080]/15 text-[#47594a]'
          }`}
          title={status?.groq === false ? 'Add GROQ_API_KEY to .env.local to enable AI features' : 'AI features are enabled'}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {status?.groq === false ? 'Groq key missing' : 'Groq Active'}
        </span>
        <span
          className="hidden items-center gap-1 rounded-full border border-[#d8cfc0] bg-[#e8e2d5] px-2.5 py-1 text-[11px] font-semibold text-[#5c554e] md:inline-flex"
          title={status?.hindsight ? 'Long-term memory is connected' : 'Add HINDSIGHT_API_KEY for long-term memory'}
        >
          <Database className="h-3.5 w-3.5" />
          {status?.hindsight ? 'Memory on' : 'Local memory'}
        </span>

        <AlertsBell onNavigate={goToAlert} refreshKey={refreshKey} />

        <button
          type="button"
          onClick={handleLogout}
          className="clay-btn-secondary flex items-center gap-1 px-2.5 py-2 text-xs"
          title="Sign out"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
