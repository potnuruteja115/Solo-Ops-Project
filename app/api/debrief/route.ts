import { NextResponse } from 'next/server';
import { chatCompletion, classifyServiceError, safeParseJson } from '@/lib/groq';
import { isValidISODate, todayISO } from '@/lib/analytics';
import { retainMemory } from '@/lib/hindsight';
import { appendActivity } from '@/lib/activity';
import { getStoreState, saveStoreState } from '@/lib/store';
import { CallOutcome, ClientNote, PaymentPromise } from '@/types';

const OUTCOMES: CallOutcome[] = ['advanced', 'stalled', 'lost_ground'];

interface ExtractedItem {
  promise?: string;
  dueDate?: string | null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const clientId = String(body?.clientId || '');
    const rawNotes = String(body?.rawNotes || '').trim();
    const outcome = body?.outcome as CallOutcome;
    const date = isValidISODate(body?.date) ? body.date : todayISO();

    if (!clientId || !rawNotes || !OUTCOMES.includes(outcome)) {
      return NextResponse.json(
        { error: 'clientId, rawNotes and an outcome (advanced, stalled, lost_ground) are required.' },
        { status: 400 }
      );
    }

    const state = getStoreState();
    const client = state.clients.find((c) => c.id === clientId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }

    let summary = `Call with ${client.name} on ${date} (${outcome.replace('_', ' ')}).`;
    let clientItems: ExtractedItem[] = [];
    let ourItems: ExtractedItem[] = [];
    let openQuestions: string[] = [];
    let extractionWarning: string | undefined;

    // Extraction is best-effort: the note is saved even if the model is unavailable.
    try {
      const raw = await chatCompletion({
        system: `You analyse notes from a freelancer's call or chat with a client about payments and delivery.
Extract explicit commitments. Resolve relative dates (such as "by Friday") against the call date ${date} and return YYYY-MM-DD, or null if no date is given.
Return ONLY valid JSON:
{
  "summary": "1 to 2 sentences",
  "clientPromises": [{"promise": "string", "dueDate": "YYYY-MM-DD or null"}],
  "ourPromises": [{"promise": "string", "dueDate": "YYYY-MM-DD or null"}],
  "openQuestions": ["string"]
}
Do not use emojis or em dashes.`,
        user: `CLIENT: ${client.name} (${client.role}, ${client.company})\nCALL DATE: ${date}\nOUTCOME: ${outcome}\nNOTES:\n${rawNotes}`,
        temperature: 0.1,
        maxTokens: 900,
        jsonMode: true,
      });
      const parsed = safeParseJson<{
        summary?: string;
        clientPromises?: ExtractedItem[];
        ourPromises?: ExtractedItem[];
        openQuestions?: unknown[];
      }>(raw);
      if (parsed) {
        if (typeof parsed.summary === 'string' && parsed.summary.trim()) summary = parsed.summary.trim();
        if (Array.isArray(parsed.clientPromises)) clientItems = parsed.clientPromises;
        if (Array.isArray(parsed.ourPromises)) ourItems = parsed.ourPromises;
        if (Array.isArray(parsed.openQuestions)) openQuestions = parsed.openQuestions.map(String);
      } else {
        extractionWarning = 'Model returned unreadable JSON, so no promises were extracted.';
      }
    } catch (err) {
      extractionWarning = classifyServiceError(err, 'groq').error;
    }

    const noteId = `note-${Date.now().toString().slice(-8)}`;
    const note: ClientNote = { id: noteId, clientId, date, outcome, summary, rawNotes, openQuestions };

    const toPromise = (item: ExtractedItem, owner: 'client' | 'us', i: number): PaymentPromise | null => {
      const text = String(item?.promise || '').trim();
      if (!text) return null;
      return {
        id: `prm-${Date.now().toString().slice(-6)}${owner[0]}${i}`,
        clientId,
        owner,
        text,
        dueDate: isValidISODate(item?.dueDate) ? item.dueDate! : null,
        status: 'pending',
        sourceNoteId: noteId,
        sourceDate: date,
      };
    };
    const newPromises = [
      ...clientItems.map((p, i) => toPromise(p, 'client', i)),
      ...ourItems.map((p, i) => toPromise(p, 'us', i)),
    ].filter((p): p is PaymentPromise => p !== null);

    saveStoreState(
      appendActivity(
        { ...state, notes: [note, ...state.notes], promises: [...newPromises, ...state.promises] },
        'debrief',
        `Call debrief with ${client.company}: ${newPromises.length} promise(s) extracted`,
        noteId
      )
    );

    const tags = [`client:${clientId}`, `outcome:${outcome}`];
    const noteMemory = await retainMemory({
      content: `[${date}] CALL with ${client.name} (${client.company}), outcome ${outcome}: ${summary} Notes: ${rawNotes}`,
      tags: [...tags, 'type:debrief'],
      documentId: noteId,
    });
    for (const p of newPromises) {
      await retainMemory({
        content: `[${date}] PROMISE by ${p.owner === 'client' ? client.name : 'us'}: ${p.text}${p.dueDate ? ` (due ${p.dueDate})` : ''}`,
        tags: [...tags, 'type:promise', `promise:${p.owner}`],
        documentId: p.id,
      });
    }

    return NextResponse.json(
      {
        note,
        promises: newPromises,
        memoryRetained: noteMemory.retained,
        extractionWarning,
      },
      { status: 201 }
    );
  } catch (err) {
    const payload = classifyServiceError(err, 'groq');
    return NextResponse.json(payload, { status: payload.statusCode });
  }
}
