'use client';

import { useEffect, useState } from 'react';
import { Send, TrendingUp, Clock3, Wallet, Gauge, Download, Percent } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';
import { FollowUpTone, LedgerEntry, ReceivablesReport } from '@/types';

interface Props {
  /** Changes whenever the ledger changes, so the report refreshes. */
  refreshKey: string;
  onOpenFollowUp: (entry: LedgerEntry, tone: FollowUpTone) => void;
}

const inr = (n: number) => `INR ${n.toLocaleString('en-IN')}`;

const TONE_STYLE: Record<FollowUpTone, string> = {
  polite: 'bg-[#7d9080]/20 text-[#435747] border-[#7d9080]/40',
  firm: 'bg-[#d99b26]/15 text-[#8a5d06] border-[#d99b26]/35',
  urgent: 'bg-[#b8623f]/15 text-[#9e5031] border-[#b8623f]/35',
};

const BUCKET_COLOR = ['#7d9080', '#d99b26', '#c9793f', '#b8623f', '#8f3f22'];

export default function ReceivablesTab({ refreshKey, onOpenFollowUp }: Props) {
  const [report, setReport] = useState<ReceivablesReport | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/receivables')
      .then((res) => {
        if (!res.ok) throw new Error('bad status');
        return res.json();
      })
      .then((data: ReceivablesReport) => {
        if (!active) return;
        setReport(data);
        setFailed(false);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (failed && !report) {
    return (
      <div className="clay-card p-5 text-xs text-[#9e5031]">
        Could not load receivables intelligence. Please retry.
      </div>
    );
  }
  if (!report) {
    return (
      <div className="space-y-4">
        <CardSkeleton rows={2} />
        <CardSkeleton rows={5} />
      </div>
    );
  }

  const maxBucket = Math.max(1, ...report.aging.map((b) => b.amount));
  const cards = [
    { icon: Wallet, label: 'Outstanding', value: inr(report.summary.totalOutstanding) },
    { icon: Clock3, label: 'Overdue', value: inr(report.summary.totalOverdue) },
    { icon: TrendingUp, label: 'Expected in 30 days', value: inr(report.summary.expectedNext30) },
    { icon: Gauge, label: 'Collection efficiency', value: `${report.summary.collectionEfficiency}%` },
    { icon: Percent, label: 'Accrued late fees', value: inr(report.summary.accruedLateFees) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="clay-card p-4">
            <c.icon className="h-4 w-4 text-[#b8623f]" />
            <p className="mt-2 text-xs font-semibold text-[#5c554e]">{c.label}</p>
            <p className="mt-0.5 font-mono text-sm font-bold text-[#2a2622]">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="clay-card space-y-3 p-5">
        <h2 className="font-heading text-base font-bold text-[#2a2622]">Receivables Aging</h2>
        {report.aging.map((b, i) => (
          <div key={b.key}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-semibold text-[#2a2622]">
                {b.label} <span className="text-[#5c554e]">({b.count})</span>
              </span>
              <span className="font-mono text-[#2a2622]">{inr(b.amount)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#e8e2d5]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(b.amount / maxBucket) * 100}%`,
                  backgroundColor: BUCKET_COLOR[i],
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="clay-card space-y-3 p-5">
        <div>
          <h2 className="font-heading text-base font-bold text-[#2a2622]">Cash Flow Forecast</h2>
          <p className="text-xs text-[#5c554e]">
            Inflows are weighted by each client&apos;s reliability score and expected payment delay.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {report.forecast.map((f) => (
            <div key={f.horizonDays} className="clay-inset p-4">
              <p className="text-xs font-semibold text-[#5c554e]">Next {f.horizonDays} days</p>
              <p className="mt-1 font-mono text-sm font-bold text-[#47594a]">
                + {inr(f.expectedInflow)}
              </p>
              <p className="font-mono text-xs text-[#9e5031]">- {inr(f.pendingOutflow)}</p>
              <p className="mt-1 border-t border-[#d8cfc0] pt-1 font-mono text-xs font-bold text-[#2a2622]">
                Net {inr(f.net)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="clay-card space-y-3 p-5">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-base font-bold text-[#2a2622]">Smart Collections Queue</h2>
            <a href="/api/reports?type=aging" className="clay-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              Export aging CSV
            </a>
          </div>
          <p className="text-xs text-[#5c554e]">
            Unpaid invoices ranked by amount, days overdue and client reliability.
          </p>
        </div>
        {report.queue.length === 0 ? (
          <p className="text-xs text-[#5c554e]">All invoices are settled. Nothing to chase.</p>
        ) : (
          <ul className="divide-y divide-[#d8cfc0]">
            {report.queue.map((q, idx) => (
              <li key={q.entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#2a2622]">
                    {idx + 1}. {q.entry.partyName}{' '}
                    <span className="font-mono text-xs text-[#5c554e]">
                      {q.entry.id.toUpperCase()}
                    </span>
                  </p>
                  <p className="text-xs text-[#5c554e]">
                    {q.reason}
                    {q.lateFee > 0 ? ` · late fee INR ${q.lateFee.toLocaleString('en-IN')}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#2a2622]">
                    {inr(q.entry.totalAmount)}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${TONE_STYLE[q.recommendedTone]}`}
                  >
                    {q.recommendedTone}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenFollowUp(q.entry, q.recommendedTone)}
                    className="clay-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Draft
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
