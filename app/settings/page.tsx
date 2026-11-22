'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import TopNav from '@/components/TopNav';
import { CardSkeleton } from '@/components/Skeleton';
import { validateGstin } from '@/lib/gstin';

interface Form {
  name: string;
  businessName: string;
  gstin: string;
  upiId: string;
  invoicePrefix: string;
  defaultTaxRate: string;
  paymentTermsDays: string;
  lateFeePercent: string;
}

export default function SettingsPage() {
  const [form, setForm] = useState<Form | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/settings')
      .then((r) => r.json())
      .then(({ user }) => {
        if (!active || !user) return;
        setForm({
          name: user.name ?? '',
          businessName: user.businessName ?? '',
          gstin: user.gstin ?? '',
          upiId: user.upiId ?? '',
          invoicePrefix: user.invoicePrefix ?? 'INV',
          defaultTaxRate: String(user.defaultTaxRate ?? 18),
          paymentTermsDays: String(user.paymentTermsDays ?? 10),
          lateFeePercent: String(user.lateFeePercent ?? 1.5),
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => (f ? { ...f, [key]: e.target.value } : f));

  const gstinCheck = form && form.gstin.trim() ? validateGstin(form.gstin) : null;

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        defaultTaxRate: Number(form.defaultTaxRate),
        paymentTermsDays: Number(form.paymentTermsDays),
        lateFeePercent: Number(form.lateFeePercent),
      }),
    });
    const json = await res.json();
    setSaving(false);
    setMessage(res.ok ? { ok: true, text: 'Settings saved.' } : { ok: false, text: json?.error || 'Could not save.' });
  };

  const field = (label: string, key: keyof Form, hint?: string, mono = false) => (
    <label className="block">
      <span className="text-xs font-semibold text-[#2a2622]">{label}</span>
      <input value={form![key]} onChange={set(key)} className={`clay-input mt-1 w-full px-3.5 py-2.5 text-sm ${mono ? 'font-mono' : ''}`} />
      {hint && <span className="mt-1 block text-[11px] text-[#5c554e]">{hint}</span>}
    </label>
  );

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6">
      <TopNav onOpenPalette={() => {}} onOpenNewClient={() => {}} />
      <main className="mx-auto mt-6 max-w-3xl space-y-6">
        <div className="clay-card p-6">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#b8623f]">Settings</p>
          <h1 className="font-heading mt-1 text-2xl font-bold text-[#2a2622]">Business Profile</h1>
          <p className="mt-1 text-xs text-[#5c554e]">
            These details appear on your invoices, the GST Tax Vault and payment reminders.
          </p>
        </div>

        {!form ? (
          <CardSkeleton rows={6} />
        ) : (
          <div className="clay-card space-y-5 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {field('Your name', 'name')}
              {field('Business name', 'businessName')}
              <div>
                {field('GSTIN', 'gstin', 'Leave empty if you are not GST registered.', true)}
                {gstinCheck && (
                  <p className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${gstinCheck.valid ? 'text-[#435747]' : 'text-[#9e5031]'}`}>
                    {gstinCheck.valid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {gstinCheck.valid ? 'Valid GSTIN' : gstinCheck.reason}
                  </p>
                )}
              </div>
              {field('UPI ID', 'upiId', 'Used for the QR code on invoices, e.g. name@okicici.', true)}
            </div>

            <div className="border-t border-[#d8cfc0] pt-5">
              <h2 className="mb-3 text-xs font-bold uppercase text-[#5c554e]">Invoicing defaults</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {field('Invoice prefix', 'invoicePrefix', 'Shown before the invoice number, e.g. INV-1003.', true)}
                {field('Default GST rate (%)', 'defaultTaxRate')}
                {field('Payment terms (days)', 'paymentTermsDays', 'Used as the default due date for new schedules.')}
                {field('Late fee (% per 30 days)', 'lateFeePercent', 'Accrued on overdue invoices in Receivables. Set 0 to disable.')}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button type="button" onClick={save} disabled={saving} className="clay-btn-primary px-5 py-2.5 text-sm disabled:opacity-50">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              {message && (
                <span role="status" className={`text-xs font-semibold ${message.ok ? 'text-[#435747]' : 'text-[#9e5031]'}`}>
                  {message.text}
                </span>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
