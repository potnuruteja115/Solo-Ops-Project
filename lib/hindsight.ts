import { HindsightClient } from '@vectorize-io/hindsight-client';

export const HINDSIGHT_BANK_ID =
  process.env.HINDSIGHT_BANK_ID || 'SOLOOPS';

function createClient(): HindsightClient | null {
  const apiKey = process.env.HINDSIGHT_API_KEY;
  if (!apiKey || apiKey === 'your_hindsight_key_here') {
    return null;
  }
  const endpoint =
    process.env.HINDSIGHT_ENDPOINT || 'https://api.hindsight.vectorize.io';
  return new HindsightClient({
    baseUrl: endpoint,
    apiKey,
  });
}

export async function retainMemory(params: {
  content: string;
  tags?: string[];
  documentId?: string;
}): Promise<{ retained: boolean; bankId: string; error?: string }> {
  const client = createClient();
  if (!client) {
    return { retained: false, bankId: HINDSIGHT_BANK_ID };
  }

  try {
    await client.retain(HINDSIGHT_BANK_ID, params.content, {
      tags: params.tags,
      documentId: params.documentId,
    });
    return { retained: true, bankId: HINDSIGHT_BANK_ID };
  } catch (err) {
    return {
      retained: false,
      bankId: HINDSIGHT_BANK_ID,
      error: String((err as { message?: string })?.message || err),
    };
  }
}

export async function recallMemory(params: {
  query: string;
  tags?: string[];
}): Promise<{ facts: string[]; bankId: string }> {
  const client = createClient();
  if (!client) {
    return { facts: [], bankId: HINDSIGHT_BANK_ID };
  }

  try {
    const res = await client.recall(HINDSIGHT_BANK_ID, params.query, {
      tags: params.tags,
      budget: 'mid',
      maxTokens: 2000,
    });
    const rawFacts = Array.isArray((res as { results?: unknown[] })?.results)
      ? (res as { results: Array<{ text?: string }> }).results
          .map((r) => r.text || '')
          .filter(Boolean)
      : [];
    return { facts: rawFacts, bankId: HINDSIGHT_BANK_ID };
  } catch {
    return { facts: [], bankId: HINDSIGHT_BANK_ID };
  }
}

export function isHindsightConfigured(): boolean {
  return createClient() !== null;
}

/**
 * Asks Hindsight to synthesise patterns across a client's memories
 * (for example which approaches led to on-time payment). Returns an
 * empty string when Hindsight is not configured or the call fails.
 */
export async function reflectMemory(params: {
  query: string;
  tags?: string[];
}): Promise<{ text: string; bankId: string }> {
  const client = createClient();
  if (!client) return { text: '', bankId: HINDSIGHT_BANK_ID };
  try {
    const res = await client.reflect(HINDSIGHT_BANK_ID, params.query, {
      budget: 'low',
      tags: params.tags,
    });
    return { text: (res as { text?: string })?.text || '', bankId: HINDSIGHT_BANK_ID };
  } catch {
    return { text: '', bankId: HINDSIGHT_BANK_ID };
  }
}
