'use client';

import { useEffect, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, MessageCircleQuestion, Send } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';
import { AnalyticsReport } from '@/types';

interface Props {
  refreshKey: string;
}

const inr = (n: number) => `INR ${n.toLocaleString('en-IN')}`;
const monthLabel = (m: string) =>
  new Date(`${m}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' });

const LEVEL_STYLE = {
  low: 'bg-[#7d9080]/20 text-[#435747] border-[#7d9080]/40',
  moderate: 'bg-[#d99b26]/15 text-[#8a5d06] border-[#d99b26]/35',
  high: 'bg-[#b8623f]/15 text-[#9e5031] border-[#b8623f]/35',
} as const;

const SUGGESTIONS = [
  'Which client is the biggest risk right now?',
  'How much will I likely collect this month?',
  'What is my profit margin and what drives it?',
];

export default function AnalyticsTab({ refreshKey }: Props) {
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [failed, setFailed] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/analytics')
      .then((r) => {
        if (!r.ok) throw new Error('bad status');
        return r.json();
      })
      .then((d: AnalyticsReport) => {
        if (!active) return;
        setReport(d);
        setFailed(false);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const ask = async (q: string) => {
    if (q.trim().length < 3) return;
    setAsking(true);
    setAskError(null);
    setAnswer(null);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const json = await res.json();
      if (!res.ok) setAskError(json?.error || 'Could not answer that.');
      else setAnswer(json.answer);
    } catch {
      setAskError('Network error. Please try again.');
    } finally {
      setAsking(false);
    }
  };

  if (failed && !report) {
    return <div className="clay-card p-5 text-xs text-[#9e5031]">Could not load analytics. Please retry.</div>;
  }
  if (!report) {
    return (
      <div className="space-y-4">
        <CardSkeleton rows={2} />
        <CardSkeleton rows={6} />
      </div>
    );
  }

  const { kpis, concentration } = report;
  const chartData = report.monthly.map((m) => ({ ...m, label: monthLabel(m.month) }));
  const maxCategory = Math.max(1, ...report.expensesByCategory.map((c) => c.amount));
  const month = report.asOf.slice(0, 7);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Invoiced (ex-GST)', value: inr(kpis.totalInvoiced) },
          { label: 'Expenses (ex-GST)', value: inr(kpis.totalExpenses) },
          { label: 'Net profit', value: inr(kpis.netProfit) },
          { label: 'Profit margin', value: `${kpis.marginPct}%` },
        ].map((c) => (
          <div key={c.label} className="clay-card p-4">
            <p className="text-xs font-semibold text-[#5c554e]">{c.label}</p>
            <p className="mt-1 font-mono text-sm font-bold text-[#2a2622]">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="clay-card p-5">
        <h2 className="font-heading text-base font-bold text-[#2a2622]">Monthly Profit and Loss</h2>
        <p className="mb-3 text-xs text-[#5c554e]">Last 6 months, amounts before GST.</p>
        <div className="h-64 w-full" role="img" aria-label="Monthly invoiced, expenses and net profit chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d8cfc0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5c554e' }} />
              <YAxis tick={{ fontSize: 11, fill: '#5c554e' }} width={55} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v) => inr(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="invoiced" name="Invoiced" fill="#b8623f" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#7d9080" radius={[4, 4, 0, 0]} />
              <Line dataKey="net" name="Net" stroke="#2a2622" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="clay-card space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-[#2a2622]">Client Concentration</h2>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${LEVEL_STYLE[concentration.level]}`}>
              {concentration.level} risk
            </span>
          </div>
          {concentration.level !== 'low' && (
            <p className="text-xs text-[#5c554e]">
              {concentration.topClient} contributes {concentration.topShare}% of revenue. Losing one large client
              would hit cash flow hard.
            </p>
          )}
          {report.revenueByClient.map((c) => (
            <div key={c.partyName}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-semibold text-[#2a2622]">{c.partyName}</span>
                <span className="font-mono text-[#5c554e]">{c.share}% · {inr(c.amount)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#e8e2d5]">
                <div className="h-full rounded-full bg-[#b8623f]" style={{ width: `${c.share}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="clay-card space-y-3 p-5">
          <h2 className="font-heading text-base font-bold text-[#2a2622]">Expenses by Category</h2>
          {report.expensesByCategory.length === 0 && <p className="text-xs text-[#5c554e]">No expenses recorded.</p>}
          {report.expensesByCategory.map((c) => (
            <div key={c.category}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-semibold text-[#2a2622]">{c.category}</span>
                <span className="font-mono text-[#5c554e]">{inr(c.amount)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#e8e2d5]">
                <div className="h-full rounded-full bg-[#7d9080]" style={{ width: `${(c.amount / maxCategory) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="clay-card space-y-3 p-5">
        <div>
          <h2 className="font-heading text-base font-bold text-[#2a2622]">CA Report Pack</h2>
          <p className="text-xs text-[#5c554e]">CSV files your accountant can open directly in Excel or Sheets.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: `GST register (${month})`, href: `/api/reports?type=gst&month=${month}` },
            { label: 'GST register (all)', href: '/api/reports?type=gst' },
            { label: 'Monthly P&L', href: '/api/reports?type=pnl' },
            { label: 'Receivables aging', href: '/api/reports?type=aging' },
            { label: 'Full ledger', href: '/api/ledger?format=csv' },
          ].map((r) => (
            <a key={r.href} href={r.href} className="clay-btn-secondary flex items-center gap-1.5 px-3 py-2 text-xs">
              <Download className="h-3.5 w-3.5" />
              {r.label}
            </a>
          ))}
        </div>
      </div>

      <div className="clay-card space-y-3 p-5">
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="h-4 w-4 text-[#b8623f]" />
          <h2 className="font-heading text-base font-bold text-[#2a2622]">Ask Your Books</h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setQuestion(s);
                ask(s);
              }}
              className="rounded-full border border-[#d8cfc0] bg-[#e8e2d5] px-3 py-1 text-[11px] text-[#5c554e] hover:text-[#2a2622]"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask(question)}
            maxLength={500}
            placeholder="Ask anything about your invoices, clients or cash flow"
            className="clay-input min-w-0 flex-1 px-3 py-2 text-xs"
            aria-label="Question about your books"
          />
          <button
            type="button"
            onClick={() => ask(question)}
            disabled={asking || question.trim().length < 3}
            className="clay-btn-primary flex items-center gap-1.5 px-3.5 py-2 text-xs disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {asking ? 'Thinking...' : 'Ask'}
          </button>
        </div>
        {answer && <div className="clay-inset p-3 text-xs leading-relaxed text-[#2a2622]">{answer}</div>}
        {askError && <p className="text-xs text-[#9e5031]">{askError}</p>}
      </div>
    </div>
  );
}
