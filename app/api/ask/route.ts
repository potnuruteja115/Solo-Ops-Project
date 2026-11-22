import { NextResponse } from 'next/server';
import { chatCompletion, classifyServiceError } from '@/lib/groq';
import { buildCollectionsQueue, isValidISODate, todayISO } from '@/lib/analytics';
import { buildAnalytics } from '@/lib/pnl';
import { promiseStats } from '@/lib/promises';
import { getStoreState } from '@/lib/store';

/** Answers questions about the user's own books, grounded in a compact data summary. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const question = String(body?.question || '').trim();
    if (question.length < 3 || question.length > 500) {
      return NextResponse.json({ error: 'Ask a question between 3 and 500 characters.' }, { status: 400 });
    }

    const asOf = isValidISODate(body?.asOf) ? body.asOf : todayISO();
    const state = getStoreState();
    const analytics = buildAnalytics(state.entries, asOf);
    const queue = buildCollectionsQueue(state.entries, state.clients, asOf, state.promises).slice(0, 8);

    const context = {
      asOf,
      currency: 'INR',
      kpis: analytics.kpis,
      monthly: analytics.monthly,
      expensesByCategory: analytics.expensesByCategory,
      revenueByClient: analytics.revenueByClient,
      unpaidInvoices: queue.map((q) => ({
        id: q.entry.id,
        client: q.entry.partyName,
        amount: q.entry.totalAmount,
        dueDate: q.entry.dueDate,
        daysOverdue: q.daysOverdue,
        lateFee: q.lateFee,
      })),
      clients: state.clients.map((c) => ({
        company: c.company,
        reliability: c.reliabilityScore,
        risk: c.riskLevel,
        promises: promiseStats(state.promises.filter((p) => p.clientId === c.id), asOf),
      })),
    };

    const answer = await chatCompletion({
      system:
        'You are the finance assistant inside SoloOps for an Indian freelancer. Answer ONLY from the JSON data provided. ' +
        'If the data does not contain the answer, say so plainly. Use INR with Indian digit grouping. Be concise (under 120 words). ' +
        'Do not use emojis or em dashes.',
      user: `DATA:\n${JSON.stringify(context)}\n\nQUESTION: ${question}`,
      temperature: 0.2,
      maxTokens: 400,
    });
    return NextResponse.json({ answer: answer.trim() });
  } catch (err) {
    const payload = classifyServiceError(err, 'groq');
    return NextResponse.json(payload, { status: payload.statusCode });
  }
}
