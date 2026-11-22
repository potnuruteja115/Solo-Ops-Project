'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Pause, Play, Trash2, Zap } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';
import { ClientProfile, RecurringFrequency, RecurringTemplate } from '@/types';

interface TemplateRow extends RecurringTemplate {
  company: string;
  nextRunDate: string | null;
  dueNow: number;
}

interface Props {
  clients: ClientProfile[];
  refreshKey: string;
  defaults: { taxRate: number; termsDays: number };
  /** Called after invoices are generated so the ledger reloads. */
  onGenerated: (count: number) => void;
}

const inr = (n: number) => `INR ${n.toLocaleString('en-IN')}`;
const today = () => new Date().toISOString().split('T')[0];

export default function RecurringTab({ clients, refreshKey, defaults, onGenerated }: Props) {
  const [rows, setRows] = useState<TemplateRow[] | null>(null);
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [taxRate, setTaxRate] = useState(String(defaults.taxRate));
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [startDate, setStartDate] = useState(today());
  const [termsDays, setTermsDays] = useState(String(defaults.termsDays));

  useEffect(() => {
    let active = true;
    fetch('/api/recurring')
      .then((r) => r.json())
      .then((d) => active && setRows(d.templates))
      .catch(() => active && setRows([]));
    return () => {
      active = false;
    };
  }, [refreshKey, version]);

  const refresh = () => setVersion((v) => v + 1);
  const call = async (method: string, body?: unknown, query = '') => {
    const res = await fetch(`/api/recurring${query}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { ok: res.ok, json: await res.json() };
  };

  const create = async () => {
    setBusy(true);
    setMessage(null);
    const { ok, json } = await call('POST', {
      clientId: clientId || clients[0]?.id,
      description,
      amount: Number(amount),
      taxRate: Number(taxRate),
      frequency,
      startDate,
      termsDays: Number(termsDays),
    });
    setBusy(false);
    if (!ok) return setMessage(json?.error || 'Could not create the schedule.');
    setDescription('');
    setAmount('');
    setMessage('Schedule created.');
    refresh();
  };

  const runDue = async () => {
    setBusy(true);
    const { json } = await call('POST', { action: 'run' });
    setBusy(false);
    setMessage(json.count ? `Generated ${json.count} invoice(s).` : 'Nothing is due yet.');
    if (json.count) onGenerated(json.count);
    refresh();
  };

  const totalDue = (rows ?? []).reduce((s, r) => s + r.dueNow, 0);

  return (
    <div className="space-y-6">
      <div className="clay-card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-heading text-base font-bold text-[#2a2622]">Recurring Invoices</h2>
          <p className="text-xs text-[#5c554e]">
            Retainers and subscriptions bill themselves on schedule. Month-end dates are handled correctly.
          </p>
        </div>
        <button
          type="button"
          onClick={runDue}
          disabled={busy || totalDue === 0}
          className="clay-btn-primary flex items-center gap-1.5 px-4 py-2 text-xs disabled:opacity-50"
        >
          <Zap className="h-3.5 w-3.5" />
          Generate due invoices{totalDue ? ` (${totalDue})` : ''}
        </button>
      </div>

      {message && <div className="clay-card-flat px-4 py-2.5 text-xs font-semibold" role="status">{message}</div>}

      <div className="clay-card space-y-3 p-5">
        <h3 className="text-xs font-bold uppercase text-[#5c554e]">New schedule</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="clay-input px-3 py-2 text-xs" aria-label="Client">
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.company}</option>
            ))}
          </select>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description, e.g. Monthly retainer" className="clay-input px-3 py-2 text-xs sm:col-span-1 lg:col-span-2" />
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="Amount (INR, before GST)" className="clay-input px-3 py-2 text-xs" />
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringFrequency)} className="clay-input px-3 py-2 text-xs" aria-label="Frequency">
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="clay-input px-3 py-2 text-xs" aria-label="First invoice date" />
          <input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} inputMode="numeric" placeholder="GST %" className="clay-input px-3 py-2 text-xs" aria-label="GST rate" />
          <input value={termsDays} onChange={(e) => setTermsDays(e.target.value)} inputMode="numeric" placeholder="Payment terms (days)" className="clay-input px-3 py-2 text-xs" aria-label="Payment terms in days" />
          <button type="button" onClick={create} disabled={busy || !description.trim() || !amount} className="clay-btn-secondary px-3 py-2 text-xs disabled:opacity-50">
            Create schedule
          </button>
        </div>
      </div>

      {!rows ? (
        <CardSkeleton rows={3} />
      ) : rows.length === 0 ? (
        <div className="clay-card p-5 text-xs text-[#5c554e]">No schedules yet. Create one above.</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="clay-card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#2a2622]">
                  <CalendarClock className="h-4 w-4 text-[#b8623f]" />
                  {r.company}
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${r.active ? 'border-[#7d9080]/40 bg-[#7d9080]/20 text-[#435747]' : 'border-[#d8cfc0] bg-[#e8e2d5] text-[#5c554e]'}`}>
                    {r.active ? 'Active' : 'Paused'}
                  </span>
                </p>
                <p className="text-xs text-[#5c554e]">
                  {r.description} · {inr(r.amount)} + {r.taxRate}% GST · {r.frequency}
                </p>
                <p className="font-mono text-[11px] text-[#5c554e]">
                  {r.nextRunDate ? `Next: ${r.nextRunDate}` : 'Schedule ended'} · {r.runCount} generated
                  {r.dueNow > 0 ? ` · ${r.dueNow} due now` : ''}
                </p>
              </div>
              <div className="flex gap-1.5">
                <button type="button" title={r.active ? 'Pause' : 'Resume'} onClick={async () => { await call('PATCH', { id: r.id, active: !r.active }); refresh(); }} className="clay-btn-secondary p-2">
                  {r.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
                <button type="button" title="Delete schedule" onClick={async () => { await call('DELETE', undefined, `?id=${encodeURIComponent(r.id)}`); refresh(); }} className="clay-btn-secondary p-2">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
