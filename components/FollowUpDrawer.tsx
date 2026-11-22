'use client';

import { useEffect, useState } from 'react';
import { X, Copy, Check, Loader2, ExternalLink } from 'lucide-react';
import { ApiErrorPayload, FollowUpDraft, FollowUpTone, LedgerEntry } from '@/types';

interface Props {
  entry: LedgerEntry | null;
  onClose: () => void;
  onServiceError: (err: ApiErrorPayload) => void;
  /** Tone pre-selected when the drawer opens (e.g. from the collections queue). */
  initialTone?: FollowUpTone;
}

export default function FollowUpDrawer({
  entry,
  onClose,
  onServiceError,
  initialTone,
}: Props) {
  const [picked, setPicked] = useState<{ id: string; tone: FollowUpTone } | null>(null);
  const tone: FollowUpTone =
    entry && picked?.id === entry.id ? picked.tone : (initialTone ?? 'polite');
  const setTone = (t: FollowUpTone) => {
    if (entry) setPicked({ id: entry.id, tone: t });
  };
  const [result, setResult] = useState<{
    key: string;
    draft: FollowUpDraft | null;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const requestKey = entry ? `${entry.id}:${tone}` : '';
  const current = result?.key === requestKey ? result : null;
  const draft = current?.draft ?? null;
  const loading = !!entry && !current;

  useEffect(() => {
    if (!entry) return;
    let active = true;
    const key = `${entry.id}:${tone}`;

    fetch('/api/followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId: entry.id, tone, useMemory: true }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          onServiceError({
            service: data?.service || 'groq',
            statusCode: data?.statusCode || res.status,
            error: data?.error || 'Failed to generate follow-up',
            rawError: data?.rawError,
          });
          setResult({ key, draft: null });
          return;
        }
        setResult({ key, draft: data.draft });
      })
      .catch(() => {
        if (active) setResult({ key, draft: null });
      });

    return () => {
      active = false;
    };
  }, [entry, tone, onServiceError]);

  if (!entry) return null;

  const copyText = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex justify-end bg-[#2a2622]/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Payment Follow-Up Drawer"
    >
      <div className="clay-card flex h-full w-full max-w-md flex-col rounded-none rounded-l-[24px] p-6">
        <div className="mb-4 flex items-center justify-between border-b border-[#d8cfc0] pb-4">
          <div>
            <h3 className="font-heading text-lg font-bold text-[#2a2622]">
              Payment Follow-Up
            </h3>
            <p className="text-xs text-[#5c554e]">
              {entry.partyName} · INR {entry.totalAmount.toLocaleString('en-IN')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="clay-btn-secondary p-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          {(['polite', 'firm', 'urgent'] as FollowUpTone[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              className={`rounded-xl py-2 text-xs font-semibold capitalize transition ${
                tone === t
                  ? 'bg-[#b8623f] text-white'
                  : 'bg-[#e8e2d5] text-[#5c554e] hover:text-[#2a2622]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading || !draft ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-xs text-[#5c554e]">
            <Loader2 className="h-4 w-4 animate-spin text-[#b8623f]" />
            Drafting {tone} follow-up...
          </div>
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto clay-scroll pr-1">
            <div className="clay-inset p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-[#47594a]">
                  WhatsApp Message
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(draft.whatsappMessage)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#47594a] hover:underline"
                  >
                    WhatsApp <ExternalLink className="h-3 w-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => copyText('wa', draft.whatsappMessage)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#5c554e] hover:text-[#2a2622]"
                  >
                    {copied === 'wa' ? (
                      <Check className="h-3.5 w-3.5 text-[#47594a]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied === 'wa' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#2a2622]">
                {draft.whatsappMessage}
              </p>
            </div>

            <div className="clay-inset p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-[#5c554e]">
                  Email Draft
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={`mailto:?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.emailBody)}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#b8623f] hover:underline"
                  >
                    Mail <ExternalLink className="h-3 w-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        'email',
                        `Subject: ${draft.subject}\n\n${draft.emailBody}`
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#5c554e] hover:text-[#2a2622]"
                  >
                    {copied === 'email' ? (
                      <Check className="h-3.5 w-3.5 text-[#47594a]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied === 'email' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <p className="mb-1.5 text-xs font-bold text-[#2a2622]">
                Subject: {draft.subject}
              </p>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#2a2622]">
                {draft.emailBody}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
