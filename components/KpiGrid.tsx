'use client';

import { IndianRupee, Clock, Receipt, Landmark } from 'lucide-react';
import { LedgerEntry } from '@/types';

interface Props {
  entries: LedgerEntry[];
}

export default function KpiGrid({ entries }: Props) {
  const revenue = entries
    .filter((e) => e.type === 'invoice' && e.status === 'paid')
    .reduce((sum, e) => sum + e.totalAmount, 0);

  const pending = entries
    .filter((e) => e.type === 'invoice' && e.status !== 'paid')
    .reduce((sum, e) => sum + e.totalAmount, 0);

  const overdueCount = entries.filter(
    (e) => e.type === 'invoice' && e.status === 'overdue'
  ).length;

  const expenses = entries
    .filter((e) => e.type === 'expense')
    .reduce((sum, e) => sum + e.totalAmount, 0);

  const gstSetAside = entries
    .filter((e) => e.type === 'invoice' && e.status === 'paid')
    .reduce((sum, e) => sum + (e.totalAmount - e.amount), 0);

  const netCash = revenue - expenses - gstSetAside;

  const cards = [
    {
      label: 'Collected Revenue',
      value: `INR ${revenue.toLocaleString('en-IN')}`,
      sub: `Net after expenses & GST: INR ${netCash.toLocaleString('en-IN')}`,
      icon: IndianRupee,
      tone: 'text-[#47594a]',
      pill: 'bg-[#7d9080]/20 text-[#47594a]',
    },
    {
      label: 'Pending Receivables',
      value: `INR ${pending.toLocaleString('en-IN')}`,
      sub:
        overdueCount > 0
          ? `${overdueCount} overdue invoice${overdueCount > 1 ? 's require' : ' requires'} action`
          : 'All invoices within terms',
      icon: Clock,
      tone: overdueCount > 0 ? 'text-[#b8623f]' : 'text-[#2a2622]',
      pill: 'bg-[#b8623f]/15 text-[#9e5031]',
    },
    {
      label: 'Logged Expenses',
      value: `INR ${expenses.toLocaleString('en-IN')}`,
      sub: `${entries.filter((e) => e.type === 'expense').length} recorded expense items`,
      icon: Receipt,
      tone: 'text-[#2a2622]',
      pill: 'bg-[#e8e2d5] text-[#5c554e]',
    },
    {
      label: 'GST Set-Aside',
      value: `INR ${gstSetAside.toLocaleString('en-IN')}`,
      sub: 'Tax collected on paid invoices',
      icon: Landmark,
      tone: 'text-[#2a2622]',
      pill: 'bg-[#e8e2d5] text-[#5c554e]',
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="clay-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5c554e]">
                {card.label}
              </span>
              <span className={`rounded-xl p-2 ${card.pill}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className={`mt-2 font-mono text-xl font-bold ${card.tone}`}>
              {card.value}
            </p>
            <p className="mt-1 text-xs text-[#5c554e]">{card.sub}</p>
          </div>
        );
      })}
    </section>
  );
}
