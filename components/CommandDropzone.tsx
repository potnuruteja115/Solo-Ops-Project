'use client';

import { useState } from 'react';
import { Sparkles, Loader2, ArrowRight, Zap } from 'lucide-react';
import { ApiErrorPayload, LedgerEntry } from '@/types';

export const DEMO_PRESETS = [
  {
    label: 'Client WhatsApp',
    text: 'Hey Teja, loved the Next.js landing page! Please send over the invoice for INR 45,000 + 18% GST to NexaTech Labs. We will clear it by next Friday.',
  },
  {
    label: 'AWS Receipt',
    text: 'AWS Cloud Services Bill - Nov 2026 - EC2 and S3 Hosting - Paid INR 4,200 + 18% GST via HDFC Card on 2026-11-18. Category Software.',
  },
  {
    label: 'Overdue Retainer',
    text: 'Follow up: PixelCraft Studio still owes INR 30,000 + 18% GST for October UI/UX Retainer. Due date was 2026-11-10, mark as overdue.',
  },
  {
    label: 'Flight Expense',
    text: 'IndiGo flight booking Visakhapatnam to Bengaluru for client demo INR 6,850 + 5% tax paid on 2026-11-19. Category Travel.',
  },
];

interface Props {
  input: string;
  onInputChange: (val: string) => void;
  onEntryCreated: (entry: LedgerEntry, provenanceNote?: string) => void;
  onServiceError: (err: ApiErrorPayload) => void;
  externalLoading?: boolean;
}

export default function CommandDropzone({
  input,
  onInputChange,
  onEntryCreated,
  onServiceError,
  externalLoading = false,
}: Props) {
  const [loading, setLoading] = useState(false);

  const executeParse = async (textOverride?: string) => {
    const payload = (textOverride ?? input).trim();
    if (!payload || loading || externalLoading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        onServiceError({
          service: data?.service || 'groq',
          statusCode: data?.statusCode || res.status,
          error: data?.error || 'Failed to parse input',
          rawError: data?.rawError,
        });
        return;
      }

      const prov = data?.provenance
        ? `Source ${data.provenance.sourceDocumentId} (${data.provenance.sourceDate})${
            data.provenance.memoryRetained ? ' · Retained in Hindsight' : ' · Saved to Ledger'
          }`
        : undefined;

      onEntryCreated(data.entry, prov);
      onInputChange('');
    } catch (err) {
      onServiceError({
        service: 'groq',
        statusCode: 500,
        error: String((err as { message?: string })?.message || 'Network error'),
      });
    } finally {
      setLoading(false);
    }
  };

  const busy = loading || externalLoading;

  return (
    <div className="clay-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#b8623f]" />
          <h2 className="font-heading text-base font-bold text-[#2a2622]">
            Universal Command Dropzone
          </h2>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {DEMO_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={busy}
              onClick={() => {
                onInputChange(preset.text);
                executeParse(preset.text);
              }}
              className="clay-btn-secondary inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs disabled:opacity-45"
            >
              <Zap className="h-3 w-3 text-[#b8623f]" />
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <textarea
          rows={3}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              executeParse();
            }
          }}
          placeholder="Paste a messy client WhatsApp message, email, or expense receipt. SoloOps extracts GST, links the client, records provenance, and builds the ledger entry."
          className="clay-input w-full resize-none p-4 pr-36 text-sm"
        />
        <button
          type="button"
          onClick={() => executeParse()}
          disabled={busy || !input.trim()}
          className="clay-btn-primary absolute bottom-3 right-3 flex items-center gap-1.5 px-4 py-2 text-xs disabled:opacity-45"
        >
          {busy ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Parsing...
            </>
          ) : (
            <>
              Execute
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
