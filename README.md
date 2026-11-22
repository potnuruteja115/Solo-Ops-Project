# SoloOps: Autonomous One-Person Back Office

SoloOps turns messy client messages, emails, and expense receipts into structured INR ledger entries, GST tax invoices with UPI QR codes, portfolio receivable risk rankings, and tone-calibrated payment follow-ups.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   Add your `GROQ_API_KEY` inside `.env.local`.
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000` or jump straight into `http://localhost:3000/app?demo=true`.

## Features

**Core**
- Turn messy messages, emails and receipts into structured INR ledger entries (Groq AI).
- GST tax invoices with a scannable UPI QR code and your own business details.
- Client directory with reliability scoring and AI payment follow-ups in four tones.
- Memory Contrast and Learning Curve views that show what long-term memory (Hindsight) adds.

**Collections intelligence**
- **Receivables aging**: unpaid invoices by days overdue, with accrued late fees.
- **Cash flow forecast**: 30/60/90 days, weighted by each client's reliability.
- **Smart Collections Queue**: ranked by amount, days overdue and reliability, with a recommended tone that opens the follow-up drawer in one click.
- **Auto-overdue detection**: unpaid invoices past their due date show as overdue automatically.

**Client Intel** (select a client first)
- **Payment promise tracker**: kept, broken or pending, with automatic broken status after the due date.
- **Post-call debrief**: paste call, WhatsApp or email notes; promises, due dates and open questions are extracted and saved to memory.
- **Promise-adjusted reliability** feeds the forecast and the queue.
- **Call timeline** and a **Memory Inspector** with Recall and Reflect.

**Automation and insight**
- **Recurring invoices**: weekly, monthly or quarterly schedules with correct month-end handling. Running twice never duplicates.
- **Smart alerts** (bell icon): overdue invoices, broken promises, GSTR-3B reminders near the 20th, client concentration and due schedules.
- **Analytics**: monthly profit and loss chart, expenses by category and client-concentration risk.
- **CA report pack**: GST register (CGST/SGST by rate), monthly P&L and aging as CSV.
- **Ask Your Books**: ask questions about your own data, answered only from it.
- **Activity log**: an audit trail of every change.

**Account and security**
- Pages and APIs require a login (`proxy.ts`); old `?demo=true` links start a demo session safely.
- **Settings** page with GSTIN validation (format and check digit), UPI ID, invoice prefix, tax and late-fee defaults.
- CSV exports quote every cell and neutralise spreadsheet formulas.

**Everyday UX**: tabs sync to the URL, `Alt+1` to `Alt+9` switch tabs, `?` shows shortcuts, `Ctrl/Cmd+K` opens the command palette, loading skeletons, auto-dismissing notices and a mobile-friendly layout.

Demo login: `demo@soloops.app` / `soloops-demo`.

## Automated Tests

Start the dev server and run:

```bash
npm test
```

This logs in as the demo user and covers route protection, settings validation, recurring invoices, alerts, reports, promises and the activity log.

For a real-browser check of every tab (needs `pip install playwright` and `playwright install chromium`):

```bash
python3 tests/ui_smoke.py
```
