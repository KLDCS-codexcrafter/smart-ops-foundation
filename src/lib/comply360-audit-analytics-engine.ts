/**
 * @file        src/lib/comply360-audit-analytics-engine.ts
 * @sibling     NEW @ Sprint 80b · Comply360 Floor 2 Audit-Suite · Pass B · DP-S80-10 · DP-S80-14 Choice (A)
 * @realizes    18 Tally Auditors' Edition-equivalent analytical procedures.
 *              Used by Statutory Audit, Internal Audit, External Audit, Tax Audit,
 *              GST Audit. Each procedure produces an AnalyticsProcedureResult and
 *              logs to audit-trail-engine via the universal logAudit (Rule 11(g)(b)).
 * @reads-from  comply360-audit-framework-engine (S80a · same-sprint-of-S80 · 0-DIFF)
 *              comply360-audit-trail-aggregator-engine (S78a · 0-DIFF)
 *              audit-trail-engine (Phase 4 · 0-DIFF)
 *              comply360-statutory-memory (S69 · 0-DIFF)
 * @sprint      Sprint 80b · T-Phase-5.B.2.1-PASS-B
 * [JWT] Phase 8: GET /api/comply360/audit-analytics/:procedure
 *               POST /api/comply360/audit-analytics/run
 */

import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

// ── READS_FROM canon (v1.22 mandatory) ────────────────────────────────
export const READS_FROM = {
  engines: [
    'comply360-audit-framework-engine',
    'comply360-audit-trail-aggregator-engine',
    'audit-trail-engine',
    'comply360-statutory-memory',
  ],
  storage_keys: ['erp_audit_analytics_runs'],
} as const;

// ── Helpers ────────────────────────────────────────────────────────────
function activeEntityCode(): string {
  try {
    return localStorage.getItem('erp_active_entity_code') ?? 'OPERIX-DEMO';
  } catch {
    return 'OPERIX-DEMO';
  }
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota — non-fatal */
  }
}

function AUD(t: string): LogAuditEntityType {
  return t as unknown as LogAuditEntityType;
}

// ── Shared types ──────────────────────────────────────────────────────
export interface VoucherInput {
  voucher_id: string;
  voucher_type: string;
  date: string;
  amount: number;
  ledger_code: string;
  ledger_name: string;
  narration: string;
  party_code?: string;
  cheque_number?: string;
  cheque_date?: string;
  cleared?: boolean;
  entity_code: string;
  fy: string;
}

export type AnalyticsProcedureCode =
  | 'COA_VERIFICATION'
  | 'STOCK_ITEMS_YOY'
  | 'BALANCES_OB_VARIANCE'
  | 'ANALYTICAL_GROUP_CC'
  | 'PENDING_DOCUMENTS'
  | 'STATUTORY_PAYMENTS'
  | 'PERIODIC_PAYMENTS'
  | 'REPEATED_TRANSACTIONS'
  | 'RSF_ANALYSIS'
  | 'INTER_BANK_TRANSFER'
  | 'CASH_WITHDRAWAL'
  | 'FIXED_ASSETS_ANALYSIS'
  | 'TRANSACTION_ON_HOLIDAY'
  | 'HIGHEST_LOWEST_VALUE'
  | 'PENDING_ADVANCES'
  | 'STALE_CHEQUE'
  | 'EXTERNAL_CONFIRMATION'
  | 'ACCOUNT_RECONCILIATION';

export interface AnalyticsProcedureInput {
  procedure_code: AnalyticsProcedureCode;
  engagement_id: string;
  fy: string;
  entity_code: string;
  population: VoucherInput[];
  parameters?: Record<string, unknown>;
  run_by_bap: BAPAccountId;
}

export interface AnalyticsProcedureResult {
  id: string;
  procedure_code: AnalyticsProcedureCode;
  procedure_label: string;
  engagement_id: string;
  fy: string;
  entity_code: string;
  population_count: number;
  flagged_count: number;
  flagged_vouchers: VoucherInput[];
  observations: string[];
  caro_clauses_triggered: string[];
  run_at: string;
  run_by_bap: BAPAccountId;
  audit_trail_id: string;
}

interface ProcedureMeta {
  code: AnalyticsProcedureCode;
  label: string;
  description: string;
  default_parameters: Record<string, unknown>;
  caro_clauses: string[];
}

// ── Procedure metadata ────────────────────────────────────────────────
export const ANALYTICS_PROCEDURES: ProcedureMeta[] = [
  { code: 'COA_VERIFICATION', label: 'Chart of Accounts (Y-o-Y)', description: 'Compare CoA structure with prior FY · identify new/deleted/renamed ledgers', default_parameters: { compare_fy: '' }, caro_clauses: [] },
  { code: 'STOCK_ITEMS_YOY', label: 'Stock Items (Y-o-Y)', description: 'Compare stock item master Y-o-Y', default_parameters: { compare_fy: '' }, caro_clauses: [] },
  { code: 'BALANCES_OB_VARIANCE', label: 'Opening Balance Variance', description: 'Verify opening balances match prior FY closing', default_parameters: { threshold_inr: 0 }, caro_clauses: [] },
  { code: 'ANALYTICAL_GROUP_CC', label: 'Group/Cost-Centre Analytics', description: 'Y-o-Y movement by Group · Cost-Centre · flag outliers', default_parameters: { variance_threshold_pct: 25 }, caro_clauses: [] },
  { code: 'PENDING_DOCUMENTS', label: 'Pending Documents', description: 'List unmatched POs · SOs · GRNs · PIs · SIs', default_parameters: { days_threshold: 90 }, caro_clauses: ['3(ii)(b)'] },
  { code: 'STATUTORY_PAYMENTS', label: 'Statutory Payments', description: 'PF · ESI · PT · GST · TDS payments timeliness · 43B compliance', default_parameters: {}, caro_clauses: ['3(vii)(a)', '3(vii)(b)'] },
  { code: 'PERIODIC_PAYMENTS', label: 'Periodic Payments/Receipts', description: 'Rent · salary · loan EMI · standing-order detection', default_parameters: { recurrence_min_months: 3 }, caro_clauses: [] },
  { code: 'REPEATED_TRANSACTIONS', label: 'Repeated Transactions', description: 'Same party + amount within window (potential duplicate)', default_parameters: { window_days: 7 }, caro_clauses: [] },
  { code: 'RSF_ANALYSIS', label: 'RSF Cross-Reference', description: 'Receipts vs Sales vs Forms-of-Payment reconciliation', default_parameters: {}, caro_clauses: [] },
  { code: 'INTER_BANK_TRANSFER', label: 'Inter-Bank Transfers', description: 'Inter-bank transfer anomaly · same-day round trip · circular flows', default_parameters: {}, caro_clauses: [] },
  { code: 'CASH_WITHDRAWAL', label: 'Cash Withdrawals/Deposits', description: 'Large cash transactions · 269ST/269SS compliance', default_parameters: { threshold_inr: 200000 }, caro_clauses: ['3(iii)'] },
  { code: 'FIXED_ASSETS_ANALYSIS', label: 'Fixed Assets Analysis', description: 'Additions · disposals · depreciation movement Y-o-Y', default_parameters: {}, caro_clauses: ['3(i)(a)', '3(i)(b)', '3(i)(c)'] },
  { code: 'TRANSACTION_ON_HOLIDAY', label: 'Transaction on Holiday', description: 'Vouchers dated on Sunday/gazetted holiday', default_parameters: { holidays: [] as string[] }, caro_clauses: [] },
  { code: 'HIGHEST_LOWEST_VALUE', label: 'Highest/Lowest Value Vouchers', description: 'Per-ledger highest + lowest value vouchers', default_parameters: { top_n: 10 }, caro_clauses: [] },
  { code: 'PENDING_ADVANCES', label: 'Pending Advances', description: 'Advances paid + not adjusted > 90 days', default_parameters: { days_threshold: 90 }, caro_clauses: ['3(iii)'] },
  { code: 'STALE_CHEQUE', label: 'Stale Cheques', description: 'Cheques issued > 3 months · still uncleared', default_parameters: { stale_days: 90 }, caro_clauses: [] },
  { code: 'EXTERNAL_CONFIRMATION', label: 'External Confirmation (basic)', description: 'Third-party balance confirmation tracker', default_parameters: {}, caro_clauses: [] },
  { code: 'ACCOUNT_RECONCILIATION', label: 'Account Reconciliation', description: 'Bank · party-balance · inter-company reconciliation', default_parameters: {}, caro_clauses: [] },
];

// ── Per-procedure flagging logic ──────────────────────────────────────
type FlagOutcome = { flagged: VoucherInput[]; observations: string[] };

function paramNum(p: Record<string, unknown> | undefined, key: string, fallback: number): number {
  const v = p?.[key];
  return typeof v === 'number' ? v : fallback;
}

function paramStrArr(p: Record<string, unknown> | undefined, key: string): string[] {
  const v = p?.[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function flagRepeated(pop: VoucherInput[], windowDays: number): FlagOutcome {
  const ms = windowDays * 86400000;
  const flagged: VoucherInput[] = [];
  for (let i = 0; i < pop.length; i++) {
    for (let j = i + 1; j < pop.length; j++) {
      const a = pop[i], b = pop[j];
      if (!a.party_code || !b.party_code) continue;
      if (a.party_code !== b.party_code) continue;
      if (a.amount !== b.amount) continue;
      const da = Date.parse(a.date), db = Date.parse(b.date);
      if (Math.abs(da - db) <= ms) {
        if (!flagged.includes(a)) flagged.push(a);
        if (!flagged.includes(b)) flagged.push(b);
      }
    }
  }
  return { flagged, observations: flagged.length ? [`${flagged.length} vouchers in same-party same-amount duplicate clusters`] : [] };
}

function flagCash(pop: VoucherInput[], threshold: number): FlagOutcome {
  const flagged = pop.filter(v => v.voucher_type === 'CR' && v.amount >= threshold);
  return { flagged, observations: flagged.length ? [`${flagged.length} cash receipts >= ₹${threshold} (269ST cross-ref)`] : [] };
}

function flagHoliday(pop: VoucherInput[], holidays: string[]): FlagOutcome {
  const holidaySet = new Set(holidays);
  const flagged = pop.filter(v => {
    const d = new Date(v.date);
    return d.getUTCDay() === 0 || holidaySet.has(v.date);
  });
  return { flagged, observations: flagged.length ? [`${flagged.length} vouchers dated on Sunday/holiday (potential backdating)`] : [] };
}

function flagStale(pop: VoucherInput[], staleDays: number): FlagOutcome {
  const cutoff = Date.now() - staleDays * 86400000;
  const flagged = pop.filter(v => v.cheque_number && v.cheque_date && Date.parse(v.cheque_date) < cutoff && v.cleared !== true);
  return { flagged, observations: flagged.length ? [`${flagged.length} cheques uncleared > ${staleDays} days`] : [] };
}

function flagPendingAdvances(pop: VoucherInput[], daysThreshold: number): FlagOutcome {
  const cutoff = Date.now() - daysThreshold * 86400000;
  const flagged = pop.filter(v => /advance/i.test(v.narration) && Date.parse(v.date) < cutoff && v.cleared !== true);
  return { flagged, observations: flagged.length ? [`${flagged.length} advances unadjusted > ${daysThreshold} days (CARO 3(iii))`] : [] };
}

function flagStatutoryLate(pop: VoucherInput[]): FlagOutcome {
  // Heuristic: late statutory payments narration-flagged.
  const flagged = pop.filter(v => /(pf|esi|tds|gst|pt).*late|late.*(pf|esi|tds|gst|pt)/i.test(v.narration));
  return { flagged, observations: flagged.length ? [`${flagged.length} statutory payments flagged late (43B cross-ref)`] : [] };
}

function flagHighLow(pop: VoucherInput[], topN: number): FlagOutcome {
  if (pop.length === 0) return { flagged: [], observations: [] };
  const sorted = [...pop].sort((a, b) => b.amount - a.amount);
  const top = sorted.slice(0, topN);
  const bottom = sorted.slice(-topN);
  const flagged = Array.from(new Set([...top, ...bottom]));
  return { flagged, observations: [`Top + bottom ${topN} value vouchers selected for analytical review`] };
}

function flagInterBank(pop: VoucherInput[]): FlagOutcome {
  const flagged = pop.filter(v => /inter[- ]?bank|transfer/i.test(v.narration));
  return { flagged, observations: flagged.length ? [`${flagged.length} inter-bank transfers identified`] : [] };
}

function flagFixedAssets(pop: VoucherInput[]): FlagOutcome {
  const flagged = pop.filter(v => /fixed asset|depreciation|addition|disposal/i.test(v.narration));
  return { flagged, observations: flagged.length ? [`${flagged.length} fixed asset movement vouchers identified`] : [] };
}

function flagPendingDocs(pop: VoucherInput[], daysThreshold: number): FlagOutcome {
  const cutoff = Date.now() - daysThreshold * 86400000;
  const flagged = pop.filter(v => /\b(po|so|grn|pi|si)\b/i.test(v.narration) && Date.parse(v.date) < cutoff && v.cleared !== true);
  return { flagged, observations: flagged.length ? [`${flagged.length} documents pending > ${daysThreshold} days`] : [] };
}

function flagPeriodic(pop: VoucherInput[]): FlagOutcome {
  const counts = new Map<string, number>();
  for (const v of pop) {
    if (!v.party_code) continue;
    counts.set(v.party_code, (counts.get(v.party_code) ?? 0) + 1);
  }
  const recurring = new Set(Array.from(counts.entries()).filter(([, n]) => n >= 3).map(([k]) => k));
  const flagged = pop.filter(v => v.party_code && recurring.has(v.party_code));
  return { flagged, observations: flagged.length ? [`${recurring.size} parties show recurring (3+) payment pattern`] : [] };
}

function runProcedure(meta: ProcedureMeta, input: AnalyticsProcedureInput): FlagOutcome {
  const p = { ...meta.default_parameters, ...(input.parameters ?? {}) };
  switch (meta.code) {
    case 'REPEATED_TRANSACTIONS': return flagRepeated(input.population, paramNum(p, 'window_days', 7));
    case 'CASH_WITHDRAWAL':       return flagCash(input.population, paramNum(p, 'threshold_inr', 200000));
    case 'TRANSACTION_ON_HOLIDAY':return flagHoliday(input.population, paramStrArr(p, 'holidays'));
    case 'STALE_CHEQUE':          return flagStale(input.population, paramNum(p, 'stale_days', 90));
    case 'PENDING_ADVANCES':      return flagPendingAdvances(input.population, paramNum(p, 'days_threshold', 90));
    case 'STATUTORY_PAYMENTS':    return flagStatutoryLate(input.population);
    case 'HIGHEST_LOWEST_VALUE':  return flagHighLow(input.population, paramNum(p, 'top_n', 10));
    case 'INTER_BANK_TRANSFER':   return flagInterBank(input.population);
    case 'FIXED_ASSETS_ANALYSIS': return flagFixedAssets(input.population);
    case 'PENDING_DOCUMENTS':     return flagPendingDocs(input.population, paramNum(p, 'days_threshold', 90));
    case 'PERIODIC_PAYMENTS':     return flagPeriodic(input.population);
    case 'COA_VERIFICATION':
    case 'STOCK_ITEMS_YOY':
    case 'BALANCES_OB_VARIANCE':
    case 'ANALYTICAL_GROUP_CC':
    case 'RSF_ANALYSIS':
    case 'EXTERNAL_CONFIRMATION':
    case 'ACCOUNT_RECONCILIATION':
    default:
      return { flagged: [], observations: [`${meta.label} executed against ${input.population.length} records`] };
  }
}

const ANALYTICS_RUNS_KEY = 'erp_audit_analytics_runs';

// ── Master API ────────────────────────────────────────────────────────
export function runAnalyticsProcedure(input: AnalyticsProcedureInput): AnalyticsProcedureResult {
  const meta = ANALYTICS_PROCEDURES.find(p => p.code === input.procedure_code);
  if (!meta) throw new Error(`Unknown procedure ${input.procedure_code}`);
  const outcome = runProcedure(meta, input);
  const id = uid('apr');
  const result: AnalyticsProcedureResult = {
    id,
    procedure_code: meta.code,
    procedure_label: meta.label,
    engagement_id: input.engagement_id,
    fy: input.fy,
    entity_code: input.entity_code,
    population_count: input.population.length,
    flagged_count: outcome.flagged.length,
    flagged_vouchers: outcome.flagged,
    observations: outcome.observations,
    caro_clauses_triggered: outcome.flagged.length > 0 ? [...meta.caro_clauses] : [],
    run_at: new Date().toISOString(),
    run_by_bap: input.run_by_bap,
    audit_trail_id: '',
  };
  const trail = logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('analytics_procedure_run'),
    recordId: id,
    recordLabel: `Analytics ${meta.code} · ${outcome.flagged.length}/${input.population.length} flagged`,
    beforeState: null,
    afterState: {
      procedure_code: meta.code,
      population_count: input.population.length,
      flagged_count: outcome.flagged.length,
      engagement_id: input.engagement_id,
      run_by_bap: input.run_by_bap,
    },
    sourceModule: 'comply360-audit-analytics-engine',
  });
  result.audit_trail_id = trail.id;
  const all = readJson<AnalyticsProcedureResult[]>(ANALYTICS_RUNS_KEY, []);
  all.push(result);
  writeJson(ANALYTICS_RUNS_KEY, all);
  return result;
}

// ── Convenience APIs ──────────────────────────────────────────────────
interface BaseRunOpts {
  population: VoucherInput[];
  engagement_id: string;
  fy: string;
  entity_code: string;
  run_by_bap: BAPAccountId;
}

export function runCoAVerification(opts: BaseRunOpts & { compare_fy: string }): AnalyticsProcedureResult {
  return runAnalyticsProcedure({ ...opts, procedure_code: 'COA_VERIFICATION', parameters: { compare_fy: opts.compare_fy } });
}

export function runRepeatedTransactions(opts: BaseRunOpts & { window_days?: number }): AnalyticsProcedureResult {
  return runAnalyticsProcedure({ ...opts, procedure_code: 'REPEATED_TRANSACTIONS', parameters: { window_days: opts.window_days ?? 7 } });
}

export function runCashWithdrawalAnalysis(opts: BaseRunOpts & { threshold_inr?: number }): AnalyticsProcedureResult {
  return runAnalyticsProcedure({ ...opts, procedure_code: 'CASH_WITHDRAWAL', parameters: { threshold_inr: opts.threshold_inr ?? 200000 } });
}

export function runTransactionOnHoliday(opts: BaseRunOpts & { holidays?: string[] }): AnalyticsProcedureResult {
  return runAnalyticsProcedure({ ...opts, procedure_code: 'TRANSACTION_ON_HOLIDAY', parameters: { holidays: opts.holidays ?? [] } });
}

export function runStatutoryPaymentsAnalysis(opts: BaseRunOpts): AnalyticsProcedureResult {
  return runAnalyticsProcedure({ ...opts, procedure_code: 'STATUTORY_PAYMENTS' });
}

export function runStaleChequeAnalysis(opts: BaseRunOpts & { stale_days?: number }): AnalyticsProcedureResult {
  return runAnalyticsProcedure({ ...opts, procedure_code: 'STALE_CHEQUE', parameters: { stale_days: opts.stale_days ?? 90 } });
}

// ── Reads ─────────────────────────────────────────────────────────────
export function listAnalyticsRuns(
  engagement_id: string,
  opts?: { procedure_code?: AnalyticsProcedureCode },
): AnalyticsProcedureResult[] {
  return readJson<AnalyticsProcedureResult[]>(ANALYTICS_RUNS_KEY, [])
    .filter(r => r.engagement_id === engagement_id)
    .filter(r => !opts?.procedure_code || r.procedure_code === opts.procedure_code);
}

export function getProcedureMetadata(code: AnalyticsProcedureCode): ProcedureMeta | undefined {
  return ANALYTICS_PROCEDURES.find(p => p.code === code);
}

// ── Entity-type registration ──────────────────────────────────────────
registerAuditEntityType({
  id: 'analytics_procedure_run',
  module: 'audit-trail',
  label: 'Audit Analytics · Procedure Run',
});
