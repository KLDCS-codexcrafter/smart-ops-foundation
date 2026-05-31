/**
 * @file        src/lib/comply360-labour-tier2-engine.ts
 * @sibling     NEW @ Sprint 93 · Comply360 Floor 5.5 · Q37 Labour Tier-2
 * @realizes    Payment of Bonus Act 1965 · Maternity Benefit Act 1961 ·
 *              Equal Remuneration Act 1976 · Apprentices Act 1961 · CLRA 1970 ·
 *              Shops & Establishments (state) · Factories Act Form 21 ·
 *              OSH Annual Health Check-up. 24th USE-SITE READ at MAXIMUM SCALE.
 * @reads-from  audit-trail-engine · comply360-audit-trail-aggregator-engine ·
 *              peoplepay-skill-engine (apprentice training tracker · cross-card)
 * @sprint      Sprint 93 · T-Phase-5.F.5.5 · Floor 5.5 · Q37
 * [JWT] Phase 8: POST /api/comply360/labour-tier2/{bonus,maternity,equal-rem,apprentices,clra,shops,form21,osh}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
    'peoplepay-skill-engine',
  ],
  storage_keys: [
    'erp_lt2_bonus',
    'erp_lt2_maternity',
    'erp_lt2_equal_remuneration',
    'erp_lt2_apprentices',
    'erp_lt2_clra',
    'erp_lt2_shops',
    'erp_lt2_factories_form21',
    'erp_lt2_osh_health',
  ],
} as const;

// 8 NEW audit entity types · ComplianceModule union constraint applied (v68 policy):
// Labour Tier-2 semantically maps to 'payroll' (existing union member) · NO §H breach.
registerAuditEntityType({ id: 'lt2_bonus',             module: 'payroll', label: 'Bonus Act 1965 Computation' });
registerAuditEntityType({ id: 'lt2_maternity',         module: 'payroll', label: 'Maternity Benefit Claim' });
registerAuditEntityType({ id: 'lt2_equal_remuneration', module: 'payroll', label: 'Equal Remuneration Audit' });
registerAuditEntityType({ id: 'lt2_apprentice',        module: 'payroll', label: 'Apprentice Registration' });
registerAuditEntityType({ id: 'lt2_clra',              module: 'payroll', label: 'CLRA Contractor Engagement' });
registerAuditEntityType({ id: 'lt2_shops',             module: 'payroll', label: 'Shops & Establishments Reg' });
registerAuditEntityType({ id: 'lt2_factories_form21',  module: 'payroll', label: 'Factories Act Form 21 Annual' });
registerAuditEntityType({ id: 'lt2_osh_health',        module: 'payroll', label: 'OSH Annual Health Check-up' });

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

// ═══ MODULE 1 · Payment of Bonus Act 1965 ════════════════════════════
export interface BonusComputation {
  id: string;
  fy: string;
  employee_id: string;
  employee_name: string;
  basic_da_paise: number;
  allocable_surplus_pct: number;
  bonus_paise: number;
  paid_on: string | null;
}
const BON_KEY = 'erp_lt2_bonus';
export function computeBonus(
  input: Omit<BonusComputation, 'id' | 'bonus_paise'>,
  by_bap: BAPAccountId,
): BonusComputation {
  const pct = Math.max(8.33, Math.min(20, input.allocable_surplus_pct));
  const bonus = Math.round(input.basic_da_paise * (pct / 100));
  const r: BonusComputation = { ...input, id: uid('bon'), bonus_paise: bonus };
  const all = readJson<BonusComputation[]>(BON_KEY, []); all.push(r); writeJson(BON_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('lt2_bonus'),
    recordId: r.id, recordLabel: `Bonus · ${input.employee_name} · ₹${(bonus / 100).toFixed(2)} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-labour-tier2-engine',
  });
  return r;
}
export function listBonusComputations(filter: { fy?: string } = {}): BonusComputation[] {
  return readJson<BonusComputation[]>(BON_KEY, []).filter((r) => !filter.fy || r.fy === filter.fy);
}

// ═══ MODULE 2 · Maternity Benefit Act 1961 ═══════════════════════════
export type MaternityStatus = 'requested' | 'approved' | 'on_leave' | 'closed' | 'rejected';
export interface MaternityClaim {
  id: string;
  employee_id: string;
  employee_name: string;
  expected_dd: string;
  leave_start: string;
  leave_weeks: number;
  wage_per_day_paise: number;
  benefit_paise: number;
  status: MaternityStatus;
}
const MAT_KEY = 'erp_lt2_maternity';
export function fileMaternityClaim(
  input: Omit<MaternityClaim, 'id' | 'benefit_paise'>,
  by_bap: BAPAccountId,
): MaternityClaim {
  const days = Math.max(0, input.leave_weeks) * 7;
  const benefit = days * input.wage_per_day_paise;
  const r: MaternityClaim = { ...input, id: uid('mat'), benefit_paise: benefit };
  const all = readJson<MaternityClaim[]>(MAT_KEY, []); all.push(r); writeJson(MAT_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('lt2_maternity'),
    recordId: r.id, recordLabel: `Maternity · ${input.employee_name} · ${input.leave_weeks}w (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-labour-tier2-engine',
  });
  return r;
}
export function listMaternityClaims(filter: { status?: MaternityStatus } = {}): MaternityClaim[] {
  return readJson<MaternityClaim[]>(MAT_KEY, []).filter((r) => !filter.status || r.status === filter.status);
}

// ═══ MODULE 3 · Equal Remuneration Audit ═════════════════════════════
export interface EqualRemAuditRow {
  id: string;
  fy: string;
  role: string;
  male_avg_paise: number;
  female_avg_paise: number;
  gap_pct: number;
  remarks: string | null;
}
const EQR_KEY = 'erp_lt2_equal_remuneration';
export function recordEqualRemAudit(
  input: Omit<EqualRemAuditRow, 'id' | 'gap_pct'>,
  by_bap: BAPAccountId,
): EqualRemAuditRow {
  const base = input.male_avg_paise || 1;
  const gap = ((input.male_avg_paise - input.female_avg_paise) / base) * 100;
  const r: EqualRemAuditRow = { ...input, id: uid('eqr'), gap_pct: Math.round(gap * 100) / 100 };
  const all = readJson<EqualRemAuditRow[]>(EQR_KEY, []); all.push(r); writeJson(EQR_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('lt2_equal_remuneration'),
    recordId: r.id, recordLabel: `EqualRem · ${input.role} · ${r.gap_pct}% gap (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-labour-tier2-engine',
  });
  return r;
}
export function listEqualRemAudits(): EqualRemAuditRow[] { return readJson<EqualRemAuditRow[]>(EQR_KEY, []); }

// ═══ MODULE 4 · Apprentices Act 1961 (cross-card peoplepay-skill) ════
export type ApprenticeStatus = 'registered' | 'active' | 'completed' | 'discontinued';
export interface ApprenticeRecord {
  id: string;
  reg_no: string;
  name: string;
  trade: string;
  start_date: string;
  end_date: string;
  stipend_paise: number;
  status: ApprenticeStatus;
}
const APP_KEY = 'erp_lt2_apprentices';
export function registerApprentice(input: Omit<ApprenticeRecord, 'id'>, by_bap: BAPAccountId): ApprenticeRecord {
  const r: ApprenticeRecord = { ...input, id: uid('app') };
  const all = readJson<ApprenticeRecord[]>(APP_KEY, []); all.push(r); writeJson(APP_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('lt2_apprentice'),
    recordId: r.id, recordLabel: `Apprentice · ${input.reg_no} · ${input.trade} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-labour-tier2-engine',
  });
  return r;
}
export function listApprentices(filter: { status?: ApprenticeStatus } = {}): ApprenticeRecord[] {
  return readJson<ApprenticeRecord[]>(APP_KEY, []).filter((r) => !filter.status || r.status === filter.status);
}

// ═══ MODULE 5 · CLRA Contract Labour ═════════════════════════════════
export interface CLRAEngagement {
  id: string;
  contractor_name: string;
  reg_license_no: string;
  worker_count: number;
  engagement_start: string;
  engagement_end: string;
  pf_esi_compliant: boolean;
}
const CLR_KEY = 'erp_lt2_clra';
export function recordCLRAEngagement(input: Omit<CLRAEngagement, 'id'>, by_bap: BAPAccountId): CLRAEngagement {
  const r: CLRAEngagement = { ...input, id: uid('clr') };
  const all = readJson<CLRAEngagement[]>(CLR_KEY, []); all.push(r); writeJson(CLR_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('lt2_clra'),
    recordId: r.id, recordLabel: `CLRA · ${input.contractor_name} · ${input.worker_count} workers (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-labour-tier2-engine',
  });
  return r;
}
export function listCLRAEngagements(): CLRAEngagement[] { return readJson<CLRAEngagement[]>(CLR_KEY, []); }

// ═══ MODULE 6 · Shops & Establishments Registration ══════════════════
export interface ShopsRegistration {
  id: string;
  state: string;
  reg_no: string;
  shop_name: string;
  issued_on: string;
  valid_until: string;
  employee_count: number;
}
const SHP_KEY = 'erp_lt2_shops';
export function registerShop(input: Omit<ShopsRegistration, 'id'>, by_bap: BAPAccountId): ShopsRegistration {
  const r: ShopsRegistration = { ...input, id: uid('shp') };
  const all = readJson<ShopsRegistration[]>(SHP_KEY, []); all.push(r); writeJson(SHP_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('lt2_shops'),
    recordId: r.id, recordLabel: `Shops · ${input.state} · ${input.reg_no} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-labour-tier2-engine',
  });
  return r;
}
export function listShops(): ShopsRegistration[] { return readJson<ShopsRegistration[]>(SHP_KEY, []); }

// ═══ MODULE 7 · Factories Act Form 21 Annual Return ══════════════════
export interface FactoriesForm21 {
  id: string;
  fy: string;
  factory_lic_no: string;
  avg_workers_employed: number;
  man_days_worked: number;
  accidents: number;
  filed_on: string | null;
}
const F21_KEY = 'erp_lt2_factories_form21';
export function fileForm21(input: Omit<FactoriesForm21, 'id'>, by_bap: BAPAccountId): FactoriesForm21 {
  const r: FactoriesForm21 = { ...input, id: uid('f21') };
  const all = readJson<FactoriesForm21[]>(F21_KEY, []); all.push(r); writeJson(F21_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('lt2_factories_form21'),
    recordId: r.id, recordLabel: `Form 21 · ${input.fy} · ${input.factory_lic_no} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-labour-tier2-engine',
  });
  return r;
}
export function listForm21(): FactoriesForm21[] { return readJson<FactoriesForm21[]>(F21_KEY, []); }

// ═══ MODULE 8 · OSH Annual Health Check-up ═══════════════════════════
export interface OSHHealthCheckup {
  id: string;
  fy: string;
  employee_id: string;
  employee_name: string;
  exam_date: string;
  fitness: 'fit' | 'fit_with_restrictions' | 'unfit';
  notes: string | null;
}
const OSH_KEY = 'erp_lt2_osh_health';
export function recordOSHCheckup(input: Omit<OSHHealthCheckup, 'id'>, by_bap: BAPAccountId): OSHHealthCheckup {
  const r: OSHHealthCheckup = { ...input, id: uid('osh') };
  const all = readJson<OSHHealthCheckup[]>(OSH_KEY, []); all.push(r); writeJson(OSH_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('lt2_osh_health'),
    recordId: r.id, recordLabel: `OSH · ${input.employee_name} · ${input.fitness} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-labour-tier2-engine',
  });
  return r;
}
export function listOSHCheckups(): OSHHealthCheckup[] { return readJson<OSHHealthCheckup[]>(OSH_KEY, []); }

// ═══ Consolidated Labour Tier-2 Compliance Summary ═══════════════════
export interface LabourTier2ComplianceSummary {
  bonus_computed: number;
  maternity_active: number;
  equal_rem_audits: number;
  active_apprentices: number;
  clra_engagements: number;
  shops_registered: number;
  form21_filed: number;
  osh_unfit: number;
  overall_status: 'compliant' | 'attention_required' | 'non_compliant';
}

export function getLabourTier2ComplianceSummary(): LabourTier2ComplianceSummary {
  const oshUnfit = listOSHCheckups().filter((c) => c.fitness === 'unfit').length;
  const clraNonCompliant = listCLRAEngagements().filter((c) => !c.pf_esi_compliant).length;

  let overall_status: LabourTier2ComplianceSummary['overall_status'] = 'compliant';
  if (oshUnfit > 0) overall_status = 'attention_required';
  if (clraNonCompliant > 0) overall_status = 'non_compliant';

  return {
    bonus_computed: listBonusComputations().length,
    maternity_active: listMaternityClaims({ status: 'on_leave' }).length,
    equal_rem_audits: listEqualRemAudits().length,
    active_apprentices: listApprentices({ status: 'active' }).length,
    clra_engagements: listCLRAEngagements().length,
    shops_registered: listShops().length,
    form21_filed: listForm21().filter((f) => f.filed_on !== null).length,
    osh_unfit: oshUnfit,
    overall_status,
  };
}
