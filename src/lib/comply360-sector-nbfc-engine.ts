/**
 * @file        src/lib/comply360-sector-nbfc-engine.ts
 * @sibling     NEW @ Sprint 87 · Comply360 Floor 4 Sector-Pack Arc 4.2 · DP-S87-1
 * @realizes    NBFC compliance per RBI Master Directions · NPA classification + ALM + LCR.
 * @reads-from  audit-trail-engine · audit-trail-aggregator · audit-framework
 * @sprint      Sprint 87 · T-Phase-5.D.4.2 · FLOOR 4 CLOSES
 * [JWT] Phase 8: POST /api/comply360/nbfc/{loan,alm,lcr}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: ['audit-trail-engine', 'comply360-audit-trail-aggregator-engine', 'comply360-audit-framework-engine'],
  storage_keys: ['erp_nbfc_loans', 'erp_nbfc_alm_buckets', 'erp_nbfc_lcr_calculations'],
} as const;

export type NPAClass = 'standard' | 'sub_standard' | 'doubtful_d1' | 'doubtful_d2' | 'doubtful_d3' | 'loss';
export type ALMBucket = '1_7_days' | '8_14_days' | '15_30_days' | '31_90_days' | '91_180_days' | '181_365_days' | '1_3_years' | '3_5_years' | 'over_5_years';

export interface LoanAccount {
  id: string;
  borrower_name: string;
  borrower_id: string;
  loan_amount_inr: number;
  outstanding_inr: number;
  days_past_due: number;
  npa_class: NPAClass;
  provision_required_pct: number;
  provision_amount_inr: number;
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

export interface ALMReport {
  id: string;
  fy: string;
  report_date: string;
  buckets: Record<ALMBucket, { assets_inr: number; liabilities_inr: number; gap_inr: number; cumulative_gap_inr: number }>;
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

export interface LCRCalculation {
  id: string;
  fy: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  hqla_inr: number;
  net_cash_outflow_inr: number;
  lcr_ratio: number;
  is_compliant: boolean;
  recorded_at: string;
}

const L_KEY = 'erp_nbfc_loans';
const A_KEY = 'erp_nbfc_alm_buckets';
const C_KEY = 'erp_nbfc_lcr_calculations';

function AUD(t: string): LogAuditEntityType { return t as unknown as LogAuditEntityType; }
function uid(p: string): string { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
function readJson<T>(k: string, fb: T): T {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : fb; } catch { return fb; }
}
function writeJson(k: string, v: unknown): void {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ }
}
function activeEntityCode(): string {
  try { return localStorage.getItem('erp_active_entity_code') ?? 'OPERIX-DEMO'; } catch { return 'OPERIX-DEMO'; }
}

export function classifyNPA(days_past_due: number): { npa_class: NPAClass; provision_required_pct: number } {
  if (days_past_due <= 90) return { npa_class: 'standard', provision_required_pct: 0.4 };
  if (days_past_due <= 365) return { npa_class: 'sub_standard', provision_required_pct: 10 };
  if (days_past_due <= 730) return { npa_class: 'doubtful_d1', provision_required_pct: 25 };
  if (days_past_due <= 1095) return { npa_class: 'doubtful_d2', provision_required_pct: 40 };
  if (days_past_due <= 1460) return { npa_class: 'doubtful_d3', provision_required_pct: 100 };
  return { npa_class: 'loss', provision_required_pct: 100 };
}

export function recordLoanAccount(
  input: Omit<LoanAccount, 'id' | 'recorded_at' | 'npa_class' | 'provision_required_pct' | 'provision_amount_inr'>,
): LoanAccount {
  const cls = classifyNPA(input.days_past_due);
  const provision_amount_inr = Math.round((input.outstanding_inr * cls.provision_required_pct) / 100);
  const r: LoanAccount = {
    ...input,
    id: uid('nbfc_loan'),
    npa_class: cls.npa_class,
    provision_required_pct: cls.provision_required_pct,
    provision_amount_inr,
    recorded_at: new Date().toISOString(),
  };
  const all = readJson<LoanAccount[]>(L_KEY, []);
  all.push(r); writeJson(L_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('nbfc_loan_account'),
    recordId: r.id, recordLabel: `NBFC Loan · ${input.borrower_name} · ${cls.npa_class}`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-sector-nbfc-engine',
  });
  return r;
}

export function listLoanAccounts(opts: { npa_class?: NPAClass } = {}): LoanAccount[] {
  return readJson<LoanAccount[]>(L_KEY, []).filter((l) => !opts.npa_class || l.npa_class === opts.npa_class);
}

export function recordALMReport(input: Omit<ALMReport, 'id' | 'recorded_at'>): ALMReport {
  const r: ALMReport = { ...input, id: uid('nbfc_alm'), recorded_at: new Date().toISOString() };
  const all = readJson<ALMReport[]>(A_KEY, []);
  all.push(r); writeJson(A_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('nbfc_alm_report'),
    recordId: r.id, recordLabel: `NBFC ALM · ${input.fy} · ${input.report_date}`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-sector-nbfc-engine',
  });
  return r;
}

export function listALMReports(opts: { fy?: string } = {}): ALMReport[] {
  return readJson<ALMReport[]>(A_KEY, []).filter((r) => !opts.fy || r.fy === opts.fy);
}

export function computeLCR(
  input: Omit<LCRCalculation, 'id' | 'recorded_at' | 'lcr_ratio' | 'is_compliant'>,
): LCRCalculation {
  const lcr_ratio = input.net_cash_outflow_inr > 0 ? input.hqla_inr / input.net_cash_outflow_inr : 0;
  const r: LCRCalculation = {
    ...input, id: uid('nbfc_lcr'),
    lcr_ratio: Math.round(lcr_ratio * 10000) / 10000,
    is_compliant: lcr_ratio >= 1.0,
    recorded_at: new Date().toISOString(),
  };
  const all = readJson<LCRCalculation[]>(C_KEY, []);
  all.push(r); writeJson(C_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('nbfc_lcr_calculation'),
    recordId: r.id, recordLabel: `NBFC LCR · ${input.fy} ${input.quarter} · ${(r.lcr_ratio * 100).toFixed(1)}%`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-sector-nbfc-engine',
  });
  return r;
}

export function listLCRCalculations(opts: { fy?: string } = {}): LCRCalculation[] {
  return readJson<LCRCalculation[]>(C_KEY, []).filter((r) => !opts.fy || r.fy === opts.fy);
}

registerAuditEntityType({ id: 'nbfc_loan_account', module: 'tax-gst', label: 'NBFC · Loan Account' });
registerAuditEntityType({ id: 'nbfc_alm_report', module: 'tax-gst', label: 'NBFC · ALM Report' });
registerAuditEntityType({ id: 'nbfc_lcr_calculation', module: 'tax-gst', label: 'NBFC · LCR Calculation' });
registerAuditEntityType({ id: 'nbfc_npa_classification_change', module: 'tax-gst', label: 'NBFC · NPA Classification Change' });
