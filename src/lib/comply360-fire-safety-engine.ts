/**
 * @file        src/lib/comply360-fire-safety-engine.ts
 * @sibling     NEW @ Sprint 89 · Comply360 Floor 5 Comprehensive Compliance Arc 5.1 · DP-F5-1 · Q33 · FLOOR 5 OPENS
 * @realizes    Fire Safety + Building Safety compliance per NBC 2025 Part 4 framework.
 *              Fire NOC (state-keyed) · Fire Safety Audit · Equipment AMC · Evacuation drills ·
 *              Building Fire Safety Certificate. 16th USE-SITE READ application · MAXIMUM SCALE.
 * @reads-from  factory-license-cap-engine (S79a) · comply360-audit-framework-engine (S80a) ·
 *              comply360-calendar-engine (S78a) · comply360-rule-11g-report-engine (S80f) ·
 *              audit-trail-engine · comply360-audit-trail-aggregator-engine
 * @sprint      Sprint 89 · T-Phase-5.F.5.1 · FLOOR 5 OPENS · Q33
 * [JWT] Phase 8: POST /api/comply360/fire-safety/{noc,audit,drill,amc,cert}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'factory-license-cap-engine',
    'comply360-audit-framework-engine',
    'comply360-calendar-engine',
    'comply360-rule-11g-report-engine',
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
  ],
  storage_keys: [
    'erp_fire_noc',
    'erp_fire_safety_audits',
    'erp_evacuation_drills',
    'erp_equipment_amc',
    'erp_building_fire_certs',
  ],
} as const;

// 5 NEW audit entity types · MCA Rule 11(g)(b) coverage
registerAuditEntityType({ id: 'fire_noc', module: 'licenses', label: 'Fire NOC' });
registerAuditEntityType({ id: 'fire_safety_audit', module: 'licenses', label: 'Fire Safety Audit' });
registerAuditEntityType({ id: 'evacuation_drill', module: 'licenses', label: 'Evacuation Drill' });
registerAuditEntityType({ id: 'equipment_amc', module: 'licenses', label: 'Fire Equipment AMC' });
registerAuditEntityType({ id: 'building_fire_certificate', module: 'licenses', label: 'Building Fire Safety Certificate' });

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

// ─── Fire NOC ─────────────────────────────────────────────────────
export type FireNOCState = 'MH' | 'KA' | 'TN' | 'DL' | 'GJ' | 'WB' | 'UP' | 'AP' | 'TG' | 'KL' | 'RJ' | 'OTHER';
export type FireNOCStatus = 'active' | 'expired' | 'renewal_pending';
export type OccupancyClass =
  | 'A1_residential' | 'A2_lodging' | 'B_educational' | 'C_institutional'
  | 'D_assembly' | 'E_business' | 'F_mercantile' | 'G_industrial'
  | 'H_storage' | 'J_hazardous';

export interface FireNOC {
  id: string;
  premises_id: string;
  state: FireNOCState;
  noc_number: string;
  issued_date: string;
  expiry_date: string;
  status: FireNOCStatus;
  occupancy_class: OccupancyClass;
}

const NOC_KEY = 'erp_fire_noc';

export function recordFireNOC(input: Omit<FireNOC, 'id'>, by_bap: BAPAccountId): FireNOC {
  const noc: FireNOC = { ...input, id: uid('noc') };
  const all = readJson<FireNOC[]>(NOC_KEY, []);
  all.push(noc); writeJson(NOC_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('fire_noc'),
    recordId: noc.id, recordLabel: `Fire NOC · ${input.state} · ${input.noc_number} (by ${by_bap})`,
    beforeState: null, afterState: noc as unknown as Record<string, unknown>,
    sourceModule: 'comply360-fire-safety-engine',
  });
  return noc;
}

export function listFireNOCs(filter: { state?: FireNOCState; status?: FireNOCStatus } = {}): FireNOC[] {
  return readJson<FireNOC[]>(NOC_KEY, []).filter((n) => {
    if (filter.state && n.state !== filter.state) return false;
    if (filter.status && n.status !== filter.status) return false;
    return true;
  });
}

// ─── Fire Safety Audit ────────────────────────────────────────────
export type AuditCategory = 'extinguisher' | 'hose' | 'pump' | 'sprinkler' | 'detector' | 'exit' | 'signage' | 'other';
export type AuditSeverity = 'critical' | 'major' | 'minor';
export type AuditPassStatus = 'pass' | 'pass_with_observations' | 'fail';

export interface FireSafetyAuditObservation {
  category: AuditCategory;
  observation: string;
  severity: AuditSeverity;
}

export interface FireSafetyAudit {
  id: string;
  premises_id: string;
  audit_date: string;
  auditor_name: string;
  observations: FireSafetyAuditObservation[];
  pass_status: AuditPassStatus;
}

const AUDIT_KEY = 'erp_fire_safety_audits';

export function recordFireSafetyAudit(input: Omit<FireSafetyAudit, 'id'>, by_bap: BAPAccountId): FireSafetyAudit {
  const a: FireSafetyAudit = { ...input, id: uid('fsa') };
  const all = readJson<FireSafetyAudit[]>(AUDIT_KEY, []);
  all.push(a); writeJson(AUDIT_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('fire_safety_audit'),
    recordId: a.id, recordLabel: `Fire Safety Audit · ${input.premises_id} · ${input.audit_date} (by ${by_bap})`,
    beforeState: null, afterState: a as unknown as Record<string, unknown>,
    sourceModule: 'comply360-fire-safety-engine',
  });
  return a;
}

export function listFireSafetyAudits(filter: { premises_id?: string; pass_status?: AuditPassStatus } = {}): FireSafetyAudit[] {
  return readJson<FireSafetyAudit[]>(AUDIT_KEY, []).filter((a) => {
    if (filter.premises_id && a.premises_id !== filter.premises_id) return false;
    if (filter.pass_status && a.pass_status !== filter.pass_status) return false;
    return true;
  });
}

// ─── Equipment AMC ────────────────────────────────────────────────
export type EquipmentType =
  | 'extinguisher_refill' | 'hose_pipe' | 'pump_testing'
  | 'sprinkler_maintenance' | 'detector_calibration';

export interface EquipmentAMC {
  id: string;
  equipment_type: EquipmentType;
  vendor_name: string;
  amc_start_date: string;
  amc_end_date: string;
  cost_inr: number;
  next_service_date: string;
}

const AMC_KEY = 'erp_equipment_amc';

export function recordEquipmentAMC(input: Omit<EquipmentAMC, 'id'>, by_bap: BAPAccountId): EquipmentAMC {
  const a: EquipmentAMC = { ...input, id: uid('amc') };
  const all = readJson<EquipmentAMC[]>(AMC_KEY, []);
  all.push(a); writeJson(AMC_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('equipment_amc'),
    recordId: a.id, recordLabel: `Equipment AMC · ${input.equipment_type} · ${input.vendor_name} (by ${by_bap})`,
    beforeState: null, afterState: a as unknown as Record<string, unknown>,
    sourceModule: 'comply360-fire-safety-engine',
  });
  return a;
}

export function listEquipmentAMCs(filter: { equipment_type?: EquipmentType } = {}): EquipmentAMC[] {
  return readJson<EquipmentAMC[]>(AMC_KEY, []).filter((a) => {
    if (filter.equipment_type && a.equipment_type !== filter.equipment_type) return false;
    return true;
  });
}

// ─── Evacuation Drill ─────────────────────────────────────────────
export interface EvacuationDrill {
  id: string;
  drill_date: string;
  premises_id: string;
  participants_count: number;
  evacuation_time_seconds: number;
  observations: string;
}

const DRILL_KEY = 'erp_evacuation_drills';

export function recordEvacuationDrill(input: Omit<EvacuationDrill, 'id'>, by_bap: BAPAccountId): EvacuationDrill {
  const d: EvacuationDrill = { ...input, id: uid('drl') };
  const all = readJson<EvacuationDrill[]>(DRILL_KEY, []);
  all.push(d); writeJson(DRILL_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('evacuation_drill'),
    recordId: d.id, recordLabel: `Evacuation Drill · ${input.premises_id} · ${input.drill_date} (by ${by_bap})`,
    beforeState: null, afterState: d as unknown as Record<string, unknown>,
    sourceModule: 'comply360-fire-safety-engine',
  });
  return d;
}

export function listEvacuationDrills(filter: { premises_id?: string; from_date?: string } = {}): EvacuationDrill[] {
  return readJson<EvacuationDrill[]>(DRILL_KEY, []).filter((d) => {
    if (filter.premises_id && d.premises_id !== filter.premises_id) return false;
    if (filter.from_date && d.drill_date < filter.from_date) return false;
    return true;
  });
}

// ─── Building Fire Safety Certificate ─────────────────────────────
export interface BuildingFireCertificate {
  id: string;
  building_name: string;
  certificate_number: string;
  issued_date: string;
  expiry_date: string;
  issuing_authority: string;
}

const CERT_KEY = 'erp_building_fire_certs';

export function recordBuildingFireCertificate(input: Omit<BuildingFireCertificate, 'id'>, by_bap: BAPAccountId): BuildingFireCertificate {
  const c: BuildingFireCertificate = { ...input, id: uid('bfc') };
  const all = readJson<BuildingFireCertificate[]>(CERT_KEY, []);
  all.push(c); writeJson(CERT_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('building_fire_certificate'),
    recordId: c.id, recordLabel: `Building Fire Cert · ${input.building_name} · ${input.certificate_number} (by ${by_bap})`,
    beforeState: null, afterState: c as unknown as Record<string, unknown>,
    sourceModule: 'comply360-fire-safety-engine',
  });
  return c;
}

export function listBuildingFireCertificates(): BuildingFireCertificate[] {
  return readJson<BuildingFireCertificate[]>(CERT_KEY, []);
}

// ─── Compliance Summary ───────────────────────────────────────────
export interface FireSafetyComplianceSummary {
  active_nocs: number;
  expiring_nocs_next_90_days: number;
  audits_passed_last_12_months: number;
  evacuation_drills_last_12_months: number;
  equipment_amcs_active: number;
  overall_status: 'compliant' | 'attention_required' | 'non_compliant';
}

export function getFireSafetyComplianceSummary(_fy: string): FireSafetyComplianceSummary {
  const now = Date.now();
  const ninetyDays = now + 90 * 24 * 3600 * 1000;
  const twelveMonthsAgo = new Date(now - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const nocs = readJson<FireNOC[]>(NOC_KEY, []);
  const active_nocs = nocs.filter((n) => n.status === 'active').length;
  const expiring_nocs_next_90_days = nocs.filter((n) =>
    n.status === 'active' && new Date(n.expiry_date).getTime() <= ninetyDays
  ).length;

  const audits = readJson<FireSafetyAudit[]>(AUDIT_KEY, []);
  const audits_passed_last_12_months = audits.filter((a) =>
    a.audit_date >= twelveMonthsAgo && (a.pass_status === 'pass' || a.pass_status === 'pass_with_observations')
  ).length;

  const drills = readJson<EvacuationDrill[]>(DRILL_KEY, []);
  const evacuation_drills_last_12_months = drills.filter((d) => d.drill_date >= twelveMonthsAgo).length;

  const amcs = readJson<EquipmentAMC[]>(AMC_KEY, []);
  const today = new Date().toISOString().slice(0, 10);
  const equipment_amcs_active = amcs.filter((a) => a.amc_end_date >= today).length;

  let overall_status: FireSafetyComplianceSummary['overall_status'] = 'compliant';
  if (expiring_nocs_next_90_days > 0 || evacuation_drills_last_12_months === 0) overall_status = 'attention_required';
  if (active_nocs === 0 || audits.some((a) => a.pass_status === 'fail')) overall_status = 'non_compliant';

  return {
    active_nocs,
    expiring_nocs_next_90_days,
    audits_passed_last_12_months,
    evacuation_drills_last_12_months,
    equipment_amcs_active,
    overall_status,
  };
}
