'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell, Info, ShieldAlert } from 'lucide-react';
import { AlertSeverity, AppAlert } from '@/types';

interface Props {
  onNavigate: (alert: AppAlert) => void;
  /** Changes when the books change so the list refreshes. */
  refreshKey?: string;
}

const ICON: Record<AlertSeverity, typeof Info> = {
  critical: ShieldAlert,
  warning: AlertTriangle,
  info: Info,
};
const COLOR: Record<AlertSeverity, string> = {
  critical: 'text-[#9e5031]',
  warning: 'text-[#8a5d06]',
  info: 'text-[#47594a]',
};

export default function AlertsBell({ onNavigate, refreshKey }: Props) {
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/alerts')
      .then((r) => (r.ok ? r.json() : { alerts: [] }))
      .then((d) => {
        if (active) setAlerts(Array.isArray(d.alerts) ? d.alerts : []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const urgent = alerts.filter((a) => a.severity !== 'info').length;
  const hasCritical = alerts.some((a) => a.severity === 'critical');

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="clay-btn-secondary relative px-2.5 py-2"
        aria-label={`Alerts, ${alerts.length} active`}
        aria-expanded={open}
      >
        <Bell className="h-3.5 w-3.5" />
        {alerts.length > 0 && (
          <span
            className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
              hasCritical ? 'bg-[#b8623f]' : urgent ? 'bg-[#d99b26]' : 'bg-[#7d9080]'
            }`}
          >
            {alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="clay-card absolute right-0 z-40 mt-2 w-80 max-w-[85vw] space-y-1 p-3" role="menu">
          <p className="px-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#5c554e]">
            Alerts
          </p>
          {alerts.length === 0 ? (
            <p className="px-1 py-3 text-xs text-[#5c554e]">All clear. Nothing needs attention.</p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto clay-scroll">
              {alerts.map((a) => {
                const Icon = ICON[a.severity];
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onNavigate(a);
                      }}
                      className="clay-inset flex w-full items-start gap-2.5 p-2.5 text-left hover:border-[#b8623f]"
                    >
                      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${COLOR[a.severity]}`} />
                      <span>
                        <span className="block text-xs font-bold text-[#2a2622]">{a.title}</span>
                        <span className="block text-[11px] text-[#5c554e]">{a.detail}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
