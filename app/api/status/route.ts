import { NextResponse } from 'next/server';
import { isHindsightConfigured } from '@/lib/hindsight';

/** Which integrations are configured. Never returns the keys themselves. */
export async function GET() {
  const key = process.env.GROQ_API_KEY;
  return NextResponse.json({
    groq: Boolean(key && key !== 'your_groq_api_key_here'),
    hindsight: isHindsightConfigured(),
  });
}
