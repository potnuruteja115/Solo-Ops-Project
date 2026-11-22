export type EntryType = 'invoice' | 'expense';
export type EntryStatus = 'paid' | 'pending' | 'overdue';
export type FollowUpTone = 'polite' | 'firm' | 'urgent';
export type RiskLevel = 'critical' | 'high' | 'moderate' | 'low';
export type RelationshipStatus = 'at_risk' | 'neutral' | 'expanding';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  businessName: string;
  gstin: string;
  upiId: string;
  currency: 'INR' | 'USD';
  createdAt: string;
  invoicePrefix?: string;
  defaultTaxRate?: number;
  paymentTermsDays?: number;
  /** Late fee as a percentage of the invoice total per 30 days overdue. */
  lateFeePercent?: number;
}

export interface ClientProfile {
  id: string;
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  reliabilityScore: number;
  riskLevel: RiskLevel;
  relationshipStatus: RelationshipStatus;
  brokenPromisesCount: number;
  overdueAmount: number;
  totalBilled: number;
  lastMeetingDate: string;
  nextAction: string;
  nextActionDeadline: string;
  memorySummary: string;
  riskFactors: string[];
}

export interface LedgerEntry {
  id: string;
  clientId?: string;
  type: EntryType;
  partyName: string;
  description: string;
  amount: number;
  taxRate: number;
  totalAmount: number;
  status: EntryStatus;
  category: string;
  date: string;
  dueDate?: string;
  rawInput?: string;
  sourceDate: string;
  sourceDocumentId: string;
}

export interface FollowUpDraft {
  subject: string;
  emailBody: string;
  whatsappMessage: string;
  usedMemory: boolean;
  provenanceNote: string;
}

export interface CfoInsight {
  headline: string;
  healthScore: number;
  cashFlowSummary: string;
  gstReserveAlert: string;
  topRiskClient: string;
  priorityActions: string[];
}

export interface LearningCurveStage {
  stage: string;
  timeframe: string;
  title: string;
  trackedEntries: number;
  detectedRisks: number;
  automationAccuracy: string;
  summary: string;
  keyInsights: string[];
}

export interface ApiErrorPayload {
  service: 'groq' | 'hindsight' | 'unknown';
  statusCode: number;
  error: string;
  rawError?: string;
}

export interface AgingBucket {
  key: 'current' | 'd1_30' | 'd31_60' | 'd61_90' | 'd90_plus';
  label: string;
  count: number;
  amount: number;
}

export interface CollectionItem {
  entry: LedgerEntry;
  daysOverdue: number;
  dueInDays: number;
  reliabilityScore: number;
  priorityScore: number;
  lateFee: number;
  recommendedTone: FollowUpTone;
  reason: string;
}

export interface CashForecastPoint {
  horizonDays: 30 | 60 | 90;
  expectedInflow: number;
  pendingOutflow: number;
  net: number;
}

export interface ReceivablesReport {
  asOf: string;
  summary: {
    totalOutstanding: number;
    totalOverdue: number;
    collectionEfficiency: number;
    expectedNext30: number;
    accruedLateFees: number;
  };
  aging: AgingBucket[];
  queue: CollectionItem[];
  forecast: CashForecastPoint[];
}

export type PromiseOwner = 'client' | 'us';
export type PromiseStatus = 'pending' | 'kept' | 'broken';
export type CallOutcome = 'advanced' | 'stalled' | 'lost_ground';

export interface PaymentPromise {
  id: string;
  clientId: string;
  owner: PromiseOwner;
  text: string;
  dueDate: string | null;
  status: PromiseStatus;
  entryId?: string;
  sourceNoteId?: string;
  sourceDate: string;
}

export interface ClientNote {
  id: string;
  clientId: string;
  date: string;
  outcome: CallOutcome;
  summary: string;
  rawNotes: string;
  openQuestions: string[];
}

export interface PromiseStats {
  kept: number;
  broken: number;
  pending: number;
  /** Share of resolved client promises that were kept, 0-100, or null if none resolved. */
  keepRate: number | null;
}

export type ActivityKind =
  | 'entry'
  | 'payment'
  | 'client'
  | 'promise'
  | 'debrief'
  | 'recurring'
  | 'settings';

export interface ActivityEvent {
  id: string;
  at: string;
  kind: ActivityKind;
  message: string;
  refId?: string;
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly';

export interface RecurringTemplate {
  id: string;
  clientId: string;
  description: string;
  amount: number;
  taxRate: number;
  category: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  termsDays: number;
  active: boolean;
  /** Number of invoices already generated; the next one is occurrence(runCount). */
  runCount: number;
  lastRunDate?: string;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AppAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  tab?: 'receivables' | 'intel' | 'tax' | 'analytics' | 'recurring' | 'ledger';
  clientId?: string;
}

export interface MonthlyPnl {
  month: string;
  invoiced: number;
  collected: number;
  expenses: number;
  net: number;
  gstOutput: number;
  gstInput: number;
}

export interface CategoryTotal {
  category: string;
  amount: number;
}

export interface ClientRevenue {
  partyName: string;
  amount: number;
  share: number;
}

export interface AnalyticsReport {
  asOf: string;
  kpis: {
    totalInvoiced: number;
    totalExpenses: number;
    netProfit: number;
    marginPct: number;
    avgInvoice: number;
  };
  monthly: MonthlyPnl[];
  expensesByCategory: CategoryTotal[];
  revenueByClient: ClientRevenue[];
  concentration: { topShare: number; level: 'low' | 'moderate' | 'high'; topClient: string };
}
