/**
 * @file        src/lib/comply360-pmla-engine.ts
 * @sibling     NEW @ Sprint 94 · Comply360 Floor 5.6 CAPSTONE · Q38 PMLA
 * @realizes    PMLA Act 2002 + FIU-IND reporting. STR/CTR generation + risk scoring
 *              + PMLA Policy register. Cross-card transaction risk scoring reads
 *              gst-aggregator + tds-aggregator declaratively. 26th USE-SITE READ.
 * @reads-from  comply360-gst-aggregator-engine · comply360-tds-aggregator-engine ·
 *              comply360-msme-aggregator-engine · comply360-audit-framework-engine ·
 *              audit-trail-engine · comply360-audit-trail-aggregator-engine
 * @sprint      Sprint 94 · T-Phase-5.F.5.6 · Floor 5.6 CAPSTONE
 * [JWT] Phase 8: POST /api/comply360/pmla/{str,ctr,risk-alert,fiu-filing,policy}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'comply360-gst-aggregator-engine',
    'comply360-tds-aggregator-engine',
    'comply360-msme-aggregator-engine',
    'comply360-audit-framework-engine',
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
  ],
  storage_keys: [
    'erp_pmla_str', 'erp_pmla_ctr', 'erp_pmla_risk_alert',
    'erp_pmla_fiu_filing', 'erp_pmla_policy',
  ],
} as const;

registerAuditEntityType({ id: 'str_report',      module: 'other', label: 'Suspicious Transaction Report (STR)' });
registerAuditEntityType({ id: 'ctr_report',      module: 'other', label: 'Cash Transaction Report (CTR)' });
registerAuditEntityType({ id: 'pmla_risk_alert', module: 'other', label: 'PMLA Risk Alert' });
registerAuditEntityType({ id: 'fiu_filing',      module: 'other', label: 'FIU-IND Filing' });
registerAuditEntityType({ id: 'pmla_policy',     module: 'other', label: 'PMLA Policy' });

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

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type FilingStatus = 'draft' | 'filed';

// ═══ STR · Suspicious Transaction Report ═════════════════════════════
export interface STRReport {
  id: string; reference: string; suspect_party: string;
  amount_paise: number; reason: string; risk: RiskLevel;
  detected_on: string; filed_on: string | null; status: FilingStatus;
}
const STR_KEY = 'erp_pmla_str';
export function recordSTR(input: Omit<STRReport, 'id'>, by_bap: BAPAccountId): STRReport {
  const r: STRReport = { ...input, id: uid('str') };
  const all = readJson<STRReport[]>(STR_KEY, []); all.push(r); writeJson(STR_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('str_report'),
    recordId: r.id, recordLabel: `STR · ${input.reference} · ${input.risk} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-pmla-engine',
  });
  return r;
}
export function listSTR(filter: { risk?: RiskLevel; status?: FilingStatus } = {}): STRReport[] {
  return readJson<STRReport[]>(STR_KEY, []).filter((r) => {
    if (filter.risk && r.risk !== filter.risk) return false;
    if (filter.status && r.status !== filter.status) return false;
    return true;
  });
}

// ═══ CTR · Cash Transaction Report (≥ ₹10L) ══════════════════════════
export interface CTRReport {
  id: string; party_name: string; pan: string | null;
  amount_paise: number; transaction_date: string;
  filed_on: string | null; status: FilingStatus;
}
const CTR_KEY = 'erp_pmla_ctr';
export const CTR_THRESHOLD_PAISE = 10_00_000 * 100; // ₹10 lakh in paise

export function recordCTR(input: Omit<CTRReport, 'id'>, by_bap: BAPAccountId): CTRReport {
  const r: CTRReport = { ...input, id: uid('ctr') };
  const all = readJson<CTRReport[]>(CTR_KEY, []); all.push(r); writeJson(CTR_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('ctr_report'),
    recordId: r.id, recordLabel: `CTR · ${input.party_name} · ₹${(input.amount_paise / 100).toFixed(0)} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-pmla-engine',
  });
  return r;
}
export function listCTR(): CTRReport[] { return readJson<CTRReport[]>(CTR_KEY, []); }

// ═══ Risk Alerts ═════════════════════════════════════════════════════
export interface PMLARiskAlert {
  id: string; party: string; trigger: string; risk: RiskLevel;
  raised_on: string; resolved_on: string | null;
}
const RISK_KEY = 'erp_pmla_risk_alert';
export function raiseRiskAlert(input: Omit<PMLARiskAlert, 'id'>, by_bap: BAPAccountId): PMLARiskAlert {
  const r: PMLARiskAlert = { ...input, id: uid('risk') };
  const all = readJson<PMLARiskAlert[]>(RISK_KEY, []); all.push(r); writeJson(RISK_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('pmla_risk_alert'),
    recordId: r.id, recordLabel: `PMLA Risk · ${input.party} · ${input.risk} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-pmla-engine',
  });
  return r;
}
export function listRiskAlerts(filter: { unresolved?: boolean } = {}): PMLARiskAlert[] {
  return readJson<PMLARiskAlert[]>(RISK_KEY, []).filter((r) => !filter.unresolved || !r.resolved_on);
}

// ═══ FIU-IND Filing ══════════════════════════════════════════════════
export interface FIUFiling {
  id: string; kind: 'STR' | 'CTR' | 'NTR'; period: string;
  count: number; filed_on: string; ack_ref: string | null;
}
const FIU_KEY = 'erp_pmla_fiu_filing';
export function recordFIUFiling(input: Omit<FIUFiling, 'id'>, by_bap: BAPAccountId): FIUFiling {
  const r: FIUFiling = { ...input, id: uid('fiu') };
  const all = readJson<FIUFiling[]>(FIU_KEY, []); all.push(r); writeJson(FIU_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('fiu_filing'),
    recordId: r.id, recordLabel: `FIU · ${input.kind} · ${input.period} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-pmla-engine',
  });
  return r;
}
export function listFIUFilings(): FIUFiling[] { return readJson<FIUFiling[]>(FIU_KEY, []); }

// ═══ PMLA Policy ═════════════════════════════════════════════════════
export interface PMLAPolicy {
  id: string; version: string; effective_date: string; pmla_officer: string; published: boolean;
}
const POL_KEY = 'erp_pmla_policy';
export function publishPMLAPolicy(input: Omit<PMLAPolicy, 'id'>, by_bap: BAPAccountId): PMLAPolicy {
  const r: PMLAPolicy = { ...input, id: uid('ppol') };
  const all = readJson<PMLAPolicy[]>(POL_KEY, []); all.push(r); writeJson(POL_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('pmla_policy'),
    recordId: r.id, recordLabel: `PMLA Policy v${input.version} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-pmla-engine',
  });
  return r;
}
export function listPMLAPolicies(): PMLAPolicy[] { return readJson<PMLAPolicy[]>(POL_KEY, []); }

// ═══ Summary ═════════════════════════════════════════════════════════
export interface PMLAComplianceSummary {
  str_filed: number; str_open: number; ctr_filed: number;
  unresolved_risk_alerts: number; fiu_filings_count: number;
  policy_published: boolean;
  overall_status: 'compliant' | 'attention_required' | 'non_compliant';
}
export function getPMLAComplianceSummary(): PMLAComplianceSummary {
  const str = listSTR();
  const strFiled = str.filter((r) => r.status === 'filed').length;
  const strOpen = str.filter((r) => r.status === 'draft').length;
  const ctrFiled = listCTR().filter((r) => r.status === 'filed').length;
  const unresolved = listRiskAlerts({ unresolved: true }).length;
  const fiu = listFIUFilings().length;
  const policy = listPMLAPolicies().some((p) => p.published);

  let overall_status: PMLAComplianceSummary['overall_status'] = 'compliant';
  if (strOpen > 0 || unresolved > 0) overall_status = 'attention_required';
  if (!policy) overall_status = 'non_compliant';
  return {
    str_filed: strFiled, str_open: strOpen, ctr_filed: ctrFiled,
    unresolved_risk_alerts: unresolved, fiu_filings_count: fiu,
    policy_published: policy, overall_status,
  };
}
