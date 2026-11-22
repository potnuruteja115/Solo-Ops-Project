'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { LedgerEntry } from '@/types';

interface Props {
  entries: LedgerEntry[];
}

export default function CashFlowChart({ entries }: Props) {
  const map: Record<string, { category: string; invoices: number; expenses: number }> = {};

  entries.forEach((entry) => {
    const key = entry.category || 'Operations';
    if (!map[key]) {
      map[key] = { category: key, invoices: 0, expenses: 0 };
    }
    if (entry.type === 'invoice') {
      map[key].invoices += entry.totalAmount;
    } else {
      map[key].expenses += entry.totalAmount;
    }
  });

  const data = Object.values(map);

  return (
    <div className="clay-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-base font-bold text-[#2a2622]">
            Cash Flow by Category
          </h2>
          <p className="text-xs text-[#5c554e]">
            Invoiced receivables vs operating expenses (INR)
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-[#5c554e]">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-[#7d9080]" />
            Invoices
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-[#b8623f]" />
            Expenses
          </span>
        </div>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d8cfc0" vertical={false} />
            <XAxis
              dataKey="category"
              tick={{ fill: '#5c554e', fontSize: 11 }}
              axisLine={{ stroke: '#d8cfc0' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#5c554e', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `INR ${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
            />
            <Tooltip
              cursor={{ fill: 'rgba(184, 98, 63, 0.06)' }}
              contentStyle={{
                backgroundColor: '#eee8dc',
                borderColor: '#d8cfc0',
                borderRadius: '14px',
                fontSize: '12px',
                color: '#2a2622',
              }}
              formatter={(value: number) =>
                `INR ${Number(value).toLocaleString('en-IN')}`
              }
            />
            <Bar dataKey="invoices" name="Invoices" fill="#7d9080" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#b8623f" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
