'use client';

import { useEffect, useState } from 'react';
import { BrainCircuit, CheckCircle2, ClipboardList, Search, Sparkles, XCircle } from 'lucide-react';
import {
  CallOutcome,
  ClientNote,
  ClientProfile,
  PaymentPromise,
  PromiseStats,
  PromiseStatus,
} from '@/types';

interface Props {
  client: ClientProfile | null;
}

interface IntelData {
  key: string;
  promises: PaymentPromise[];
  notes: ClientNote[];
  stats: PromiseStats;
}

interface MemoryResult {
  hindsightConfigured: boolean;
  facts: string[];
  reflection: string;
  local: Array<{ kind: 'note' | 'promise'; date: string; text: string; sourceId: string }>;
}

const STATUS_STYLE: Record<PromiseStatus, string> = {
  kept: 'bg-[#7d9080]/20 text-[#435747] border-[#7d9080]/40',
  broken: 'bg-[#b8623f]/15 text-[#9e5031] border-[#b8623f]/35',
  pending: 'bg-[#d99b26]/15 text-[#8a5d06] border-[#d99b26]/35',
};

const OUTCOME_LABEL: Record<CallOutcome, string> = {
  advanced: 'Advanced',
  stalled: 'Stalled',
  lost_ground: 'Lost ground',
};

const today = () => new Date().toISOString().split('T')[0];

export default function ClientIntelTab({ client }: Props) {
  const [data, setData] = useState<IntelData | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [debriefOpen, setDebriefOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState<CallOutcome>('advanced');
  const [callDate, setCallDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [promiseText, setPromiseText] = useState('');
  const [promiseDue, setPromiseDue] = useState('');

  const [query, setQuery] = useState('');
  const [asking, setAsking] = useState(false);
  const [memory, setMemory] = useState<MemoryResult | null>(null);

  const clientId = client?.id;
  const requestKey = clientId ? `${clientId}:${version}` : '';

  useEffect(() => {
    if (!clientId) return;
    let active = true;
    const key = `${clientId}:${version}`;
    fetch(`/api/promises?clientId=${encodeURIComponent(clientId)}`)
      .then((res) => res.json())
      .then((json) => {
        if (active) setData({ key, promises: json.promises, notes: json.notes, stats: json.stats });
      })
      .catch(() => {
        if (active) setError('Could not load client intelligence.');
      });
    return () => {
      active = false;
    };
  }, [clientId, version]);

  if (!client) {
    return (
      <div className="clay-card p-6 text-sm text-[#5c554e]">
        Select a client from the directory to see their promise history, call timeline and memory.
      </div>
    );
  }

  const current = data?.key === requestKey ? data : null;
  const refresh = () => setVersion((v) => v + 1);

  const submitDebrief = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch('/api/debrief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, rawNotes: notes, outcome, date: callDate }),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice(json?.error || 'Could not save the debrief.');
        return;
      }
      setNotice(
        json.extractionWarning
          ? `Note saved. ${json.extractionWarning}`
          : `Saved. Extracted ${json.promises.length} promise(s).`
      );
      setNotes('');
      setDebriefOpen(false);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: string, status: PromiseStatus) => {
    await fetch('/api/promises', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    refresh();
  };

  const addPromise = async () => {
    if (!promiseText.trim()) return;
    await fetch('/api/promises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: client.id, text: promiseText, dueDate: promiseDue || undefined }),
    });
    setPromiseText('');
    setPromiseDue('');
    refresh();
  };

  const ask = async (mode: 'recall' | 'reflect') => {
    if (!query.trim()) return;
    setAsking(true);
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, query, mode }),
      });
      setMemory(await res.json());
    } finally {
      setAsking(false);
    }
  };

  const noteDate = (id?: string) => current?.notes.find((n) => n.id === id)?.date;
  const stats = current?.stats;

  return (
    <div className="space-y-6">
      <div className="clay-card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-heading text-lg font-bold text-[#2a2622]">{client.company}</h2>
          <p className="text-xs text-[#5c554e]">
            {client.name}, {client.role} · reliability {client.reliabilityScore}/100
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDebriefOpen((o) => !o)}
          className="clay-btn-primary flex items-center gap-1.5 px-4 py-2 text-xs"
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Log Call Debrief
        </button>
      </div>

      {notice && <div className="clay-card-flat px-4 py-2.5 text-xs font-semibold">{notice}</div>}
      {error && <div className="clay-card p-4 text-xs text-[#9e5031]">{error}</div>}

      {debriefOpen && (
        <div className="clay-card space-y-3 p-5">
          <p className="text-xs text-[#5c554e]">
            Paste notes from a call, WhatsApp chat or email. Promises and open questions are
            extracted automatically and saved to memory.
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder="Spoke to Rohan. He said payment will be released by next Friday..."
            className="clay-input w-full px-3.5 py-2.5 text-sm"
          />
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={callDate}
              onChange={(e) => setCallDate(e.target.value)}
              className="clay-input px-3 py-2 text-xs"
            />
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as CallOutcome)}
              className="clay-input px-3 py-2 text-xs"
            >
              {(Object.keys(OUTCOME_LABEL) as CallOutcome[]).map((o) => (
                <option key={o} value={o}>
                  {OUTCOME_LABEL[o]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={saving || !notes.trim()}
              onClick={submitDebrief}
              className="clay-btn-primary px-4 py-2 text-xs disabled:opacity-50"
            >
              {saving ? 'Extracting...' : 'Extract and Save'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Promises kept', value: stats?.kept ?? '-' },
          { label: 'Promises broken', value: stats?.broken ?? '-' },
          { label: 'Pending', value: stats?.pending ?? '-' },
          { label: 'Keep rate', value: stats?.keepRate == null ? 'n/a' : `${stats.keepRate}%` },
        ].map((s) => (
          <div key={s.label} className="clay-card p-4">
            <p className="text-xs font-semibold text-[#5c554e]">{s.label}</p>
            <p className="mt-1 font-mono text-lg font-bold text-[#2a2622]">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="clay-card space-y-3 p-5">
        <h3 className="font-heading text-base font-bold text-[#2a2622]">Commitments and Promises</h3>
        {!current ? (
          <p className="text-xs text-[#5c554e]">Loading...</p>
        ) : current.promises.length === 0 ? (
          <p className="text-xs text-[#5c554e]">No promises recorded yet. Log a call debrief to start.</p>
        ) : (
          <ul className="space-y-2">
            {current.promises.map((p) => (
              <li key={p.id} className="clay-inset flex flex-wrap items-start justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#2a2622]">{p.text}</p>
                  <p className="mt-0.5 text-xs text-[#5c554e]">
                    {p.owner === 'client' ? 'Client promise' : 'Our promise'}
                    {p.dueDate ? ` · due ${p.dueDate}` : ''}
                    {noteDate(p.sourceNoteId) ? ` · Source: ${noteDate(p.sourceNoteId)} call` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[p.status]}`}>
                    {p.status}
                  </span>
                  <button type="button" title="Mark kept" onClick={() => setStatus(p.id, 'kept')} className="clay-btn-secondary p-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" title="Mark broken" onClick={() => setStatus(p.id, 'broken')} className="clay-btn-secondary p-1.5">
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2 border-t border-[#d8cfc0] pt-3">
          <input
            value={promiseText}
            onChange={(e) => setPromiseText(e.target.value)}
            placeholder="Add a client promise manually"
            className="clay-input min-w-[200px] flex-1 px-3 py-2 text-xs"
          />
          <input type="date" value={promiseDue} onChange={(e) => setPromiseDue(e.target.value)} className="clay-input px-3 py-2 text-xs" />
          <button type="button" onClick={addPromise} className="clay-btn-secondary px-3 py-2 text-xs">
            Add
          </button>
        </div>
      </div>

      <div className="clay-card space-y-3 p-5">
        <h3 className="font-heading text-base font-bold text-[#2a2622]">Call Timeline</h3>
        {current?.notes.length ? (
          <ol className="space-y-3">
            {current.notes.map((n) => (
              <li key={n.id} className="border-l-2 border-[#b8623f]/50 pl-3">
                <p className="font-mono text-xs text-[#5c554e]">
                  {n.date} · {OUTCOME_LABEL[n.outcome]}
                </p>
                <p className="text-sm text-[#2a2622]">{n.summary}</p>
                {n.openQuestions.length > 0 && (
                  <p className="mt-0.5 text-xs text-[#5c554e]">Open: {n.openQuestions.join(' · ')}</p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-[#5c554e]">No calls logged yet.</p>
        )}
      </div>

      <div className="clay-card space-y-3 p-5">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-[#b8623f]" />
          <h3 className="font-heading text-base font-bold text-[#2a2622]">Memory Inspector</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Why do payments from this client get delayed?"
            className="clay-input min-w-[220px] flex-1 px-3 py-2 text-xs"
          />
          <button type="button" disabled={asking} onClick={() => ask('recall')} className="clay-btn-secondary flex items-center gap-1.5 px-3 py-2 text-xs">
            <Search className="h-3.5 w-3.5" />
            Recall
          </button>
          <button type="button" disabled={asking} onClick={() => ask('reflect')} className="clay-btn-primary flex items-center gap-1.5 px-3 py-2 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            Reflect
          </button>
        </div>
        {memory && (
          <div className="space-y-3 text-xs">
            {!memory.hindsightConfigured && (
              <p className="text-[#8a5d06]">
                Hindsight is not configured, so only local history is searched. Add HINDSIGHT_API_KEY for
                long-term memory and reflection.
              </p>
            )}
            {memory.reflection && (
              <div className="clay-inset p-3 text-[#2a2622]">
                <p className="mb-1 font-bold uppercase text-[#5c554e]">Reflection</p>
                {memory.reflection}
              </div>
            )}
            {memory.facts.length > 0 && (
              <ul className="space-y-1.5">
                {memory.facts.map((f, i) => (
                  <li key={i} className="clay-inset p-2.5 text-[#2a2622]">{f}</li>
                ))}
              </ul>
            )}
            {memory.local.length > 0 ? (
              <ul className="space-y-1.5">
                {memory.local.map((m) => (
                  <li key={m.sourceId} className="clay-inset p-2.5 text-[#2a2622]">
                    <span className="font-mono text-[#5c554e]">{m.date} · {m.kind}</span>
                    <br />
                    {m.text}
                  </li>
                ))}
              </ul>
            ) : (
              memory.facts.length === 0 && !memory.reflection && (
                <p className="text-[#5c554e]">Nothing found for that question.</p>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
