'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Zap, ArrowUpRight, Sparkles } from 'lucide-react';
import { DEMO_PRESETS } from '@/components/CommandDropzone';

interface Props {
  open: boolean;
  onClose: () => void;
  onRunPreset: (text: string) => void;
  onRunAudit: () => void;
  /** Jump to a workspace tab. */
  onNavigate?: (tab: string) => void;
  tabs?: Array<{ id: string; label: string }>;
}

export default function CommandPalette({
  open,
  onClose,
  onRunPreset,
  onRunAudit,
  onNavigate,
  tabs = [],
}: Props) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) onClose();
      } else if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const q = query.trim().toLowerCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#2a2622]/45 px-4 pt-20 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Global Command Palette"
    >
      <div className="clay-card w-full max-w-xl overflow-hidden p-5">
        <div className="flex items-center gap-3 border-b border-[#d8cfc0] pb-3">
          <Search className="h-4 w-4 text-[#b8623f]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to view or trigger an AI workflow..."
            className="w-full bg-transparent text-sm text-[#2a2622] placeholder-[#7a7269] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#5c554e] hover:bg-[#e8e2d5]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 max-h-80 overflow-y-auto clay-scroll">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#5c554e]">
              Quick Actions
            </p>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRunAudit();
                }}
                className="clay-inset flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold hover:border-[#b8623f]"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-[#b8623f]" />
                  Run AI CFO Executive Audit
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-[#5c554e]" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push('/overview');
                }}
                className="clay-inset flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold hover:border-[#b8623f]"
              >
                <span>Open Portfolio Cash-Flow Risk Overview</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-[#5c554e]" />
              </button>
            </div>
          </div>

          {onNavigate && tabs.some((t) => !q || t.label.toLowerCase().includes(q)) && (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#5c554e]">
                Go to
              </p>
              <div className="space-y-1.5">
                {tabs
                  .filter((t) => !q || t.label.toLowerCase().includes(q))
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigate(t.id);
                      }}
                      className="clay-inset flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold hover:border-[#b8623f]"
                    >
                      <span>{t.label}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-[#5c554e]" />
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#5c554e]">
              Instant AI Demo Presets
            </p>
            <div className="space-y-1.5">
              {DEMO_PRESETS.filter(
                (p) => !q || p.label.toLowerCase().includes(q) || p.text.toLowerCase().includes(q)
              ).map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    onClose();
                    onRunPreset(preset.text);
                  }}
                  className="clay-inset flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs hover:border-[#b8623f]"
                >
                  <span className="flex items-center gap-2 font-semibold text-[#2a2622]">
                    <Zap className="h-3.5 w-3.5 text-[#b8623f]" />
                    {preset.label}
                  </span>
                  <span className="ml-3 truncate text-[11px] text-[#5c554e]">
                    {preset.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
