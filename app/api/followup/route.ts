import { NextResponse } from 'next/server';
import { chatCompletion, classifyServiceError, safeParseJson } from '@/lib/groq';
import { recallMemory } from '@/lib/hindsight';
import { getStoreState } from '@/lib/store';
import { FollowUpDraft, FollowUpTone } from '@/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const entryId = typeof body?.entryId === 'string' ? body.entryId.trim() : '';
    const tone: FollowUpTone = ['polite', 'firm', 'urgent'].includes(body?.tone)
      ? body.tone
      : 'polite';
    const useMemory = body?.useMemory !== false;

    const state = getStoreState();
    const entry = state.entries.find((e) => e.id === entryId);

    if (!entry) {
      return NextResponse.json(
        { error: 'Ledger entry not found.' },
        { status: 404 }
      );
    }

    const client = state.clients.find(
      (c) =>
        c.id === entry.clientId ||
        c.company.toLowerCase() === entry.partyName.toLowerCase()
    );
    const studioUser = state.users[0];

    let recalledContext = '';
    if (useMemory) {
      const hs = await recallMemory({
        query: `Payment history and follow-up reliability for ${entry.partyName}`,
        tags: client ? [`client:${client.id}`] : undefined,
      });
      const localHistory = state.entries
        .filter(
          (e) =>
            e.partyName.toLowerCase() === entry.partyName.toLowerCase() &&
            e.id !== entry.id
        )
        .map(
          (e) =>
            `Prior entry ${e.id.toUpperCase()} on ${e.date}: INR ${e.totalAmount.toLocaleString('en-IN')} (${e.status})`
        );
      const combined = [...hs.facts, ...localHistory];
      if (client?.memorySummary) {
        combined.unshift(`Client profile note: ${client.memorySummary}`);
      }
      recalledContext = combined.slice(0, 6).join(' | ');
    }

    const systemPrompt = useMemory
      ? `You are a financial operations assistant drafting payment reminders for ${studioUser?.businessName || 'Teja Digital Labs'}.
Use the grounded memory context to calibrate the message.
Return ONLY valid JSON with keys: "subject", "emailBody", "whatsappMessage".
Tone: ${tone.toUpperCase()}.
Sign off as "${studioUser?.name || 'Teja'}". Include UPI ID "${studioUser?.upiId || 'tejadigitallabs@okicici'}" where helpful.
Do not use emojis or em dashes.`
      : `You are a basic billing assistant drafting a generic payment reminder with no prior client history.
Return ONLY valid JSON with keys: "subject", "emailBody", "whatsappMessage".
Tone: ${tone.toUpperCase()}.
Sign off as "${studioUser?.name || 'Teja'}". Do not use emojis or em dashes.`;

    const userPrompt = useMemory
      ? `Invoice ID: ${entry.id.toUpperCase()}
Client: ${entry.partyName}
Description: ${entry.description}
Amount Due: INR ${entry.totalAmount.toLocaleString('en-IN')}
Status: ${entry.status}
Due Date: ${entry.dueDate || entry.date}
Grounded Memory: ${recalledContext || 'No prior ledger history found.'}`
      : `Invoice ID: ${entry.id.toUpperCase()}
Client: ${entry.partyName}
Description: ${entry.description}
Amount Due: INR ${entry.totalAmount.toLocaleString('en-IN')}
Due Date: ${entry.dueDate || entry.date}`;

    const rawText = await chatCompletion({
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.3,
      maxTokens: 900,
      jsonMode: true,
    });

    const parsed = safeParseJson<{
      subject?: string;
      emailBody?: string;
      whatsappMessage?: string;
    }>(rawText);

    if (!parsed) {
      return NextResponse.json(
        {
          service: 'groq',
          statusCode: 502,
          error: 'Failed to parse generated payment follow-up JSON.',
          rawError: rawText,
        },
        { status: 502 }
      );
    }

    const draft: FollowUpDraft = {
      subject:
        parsed.subject ||
        `Payment Reminder: Invoice ${entry.id.toUpperCase()} for ${entry.partyName}`,
      emailBody:
        parsed.emailBody ||
        `Hello ${entry.partyName},

This is a reminder regarding invoice ${entry.id.toUpperCase()} for INR ${entry.totalAmount.toLocaleString('en-IN')}.

Regards,
${studioUser?.name || 'Teja'}`,
      whatsappMessage:
        parsed.whatsappMessage ||
        `Hello ${entry.partyName}, reminder for invoice ${entry.id.toUpperCase()} (INR ${entry.totalAmount.toLocaleString('en-IN')}). UPI: ${studioUser?.upiId || 'tejadigitallabs@okicici'} - ${studioUser?.name || 'Teja'}`,
      usedMemory: useMemory,
      provenanceNote: useMemory
        ? `Grounded in ${entry.id.toUpperCase()} (${entry.sourceDate}) and ${client ? client.company : entry.partyName} history`
        : 'Cold baseline (memory disabled)',
    };

    return NextResponse.json({
      draft,
      entry,
      client: client || null,
      useMemory,
    });
  } catch (err) {
    const payload = classifyServiceError(err, 'groq');
    return NextResponse.json(payload, { status: payload.statusCode });
  }
}
