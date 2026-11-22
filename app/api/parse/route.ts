import { NextResponse } from 'next/server';
import { chatCompletion, classifyServiceError, safeParseJson } from '@/lib/groq';
import { retainMemory } from '@/lib/hindsight';
import { getStoreState, saveStoreState, upsertClientForParty } from '@/lib/store';
import { EntryStatus, EntryType, LedgerEntry } from '@/types';

interface ParsedAiPayload {
  type?: string;
  partyName?: string;
  description?: string;
  amount?: number | string;
  taxRate?: number | string;
  status?: string;
  category?: string;
  date?: string;
  dueDate?: string;
}

const VALID_CATEGORIES = [
  'Development',
  'Design',
  'AI Consulting',
  'Data Science',
  'Software',
  'Travel',
  'Operations',
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawInput = typeof body?.rawInput === 'string' ? body.rawInput.trim() : '';

    if (!rawInput) {
      return NextResponse.json(
        { error: 'rawInput is required to parse a transaction.' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const docId = `doc-${Date.now().toString().slice(-6)}`;

    const rawLlmText = await chatCompletion({
      system: `You are an autonomous financial ledger parser for an Indian freelancer or studio.
Return ONLY valid JSON matching this schema:
{
  "type": "invoice" | "expense",
  "partyName": "string",
  "description": "string",
  "amount": number,
  "taxRate": number,
  "status": "paid" | "pending" | "overdue",
  "category": "Development" | "Design" | "AI Consulting" | "Data Science" | "Software" | "Travel" | "Operations",
  "date": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD"
}
Rules: Use INR base amounts without currency symbols. Default taxRate to 18 for invoices/software unless specified. Default date to ${today}. Do not use emojis or em dashes.`,
      user: rawInput,
      temperature: 0.1,
      maxTokens: 600,
      jsonMode: true,
    });

    const parsed = safeParseJson<ParsedAiPayload>(rawLlmText);
    if (!parsed) {
      return NextResponse.json(
        {
          service: 'groq',
          statusCode: 502,
          error: 'Model returned malformed JSON during transaction extraction.',
          rawError: rawLlmText,
        },
        { status: 502 }
      );
    }

    const entryType: EntryType =
      parsed.type === 'expense' ? 'expense' : 'invoice';
    const amount = Math.max(0, Number(parsed.amount) || 0);
    const taxRate = Math.max(0, Number(parsed.taxRate) || 0);
    const totalAmount = Math.round(amount + (amount * taxRate) / 100);
    const status: EntryStatus = ['paid', 'pending', 'overdue'].includes(
      String(parsed.status)
    )
      ? (parsed.status as EntryStatus)
      : 'pending';
    const category = VALID_CATEGORIES.includes(String(parsed.category))
      ? String(parsed.category)
      : 'Operations';
    const groundedDate = /^\d{4}-\d{2}-\d{2}$/.test(String(parsed.date || ''))
      ? String(parsed.date)
      : today;
    const groundedDueDate = /^\d{4}-\d{2}-\d{2}$/.test(String(parsed.dueDate || ''))
      ? String(parsed.dueDate)
      : undefined;

    const entry: LedgerEntry = {
      id: `${entryType === 'expense' ? 'exp' : 'inv'}-${Date.now().toString().slice(-4)}`,
      type: entryType,
      partyName: String(parsed.partyName || 'Client Account').trim(),
      description: String(parsed.description || 'Consulting deliverable').trim(),
      amount,
      taxRate,
      totalAmount,
      status,
      category,
      date: groundedDate,
      dueDate: groundedDueDate,
      rawInput,
      sourceDate: groundedDate,
      sourceDocumentId: docId,
    };

    const currentState = getStoreState();
    const { state: updatedState, client } = upsertClientForParty(
      currentState,
      entry.partyName,
      entry
    );
    entry.clientId = client.id;

    saveStoreState({
      ...updatedState,
      entries: [entry, ...updatedState.entries],
    });

    const memoryResult = await retainMemory({
      content: `[${groundedDate}] ${entryType.toUpperCase()} for ${entry.partyName}: ${entry.description} | Base INR ${amount}, Total INR ${totalAmount} (${taxRate}% tax), Status: ${status}.`,
      tags: [`client:${client.id}`, `type:${entryType}`, `status:${status}`],
      documentId: docId,
    });

    return NextResponse.json({
      entry,
      client,
      provenance: {
        sourceDate: groundedDate,
        sourceDocumentId: docId,
        memoryRetained: memoryResult.retained,
        bankId: memoryResult.bankId,
      },
    });
  } catch (err) {
    const payload = classifyServiceError(err, 'groq');
    return NextResponse.json(payload, { status: payload.statusCode });
  }
}
