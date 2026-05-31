/**
 * @file        src/lib/comply360-schedule-iv-engine.ts
 * @sibling     NEW @ Sprint 84 · Comply360 Floor 3 ROC-Suite Arc 3.2 · DP-S84-3
 * @realizes    Companies Act Schedule IV · Code for Independent Directors (Section 149(8)).
 *              Register + 7-criteria check (Section 149(6)) + annual declaration.
 *              USE-SITE READS S83 dir3-kyc-engine (v1.26 canon · S83 0-DIFF).
 * @reads-from  audit-trail-engine · comply360-audit-trail-aggregator-engine ·
 *              comply360-dir3-kyc-engine (USE-SITE)
 * @sprint      Sprint 84 · T-Phase-5.C.3.2
 * [JWT] Phase 8: POST /api/comply360/schedule-iv/{register,declare}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';
// USE-SITE READS S83 dir3-kyc
import { getDirectorMaster } from './comply360-dir3-kyc-engine';

export const READS_FROM = {
  engines: [
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
    'comply360-dir3-kyc-engine',
  ],
  storage_keys: ['erp_schedule_iv_register', 'erp_schedule_iv_declarations'],
} as const;

export interface IndependentDirectorRegister {
  id: string;
  director_id: string;
  din: string;
  appointment_date: string;
  reappointment_due_date: string;
  meets_section_149_6_criteria: boolean;
  criteria_evidence: {
    no_pecuniary_relationship: boolean;
    not_promoter: boolean;
    not_kmp_relative: boolean;
    no_material_pecuniary_3yr: boolean;
    professional_qualification: boolean;
    no_employee_3yr: boolean;
    integrity_expertise_experience: boolean;
  };
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

export interface AnnualDeclaration {
  id: string;
  register_id: string;
  declaration_fy: string;
  declaration_date: string;
  is_independent: boolean;
  is_suitable_integrity: boolean;
  is_suitable_expertise: boolean;
  is_suitable_experience: boolean;
  conflict_of_interest_declared: string;
  pecuniary_relationships_declared: string;
  signed_at: string;
  recorded_by_bap: BAPAccountId;
}

const REG_KEY = 'erp_schedule_iv_register';
const DECL_KEY = 'erp_schedule_iv_declarations';
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
function addYears(iso: string, years: number): string {
  const d = new Date(iso);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export function registerIndependentDirector(
  input: Omit<IndependentDirectorRegister, 'id' | 'recorded_at' | 'reappointment_due_date'>,
): IndependentDirectorRegister {
  const r: IndependentDirectorRegister = {
    ...input,
    id: uid('idr'),
    reappointment_due_date: addYears(input.appointment_date, 5),
    recorded_at: new Date().toISOString(),
  };
  const all = readJson<IndependentDirectorRegister[]>(REG_KEY, []);
  all.push(r); writeJson(REG_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('independent_director_register'),
    recordId: r.id, recordLabel: `Independent Director · DIN ${input.din}`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-schedule-iv-engine',
  });
  return r;
}

export function recordAnnualDeclaration(
  input: Omit<AnnualDeclaration, 'id' | 'signed_at'>,
): AnnualDeclaration {
  const d: AnnualDeclaration = { ...input, id: uid('decl'), signed_at: new Date().toISOString() };
  const all = readJson<AnnualDeclaration[]>(DECL_KEY, []);
  all.push(d); writeJson(DECL_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('independent_director_annual_declaration'),
    recordId: d.id, recordLabel: `IDR Annual Declaration · FY ${input.declaration_fy}`,
    beforeState: null, afterState: d as unknown as Record<string, unknown>,
    sourceModule: 'comply360-schedule-iv-engine',
  });
  return d;
}

export function listRegisterEntries(opts: { fy?: string } = {}): IndependentDirectorRegister[] {
  return readJson<IndependentDirectorRegister[]>(REG_KEY, []).filter((r) => {
    if (opts.fy) {
      return r.appointment_date <= `${opts.fy}-03-31`;
    }
    return true;
  });
}

export function listDeclarations(register_id: string): AnnualDeclaration[] {
  return readJson<AnnualDeclaration[]>(DECL_KEY, []).filter((d) => d.register_id === register_id);
}

export function verifyIndependence(director_id: string, _fy: string): { is_independent: boolean; criteria_results: Record<string, boolean>; missing_evidence: string[] } {
  // USE-SITE READ S83 dir3-kyc · just ensures director exists
  getDirectorMaster(director_id);
  const reg = readJson<IndependentDirectorRegister[]>(REG_KEY, []).find((r) => r.director_id === director_id);
  const ev = reg?.criteria_evidence;
  const criteria_results: Record<string, boolean> = {
    no_pecuniary_relationship: !!ev?.no_pecuniary_relationship,
    not_promoter: !!ev?.not_promoter,
    not_kmp_relative: !!ev?.not_kmp_relative,
    no_material_pecuniary_3yr: !!ev?.no_material_pecuniary_3yr,
    professional_qualification: !!ev?.professional_qualification,
    no_employee_3yr: !!ev?.no_employee_3yr,
    integrity_expertise_experience: !!ev?.integrity_expertise_experience,
  };
  const missing_evidence = Object.entries(criteria_results).filter(([, v]) => !v).map(([k]) => k);
  return { is_independent: missing_evidence.length === 0, criteria_results, missing_evidence };
}

export function getUpcomingReappointments(days_ahead = 90): Array<{ register_id: string; director_id: string; reappointment_due_date: string; days_remaining: number }> {
  const today = new Date();
  return readJson<IndependentDirectorRegister[]>(REG_KEY, [])
    .map((r) => ({
      register_id: r.id,
      director_id: r.director_id,
      reappointment_due_date: r.reappointment_due_date,
      days_remaining: Math.ceil((Date.parse(r.reappointment_due_date) - today.getTime()) / 86400000),
    }))
    .filter((x) => x.days_remaining <= days_ahead)
    .sort((a, b) => a.days_remaining - b.days_remaining);
}

registerAuditEntityType({ id: 'independent_director_register', module: 'mca-roc', label: 'Schedule IV Independent Director Register' });
registerAuditEntityType({ id: 'independent_director_annual_declaration', module: 'mca-roc', label: 'Schedule IV Annual Declaration' });
