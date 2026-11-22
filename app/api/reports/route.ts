import { NextResponse } from 'next/server';
import { buildCollectionsQueue, isValidISODate, todayISO } from '@/lib/analytics';
import { toCsv } from '@/lib/csv';
import { buildMonthlyPnl } from '@/lib/pnl';
import { getStoreState } from '@/lib/store';

const TYPES = ['gst', 'pnl', 'aging'] as const;
type ReportType = (typeof TYPES)[number];

const round2 = (n: number) => Math.round(n * 100) / 100;

function csvResponse(csv: string, filename: string) {
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

/** CA report pack: GST register, monthly P&L and receivables aging as CSV downloads. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') as ReportType;
  const month = searchParams.get('month');
  const requested = searchParams.get('asOf');
  const asOf = isValidISODate(requested) ? requested : todayISO();

  if (!TYPES.includes(type)) {
    return NextResponse.json({ error: 'type must be one of gst, pnl, aging.' }, { status: 400 });
  }
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return NextResponse.json({ error: 'month must be YYYY-MM.' }, { status: 400 });
  }

  const state = getStoreState();

  if (type === 'gst') {
    const rows = state.entries
      .filter((e) => !month || e.date.startsWith(month))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => {
        const tax = e.totalAmount - e.amount;
        return [
          e.date,
          e.id.toUpperCase(),
          e.partyName,
          e.type === 'invoice' ? 'Outward supply' : 'Inward supply',
          e.amount,
          e.taxRate,
          round2(tax / 2),
          round2(tax / 2),
          tax,
          e.totalAmount,
        ];
      });
    return csvResponse(
      toCsv(
        ['Date', 'Document No', 'Party', 'Supply Type', 'Taxable Value', 'GST Rate %', 'CGST', 'SGST', 'Total Tax', 'Invoice Value'],
        rows
      ),
      `soloops-gst-register${month ? `-${month}` : ''}.csv`
    );
  }

  if (type === 'pnl') {
    const rows = buildMonthlyPnl(state.entries, asOf, 12).map((m) => [
      m.month, m.invoiced, m.collected, m.expenses, m.net, m.gstOutput, m.gstInput,
    ]);
    return csvResponse(
      toCsv(['Month', 'Invoiced', 'Collected', 'Expenses', 'Net Profit', 'GST Output', 'GST Input'], rows),
      'soloops-monthly-pnl.csv'
    );
  }

  const user = state.users[0];
  const queue = buildCollectionsQueue(state.entries, state.clients, asOf, state.promises, user?.lateFeePercent ?? 1.5);
  const bucket = (d: number) => (d <= 0 ? 'Not yet due' : d <= 30 ? '1-30' : d <= 60 ? '31-60' : d <= 90 ? '61-90' : '90+');
  return csvResponse(
    toCsv(
      ['Invoice', 'Client', 'Invoice Date', 'Due Date', 'Amount', 'Days Overdue', 'Bucket', 'Accrued Late Fee', 'Suggested Tone'],
      queue.map((q) => [
        q.entry.id.toUpperCase(), q.entry.partyName, q.entry.date, q.entry.dueDate ?? '',
        q.entry.totalAmount, q.daysOverdue, bucket(q.daysOverdue), q.lateFee, q.recommendedTone,
      ])
    ),
    'soloops-receivables-aging.csv'
  );
}
