import { NextResponse } from 'next/server';
import { getStoreState } from '@/lib/store';

const RISK_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  moderate: 2,
  low: 3,
};

export async function GET() {
  const state = getStoreState();
  const rankedClients = [...state.clients].sort(
    (a, b) => (RISK_ORDER[a.riskLevel] ?? 9) - (RISK_ORDER[b.riskLevel] ?? 9)
  );

  const totalOverdue = rankedClients.reduce((s, c) => s + c.overdueAmount, 0);
  const totalBilled = rankedClients.reduce((s, c) => s + c.totalBilled, 0);
  const avgReliability =
    rankedClients.length > 0
      ? Math.round(
          rankedClients.reduce((s, c) => s + c.reliabilityScore, 0) /
            rankedClients.length
        )
      : 0;

  return NextResponse.json({
    summary: {
      totalClients: rankedClients.length,
      totalOverdue,
      totalBilled,
      avgReliability,
    },
    clients: rankedClients,
    generatedAt: new Date().toISOString(),
  });
}
