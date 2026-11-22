'use client';

import { useEffect, useState } from 'react';
import { Banknote, BrainCircuit, CalendarClock, ClipboardList, FilePlus2, Settings, UserPlus } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';
import { ActivityEvent, ActivityKind } from '@/types';

const ICON: Record<ActivityKind, typeof Banknote> = {
  entry: FilePlus2,
  payment: Banknote,
  client: UserPlus,
  promise: ClipboardList,
  debrief: BrainCircuit,
  recurring: CalendarClock,
  settings: Settings,
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function ActivityTab({ refreshKey }: { refreshKey: string }) {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/activity?limit=60')
      .then((r) => r.json())
      .then((d) => active && setEvents(d.events))
      .catch(() => active && setEvents([]));
    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (!events) return <CardSkeleton rows={5} />;

  return (
    <div className="clay-card space-y-4 p-5">
      <div>
        <h2 className="font-heading text-base font-bold text-[#2a2622]">Activity Log</h2>
        <p className="text-xs text-[#5c554e]">An audit trail of every change made in this workspace.</p>
      </div>
      {events.length === 0 ? (
        <p className="text-xs text-[#5c554e]">No activity yet. Log an entry, mark a payment or add a client.</p>
      ) : (
        <ol className="space-y-3">
          {events.map((e) => {
            const Icon = ICON[e.kind] ?? FilePlus2;
            return (
              <li key={e.id} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e8e2d5] text-[#b8623f]">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-sm text-[#2a2622]">{e.message}</p>
                  <p className="font-mono text-[11px] text-[#5c554e]">{formatTime(e.at)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
