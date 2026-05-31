/**
 * @file        src/lib/comply360-environmental-engine.ts
 * @sibling     NEW @ Sprint 90 · Comply360 Floor 5 Comprehensive Compliance Arc 5.2 · DP-F5-1 · Q34 · Environmental Compliance Pt 1
 * @realizes    Environmental compliance per Environment Protection Act 1986 base framework.
 *              Air Act 1981 CTE/CTO · Water Act 1974 CTE/CTO · Form 5 Annual Environmental Statement · Form V Water Cess.
 *              18th USE-SITE READ application · MAXIMUM SCALE.
 * @reads-from  comply360-audit-framework-engine (S80a) · comply360-calendar-engine (S78a · CTE/CTO renewal dates) ·
 *              comply360-brsr-comprehensive-engine (S77a · Core 9 metrics shared) · comply360-rule-11g-report-engine (S80f) ·
 *              audit-trail-engine · comply360-audit-trail-aggregator-engine
 * @sprint      Sprint 90 · T-Phase-5.F.5.2 · Floor 5.2 · Q34
 * [JWT] Phase 8: POST /api/comply360/environmental/{cte,cto,form5,form-v}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'comply360-audit-framework-engine',
    'comply360-calendar-engine',
    'comply360-brsr-comprehensive-engine',
    'comply360-rule-11g-report-engine',
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
  ],
  storage_keys: [
    'erp_cte_air', 'erp_cto_air', 'erp_cte_water', 'erp_cto_water',
    'erp_form5_statements', 'erp_form_v_cess',
  ],
} as const;

// 6 NEW audit entity types · MCA Rule 11(g)(b) coverage · module 'esg'
registerAuditEntityType({ id: 'cte_air', module: 'esg', label: 'CTE Air Act 1981' });
registerAuditEntityType({ id: 'cto_air', module: 'esg', label: 'CTO Air Act 1981' });
registerAuditEntityType({ id: 'cte_water', module: 'esg', label: 'CTE Water Act 1974' });
registerAuditEntityType({ id: 'cto_water', module: 'esg', label: 'CTO Water Act 1974' });
registerAuditEntityType({ id: 'form5_statement', module: 'esg', label: 'Form 5 Annual Environmental Statement' });
registerAuditEntityType({ id: 'form_v_cess', module: 'esg', label: 'Form V Water Cess' });

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

// ─── CTE (Consent to Establish) ────────────────────────────────────
export type PermitType = 'air' | 'water';
export type IssuingAuthority = 'CPCB' | 'SPCB';
export type IndustryCategory = 'red' | 'orange' | 'green' | 'white';
export type PermitStatus = 'active' | 'expired' | 'renewal_pending';

export interface CTEPermit {
  id: string;
  permit_type: PermitType;
  premises_id: string;
  permit_number: string;
  issued_date: string;
  expiry_date: string;
  issuing_authority: IssuingAuthority;
  industry_category: IndustryCategory;
  status: PermitStatus;
}

const CTE_AIR_KEY = 'erp_cte_air';
const CTE_WATER_KEY = 'erp_cte_water';

function cteKey(t: PermitType): string { return t === 'air' ? CTE_AIR_KEY : CTE_WATER_KEY; }

export function recordCTEPermit(input: Omit<CTEPermit, 'id'>, by_bap: BAPAccountId): CTEPermit {
  const p: CTEPermit = { ...input, id: uid('cte') };
  const key = cteKey(p.permit_type);
  const all = readJson<CTEPermit[]>(key, []);
  all.push(p); writeJson(key, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create',
    entityType: AUD(p.permit_type === 'air' ? 'cte_air' : 'cte_water'),
    recordId: p.id,
    recordLabel: `CTE ${p.permit_type} · ${input.permit_number} (by ${by_bap})`,
    beforeState: null, afterState: p as unknown as Record<string, unknown>,
    sourceModule: 'comply360-environmental-engine',
  });
  return p;
}

export function listCTEPermits(filter: { permit_type?: PermitType; status?: PermitStatus } = {}): CTEPermit[] {
  const air = readJson<CTEPermit[]>(CTE_AIR_KEY, []);
  const water = readJson<CTEPermit[]>(CTE_WATER_KEY, []);
  const all = filter.permit_type === 'air' ? air : filter.permit_type === 'water' ? water : [...air, ...water];
  return all.filter((p) => !filter.status || p.status === filter.status);
}

// ─── CTO (Consent to Operate) ──────────────────────────────────────
export interface CTOPermit {
  id: string;
  permit_type: PermitType;
  premises_id: string;
  permit_number: string;
  issued_date: string;
  expiry_date: string;
  issuing_authority: IssuingAuthority;
  conditions: string[];
  status: PermitStatus;
}

const CTO_AIR_KEY = 'erp_cto_air';
const CTO_WATER_KEY = 'erp_cto_water';

function ctoKey(t: PermitType): string { return t === 'air' ? CTO_AIR_KEY : CTO_WATER_KEY; }

export function recordCTOPermit(input: Omit<CTOPermit, 'id'>, by_bap: BAPAccountId): CTOPermit {
  const p: CTOPermit = { ...input, id: uid('cto') };
  const key = ctoKey(p.permit_type);
  const all = readJson<CTOPermit[]>(key, []);
  all.push(p); writeJson(key, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create',
    entityType: AUD(p.permit_type === 'air' ? 'cto_air' : 'cto_water'),
    recordId: p.id,
    recordLabel: `CTO ${p.permit_type} · ${input.permit_number} (by ${by_bap})`,
    beforeState: null, afterState: p as unknown as Record<string, unknown>,
    sourceModule: 'comply360-environmental-engine',
  });
  return p;
}

export function listCTOPermits(filter: { permit_type?: PermitType; status?: PermitStatus } = {}): CTOPermit[] {
  const air = readJson<CTOPermit[]>(CTO_AIR_KEY, []);
  const water = readJson<CTOPermit[]>(CTO_WATER_KEY, []);
  const all = filter.permit_type === 'air' ? air : filter.permit_type === 'water' ? water : [...air, ...water];
  return all.filter((p) => !filter.status || p.status === filter.status);
}

// ─── Form 5 Annual Environmental Statement ─────────────────────────
export type FilingStatus = 'draft' | 'filed' | 'late_filed';

export interface Form5Statement {
  id: string;
  fy: string;
  premises_id: string;
  water_consumption_kld: number;
  raw_material_consumption_mt: number;
  pollution_load_summary: string;
  hazardous_waste_generated_mt: number;
  filed_date: string;
  filing_status: FilingStatus;
}

const FORM5_KEY = 'erp_form5_statements';

export function recordForm5Statement(input: Omit<Form5Statement, 'id'>, by_bap: BAPAccountId): Form5Statement {
  const s: Form5Statement = { ...input, id: uid('f5') };
  const all = readJson<Form5Statement[]>(FORM5_KEY, []);
  all.push(s); writeJson(FORM5_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('form5_statement'),
    recordId: s.id, recordLabel: `Form 5 · ${input.fy} · ${input.premises_id} (by ${by_bap})`,
    beforeState: null, afterState: s as unknown as Record<string, unknown>,
    sourceModule: 'comply360-environmental-engine',
  });
  return s;
}

export function listForm5Statements(filter: { fy?: string; filing_status?: FilingStatus } = {}): Form5Statement[] {
  return readJson<Form5Statement[]>(FORM5_KEY, []).filter((s) => {
    if (filter.fy && s.fy !== filter.fy) return false;
    if (filter.filing_status && s.filing_status !== filter.filing_status) return false;
    return true;
  });
}

// ─── Form V Water Cess ─────────────────────────────────────────────
export interface FormVCess {
  id: string;
  fy: string;
  premises_id: string;
  water_consumed_kld: number;
  cess_rate_per_kld: number;
  total_cess_inr: number;
  paid_date: string;
  filing_status: FilingStatus;
}

const FORM_V_KEY = 'erp_form_v_cess';

export function recordFormVCess(input: Omit<FormVCess, 'id'>, by_bap: BAPAccountId): FormVCess {
  const c: FormVCess = { ...input, id: uid('fv') };
  const all = readJson<FormVCess[]>(FORM_V_KEY, []);
  all.push(c); writeJson(FORM_V_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('form_v_cess'),
    recordId: c.id, recordLabel: `Form V Cess · ${input.fy} · ₹${input.total_cess_inr} (by ${by_bap})`,
    beforeState: null, afterState: c as unknown as Record<string, unknown>,
    sourceModule: 'comply360-environmental-engine',
  });
  return c;
}

export function listFormVCesses(filter: { fy?: string } = {}): FormVCess[] {
  return readJson<FormVCess[]>(FORM_V_KEY, []).filter((c) => !filter.fy || c.fy === filter.fy);
}

// ─── Compliance Summary ────────────────────────────────────────────
export interface EnvironmentalComplianceSummary {
  active_cte_count: number;
  active_cto_count: number;
  expiring_permits_next_90_days: number;
  form5_statements_filed_current_fy: number;
  form_v_cess_paid_current_fy: number;
  overall_status: 'compliant' | 'attention_required' | 'non_compliant';
}

export function getEnvironmentalComplianceSummary(fy: string): EnvironmentalComplianceSummary {
  const now = Date.now();
  const ninetyDays = now + 90 * 24 * 3600 * 1000;
  const ctes = listCTEPermits();
  const ctos = listCTOPermits();
  const active_cte_count = ctes.filter((p) => p.status === 'active').length;
  const active_cto_count = ctos.filter((p) => p.status === 'active').length;
  const expiring_permits_next_90_days =
    [...ctes, ...ctos].filter((p) => p.status === 'active' && new Date(p.expiry_date).getTime() <= ninetyDays).length;
  const form5_statements_filed_current_fy =
    listForm5Statements({ fy }).filter((s) => s.filing_status === 'filed' || s.filing_status === 'late_filed').length;
  const form_v_cess_paid_current_fy =
    listFormVCesses({ fy }).filter((c) => c.filing_status === 'filed' || c.filing_status === 'late_filed').length;

  let overall_status: EnvironmentalComplianceSummary['overall_status'] = 'compliant';
  if (expiring_permits_next_90_days > 0 || form5_statements_filed_current_fy === 0) overall_status = 'attention_required';
  if (active_cto_count === 0 && (ctes.length > 0 || ctos.length > 0)) overall_status = 'non_compliant';

  return {
    active_cte_count, active_cto_count, expiring_permits_next_90_days,
    form5_statements_filed_current_fy, form_v_cess_paid_current_fy, overall_status,
  };
}
