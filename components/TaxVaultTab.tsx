'use client';

import { Landmark, Download } from 'lucide-react';
import { LedgerEntry } from '@/types';

interface Props {
  entries: LedgerEntry[];
  gstin?: string;
}

export default function TaxVaultTab({
  entries,
  gstin = '',
}: Props) {
  const outputGst = entries
    .filter((e) => e.type === 'invoice')
    .reduce((s, e) => s + (e.totalAmount - e.amount), 0);

  const inputTaxCredit = entries
    .filter((e) => e.type === 'expense')
    .reduce((s, e) => s + (e.totalAmount - e.amount), 0);

  const netGstPayable = Math.max(0, outputGst - inputTaxCredit);

  // Rate-wise register: taxable value and tax split, as a CA would file it.
  const register = Object.values(
    entries.reduce<
      Record<string, { type: string; rate: number; taxable: number; tax: number }>
    >((acc, e) => {
      const key = `${e.type}:${e.taxRate}`;
      const row = acc[key] || { type: e.type, rate: e.taxRate, taxable: 0, tax: 0 };
      row.taxable += e.amount;
      row.tax += e.totalAmount - e.amount;
      acc[key] = row;
      return acc;
    }, {})
  ).sort((a, b) => a.type.localeCompare(b.type) || b.rate - a.rate);

  const downloadTaxSummary = () => {
    const lines = [
      'Metric,Amount (INR)',
      `GSTIN,${gstin || 'Not registered'}`,
      `Output GST on Invoices,${outputGst}`,
      `Input Tax Credit on Expenses,${inputTaxCredit}`,
      `Net GST Payable,${netGstPayable}`,
      '',
      'Register,GST Rate %,Taxable Value (INR),CGST (INR),SGST (INR),Total Tax (INR)',
      ...register.map(
        (r) =>
          `${r.type === 'invoice' ? 'Outward supply' : 'Inward supply'},${r.rate},${r.taxable},${r.tax / 2},${r.tax / 2},${r.tax}`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'soloops-gst-summary.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="clay-card space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Landmark className="h-5 w-5 text-[#b8623f]" />
          <div>
            <h2 className="font-heading text-base font-bold text-[#2a2622]">
              Tax and GST Vault
            </h2>
            <p className="text-xs text-[#5c554e]">
              Registered GSTIN: <span className="font-mono font-semibold">{gstin || 'Not registered'}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={downloadTaxSummary}
          className="clay-btn-secondary flex items-center gap-1.5 px-3.5 py-2 text-xs"
        >
          <Download className="h-3.5 w-3.5" />
          Export CA Summary CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="clay-inset p-4">
          <p className="text-xs font-semibold text-[#5c554e]">Output GST (Invoices)</p>
          <p className="mt-1 font-mono text-xl font-bold text-[#2a2622]">
            INR {outputGst.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-[#5c554e]">
            CGST: INR {Math.round(outputGst / 2).toLocaleString('en-IN')} · SGST: INR{' '}
            {Math.round(outputGst / 2).toLocaleString('en-IN')}
          </p>
        </div>

        <div className="clay-inset p-4">
          <p className="text-xs font-semibold text-[#5c554e]">Input Tax Credit (Expenses)</p>
          <p className="mt-1 font-mono text-xl font-bold text-[#47594a]">
            INR {inputTaxCredit.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-[#5c554e]">
            Eligible tax from software, cloud, and travel items
          </p>
        </div>

        <div className="clay-inset p-4">
          <p className="text-xs font-semibold text-[#5c554e]">Net GST Payable</p>
          <p className="mt-1 font-mono text-xl font-bold text-[#b8623f]">
            INR {netGstPayable.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-[#5c554e]">
            Output tax minus claimable expense tax
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase text-[#5c554e]">
          Rate-wise GST Register
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr className="border-b border-[#d8cfc0] text-[#5c554e]">
                <th className="py-2 pr-3 font-semibold">Supply</th>
                <th className="py-2 pr-3 font-semibold">Rate</th>
                <th className="py-2 pr-3 text-right font-semibold">Taxable (INR)</th>
                <th className="py-2 pr-3 text-right font-semibold">CGST</th>
                <th className="py-2 pr-3 text-right font-semibold">SGST</th>
                <th className="py-2 text-right font-semibold">Total Tax</th>
              </tr>
            </thead>
            <tbody>
              {register.map((r) => (
                <tr key={`${r.type}:${r.rate}`} className="border-b border-[#d8cfc0]/60 font-mono">
                  <td className="py-2 pr-3 font-sans">
                    {r.type === 'invoice' ? 'Outward' : 'Inward'}
                  </td>
                  <td className="py-2 pr-3">{r.rate}%</td>
                  <td className="py-2 pr-3 text-right">{r.taxable.toLocaleString('en-IN')}</td>
                  <td className="py-2 pr-3 text-right">{(r.tax / 2).toLocaleString('en-IN')}</td>
                  <td className="py-2 pr-3 text-right">{(r.tax / 2).toLocaleString('en-IN')}</td>
                  <td className="py-2 text-right font-bold">{r.tax.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
