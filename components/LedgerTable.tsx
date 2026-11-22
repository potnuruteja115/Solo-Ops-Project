'use client';

import { useState } from 'react';
import {
  FileText,
  Send,
  CheckCircle2,
  Trash2,
  Download,
  Search,
} from 'lucide-react';
import { LedgerEntry } from '@/types';

interface Props {
  entries: LedgerEntry[];
  onTogglePaid: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenInvoice: (entry: LedgerEntry) => void;
  onOpenFollowUp: (entry: LedgerEntry) => void;
}

type FilterTab = 'all' | 'invoice' | 'expense' | 'overdue';

export default function LedgerTable({
  entries,
  onTogglePaid,
  onDelete,
  onOpenInvoice,
  onOpenFollowUp,
}: Props) {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [query, setQuery] = useState('');

  const filtered = entries.filter((entry) => {
    if (filter === 'invoice' && entry.type !== 'invoice') return false;
    if (filter === 'expense' && entry.type !== 'expense') return false;
    if (filter === 'overdue' && entry.status !== 'overdue') return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return (
        entry.partyName.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statusBadge = (status: LedgerEntry['status']) => {
    if (status === 'paid') {
      return 'bg-[#7d9080]/20 text-[#435747] border-[#7d9080]/40';
    }
    if (status === 'overdue') {
      return 'bg-[#b8623f]/15 text-[#9e5031] border-[#b8623f]/35';
    }
    return 'bg-[#d99b26]/15 text-[#8a5d06] border-[#d99b26]/35';
  };

  return (
    <div className="clay-card overflow-hidden p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <h2 className="mr-2 font-heading text-base font-bold text-[#2a2622]">
            Live Ledger ({filtered.length})
          </h2>
          {(['all', 'invoice', 'expense', 'overdue'] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`rounded-xl px-3 py-1 text-xs font-semibold capitalize transition ${
                filter === tab
                  ? 'bg-[#2a2622] text-[#fffaf5]'
                  : 'bg-[#e8e2d5] text-[#5c554e] hover:text-[#2a2622]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2 h-3.5 w-3.5 text-[#7a7269]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search party or work..."
              className="clay-input w-40 py-1.5 pl-8 pr-3 text-xs sm:w-52"
            />
          </div>
          <a
            href="/api/ledger?format=csv"
            className="clay-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </a>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#d8cfc0] text-[11px] font-bold uppercase tracking-wider text-[#5c554e]">
              <th className="py-3 pr-4">Party and Work</th>
              <th className="px-3 py-3">Provenance</th>
              <th className="px-3 py-3">Amount (INR)</th>
              <th className="px-3 py-3">Status</th>
              <th className="py-3 pl-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#d8cfc0]/70">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-xs text-[#5c554e]">
                  No entries match the current filter.
                </td>
              </tr>
            ) : (
              filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#e8e2d5]/45">
                  <td className="py-3.5 pr-4">
                    <p className="font-bold text-[#2a2622]">{entry.partyName}</p>
                    <p className="text-xs text-[#5c554e]">
                      {entry.description} · {entry.category}
                    </p>
                  </td>
                  <td className="px-3 py-3.5 text-xs text-[#5c554e]">
                    <span className="font-mono text-[11px]">
                      {entry.sourceDocumentId}
                    </span>
                    <span className="block text-[11px]">
                      Date: {entry.sourceDate}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 font-mono text-xs font-bold">
                    <span
                      className={
                        entry.type === 'expense'
                          ? 'text-[#b8623f]'
                          : 'text-[#47594a]'
                      }
                    >
                      {entry.type === 'expense' ? '-' : '+'}INR{' '}
                      {entry.totalAmount.toLocaleString('en-IN')}
                    </span>
                    {entry.taxRate > 0 && (
                      <span className="block text-[10px] font-normal text-[#5c554e]">
                        incl. {entry.taxRate}% GST
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3.5">
                    <button
                      type="button"
                      onClick={() => onTogglePaid(entry.id)}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusBadge(entry.status)}`}
                    >
                      {entry.status}
                    </button>
                  </td>
                  <td className="py-3.5 pl-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      {entry.type === 'invoice' && (
                        <>
                          <button
                            type="button"
                            onClick={() => onOpenInvoice(entry)}
                            className="clay-btn-secondary p-1.5"
                            title="View Printable GST Invoice"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                          {entry.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => onOpenFollowUp(entry)}
                              className="clay-btn-primary p-1.5"
                              title="Draft Payment Follow-Up"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => onTogglePaid(entry.id)}
                        className="clay-btn-secondary p-1.5"
                        title="Toggle Paid Status"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(entry.id)}
                        className="clay-btn-secondary p-1.5 text-[#b8623f]"
                        title="Delete Entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
