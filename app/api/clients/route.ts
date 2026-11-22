import { NextResponse } from 'next/server';
import { appendActivity } from '@/lib/activity';
import { getStoreState, saveStoreState } from '@/lib/store';
import { ClientProfile } from '@/types';

export async function GET() {
  const state = getStoreState();
  return NextResponse.json({ clients: state.clients });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || '').trim();
  const company = String(body?.company || name).trim();

  if (!name) {
    return NextResponse.json(
      { error: 'Client name is required.' },
      { status: 400 }
    );
  }

  const state = getStoreState();
  const newClient: ClientProfile = {
    id: `client-${Date.now().toString().slice(-5)}`,
    name,
    role: String(body?.role || 'Decision Maker').trim(),
    company,
    email: String(body?.email || 'contact@client.in').trim(),
    phone: String(body?.phone || '+919800000000').trim(),
    reliabilityScore: 85,
    riskLevel: 'low',
    relationshipStatus: 'neutral',
    brokenPromisesCount: 0,
    overdueAmount: 0,
    totalBilled: 0,
    lastMeetingDate: new Date().toISOString().split('T')[0],
    nextAction: String(body?.nextAction || 'Send initial scope and payment schedule').trim(),
    nextActionDeadline: new Date(Date.now() + 86400000 * 7)
      .toISOString()
      .split('T')[0],
    memorySummary: 'Newly added client in SoloOps directory.',
    riskFactors: ['No overdue history yet'],
  };

  const nextClients = [newClient, ...state.clients];
  saveStoreState(
    appendActivity({ ...state, clients: nextClients }, 'client', `Added client ${newClient.company}`, newClient.id)
  );
  return NextResponse.json({ client: newClient, clients: nextClients }, { status: 201 });
}
