/**
 * @file        src/lib/comply360-cost-audit-engine.ts
 * @sibling     NEW @ Sprint 85 · DP-S85-3
 * @realizes    Section 148 Cost Audit · CRA-1/2/3/4 + Cost Auditor appointment + cooling-off + Cost Audit Report.
 * @reads-from  audit-trail-engine · aggregator · audit-framework
 * @sprint      Sprint 85 · T-Phase-5.C.3.3
 * [JWT] Phase 8: POST /api/comply360/cost-audit/{appointment,cra,report}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
    'comply360-audit-framework-engine',
  ],
  storage_keys: ['erp_cost_auditor_appointments', 'erp_cra_form_filings', 'erp_cost_audit_reports'],
} as const;

export type CRAFormType = 'CRA_1' | 'CRA_2' | 'CRA_3' | 'CRA_4';
export type AppointmentType = 'first_appointment' | 'reappointment' | 'casual_vacancy';

export interface CostAuditorAppointment {
  id: string;
  fy: string;
  appointment_type: AppointmentType;
  cost_auditor_name: string;
  icmai_membership_no: string;
  firm_registration_no: string | null;
  appointment_date: string;
  term_years: number;
  prepared_by_bap: BAPAccountId;
  recorded_at: string;
}

export interface CRAFormFiling {
  id: string;
  form_type: CRAFormType;
  fy: string;
  appointment_id: string | null;
  filing_status: 'draft' | 'filed';
  prepared_at: string;
  filed_at: string | null;
  prepared_by_bap: BAPAccountId;
}

export interface CostAuditReport {
  id: string;
  fy: string;
  appointment_id: string;
  total_cost_inr: number;
  adverse_findings: boolean;
  findings_summary: string;
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

const A_KEY = 'erp_cost_auditor_appointments';
const F_KEY = 'erp_cra_form_filings';
const R_KEY = 'erp_cost_audit_reports';

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

export function appointCostAuditor(input: Omit<CostAuditorAppointment, 'id' | 'recorded_at'>): CostAuditorAppointment {
  if (!input.icmai_membership_no) throw new Error('ICMAI membership number is required');
  const a: CostAuditorAppointment = { ...input, id: uid('capt'), recorded_at: new Date().toISOString() };
  const all = readJson<CostAuditorAppointment[]>(A_KEY, []);
  all.push(a); writeJson(A_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('cost_auditor_appointment'),
    recordId: a.id, recordLabel: `Cost Auditor · ${input.cost_auditor_name} · FY ${input.fy}`,
    beforeState: null, afterState: a as unknown as Record<string, unknown>,
    sourceModule: 'comply360-cost-audit-engine',
  });
  return a;
}

export function listCostAuditorAppointments(opts: { fy?: string } = {}): CostAuditorAppointment[] {
  return readJson<CostAuditorAppointment[]>(A_KEY, []).filter((a) => (opts.fy ? a.fy === opts.fy : true));
}

export function createCRAFormFiling(input: Omit<CRAFormFiling, 'id' | 'prepared_at' | 'filed_at' | 'filing_status'>): CRAFormFiling {
  const f: CRAFormFiling = {
    ...input, id: uid('cra'), filing_status: 'draft', filed_at: null,
    prepared_at: new Date().toISOString(),
  };
  const all = readJson<CRAFormFiling[]>(F_KEY, []);
  all.push(f); writeJson(F_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('cra_form_filing'),
    recordId: f.id, recordLabel: `${input.form_type} · FY ${input.fy}`,
    beforeState: null, afterState: f as unknown as Record<string, unknown>,
    sourceModule: 'comply360-cost-audit-engine',
  });
  return f;
}

export function listCRAFormFilings(opts: { fy?: string; form_type?: CRAFormType } = {}): CRAFormFiling[] {
  return readJson<CRAFormFiling[]>(F_KEY, []).filter((f) => {
    if (opts.fy && f.fy !== opts.fy) return false;
    if (opts.form_type && f.form_type !== opts.form_type) return false;
    return true;
  });
}

export function recordCostAuditReport(input: Omit<CostAuditReport, 'id' | 'recorded_at'>): CostAuditReport {
  const r: CostAuditReport = { ...input, id: uid('car'), recorded_at: new Date().toISOString() };
  const all = readJson<CostAuditReport[]>(R_KEY, []);
  all.push(r); writeJson(R_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('cost_audit_report'),
    recordId: r.id, recordLabel: `Cost Audit Report · FY ${input.fy}${input.adverse_findings ? ' · ADVERSE' : ''}`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-cost-audit-engine',
  });
  return r;
}

export function listCostAuditReports(opts: { fy?: string } = {}): CostAuditReport[] {
  return readJson<CostAuditReport[]>(R_KEY, []).filter((r) => (opts.fy ? r.fy === opts.fy : true));
}

/** Cooling-off check · Section 148(3) · 5-year cooling-off between consecutive terms */
export function isCostAuditorEligible(icmai_membership_no: string, proposed_fy: string): { eligible: boolean; reason: string } {
  const past = readJson<CostAuditorAppointment[]>(A_KEY, [])
    .filter((a) => a.icmai_membership_no === icmai_membership_no)
    .sort((a, b) => a.fy.localeCompare(b.fy));
  if (past.length === 0) return { eligible: true, reason: 'No prior appointments' };
  const last = past[past.length - 1];
  const lastFyEnd = parseInt(last.fy.slice(0, 4), 10) + last.term_years;
  const proposedFyStart = parseInt(proposed_fy.slice(0, 4), 10);
  const gap = proposedFyStart - lastFyEnd;
  if (gap >= 5) return { eligible: true, reason: `${gap}-year gap since last term · within rules` };
  return { eligible: false, reason: `Only ${gap}-year gap · cooling-off requires 5 years` };
}

registerAuditEntityType({ id: 'cost_auditor_appointment', module: 'mca-roc', label: 'Cost Auditor Appointment (S 148)' });
registerAuditEntityType({ id: 'cra_form_filing', module: 'mca-roc', label: 'CRA Form Filing' });
registerAuditEntityType({ id: 'cost_audit_report', module: 'mca-roc', label: 'Cost Audit Report' });

/* ────────────────────────────────────────────────────────────────────────────
 * Sprint 104 · T-Phase-6.A.1.3 · DP-A1-5 — §148 applicability (ADDITIVE)
 * Companies (Cost Records and Audit) Rules 2014 · Rule 3 (records) + Rule 4 (audit)
 * 0-DIFF: existing 9 exports untouched · no new SIBLING · no new audit type.
 * Source: MCA notification G.S.R. 425(E) dated 30-Jun-2014 (Rules 3 & 4).
 * ──────────────────────────────────────────────────────────────────────────── */

export type CostAuditTable = 'A_regulated' | 'B_non_regulated' | 'none';

export interface CostAuditApplicability {
  fy: string;
  cost_records_required: boolean;
  cost_audit_required: boolean;
  table: CostAuditTable;
  overall_turnover: number;
  aggregate_product_service_turnover: number;
  thresholds_applied: { records_threshold: number; audit_threshold: number };
  reason: string;
}

export interface CostProductServiceEntry {
  ceta_heading: string;
  description: string;
  turnover: number;
}

const PS_KEY = 'erp_cost_product_services';
// Rule 3 records threshold (overall turnover) — uniform ₹35 cr for both tables.
const RECORDS_THRESHOLD_INR = 35_00_00_000;
// Rule 4 audit thresholds (aggregate product/service turnover).
const AUDIT_THRESHOLD_REGULATED_INR = 25_00_00_000;
const AUDIT_THRESHOLD_NON_REGULATED_INR = 35_00_00_000;
// Overall turnover gate for cost audit (Rule 4 entry condition).
const AUDIT_OVERALL_GATE_REGULATED_INR = 50_00_00_000;
const AUDIT_OVERALL_GATE_NON_REGULATED_INR = 100_00_00_000;

export function determineCostAuditApplicability(input: {
  fy: string;
  industry_category: 'regulated' | 'non_regulated' | 'exempt';
  overall_turnover: number;
  aggregate_product_service_turnover: number;
}): CostAuditApplicability {
  const overall = Math.max(0, Math.floor(input.overall_turnover));
  const aggregate = Math.max(0, Math.floor(input.aggregate_product_service_turnover));

  if (input.industry_category === 'exempt') {
    return {
      fy: input.fy,
      cost_records_required: false,
      cost_audit_required: false,
      table: 'none',
      overall_turnover: overall,
      aggregate_product_service_turnover: aggregate,
      thresholds_applied: { records_threshold: 0, audit_threshold: 0 },
      reason: 'Exempt industry · CRA Rules 2014 do not apply (Rule 2 exclusions).',
    };
  }

  const regulated = input.industry_category === 'regulated';
  const table: CostAuditTable = regulated ? 'A_regulated' : 'B_non_regulated';
  const audit_threshold = regulated ? AUDIT_THRESHOLD_REGULATED_INR : AUDIT_THRESHOLD_NON_REGULATED_INR;
  const overall_gate = regulated ? AUDIT_OVERALL_GATE_REGULATED_INR : AUDIT_OVERALL_GATE_NON_REGULATED_INR;

  const records_required = overall >= RECORDS_THRESHOLD_INR;
  const audit_required = records_required && overall >= overall_gate && aggregate >= audit_threshold;

  let reason: string;
  if (!records_required) {
    reason = `Overall turnover \u20B9${overall.toLocaleString('en-IN')} below Rule 3 threshold \u20B9${RECORDS_THRESHOLD_INR.toLocaleString('en-IN')} \u00B7 no cost records required.`;
  } else if (!audit_required) {
    reason = `Cost records required (Rule 3 \u00B7 Table ${regulated ? 'A' : 'B'}) \u00B7 cost audit NOT required \u2014 overall \u20B9${overall.toLocaleString('en-IN')} vs gate \u20B9${overall_gate.toLocaleString('en-IN')} / aggregate \u20B9${aggregate.toLocaleString('en-IN')} vs Rule 4 \u20B9${audit_threshold.toLocaleString('en-IN')}.`;
  } else {
    reason = `Cost records + cost audit BOTH required (Rule 3 + Rule 4 \u00B7 Table ${regulated ? 'A' : 'B'}) \u00B7 aggregate \u20B9${aggregate.toLocaleString('en-IN')} \u2265 \u20B9${audit_threshold.toLocaleString('en-IN')}.`;
  }

  return {
    fy: input.fy,
    cost_records_required: records_required,
    cost_audit_required: audit_required,
    table,
    overall_turnover: overall,
    aggregate_product_service_turnover: aggregate,
    thresholds_applied: { records_threshold: RECORDS_THRESHOLD_INR, audit_threshold },
    reason,
  };
}

interface ProductServiceStore { [fy: string]: CostProductServiceEntry[] }

export function listCostProductServices(fy: string): CostProductServiceEntry[] {
  const store = readJson<ProductServiceStore>(PS_KEY, {});
  return store[fy] ?? [];
}

export function upsertCostProductService(fy: string, entry: CostProductServiceEntry): void {
  if (!entry.ceta_heading) throw new Error('CETA heading is required');
  const store = readJson<ProductServiceStore>(PS_KEY, {});
  const rows = store[fy] ?? [];
  const idx = rows.findIndex((r) => r.ceta_heading === entry.ceta_heading);
  const next: CostProductServiceEntry = {
    ceta_heading: entry.ceta_heading,
    description: entry.description,
    turnover: Math.max(0, Math.floor(entry.turnover)),
  };
  if (idx >= 0) rows[idx] = next;
  else rows.push(next);
  store[fy] = rows;
  writeJson(PS_KEY, store);
}
