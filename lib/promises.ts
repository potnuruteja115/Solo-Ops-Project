import { PaymentPromise, PromiseStats, PromiseStatus } from '@/types';
import { daysBetween } from '@/lib/analytics';

/** A pending promise whose due date has passed counts as broken. */
export function effectivePromiseStatus(p: PaymentPromise, asOf: string): PromiseStatus {
  if (p.status === 'pending' && p.dueDate && daysBetween(p.dueDate, asOf) > 0) {
    return 'broken';
  }
  return p.status;
}

export function withEffectivePromiseStatus(
  promises: PaymentPromise[],
  asOf: string
): PaymentPromise[] {
  return promises.map((p) => {
    const status = effectivePromiseStatus(p, asOf);
    return status === p.status ? p : { ...p, status };
  });
}

/** Stats over a client's own promises (what they said they would do). */
export function promiseStats(promises: PaymentPromise[], asOf: string): PromiseStats {
  const own = promises.filter((p) => p.owner === 'client');
  let kept = 0;
  let broken = 0;
  let pending = 0;
  for (const p of own) {
    const s = effectivePromiseStatus(p, asOf);
    if (s === 'kept') kept += 1;
    else if (s === 'broken') broken += 1;
    else pending += 1;
  }
  const resolved = kept + broken;
  return {
    kept,
    broken,
    pending,
    keepRate: resolved > 0 ? Math.round((kept / resolved) * 100) : null,
  };
}

/**
 * Blend the stored reliability score with observed promise-keeping.
 * Needs at least 2 resolved promises before it moves the score.
 */
export function adjustedReliability(
  base: number,
  clientPromises: PaymentPromise[],
  asOf: string
): number {
  const stats = promiseStats(clientPromises, asOf);
  if (stats.keepRate === null || stats.kept + stats.broken < 2) return base;
  return Math.round(0.7 * base + 0.3 * stats.keepRate);
}
