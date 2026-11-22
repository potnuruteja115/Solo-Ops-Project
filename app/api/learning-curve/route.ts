import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  const cachePath = path.join(process.cwd(), 'data', 'learning-curve-cache.json');
  const raw = fs.readFileSync(cachePath, 'utf-8');
  const data = JSON.parse(raw);
  return NextResponse.json({ ...data, cached: true });
}
