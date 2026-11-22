'use client';

import { useState } from 'react';
import { Loader2, Columns2 } from 'lucide-react';
import { ApiErrorPayload, FollowUpDraft, FollowUpTone, LedgerEntry } from '@/types';

interface Props {
  entries: LedgerEntry[];
  onServiceError: (err: ApiErrorPayload) => void;
}

export default function SideBySideCompare({ entries, onServiceError }: Props) {
  const invoices = entries.filter((e) => e.type === 'invoice');
  const [selectedId, setSelectedId] = useState(
    invoices.find((i) => i.status !== 'paid')?.id || invoices[0]?.id || ''
  );
  const [tone, setTone] = useState<FollowUpTone>('firm');
  const [withMemoryDraft, setWithMemoryDraft] = useState<FollowUpDraft | null>(null);
  const [withoutMemoryDraft, setWithoutMemoryDraft] = useState<FollowUpDraft | null>(null);
  const [loading, setLoading] = useState(false);

  const runComparison = async () => {
    if (!selectedId || loading) return;
    setLoading(true);
    try {
      const [memRes, coldRes] = await Promise.all([
        fetch('/api/followup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entryId: selectedId, tone, useMemory: true }),
        }),
        fetch('/api/followup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entryId: selectedId, tone, useMemory: false }),
        }),
      ]);

      const memData = await memRes.json();
      const coldData = await coldRes.json();

      if (!memRes.ok) {
        onServiceError({
          service: memData?.service || 'groq',
          statusCode: memData?.statusCode || memRes.status,
          error: memData?.error || 'Comparison failed',
          rawError: memData?.rawError,
        });
        return;
      }
      if (!coldRes.ok) {
        onServiceError({
          service: coldData?.service || 'groq',
          statusCode: coldData?.statusCode || coldRes.status,
          error: coldData?.error || 'Baseline comparison failed',
          rawError: coldData?.rawError,
        });
        return;
      }

      setWithMemoryDraft(memData.draft);
      setWithoutMemoryDraft(coldData.draft);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="clay-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Columns2 className="h-4 w-4 text-[#b8623f]" />
          <h2 className="font-heading text-base font-bold text-[#2a2622]">
            Side-by-Side Memory Contrast
          </h2>
        </div>
        <p className="mb-4 text-xs text-[#5c554e]">
          Compare a grounded follow-up backed by ledger history and UPI details against a generic cold baseline.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="clay-input px-3.5 py-2 text-xs font-semibold"
          >
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.id.toUpperCase()} · {inv.partyName} (INR {inv.totalAmount.toLocaleString('en-IN')})
              </option>
            ))}
          </select>

          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as FollowUpTone)}
            className="clay-input px-3.5 py-2 text-xs font-semibold capitalize"
          >
            <option value="polite">Polite</option>
            <option value="firm">Firm</option>
            <option value="urgent">Urgent</option>
          </select>

          <button
            type="button"
            onClick={runComparison}
            disabled={loading || !selectedId}
            className="clay-btn-primary flex items-center gap-2 px-4 py-2 text-xs"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Generate Side-by-Side Comparison
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="clay-card p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#47594a]">
              With SoloOps Memory
            </span>
            <span className="rounded-full bg-[#7d9080]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#435747]">
              Grounded Context
            </span>
          </div>
          {withMemoryDraft ? (
            <div className="space-y-3 text-xs">
              <p className="font-mono text-[11px] text-[#5c554e]">
                {withMemoryDraft.provenanceNote}
              </p>
              <div className="clay-inset p-3.5">
                <p className="mb-1 text-[11px] font-bold uppercase text-[#5c554e]">
                  WhatsApp Draft
                </p>
                <p className="whitespace-pre-wrap text-[#2a2622]">
                  {withMemoryDraft.whatsappMessage}
                </p>
              </div>
              <div className="clay-inset p-3.5">
                <p className="mb-1 text-[11px] font-bold uppercase text-[#5c554e]">
                  Email ({withMemoryDraft.subject})
                </p>
                <p className="whitespace-pre-wrap text-[#2a2622]">
                  {withMemoryDraft.emailBody}
                </p>
              </div>
            </div>
          ) : (
            <div className="clay-inset p-5 text-xs text-[#5c554e]">
              Click Generate Side-by-Side Comparison to inspect the memory-grounded outreach draft.
            </div>
          )}
        </div>

        <div className="clay-card p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5c554e]">
              Without Memory (Cold Baseline)
            </span>
            <span className="rounded-full bg-[#e8e2d5] px-2.5 py-0.5 text-[11px] font-semibold text-[#5c554e]">
              No History
            </span>
          </div>
          {withoutMemoryDraft ? (
            <div className="space-y-3 text-xs">
              <p className="font-mono text-[11px] text-[#5c554e]">
                {withoutMemoryDraft.provenanceNote}
              </p>
              <div className="clay-inset p-3.5">
                <p className="mb-1 text-[11px] font-bold uppercase text-[#5c554e]">
                  WhatsApp Draft
                </p>
                <p className="whitespace-pre-wrap text-[#2a2622]">
                  {withoutMemoryDraft.whatsappMessage}
                </p>
              </div>
              <div className="clay-inset p-3.5">
                <p className="mb-1 text-[11px] font-bold uppercase text-[#5c554e]">
                  Email ({withoutMemoryDraft.subject})
                </p>
                <p className="whitespace-pre-wrap text-[#2a2622]">
                  {withoutMemoryDraft.emailBody}
                </p>
              </div>
            </div>
          ) : (
            <div className="clay-inset p-5 text-xs text-[#5c554e]">
              Baseline output with no historical ledger or client context will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
