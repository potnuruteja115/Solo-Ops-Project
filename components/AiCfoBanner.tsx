'use client';

import { useState } from 'react';
import { Loader2, ShieldAlert, Sparkles } from 'lucide-react';
import { ApiErrorPayload, CfoInsight, LedgerEntry } from '@/types';

interface Props {
  entries: LedgerEntry[];
  onServiceError: (err: ApiErrorPayload) => void;
  externalTrigger?: number;
}

export default function AiCfoBanner({
  entries,
  onServiceError,
}: Props) {
  const [insight, setInsight] = useState<CfoInsight | null>(null);
  const [loading, setLoading] = useState(false);

  const runAudit = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      const data = await res.json();
      if (!res.ok) {
        onServiceError({
          service: data?.service || 'groq',
          statusCode: data?.statusCode || res.status,
          error: data?.error || 'AI CFO audit failed',
          rawError: data?.rawError,
        });
        return;
      }
      setInsight(data.insight);
    } catch (err) {
      onServiceError({
        service: 'groq',
        statusCode: 500,
        error: String((err as { message?: string })?.message || 'Audit request failed'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="clay-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7d9080]/20 text-[#47594a]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-base font-bold text-[#2a2622]">
              AI CFO Executive Audit
            </h2>
            <p className="text-xs text-[#5c554e]">
              Cash-flow health score, GST reserve check, and priority receivable action
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={runAudit}
          disabled={loading}
          className="clay-btn-sage flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Auditing...
            </>
          ) : (
            <span>{insight ? 'Refresh Audit' : 'Run AI CFO Audit'}</span>
          )}
        </button>
      </div>

      {insight && (
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#d8cfc0] pt-4 md:grid-cols-3">
          <div className="clay-inset p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5c554e]">
                Health Score
              </span>
              <span className="font-mono text-sm font-bold text-[#47594a]">
                {insight.healthScore}/100
              </span>
            </div>
            <p className="mt-1 text-sm font-bold text-[#2a2622]">
              {insight.headline}
            </p>
            <p className="mt-1 text-xs text-[#5c554e]">
              {insight.cashFlowSummary}
            </p>
          </div>

          <div className="clay-inset p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#47594a]">
              GST Reserve & Risk Account
            </span>
            <p className="mt-1 text-xs font-semibold text-[#2a2622]">
              Top Risk: {insight.topRiskClient}
            </p>
            <p className="mt-1 text-xs text-[#5c554e]">
              {insight.gstReserveAlert}
            </p>
          </div>

          <div className="clay-inset p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#b8623f]">
              <ShieldAlert className="h-3.5 w-3.5" />
              Priority Actions
            </div>
            <ul className="mt-1.5 space-y-1 text-xs text-[#2a2622]">
              {insight.priorityActions.map((act, idx) => (
                <li key={idx}>· {act}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
