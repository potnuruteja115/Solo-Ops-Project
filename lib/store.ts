import fs from 'fs';
import path from 'path';
import {
  ActivityEvent,
  ClientNote,
  ClientProfile,
  LedgerEntry,
  PaymentPromise,
  RecurringTemplate,
  UserProfile,
} from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const SEED_FILE = path.join(DATA_DIR, 'seed-ledger.json');
const RUNTIME_FILE = path.join(DATA_DIR, 'runtime-ledger.json');

export interface StoreState {
  users: UserProfile[];
  clients: ClientProfile[];
  entries: LedgerEntry[];
  promises: PaymentPromise[];
  notes: ClientNote[];
  recurring: RecurringTemplate[];
  activity: ActivityEvent[];
}

// Older runtime files may predate promises and notes, so default them.
function normalise(state: Partial<StoreState>): StoreState {
  return {
    users: state.users ?? [],
    clients: state.clients ?? [],
    entries: state.entries ?? [],
    promises: state.promises ?? [],
    notes: state.notes ?? [],
    recurring: state.recurring ?? [],
    activity: state.activity ?? [],
  };
}

function readSeedState(): StoreState {
  const raw = fs.readFileSync(SEED_FILE, 'utf-8');
  return normalise(JSON.parse(raw));
}

export function getStoreState(): StoreState {
  try {
    if (fs.existsSync(RUNTIME_FILE)) {
      const raw = fs.readFileSync(RUNTIME_FILE, 'utf-8');
      return normalise(JSON.parse(raw));
    }
  } catch {
    // Fallback to seed file
  }
  return readSeedState();
}

export function saveStoreState(state: StoreState): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(RUNTIME_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

/** Restores seed data but keeps accounts people registered, so a reset never logs them out. */
export function resetStoreState(): StoreState {
  const seed = readSeedState();
  const demoId = seed.users[0]?.id;
  const registered = getStoreState().users.filter((u) => u.id !== demoId);
  const next = { ...seed, users: [...seed.users, ...registered] };
  saveStoreState(next);
  return next;
}

export function upsertClientForParty(
  state: StoreState,
  partyName: string,
  entry: LedgerEntry
): { state: StoreState; client: ClientProfile } {
  const normalized = partyName.trim().toLowerCase();
  const existingIndex = state.clients.findIndex(
    (c) =>
      c.company.toLowerCase() === normalized ||
      c.name.toLowerCase() === normalized
  );

  if (existingIndex !== -1) {
    const existing = state.clients[existingIndex];
    const addedOverdue =
      entry.type === 'invoice' && entry.status === 'overdue'
        ? entry.totalAmount
        : 0;
    const addedBilled = entry.type === 'invoice' ? entry.totalAmount : 0;
    const updated: ClientProfile = {
      ...existing,
      totalBilled: existing.totalBilled + addedBilled,
      overdueAmount: existing.overdueAmount + addedOverdue,
      lastMeetingDate: entry.date,
      riskLevel:
        existing.overdueAmount + addedOverdue > 0
          ? 'critical'
          : existing.riskLevel,
      relationshipStatus:
        existing.overdueAmount + addedOverdue > 0
          ? 'at_risk'
          : existing.relationshipStatus,
    };
    const nextClients = [...state.clients];
    nextClients[existingIndex] = updated;
    return {
      state: { ...state, clients: nextClients },
      client: updated,
    };
  }

  const newClient: ClientProfile = {
    id: `client-${Date.now().toString().slice(-5)}`,
    name: partyName,
    role: 'Account Stakeholder',
    company: partyName,
    email: 'accounts@client-domain.in',
    phone: '+919800000000',
    reliabilityScore: entry.status === 'overdue' ? 55 : 82,
    riskLevel: entry.status === 'overdue' ? 'high' : 'low',
    relationshipStatus: entry.status === 'overdue' ? 'at_risk' : 'neutral',
    brokenPromisesCount: entry.status === 'overdue' ? 1 : 0,
    overdueAmount:
      entry.type === 'invoice' && entry.status === 'overdue'
        ? entry.totalAmount
        : 0,
    totalBilled: entry.type === 'invoice' ? entry.totalAmount : 0,
    lastMeetingDate: entry.date,
    nextAction:
      entry.status === 'overdue'
        ? `Follow up on overdue balance of INR ${entry.totalAmount.toLocaleString('en-IN')}`
        : `Track settlement for ${entry.id.toUpperCase()}`,
    nextActionDeadline: entry.dueDate || entry.date,
    memorySummary: `Added via command dropzone: ${entry.description}`,
    riskFactors:
      entry.status === 'overdue'
        ? ['New entry logged with overdue status']
        : ['Recently added client profile'],
  };

  return {
    state: { ...state, clients: [newClient, ...state.clients] },
    client: newClient,
  };
}
