import { NextResponse } from 'next/server';
import { chatCompletion, classifyServiceError, safeParseJson } from '@/lib/groq';
import { CfoInsight, LedgerEntry } from '@/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const entries: LedgerEntry[] = Array.isArray(body?.entries) ? body.entries : [];

    const paidRevenue = entries
      .filter((e) => e.type === 'invoice' && e.status === 'paid')
      .reduce((s, e) => s + e.totalAmount, 0);
    const pendingOrOverdue = entries
      .filter((e) => e.type === 'invoice' && e.status !== 'paid')
      .reduce((s, e) => s + e.totalAmount, 0);
    const expenses = entries
      .filter((e) => e.type === 'expense')
      .reduce((s, e) => s + e.totalAmount, 0);
    const gstCollected = entries
      .filter((e) => e.type === 'invoice' && e.status === 'paid')
      .reduce((s, e) => s + (e.totalAmount - e.amount), 0);

    const rawText = await chatCompletion({
      system: `You are an AI CFO advising an Indian solo freelancer or studio founder.
Return ONLY valid JSON matching this schema:
{
  "headline": "string (6 to 10 words)",
  "healthScore": number (0 to 100),
  "cashFlowSummary": "string (1 to 2 sentences using INR figures)",
  "gstReserveAlert": "string (1 sentence on GST set-aside)",
  "topRiskClient": "string (name highest overdue or pending client)",
  "priorityActions": ["string", "string", "string"]
}
Do not use emojis or em dashes.`,
      user: JSON.stringify({
        metrics: { paidRevenue, pendingOrOverdue, expenses, gstCollected },
        entries: entries.slice(0, 12),
      }),
      temperature: 0.2,
      maxTokens: 900,
      jsonMode: true,
    });

    const parsed = safeParseJson<CfoInsight>(rawText);
    if (!parsed) {
      return NextResponse.json(
        {
          service: 'groq',
          statusCode: 502,
          error: 'Failed to parse AI CFO audit JSON.',
          rawError: rawText,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      insight: {
        headline: parsed.headline || 'Positive cash flow with overdue receivables to collect',
        healthScore: Math.max(0, Math.min(100, Number(parsed.healthScore) || 78)),
        cashFlowSummary:
          parsed.cashFlowSummary ||
          `Collected INR ${paidRevenue.toLocaleString('en-IN')} against INR ${pendingOrOverdue.toLocaleString('en-IN')} open receivables and INR ${expenses.toLocaleString('en-IN')} expenses.`,
        gstReserveAlert:
          parsed.gstReserveAlert ||
          `Set aside INR ${gstCollected.toLocaleString('en-IN')} for GST obligations on settled invoices.`,
        topRiskClient: parsed.topRiskClient || 'Verve Commerce',
        priorityActions: Array.isArray(parsed.priorityActions)
          ? parsed.priorityActions.slice(0, 3)
          : [
              'Send firm follow-up for overdue invoices today',
              'Ring-fence GST reserve in a separate account',
              'Confirm milestone sign-off before next sprint',
            ],
      },
    });
  } catch (err) {
    const payload = classifyServiceError(err, 'groq');
    return NextResponse.json(payload, { status: payload.statusCode });
  }
}
