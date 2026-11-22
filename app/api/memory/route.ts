import { NextResponse } from 'next/server';
import { isHindsightConfigured, recallMemory, reflectMemory } from '@/lib/hindsight';
import { getStoreState } from '@/lib/store';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const query = String(body?.query || '').trim();
  const clientId = body?.clientId ? String(body.clientId) : undefined;
  const mode = body?.mode === 'reflect' ? 'reflect' : 'recall';

  if (!query) {
    return NextResponse.json({ error: 'query is required.' }, { status: 400 });
  }

  const state = getStoreState();
  if (clientId && !state.clients.some((c) => c.id === clientId)) {
    return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
  }

  // Local search always works, so the inspector is useful without Hindsight.
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const matches = (text: string) => terms.length === 0 || terms.some((t) => text.toLowerCase().includes(t));
  const local = [
    ...state.notes
      .filter((n) => (!clientId || n.clientId === clientId) && matches(`${n.summary} ${n.rawNotes}`))
      .map((n) => ({ kind: 'note' as const, date: n.date, text: n.summary, sourceId: n.id })),
    ...state.promises
      .filter((p) => (!clientId || p.clientId === clientId) && matches(p.text))
      .map((p) => ({ kind: 'promise' as const, date: p.sourceDate, text: p.text, sourceId: p.id })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  const tags = clientId ? [`client:${clientId}`] : undefined;
  const configured = isHindsightConfigured();
  const recalled = configured ? await recallMemory({ query, tags }) : { facts: [], bankId: '' };
  const reflection = configured && mode === 'reflect' ? await reflectMemory({ query, tags }) : { text: '' };

  return NextResponse.json({
    query,
    mode,
    hindsightConfigured: configured,
    facts: recalled.facts.slice(0, 10),
    reflection: reflection.text,
    local,
  });
}
