/**
 * @file        src/lib/comply360-industrial-safety-engine.ts
 * @sibling     NEW @ Sprint 89 · Comply360 Floor 5 Comprehensive Compliance Arc 5.1 · DP-F5-1 · Q33 · FLOOR 5 OPENS
 * @realizes    Industrial Safety · PESO + Boiler Act 1923 + SMPV 1981 + Electrical CEA + Lift Act.
 *              17th USE-SITE READ application · MAXIMUM SCALE.
 * @reads-from  comply360-licenses-registry-engine (S79a) · comply360-audit-framework-engine (S80a) ·
 *              comply360-calendar-engine (S78a) · comply360-rule-11g-report-engine (S80f) ·
 *              audit-trail-engine · comply360-audit-trail-aggregator-engine
 * @sprint      Sprint 89 · T-Phase-5.F.5.1 · FLOOR 5 OPENS · Q33
 * [JWT] Phase 8: POST /api/comply360/industrial-safety/{peso,boiler,smpv,electrical,lift}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'comply360-licenses-registry-engine',
    'comply360-audit-framework-engine',
    'comply360-calendar-engine',
    'comply360-rule-11g-report-engine',
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
  ],
  storage_keys: [
    'erp_peso_licenses',
    'erp_boiler_inspections',
    'erp_smpv_records',
    'erp_electrical_safety_nocs',
    'erp_lift_act_filings',
  ],
} as const;

// 5 NEW audit entity types · MCA Rule 11(g)(b) coverage
registerAuditEntityType({ id: 'peso_license', module: 'licenses', label: 'PESO License' });
registerAuditEntityType({ id: 'boiler_inspection', module: 'licenses', label: 'Boiler Inspection' });
registerAuditEntityType({ id: 'smpv_record', module: 'licenses', label: 'SMPV Record' });
registerAuditEntityType({ id: 'electrical_safety_noc', module: 'licenses', label: 'Electrical Safety NOC' });
registerAuditEntityType({ id: 'lift_act_filing', module: 'licenses', label: 'Lift Act Filing' });

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

// ─── PESO License ─────────────────────────────────────────────────
export type PESOLicenseType = 'diesel_storage' | 'petroleum_storage' | 'explosives_handling' | 'lpg_storage';
export type PESOStatus = 'active' | 'expired' | 'renewal_pending';

export interface PESOLicense {
  id: string;
  license_type: PESOLicenseType;
  license_number: string;
  capacity_kl_or_kg: number;
  premises_id: string;
  issued_date: string;
  expiry_date: string;
  status: PESOStatus;
}

const PESO_KEY = 'erp_peso_licenses';

export function recordPESOLicense(input: Omit<PESOLicense, 'id'>, by_bap: BAPAccountId): PESOLicense {
  const lic: PESOLicense = { ...input, id: uid('peso') };
  const all = readJson<PESOLicense[]>(PESO_KEY, []);
  all.push(lic); writeJson(PESO_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('peso_license'),
    recordId: lic.id, recordLabel: `PESO · ${input.license_type} · ${input.license_number} (by ${by_bap})`,
    beforeState: null, afterState: lic as unknown as Record<string, unknown>,
    sourceModule: 'comply360-industrial-safety-engine',
  });
  return lic;
}

export function listPESOLicenses(filter: { license_type?: PESOLicenseType; status?: PESOStatus } = {}): PESOLicense[] {
  return readJson<PESOLicense[]>(PESO_KEY, []).filter((l) => {
    if (filter.license_type && l.license_type !== filter.license_type) return false;
    if (filter.status && l.status !== filter.status) return false;
    return true;
  });
}

// ─── Boiler Inspection ────────────────────────────────────────────
export type BoilerResult = 'pass' | 'pass_with_observations' | 'fail';

export interface BoilerInspection {
  id: string;
  boiler_serial_number: string;
  capacity_kg_per_hour: number;
  inspection_date: string;
  inspector_name: string;
  next_inspection_due: string;
  inspection_result: BoilerResult;
  observations: string;
}

const BOILER_KEY = 'erp_boiler_inspections';

export function recordBoilerInspection(input: Omit<BoilerInspection, 'id'>, by_bap: BAPAccountId): BoilerInspection {
  const b: BoilerInspection = { ...input, id: uid('blr') };
  const all = readJson<BoilerInspection[]>(BOILER_KEY, []);
  all.push(b); writeJson(BOILER_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('boiler_inspection'),
    recordId: b.id, recordLabel: `Boiler Inspection · ${input.boiler_serial_number} · ${input.inspection_result} (by ${by_bap})`,
    beforeState: null, afterState: b as unknown as Record<string, unknown>,
    sourceModule: 'comply360-industrial-safety-engine',
  });
  return b;
}

export function listBoilerInspections(filter: { result?: BoilerResult } = {}): BoilerInspection[] {
  return readJson<BoilerInspection[]>(BOILER_KEY, []).filter((b) => {
    if (filter.result && b.inspection_result !== filter.result) return false;
    return true;
  });
}

// ─── SMPV Record ──────────────────────────────────────────────────
export type SMPVType = 'static' | 'mobile';
export type SMPVComplianceStatus = 'compliant' | 'non_compliant';

export interface SMPVRecord {
  id: string;
  vessel_serial_number: string;
  vessel_type: SMPVType;
  pressure_rating_bar: number;
  inspection_date: string;
  next_inspection_due: string;
  compliance_status: SMPVComplianceStatus;
}

const SMPV_KEY = 'erp_smpv_records';

export function recordSMPV(input: Omit<SMPVRecord, 'id'>, by_bap: BAPAccountId): SMPVRecord {
  const s: SMPVRecord = { ...input, id: uid('smpv') };
  const all = readJson<SMPVRecord[]>(SMPV_KEY, []);
  all.push(s); writeJson(SMPV_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('smpv_record'),
    recordId: s.id, recordLabel: `SMPV · ${input.vessel_type} · ${input.vessel_serial_number} (by ${by_bap})`,
    beforeState: null, afterState: s as unknown as Record<string, unknown>,
    sourceModule: 'comply360-industrial-safety-engine',
  });
  return s;
}

export function listSMPVRecords(filter: { vessel_type?: SMPVType } = {}): SMPVRecord[] {
  return readJson<SMPVRecord[]>(SMPV_KEY, []).filter((s) => {
    if (filter.vessel_type && s.vessel_type !== filter.vessel_type) return false;
    return true;
  });
}

// ─── Electrical Safety NOC ────────────────────────────────────────
export type VoltageClass = 'LT' | 'HT' | 'EHV';

export interface ElectricalSafetyNOC {
  id: string;
  premises_id: string;
  noc_number: string;
  voltage_class: VoltageClass;
  issued_date: string;
  expiry_date: string;
  issuing_authority: string;
}

const ELEC_KEY = 'erp_electrical_safety_nocs';

export function recordElectricalSafetyNOC(input: Omit<ElectricalSafetyNOC, 'id'>, by_bap: BAPAccountId): ElectricalSafetyNOC {
  const e: ElectricalSafetyNOC = { ...input, id: uid('enoc') };
  const all = readJson<ElectricalSafetyNOC[]>(ELEC_KEY, []);
  all.push(e); writeJson(ELEC_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('electrical_safety_noc'),
    recordId: e.id, recordLabel: `Electrical NOC · ${input.voltage_class} · ${input.noc_number} (by ${by_bap})`,
    beforeState: null, afterState: e as unknown as Record<string, unknown>,
    sourceModule: 'comply360-industrial-safety-engine',
  });
  return e;
}

export function listElectricalSafetyNOCs(filter: { voltage_class?: VoltageClass } = {}): ElectricalSafetyNOC[] {
  return readJson<ElectricalSafetyNOC[]>(ELEC_KEY, []).filter((e) => {
    if (filter.voltage_class && e.voltage_class !== filter.voltage_class) return false;
    return true;
  });
}

// ─── Lift Act Filing ──────────────────────────────────────────────
export type LiftActState = 'MH' | 'KA' | 'TN' | 'DL' | 'GJ' | 'WB' | 'UP' | 'OTHER';

export interface LiftActFiling {
  id: string;
  lift_serial_number: string;
  state: LiftActState;
  registration_number: string;
  capacity_persons: number;
  registration_date: string;
  next_inspection_due: string;
}

const LIFT_KEY = 'erp_lift_act_filings';

export function recordLiftActFiling(input: Omit<LiftActFiling, 'id'>, by_bap: BAPAccountId): LiftActFiling {
  const f: LiftActFiling = { ...input, id: uid('lift') };
  const all = readJson<LiftActFiling[]>(LIFT_KEY, []);
  all.push(f); writeJson(LIFT_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('lift_act_filing'),
    recordId: f.id, recordLabel: `Lift Act · ${input.state} · ${input.registration_number} (by ${by_bap})`,
    beforeState: null, afterState: f as unknown as Record<string, unknown>,
    sourceModule: 'comply360-industrial-safety-engine',
  });
  return f;
}

export function listLiftActFilings(filter: { state?: LiftActState } = {}): LiftActFiling[] {
  return readJson<LiftActFiling[]>(LIFT_KEY, []).filter((f) => {
    if (filter.state && f.state !== filter.state) return false;
    return true;
  });
}

// ─── Compliance Summary ───────────────────────────────────────────
export interface IndustrialSafetyComplianceSummary {
  peso_licenses_active: number;
  boiler_inspections_passed_last_12_months: number;
  smpv_compliant_count: number;
  electrical_nocs_active: number;
  lift_filings_compliant: number;
  overall_status: 'compliant' | 'attention_required' | 'non_compliant';
}

export function getIndustrialSafetyComplianceSummary(_fy: string): IndustrialSafetyComplianceSummary {
  const now = Date.now();
  const twelveMonthsAgo = new Date(now - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const peso = readJson<PESOLicense[]>(PESO_KEY, []);
  const peso_licenses_active = peso.filter((l) => l.status === 'active').length;

  const boilers = readJson<BoilerInspection[]>(BOILER_KEY, []);
  const boiler_inspections_passed_last_12_months = boilers.filter((b) =>
    b.inspection_date >= twelveMonthsAgo && (b.inspection_result === 'pass' || b.inspection_result === 'pass_with_observations')
  ).length;

  const smpv = readJson<SMPVRecord[]>(SMPV_KEY, []);
  const smpv_compliant_count = smpv.filter((s) => s.compliance_status === 'compliant').length;

  const elec = readJson<ElectricalSafetyNOC[]>(ELEC_KEY, []);
  const electrical_nocs_active = elec.filter((e) => e.expiry_date >= today).length;

  const lifts = readJson<LiftActFiling[]>(LIFT_KEY, []);
  const lift_filings_compliant = lifts.filter((f) => f.next_inspection_due >= today).length;

  let overall_status: IndustrialSafetyComplianceSummary['overall_status'] = 'compliant';
  if (boilers.some((b) => b.inspection_result === 'fail') || smpv.some((s) => s.compliance_status === 'non_compliant')) {
    overall_status = 'non_compliant';
  } else if (peso.some((l) => l.status === 'expired') || elec.some((e) => e.expiry_date < today)) {
    overall_status = 'attention_required';
  }

  return {
    peso_licenses_active,
    boiler_inspections_passed_last_12_months,
    smpv_compliant_count,
    electrical_nocs_active,
    lift_filings_compliant,
    overall_status,
  };
}
