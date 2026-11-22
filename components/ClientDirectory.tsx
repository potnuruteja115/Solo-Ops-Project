'use client';

import { useState } from 'react';
import { Search, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { ClientProfile, LedgerEntry } from '@/types';

interface Props {
  clients: ClientProfile[];
  entries: LedgerEntry[];
  selectedClientId: string | null;
  onSelectClient: (client: ClientProfile | null) => void;
}

export default function ClientDirectory({
  clients,
  entries,
  selectedClientId,
  onSelectClient,
}: Props) {
  const [search, setSearch] = useState('');

  const filtered = clients.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q)
    );
  });

  const badgeClass = (risk: ClientProfile['riskLevel']) => {
    if (risk === 'critical' || risk === 'high') {
      return 'bg-[#b8623f]/15 text-[#9e5031] border-[#b8623f]/30';
    }
    if (risk === 'moderate') {
      return 'bg-[#d99b26]/15 text-[#8a5d06] border-[#d99b26]/35';
    }
    return 'bg-[#7d9080]/20 text-[#435747] border-[#7d9080]/40';
  };

  return (
    <aside className="clay-card flex flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-base font-bold text-[#2a2622]">
          Client Directory
        </h2>
        <span className="rounded-full bg-[#e8e2d5] px-2.5 py-0.5 font-mono text-xs font-semibold text-[#5c554e]">
          {clients.length} Total
        </span>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-[#7a7269]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client, company, role..."
          className="clay-input w-full py-2 pl-9 pr-3 text-xs"
        />
      </div>

      {selectedClientId && (
        <button
          type="button"
          onClick={() => onSelectClient(null)}
          className="mb-3 rounded-xl border border-[#d8cfc0] bg-[#e8e2d5] px-3 py-1.5 text-left text-xs font-semibold text-[#2a2622] hover:bg-[#dfd7c7]"
        >
          Showing filtered client · Click to view all
        </button>
      )}

      <div className="space-y-2.5 max-h-[540px] overflow-y-auto clay-scroll pr-1">
        {filtered.map((client) => {
          const active = selectedClientId === client.id;
          const itemCount = entries.filter(
            (e) =>
              e.clientId === client.id ||
              e.partyName.toLowerCase() === client.company.toLowerCase()
          ).length;

          return (
            <button
              key={client.id}
              type="button"
              onClick={() => onSelectClient(active ? null : client)}
              className={`w-full rounded-2xl border p-3.5 text-left transition ${
                active
                  ? 'border-[#b8623f] bg-[#f7f3eb] shadow-sm'
                  : 'border-[#d8cfc0] bg-[#e8e2d5]/70 hover:bg-[#f7f3eb]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-[#2a2622]">
                    {client.name}
                  </p>
                  <p className="text-xs text-[#5c554e]">
                    {client.role} · {client.company}
                  </p>
                </div>
                <span className="rounded-md bg-[#eee8dc] px-2 py-0.5 font-mono text-[11px] text-[#5c554e]">
                  {itemCount} items
                </span>
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${badgeClass(client.riskLevel)}`}
                >
                  {client.riskLevel === 'critical' || client.riskLevel === 'high' ? (
                    <AlertTriangle className="h-3 w-3" />
                  ) : client.riskLevel === 'moderate' ? (
                    <Clock className="h-3 w-3" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3" />
                  )}
                  {client.riskLevel} Risk
                </span>
                <span className="font-mono text-xs font-semibold text-[#2a2622]">
                  Score {client.reliabilityScore}/100
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
