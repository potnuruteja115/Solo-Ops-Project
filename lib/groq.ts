import Groq from 'groq-sdk';
import { ApiErrorPayload } from '@/types';

export const GROQ_MODEL =
  process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

export function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    throw new Error('GROQ_API_KEY is not configured in .env.local');
  }
  return new Groq({ apiKey });
}

function isTransientGroqError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || err || '').toLowerCase();
  const status = Number((err as { status?: number })?.status || 0);
  return (
    status === 429 ||
    status >= 500 ||
    msg.includes('rate_limit') ||
    msg.includes('429') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('fetch failed')
  );
}

export async function chatCompletion(params: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}) {
  const client = getGroqClient();
  const maxRetries = 3;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: GROQ_MODEL,
        temperature: params.temperature ?? 0.2,
        max_tokens: params.maxTokens ?? 1800,
        ...(params.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
        messages: [
          { role: 'system', content: params.system },
          { role: 'user', content: params.user },
        ],
      });

      const text = response.choices?.[0]?.message?.content || '';
      if (!text.trim()) {
        throw new Error('Empty response received from Groq inference');
      }
      return text;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries && isTransientGroqError(err)) {
        const backoff = Math.min(2500, 350 * Math.pow(2, attempt)) + Math.floor(Math.random() * 150);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }
      break;
    }
  }

  throw lastError;
}

export function safeParseJson<T>(raw: string): T | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Strip markdown code fences if present
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim()) as T;
    } catch {
      // Continue to brace slicing
    }
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const slice = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(slice) as T;
    } catch {
      return null;
    }
  }

  return null;
}

export function classifyServiceError(
  err: unknown,
  defaultService: 'groq' | 'hindsight' | 'unknown' = 'groq'
): ApiErrorPayload {
  const rawMessage = String((err as { message?: string })?.message || err || 'Unexpected error');
  const lower = rawMessage.toLowerCase();
  const status = Number((err as { status?: number })?.status || 0);

  if (status === 429 || lower.includes('rate_limit') || lower.includes('429')) {
    return {
      service: 'groq',
      statusCode: 429,
      error: 'Groq rate limit reached. Wait 10 seconds or retry with lightweight/cold mode.',
      rawError: rawMessage,
    };
  }

  if (lower.includes('hindsight')) {
    return {
      service: 'hindsight',
      statusCode: 502,
      error: 'Hindsight memory bank unavailable. Falling back to local store.',
      rawError: rawMessage,
    };
  }

  if (defaultService === 'groq' || lower.includes('groq') || lower.includes('api_key')) {
    return {
      service: 'groq',
      statusCode: status >= 400 && status < 600 ? status : 502,
      error: rawMessage,
      rawError: rawMessage,
    };
  }

  return {
    service: 'unknown',
    statusCode: 500,
    error: rawMessage,
    rawError: rawMessage,
  };
}
