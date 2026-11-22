'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, X, RotateCcw } from 'lucide-react';
import TopNav from '@/components/TopNav';
import CommandPalette from '@/components/CommandPalette';
import ClientDirectory from '@/components/ClientDirectory';
import CommandDropzone from '@/components/CommandDropzone';
import KpiGrid from '@/components/KpiGrid';
import CashFlowChart from '@/components/CashFlowChart';
import AiCfoBanner from '@/components/AiCfoBanner';
import LedgerTable from '@/components/LedgerTable';
import SideBySideCompare from '@/components/SideBySideCompare';
import TaxVaultTab from '@/components/TaxVaultTab';
import LearningCurveTab from '@/components/LearningCurveTab';
import ReceivablesTab from '@/components/ReceivablesTab';
import ClientIntelTab from '@/components/ClientIntelTab';
import AnalyticsTab from '@/components/AnalyticsTab';
import RecurringTab from '@/components/RecurringTab';
import ActivityTab from '@/components/ActivityTab';
import { Skeleton } from '@/components/Skeleton';
import InvoiceModal from '@/components/InvoiceModal';
import FollowUpDrawer from '@/components/FollowUpDrawer';
import {
  ApiErrorPayload,
  AppAlert,
  ClientProfile,
  FollowUpTone,
  LedgerEntry,
} from '@/types';

type WorkspaceTab = 'ledger' | 'receivables' | 'intel' | 'analytics' | 'recurring' | 'activity' | 'compare' | 'tax' | 'curve';

const TAB_DEFS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'ledger', label: 'Command & Ledger' },
  { id: 'receivables', label: 'Receivables' },
  { id: 'intel', label: 'Client Intel' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'recurring', label: 'Recurring' },
  { id: 'activity', label: 'Activity' },
  { id: 'compare', label: 'Memory Contrast' },
  { id: 'tax', label: 'GST Tax Vault' },
  { id: 'curve', label: 'Learning Curve' },
];
const TAB_IDS = TAB_DEFS.map((t) => t.id);

export default function WorkspacePage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('ledger');
  const [commandInput, setCommandInput] = useState('');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState<ApiErrorPayload | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<LedgerEntry | null>(null);
  const [selectedFollowUp, setSelectedFollowUp] = useState<LedgerEntry | null>(null);
  const [followUpTone, setFollowUpTone] = useState<FollowUpTone | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [profile, setProfile] = useState<{
    businessName: string;
    gstin: string;
    upiId: string;
    invoicePrefix?: string;
    defaultTaxRate?: number;
    paymentTermsDays?: number;
  } | null>(null);
  const dropzoneRef = useRef<HTMLDivElement | null>(null);

  const selectTab = useCallback((tab: WorkspaceTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState(null, '', url);
  }, []);

  const loadLedger = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ledger');
      const data = await res.json();
      setEntries(Array.isArray(data?.entries) ? data.entries : []);
      setClients(Array.isArray(data?.clients) ? data.clients : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // `loading` already starts as true, so the first load does not need to set it again.
    let active = true;
    fetch('/api/ledger')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setEntries(Array.isArray(data?.entries) ? data.entries : []);
        setClients(Array.isArray(data?.clients) ? data.clients : []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => active && d?.user && setProfile(d.user))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!statusBanner) return;
    const timer = setTimeout(() => setStatusBanner(null), 6000);
    return () => clearTimeout(timer);
  }, [statusBanner]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('clientId');
    // Reading the URL once on mount is a legitimate sync with an external system.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (cid) setSelectedClientId(cid);
    const tabParam = params.get('tab') === 'learning-curve' ? 'curve' : params.get('tab');
    if (tabParam && TAB_IDS.includes(tabParam as WorkspaceTab)) setActiveTab(tabParam as WorkspaceTab);
    /* eslint-enable react-hooks/set-state-in-effect */

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
        return;
      }
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      if (typing) return;
      if (e.altKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        selectTab(TAB_DEFS[Number(e.key) - 1].id);
      } else if (e.key === '?') {
        setShortcutsOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setShortcutsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectTab]);

  const openFollowUp = (entry: LedgerEntry, tone?: FollowUpTone) => {
    setFollowUpTone(tone);
    setSelectedFollowUp(entry);
  };

  const handleEntryCreated = (entry: LedgerEntry, provNote?: string) => {
    setEntries((prev) => [entry, ...prev]);
    setServiceError(null);
    setStatusBanner(
      `Recorded ${entry.id.toUpperCase()} for ${entry.partyName} (INR ${entry.totalAmount.toLocaleString('en-IN')})${
        provNote ? ` · ${provNote}` : ''
      }`
    );
    loadLedger();
  };

  const handleTogglePaid = async (id: string) => {
    const res = await fetch('/api/ledger', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (Array.isArray(data?.entries)) {
      setEntries(data.entries);
      setStatusBanner(`Updated status for ${id.toUpperCase()}.`);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/ledger?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (Array.isArray(data?.entries)) {
      setEntries(data.entries);
      setStatusBanner(`Removed entry ${id.toUpperCase()}.`);
    }
  };

  const handleResetDemo = async () => {
    const res = await fetch('/api/ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    });
    const data = await res.json();
    setEntries(Array.isArray(data?.entries) ? data.entries : []);
    setClients(Array.isArray(data?.clients) ? data.clients : []);
    setServiceError(null);
    setStatusBanner('Restored sample seed ledger and client directory.');
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newClientName.trim(),
        company: newClientCompany.trim() || newClientName.trim(),
      }),
    });
    const data = await res.json();
    if (Array.isArray(data?.clients)) {
      setClients(data.clients);
    }
    setNewClientName('');
    setNewClientCompany('');
    setNewClientOpen(false);
    setStatusBanner(`Added client ${newClientName.trim()}.`);
  };

  const entriesKey = entries.map((e) => `${e.id}:${e.status}`).join('|');

  const visibleEntries = selectedClientId
    ? entries.filter((e) => {
        const clientObj = clients.find((c) => c.id === selectedClientId);
        return (
          e.clientId === selectedClientId ||
          (clientObj &&
            e.partyName.toLowerCase() === clientObj.company.toLowerCase())
        );
      })
    : entries;

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6">
      <TopNav
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenNewClient={() => setNewClientOpen(true)}
        onFocusDropzone={() => {
          selectTab('ledger');
          dropzoneRef.current?.scrollIntoView({ behavior: 'smooth' });
        }}
        businessName={profile?.businessName}
        refreshKey={entriesKey}
        onNavigateAlert={(a: AppAlert) => {
          if (a.clientId) setSelectedClientId(a.clientId);
          selectTab(a.tab ?? 'receivables');
        }}
      />

      <main className="mx-auto mt-6 max-w-7xl space-y-6">
        {serviceError && (
          <div
            role="alert"
            className="clay-card flex items-start justify-between gap-3 border-[#b8623f] bg-[#f7eae4] p-4 text-xs text-[#2a2622]"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#b8623f]" />
              <div>
                <p className="font-bold uppercase text-[#9e5031]">
                  {serviceError.service} Service Error ({serviceError.statusCode})
                </p>
                <p className="mt-0.5">{serviceError.error}</p>
                {serviceError.statusCode === 429 && (
                  <p className="mt-1 text-[#5c554e]">
                    Wait 10 seconds before retrying or use Side-by-Side Compare with cold mode.
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setServiceError(null)}
              className="rounded-lg p-1 text-[#5c554e] hover:bg-[#e8e2d5]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {statusBanner && (
          <div className="clay-card-flat flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-[#2a2622]">
            <span>{statusBanner}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-[#5c554e] hover:text-[#2a2622]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Loading figures">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[104px]" />
            ))}
          </div>
        ) : (
          <KpiGrid entries={visibleEntries} />
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <ClientDirectory
              clients={clients}
              entries={entries}
              selectedClientId={selectedClientId}
              onSelectClient={(c) => setSelectedClientId(c ? c.id : null)}
            />
          </div>

          <div className="space-y-6 lg:col-span-8">
            <div className="clay-card flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="-mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1 pb-1 md:flex-wrap" role="tablist" aria-label="Workspace views">
                {TAB_DEFS.map((t, i) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === t.id}
                    title={`Alt+${i + 1}`}
                    onClick={() => selectTab(t.id)}
                    className={`shrink-0 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                      activeTab === t.id
                        ? 'bg-[#b8623f] text-white'
                        : 'bg-[#e8e2d5] text-[#5c554e] hover:text-[#2a2622]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleResetDemo}
                className="clay-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Seed Data
              </button>
            </div>

            {activeTab === 'ledger' && (
              <>
                <div ref={dropzoneRef}>
                  <CommandDropzone
                    input={commandInput}
                    onInputChange={setCommandInput}
                    onEntryCreated={handleEntryCreated}
                    onServiceError={setServiceError}
                    externalLoading={loading}
                  />
                </div>

                <AiCfoBanner
                  entries={visibleEntries}
                  onServiceError={setServiceError}
                />

                <CashFlowChart entries={visibleEntries} />

                <LedgerTable
                  entries={visibleEntries}
                  onTogglePaid={handleTogglePaid}
                  onDelete={handleDelete}
                  onOpenInvoice={setSelectedInvoice}
                  onOpenFollowUp={(entry) => openFollowUp(entry)}
                />
              </>
            )}

            {activeTab === 'receivables' && (
              <ReceivablesTab
                refreshKey={entriesKey}
                onOpenFollowUp={openFollowUp}
              />
            )}

            {activeTab === 'intel' && (
              <ClientIntelTab
                client={clients.find((c) => c.id === selectedClientId) ?? null}
              />
            )}

            {activeTab === 'compare' && (
              <SideBySideCompare
                entries={entries}
                onServiceError={setServiceError}
              />
            )}

            {activeTab === 'analytics' && <AnalyticsTab refreshKey={entriesKey} />}

            {activeTab === 'recurring' && (
              <RecurringTab
                clients={clients}
                refreshKey={entriesKey}
                defaults={{
                  taxRate: profile?.defaultTaxRate ?? 18,
                  termsDays: profile?.paymentTermsDays ?? 10,
                }}
                onGenerated={(count) => {
                  loadLedger();
                  setStatusBanner(`Generated ${count} recurring invoice(s). Review them in the ledger.`);
                }}
              />
            )}

            {activeTab === 'activity' && <ActivityTab refreshKey={entriesKey} />}

            {activeTab === 'tax' && <TaxVaultTab entries={entries} gstin={profile?.gstin} />}

            {activeTab === 'curve' && <LearningCurveTab />}
          </div>
        </div>
      </main>

      {newClientOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a2622]/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form onSubmit={handleCreateClient} className="clay-card w-full max-w-md space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-[#2a2622]">
                Add New Client
              </h2>
              <button
                type="button"
                onClick={() => setNewClientOpen(false)}
                className="clay-btn-secondary p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Client Contact Name</label>
              <input
                type="text"
                required
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Arjun Rao"
                className="clay-input w-full px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Company / Studio</label>
              <input
                type="text"
                value={newClientCompany}
                onChange={(e) => setNewClientCompany(e.target.value)}
                placeholder="Rao Ventures"
                className="clay-input w-full px-3.5 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewClientOpen(false)}
                className="clay-btn-secondary px-4 py-2 text-xs"
              >
                Cancel
              </button>
              <button type="submit" className="clay-btn-primary px-4 py-2 text-xs">
                Save Client
              </button>
            </div>
          </form>
        </div>
      )}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onRunPreset={(txt) => {
          selectTab('ledger');
          setCommandInput(txt);
        }}
        onRunAudit={() => selectTab('ledger')}
        onNavigate={(tab) => selectTab(tab as WorkspaceTab)}
        tabs={TAB_DEFS}
      />

      <InvoiceModal
        entry={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        businessName={profile?.businessName}
        gstin={profile?.gstin}
        upiId={profile?.upiId}
        invoicePrefix={profile?.invoicePrefix}
      />

      {shortcutsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a2622]/45 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
          onClick={() => setShortcutsOpen(false)}
        >
          <div className="clay-card w-full max-w-sm space-y-3 p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-heading text-base font-bold text-[#2a2622]">Keyboard shortcuts</h2>
            <ul className="space-y-1.5 text-xs text-[#2a2622]">
              <li className="flex justify-between"><span>Command palette</span><kbd className="font-mono">Ctrl/Cmd + K</kbd></li>
              {TAB_DEFS.map((t, i) => (
                <li key={t.id} className="flex justify-between"><span>{t.label}</span><kbd className="font-mono">Alt + {i + 1}</kbd></li>
              ))}
              <li className="flex justify-between"><span>This help</span><kbd className="font-mono">?</kbd></li>
            </ul>
          </div>
        </div>
      )}

      <FollowUpDrawer
        entry={selectedFollowUp}
        onClose={() => setSelectedFollowUp(null)}
        onServiceError={setServiceError}
        initialTone={followUpTone}
      />
    </div>
  );
}
