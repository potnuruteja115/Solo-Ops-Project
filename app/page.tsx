import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Send,
  Lock,
  Brain,
  TrendingUp,
  Repeat,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

const MODULES = [
  {
    icon: FileSpreadsheet,
    accent: 'text-[#b8623f]',
    title: 'Command-to-Ledger Extraction',
    desc: 'Paste raw WhatsApp chats, emails, or expense receipts. SoloOps extracts base INR amounts, GST percentages, due dates, and source provenance in one click.',
  },
  {
    icon: ShieldCheck,
    accent: 'text-[#47594a]',
    title: 'GST Tax Vault & UPI QR Invoices',
    desc: 'Automatically computes CGST/SGST splits, tracks input tax credit, and generates print-ready tax invoices with scannable UPI QR codes.',
  },
  {
    icon: Send,
    accent: 'text-[#b8623f]',
    title: 'Grounded Payment Follow-Ups',
    desc: 'Drafts polite, firm, or urgent WhatsApp and email reminders backed by each client’s actual payment history and overdue aging.',
  },
  {
    icon: Brain,
    accent: 'text-[#47594a]',
    title: 'Persistent Client Memory & Promises',
    desc: 'Tracks verbal payment commitments, flags broken promises, and ranks portfolio receivable risk so late payers never catch you off guard.',
  },
  {
    icon: Repeat,
    accent: 'text-[#b8623f]',
    title: 'Recurring Retainers & P&L Analytics',
    desc: 'Automate monthly retainer schedules, monitor client revenue concentration, and export CA-ready CSV reports.',
  },
  {
    icon: Lock,
    accent: 'text-[#47594a]',
    title: 'Bcrypt Auth & Private Workspace',
    desc: 'Every account is secured with salted bcrypt password hashing and HMAC-signed HttpOnly session cookies.',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Drop Messy Inputs',
    desc: 'Paste a client approval message, receipt text, or log an invoice directly in the command dropzone.',
  },
  {
    step: '02',
    title: 'AI Structures Your Books',
    desc: 'SoloOps parses INR totals, GST splits, client profiles, and due dates—linking everything to your ledger.',
  },
  {
    step: '03',
    title: 'Collect Faster & Stay Compliant',
    desc: 'Send UPI QR invoices, watch overdue risk alerts, and download CA-ready P&L and GST summaries.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-[#d8cfc0] bg-[#e6dfd3]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" aria-label="SoloOps Home">
            <Logo size="md" subtitle="Autonomous One-Person Back Office" />
          </Link>

          <nav className="hidden items-center gap-6 text-xs font-semibold text-[#5c554e] md:flex">
            <a href="#about" className="transition hover:text-[#2a2622]">
              Project Overview
            </a>
            <a href="#workflow" className="transition hover:text-[#2a2622]">
              How It Works
            </a>
            <a href="#modules" className="transition hover:text-[#2a2622]">
              Modules
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="clay-btn-secondary px-4 py-2 text-xs"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="clay-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs"
            >
              Sign Up
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
        {/* Hero Card */}
        <section className="clay-card p-8 sm:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d8cfc0] bg-[#e8e2d5] px-3.5 py-1 text-xs font-semibold text-[#5c554e]">
            <Sparkles className="h-3.5 w-3.5 text-[#b8623f]" />
            Built for Solo Founders, Consultants & Freelancers in India
          </div>

          <h1 className="font-heading mt-5 max-w-3xl text-3xl font-bold leading-tight text-[#2a2622] sm:text-5xl">
            Turn messy client chats and receipts into GST invoices and cash-flow clarity.
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#5c554e]">
            SoloOps is an autonomous financial back-office workspace. It converts unstructured client messages and expense receipts into structured INR ledger entries, builds print-ready GST invoices with scannable UPI QR codes, tracks payment promises, and drafts tone-calibrated follow-ups.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="clay-btn-primary inline-flex items-center gap-2 px-5 py-3 text-sm"
            >
              Create Free Account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/app?demo=true"
              className="clay-btn-sage inline-flex items-center gap-2 px-5 py-3 text-sm"
            >
              Launch Instant Demo Workspace
            </Link>
            <Link
              href="/overview?demo=true"
              className="clay-btn-secondary inline-flex items-center gap-2 px-5 py-3 text-sm"
            >
              <TrendingUp className="h-4 w-4 text-[#b8623f]" />
              Portfolio Risk Overview
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#d8cfc0] pt-5 text-xs text-[#5c554e]">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#47594a]" />
              Salted bcrypt password hashing
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#47594a]" />
              GSTIN &amp; CGST/SGST ready
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#47594a]" />
              Instant UPI QR invoice generation
            </span>
          </div>
        </section>

        {/* Project Introduction */}
        <section id="about" className="clay-card p-8 sm:p-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:items-center">
            <div className="md:col-span-7">
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#b8623f]">
                About the Project
              </p>
              <h2 className="font-heading mt-2 text-2xl font-bold text-[#2a2622] sm:text-3xl">
                Why we built SoloOps
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#5c554e]">
                Independent consultants and one-person studios lose hours every week juggling WhatsApp confirmations, scattered expense bills, manual GST calculations, and awkward payment reminders.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#5c554e]">
                SoloOps combines fast LLM extraction, persistent client memory, and Indian tax/UPI workflows into a single calm workspace—giving solo operators the financial visibility of a full back-office finance team.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:col-span-5">
              <div className="clay-inset p-4">
                <p className="font-mono text-xl font-bold text-[#b8623f]">9 Tabs</p>
                <p className="mt-1 text-xs text-[#5c554e]">
                  Ledger, Receivables, Tax Vault, Analytics, Recurring, Client Intel &amp; more
                </p>
              </div>
              <div className="clay-inset p-4">
                <p className="font-mono text-xl font-bold text-[#47594a]">INR + GST</p>
                <p className="mt-1 text-xs text-[#5c554e]">
                  Native CGST/SGST math, ITC tracking, and UPI QR codes
                </p>
              </div>
              <div className="clay-inset p-4">
                <p className="font-mono text-xl font-bold text-[#2a2622]">AI CFO</p>
                <p className="mt-1 text-xs text-[#5c554e]">
                  Ask cash-flow questions and generate grounded follow-up drafts
                </p>
              </div>
              <div className="clay-inset p-4">
                <p className="font-mono text-xl font-bold text-[#2a2622]">Secure Auth</p>
                <p className="mt-1 text-xs text-[#5c554e]">
                  bcrypt hashed credentials &amp; signed HttpOnly session cookies
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3-Step Workflow */}
        <section id="workflow" className="clay-card p-8 sm:p-10">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#b8623f]">
            How It Works
          </p>
          <h2 className="font-heading mt-2 text-2xl font-bold text-[#2a2622]">
            From raw message to paid invoice in three steps
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {STEPS.map((item) => (
              <div key={item.step} className="clay-inset p-5">
                <span className="font-mono text-xs font-bold text-[#b8623f]">
                  STEP {item.step}
                </span>
                <h3 className="font-heading mt-2 text-base font-bold text-[#2a2622]">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#5c554e]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Core Modules */}
        <section id="modules" className="clay-card p-8 sm:p-10">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#b8623f]">
            Core Capabilities
          </p>
          <h2 className="font-heading mt-2 text-2xl font-bold text-[#2a2622]">
            Everything inside your SoloOps workspace
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <div key={mod.title} className="clay-inset p-5">
                  <Icon className={`h-4 w-4 ${mod.accent}`} />
                  <h3 className="font-heading mt-2.5 text-base font-bold text-[#2a2622]">
                    {mod.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#5c554e]">
                    {mod.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-8 border-t border-[#d8cfc0] bg-[#e8e2d5]/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
          <Logo size="sm" />
          <p className="text-xs text-[#5c554e]">
            © {new Date().getFullYear()} SoloOps · Autonomous One-Person Back Office
          </p>
          <div className="flex items-center gap-4 text-xs font-semibold text-[#5c554e]">
            <Link href="/login" className="hover:text-[#b8623f]">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-[#b8623f]">
              Create Account
            </Link>
            <Link href="/app?demo=true" className="hover:text-[#b8623f]">
              Live Demo
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
