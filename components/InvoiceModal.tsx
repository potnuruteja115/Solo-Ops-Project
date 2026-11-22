'use client';

import { X, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { LedgerEntry } from '@/types';

interface Props {
  entry: LedgerEntry | null;
  onClose: () => void;
  businessName?: string;
  gstin?: string;
  upiId?: string;
  invoicePrefix?: string;
}

export default function InvoiceModal({
  entry,
  onClose,
  businessName = 'Your Business',
  gstin = '',
  upiId = '',
  invoicePrefix = 'INV',
}: Props) {
  if (!entry) return null;

  const documentNumber = (
    entry.type === 'invoice' ? entry.id.replace(/^inv-/i, `${invoicePrefix}-`) : entry.id
  ).toUpperCase();

  const taxAmount = entry.totalAmount - entry.amount;
  const halfTax = Math.round(taxAmount / 2);
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(businessName)}&am=${entry.totalAmount}&cu=INR`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a2622]/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="GST Tax Invoice"
    >
      <div className="print-only-card clay-card w-full max-w-xl p-6">
        <div className="mb-5 flex items-center justify-between border-b border-[#d8cfc0] pb-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#b8623f]">
              GST Tax Invoice
            </p>
            <h3 className="font-heading text-xl font-bold text-[#2a2622]">
              {documentNumber} · {businessName}
            </h3>
            <p className="font-mono text-xs text-[#5c554e]">GSTIN: {gstin || 'Not registered'}</p>
          </div>

          <div className="no-print flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="clay-btn-primary flex items-center gap-1.5 px-3.5 py-2 text-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="clay-btn-secondary p-2"
              aria-label="Close invoice modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-4 text-xs">
          <div className="clay-inset p-3">
            <p className="font-bold uppercase text-[#5c554e]">Billed To</p>
            <p className="mt-1 text-sm font-bold text-[#2a2622]">{entry.partyName}</p>
            <p className="mt-0.5 text-[#5c554e]">Category: {entry.category}</p>
          </div>
          <div className="clay-inset p-3 text-right">
            <p className="text-[#5c554e]">Issue Date: {entry.date}</p>
            {entry.dueDate && (
              <p className="mt-0.5 text-[#5c554e]">Due Date: {entry.dueDate}</p>
            )}
            <p className="mt-0.5 font-mono text-[11px] uppercase text-[#2a2622]">
              Status: {entry.status}
            </p>
          </div>
        </div>

        <div className="clay-inset mb-5 space-y-2.5 p-4 text-xs">
          <div className="flex justify-between text-sm font-semibold text-[#2a2622]">
            <span>{entry.description}</span>
            <span className="font-mono">
              INR {entry.amount.toLocaleString('en-IN')}
            </span>
          </div>
          {entry.taxRate > 0 && (
            <>
              <div className="flex justify-between border-t border-[#d8cfc0] pt-2 text-[#5c554e]">
                <span>CGST ({(entry.taxRate / 2).toFixed(1)}%)</span>
                <span className="font-mono">
                  INR {halfTax.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-[#5c554e]">
                <span>SGST ({(entry.taxRate / 2).toFixed(1)}%)</span>
                <span className="font-mono">
                  INR {(taxAmount - halfTax).toLocaleString('en-IN')}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between border-t border-[#d8cfc0] pt-3 text-base font-bold text-[#2a2622]">
            <span>Total Payable</span>
            <span className="font-mono text-[#b8623f]">
              INR {entry.totalAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#d8cfc0] pt-4">
          <div className="text-xs text-[#5c554e]">
            <p className="font-bold text-[#2a2622]">Instant UPI Settlement</p>
            <p className="mt-0.5 font-mono">
              {upiId ? `UPI ID: ${upiId}` : 'Add your UPI ID in Settings to show a payment QR.'}
            </p>
            <p className="mt-1 font-mono text-[11px]">
              Provenance: {entry.sourceDocumentId} ({entry.sourceDate})
            </p>
          </div>
          <div className="rounded-xl border border-[#d8cfc0] bg-white p-2">
            {upiId ? (
              <QRCodeSVG value={upiUri} size={84} />
            ) : (
              <div className="flex h-[84px] w-[84px] items-center justify-center text-center text-[10px] text-[#5c554e]">
                No UPI ID
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
