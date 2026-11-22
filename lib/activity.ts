import { ActivityEvent, ActivityKind } from '@/types';
import type { StoreState } from '@/lib/store';

const MAX_EVENTS = 200;

/** Returns a new state with the event added to the front of the audit log. */
export function appendActivity(
  state: StoreState,
  kind: ActivityKind,
  message: string,
  refId?: string
): StoreState {
  const event: ActivityEvent = {
    id: `act-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    kind,
    message,
    refId,
  };
  return { ...state, activity: [event, ...(state.activity ?? [])].slice(0, MAX_EVENTS) };
}
