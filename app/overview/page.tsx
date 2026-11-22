'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import TopNav from '@/components/TopNav';
import { ClientProfile } from '@/types';

interface OverviewResponse {
  summary: {
    totalClients: number;
    totalOverdue: number;
    totalBilled: number;
    avgReliability: number;
  };
  clients: ClientProfile[];
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/overview')
      .then((r) => r.json())
      .then((res) => setData(res))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6">
      <TopNav
        onOpenPalette={() => {}}
        onOpenNewClient={() => {}}
      />

      <main className="mx-auto mt-6 max-w-7xl space-y-6">
        <div className="clay-card p-6">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#b8623f]">
            Portfolio Receivables Risk
          </p>
          <h1 className="font-heading mt-1 text-2xl font-bold text-[#2a2622]">
            Client Risk Ranking and Cash-Flow Exposure
          </h1>
          <p className="mt-1 text-xs text-[#5c554e]">
            Accounts ranked by overdue INR exposure and reliability score. Select any client to open their ledger context.
          </p>

          {data && (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="clay-inset p-4">
                <p className="text-xs text-[#5c554e]">Total Overdue Exposure</p>
                <p className="mt-1 font-mono text-xl font-bold text-[#b8623f]">
                  INR {data.summary.totalOverdue.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="clay-inset p-4">
                <p className="text-xs text-[#5c554e]">Total Billed Volume</p>
                <p className="mt-1 font-mono text-xl font-bold text-[#2a2622]">
                  INR {data.summary.totalBilled.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="clay-inset p-4">
                <p className="text-xs text-[#5c554e]">Average Reliability Score</p>
                <p className="mt-1 font-mono text-xl font-bold text-[#47594a]">
                  {data.summary.avgReliability}/100
                </p>
              </div>
            </div>
          )}
        </div>

        {loading || !data ? (
          <div className="clay-card flex items-center justify-center gap-2 p-8 text-xs text-[#5c554e]">
            <Loader2 className="h-4 w-4 animate-spin text-[#b8623f]" />
            Loading risk-ranked portfolio...
          </div>
        ) : (
          <div className="space-y-3">
            {data.clients.map((client, idx) => (
              <div
                key={client.id}
                className="clay-card flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-[#b8623f]">
                      #{idx + 1}
                    </span>
                    <h2 className="font-heading text-lg font-bold text-[#2a2622]">
                      {client.name}
                    </h2>
                    <span className="rounded-full bg-[#e8e2d5] px-2.5 py-0.5 text-xs font-semibold text-[#5c554e]">
                      {client.company} · {client.role}
                    </span>
                    <span className="rounded-full border border-[#b8623f]/35 bg-[#b8623f]/15 px-2.5 py-0.5 text-[11px] font-bold uppercase text-[#9e5031]">
                      {client.riskLevel}
                    </span>
                  </div>

                  <p className="text-xs text-[#2a2622]">{client.memorySummary}</p>
                  <p className="text-xs font-semibold text-[#5c554e]">
                    Next Action ({client.nextActionDeadline}): {client.nextAction}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right font-mono text-xs">
                    <p className="font-bold text-[#b8623f]">
                      Overdue: INR {client.overdueAmount.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[#5c554e]">
                      Reliability: {client.reliabilityScore}/100 · Broken: {client.brokenPromisesCount}
                    </p>
                  </div>

                  <Link
                    href={`/app?demo=true&clientId=${client.id}`}
                    className="clay-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs"
                  >
                    <span>Open in Workspace</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
