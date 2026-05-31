/**
 * @file        src/lib/comply360-waste-management-engine.ts
 * @sibling     NEW @ Sprint 91 · Comply360 Floor 5.3 · Q35 Waste Management
 * @realizes    Consolidated waste-management engine · 6 sub-regimes INTERNAL modules:
 *              Hazardous Waste Rules 2016 (Form 1 + Form 4 + Form 10 manifest)
 *              E-Waste Rules 2022 (Form 1 + Form 6 EPR + Form 1A)
 *              Plastic Waste Rules 2022 (Form I + Annual Return)
 *              Battery Waste Rules 2022 (Form 1 + Form 5)
 *              Bio-Medical Waste Rules (Form II + Form IV)
 *              EPR Consolidated Tracker
 *              20th USE-SITE READ application · MAXIMUM SCALE.
 * @reads-from  comply360-audit-framework-engine (S80a) · comply360-calendar-engine (S78a renewal dates) ·
 *              comply360-brsr-comprehensive-engine (S77a · BRSR Principle 6 metrics) ·
 *              comply360-rule-11g-report-engine (S80f) · comply360-environmental-engine (S90 base framework) ·
 *              audit-trail-engine · comply360-audit-trail-aggregator-engine
 * @sprint      Sprint 91 · T-Phase-5.F.5.3 · Floor 5.3 · Q35
 * [JWT] Phase 8: POST /api/comply360/waste-management/{hazardous,e-waste,plastic,battery,bio-medical,epr}
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
    'comply360-environmental-engine',
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
  ],
  storage_keys: [
    'erp_hw_form1', 'erp_hw_form4', 'erp_hw_form10',
    'erp_ew_form1', 'erp_ew_form6_epr', 'erp_ew_form1a',
    'erp_pw_form1', 'erp_pw_annual',
    'erp_bw_form1', 'erp_bw_form5',
    'erp_bmw_form2', 'erp_bmw_form4',
    'erp_epr_consolidated',
  ],
} as const;

// 13 NEW audit entity types · MCA Rule 11(g)(b) coverage · module 'esg'
registerAuditEntityType({ id: 'hazardous_form1',  module: 'esg', label: 'Hazardous Waste Form 1 (Authorisation)' });
registerAuditEntityType({ id: 'hazardous_form4',  module: 'esg', label: 'Hazardous Waste Form 4 (Annual Return)' });
registerAuditEntityType({ id: 'hazardous_form10', module: 'esg', label: 'Hazardous Waste Form 10 (Manifest)' });
registerAuditEntityType({ id: 'ewaste_form1',     module: 'esg', label: 'E-Waste Form 1 (Authorisation)' });
registerAuditEntityType({ id: 'ewaste_form6_epr', module: 'esg', label: 'E-Waste Form 6 (EPR Plan)' });
registerAuditEntityType({ id: 'ewaste_form1a',    module: 'esg', label: 'E-Waste Form 1A (Annual Return)' });
registerAuditEntityType({ id: 'plastic_form1',    module: 'esg', label: 'Plastic Waste Form I (Registration)' });
registerAuditEntityType({ id: 'plastic_annual',   module: 'esg', label: 'Plastic Waste Annual Return' });
registerAuditEntityType({ id: 'battery_form1',    module: 'esg', label: 'Battery Waste Form 1 (Registration)' });
registerAuditEntityType({ id: 'battery_form5',    module: 'esg', label: 'Battery Waste Form 5 (Annual Return)' });
registerAuditEntityType({ id: 'biomedical_form2', module: 'esg', label: 'Bio-Medical Waste Form II (Authorisation)' });
registerAuditEntityType({ id: 'biomedical_form4', module: 'esg', label: 'Bio-Medical Waste Form IV (Annual Report)' });
registerAuditEntityType({ id: 'epr_consolidated', module: 'esg', label: 'EPR Consolidated Tracker' });

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

export type FilingStatus = 'draft' | 'filed' | 'late_filed';
export type AuthStatus = 'active' | 'expired' | 'renewal_pending';

// ═══ MODULE 1 · Hazardous Waste Rules 2016 ═══════════════════════════
export type HazardousSchedule = 'I' | 'II' | 'III';

export interface HazardousForm1 {
  id: string;
  premises_id: string;
  authorisation_number: string;
  issued_date: string;
  expiry_date: string;
  schedules: HazardousSchedule[];
  status: AuthStatus;
}

export interface HazardousForm4 {
  id: string;
  fy: string;
  premises_id: string;
  generated_mt: number;
  recycled_mt: number;
  disposed_mt: number;
  filing_status: FilingStatus;
}

export interface HazardousForm10Manifest {
  id: string;
  manifest_number: string;
  date: string;
  generator_id: string;
  transporter_id: string;
  tsdf_id: string;
  waste_category: string;
  quantity_mt: number;
}

const HW_F1 = 'erp_hw_form1', HW_F4 = 'erp_hw_form4', HW_F10 = 'erp_hw_form10';

export function recordHazardousForm1(input: Omit<HazardousForm1, 'id'>, by_bap: BAPAccountId): HazardousForm1 {
  const r: HazardousForm1 = { ...input, id: uid('hwf1') };
  const all = readJson<HazardousForm1[]>(HW_F1, []); all.push(r); writeJson(HW_F1, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('hazardous_form1'),
    recordId: r.id, recordLabel: `HW Form 1 · ${input.authorisation_number} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-waste-management-engine',
  });
  return r;
}
export function listHazardousForm1(filter: { status?: AuthStatus } = {}): HazardousForm1[] {
  return readJson<HazardousForm1[]>(HW_F1, []).filter((r) => !filter.status || r.status === filter.status);
}

export function recordHazardousForm4(input: Omit<HazardousForm4, 'id'>, by_bap: BAPAccountId): HazardousForm4 {
  const r: HazardousForm4 = { ...input, id: uid('hwf4') };
  const all = readJson<HazardousForm4[]>(HW_F4, []); all.push(r); writeJson(HW_F4, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('hazardous_form4'),
    recordId: r.id, recordLabel: `HW Form 4 · ${input.fy} · ${input.premises_id} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-waste-management-engine',
  });
  return r;
}
export function listHazardousForm4(filter: { fy?: string } = {}): HazardousForm4[] {
  return readJson<HazardousForm4[]>(HW_F4, []).filter((r) => !filter.fy || r.fy === filter.fy);
}

export function recordHazardousForm10(input: Omit<HazardousForm10Manifest, 'id'>, by_bap: BAPAccountId): HazardousForm10Manifest {
  const r: HazardousForm10Manifest = { ...input, id: uid('hwf10') };
  const all = readJson<HazardousForm10Manifest[]>(HW_F10, []); all.push(r); writeJson(HW_F10, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('hazardous_form10'),
    recordId: r.id, recordLabel: `HW Form 10 Manifest · ${input.manifest_number} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-waste-management-engine',
  });
  return r;
}
export function listHazardousForm10(): HazardousForm10Manifest[] {
  return readJson<HazardousForm10Manifest[]>(HW_F10, []);
}

// ═══ MODULE 2 · E-Waste Rules 2022 ═══════════════════════════════════
export interface EWasteForm1 {
  id: string;
  producer_id: string;
  authorisation_number: string;
  issued_date: string;
  expiry_date: string;
  product_categories: string[];
  status: AuthStatus;
}

export interface EWasteForm6EPR {
  id: string;
  fy: string;
  producer_id: string;
  target_collection_mt: number;
  achieved_collection_mt: number;
  pro_id: string | null;
  filing_status: FilingStatus;
}

export interface EWasteForm1A {
  id: string;
  fy: string;
  producer_id: string;
  placed_market_mt: number;
  collected_mt: number;
  recycled_mt: number;
  filing_status: FilingStatus;
}

const EW_F1 = 'erp_ew_form1', EW_F6 = 'erp_ew_form6_epr', EW_F1A = 'erp_ew_form1a';

export function recordEWasteForm1(input: Omit<EWasteForm1, 'id'>, by_bap: BAPAccountId): EWasteForm1 {
  const r: EWasteForm1 = { ...input, id: uid('ewf1') };
  const all = readJson<EWasteForm1[]>(EW_F1, []); all.push(r); writeJson(EW_F1, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('ewaste_form1'),
    recordId: r.id, recordLabel: `E-Waste Form 1 · ${input.authorisation_number} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-waste-management-engine',
  });
  return r;
}
export function listEWasteForm1(): EWasteForm1[] { return readJson<EWasteForm1[]>(EW_F1, []); }

export function recordEWasteForm6EPR(input: Omit<EWasteForm6EPR, 'id'>, by_bap: BAPAccountId): EWasteForm6EPR {
  const r: EWasteForm6EPR = { ...input, id: uid('ewf6') };
  const all = readJson<EWasteForm6EPR[]>(EW_F6, []); all.push(r); writeJson(EW_F6, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('ewaste_form6_epr'),
    recordId: r.id, recordLabel: `E-Waste Form 6 EPR · ${input.fy} · ${input.producer_id} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-waste-management-engine',
  });
  return r;
}
export function listEWasteForm6EPR(filter: { fy?: string } = {}): EWasteForm6EPR[] {
  return readJson<EWasteForm6EPR[]>(EW_F6, []).filter((r) => !filter.fy || r.fy === filter.fy);
}

export function recordEWasteForm1A(input: Omit<EWasteForm1A, 'id'>, by_bap: BAPAccountId): EWasteForm1A {
  const r: EWasteForm1A = { ...input, id: uid('ewf1a') };
  const all = readJson<EWasteForm1A[]>(EW_F1A, []); all.push(r); writeJson(EW_F1A, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('ewaste_form1a'),
    recordId: r.id, recordLabel: `E-Waste Form 1A · ${input.fy} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-waste-management-engine',
  });
  return r;
}
export function listEWasteForm1A(filter: { fy?: string } = {}): EWasteForm1A[] {
  return readJson<EWasteForm1A[]>(EW_F1A, []).filter((r) => !filter.fy || r.fy === filter.fy);
}

// ═══ MODULE 3 · Plastic Waste Rules 2022 ═════════════════════════════
export type PIBOCategory = 'producer' | 'importer' | 'brand_owner';

export interface PlasticForm1 {
  id: string;
  entity_role: PIBOCategory;
  registration_number: string;
  issued_date: string;
  expiry_date: string;
  status: AuthStatus;
}

export interface PlasticAnnualReturn {
  id: string;
  fy: string;
  entity_role: PIBOCategory;
  category_i_mt: number;
  category_ii_mt: number;
  category_iii_mt: number;
  category_iv_mt: number;
  epr_target_mt: number;
  epr_achieved_mt: number;
  filing_status: FilingStatus;
}

const PW_F1 = 'erp_pw_form1', PW_AR = 'erp_pw_annual';

export function recordPlasticForm1(input: Omit<PlasticForm1, 'id'>, by_bap: BAPAccountId): PlasticForm1 {
  const r: PlasticForm1 = { ...input, id: uid('pwf1') };
  const all = readJson<PlasticForm1[]>(PW_F1, []); all.push(r); writeJson(PW_F1, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('plastic_form1'),
    recordId: r.id, recordLabel: `Plastic Form I · ${input.registration_number} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-waste-management-engine',
  });
  return r;
}
export function listPlasticForm1(): PlasticForm1[] { return readJson<PlasticForm1[]>(PW_F1, []); }

export function recordPlasticAnnualReturn(input: Omit<PlasticAnnualReturn, 'id'>, by_bap: BAPAccountId): PlasticAnnualReturn {
  const r: PlasticAnnualReturn = { ...input, id: uid('pwar') };
  const all = readJson<PlasticAnnualReturn[]>(PW_AR, []); all.push(r); writeJson(PW_AR, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('plastic_annual'),
    recordId: r.id, recordLabel: `Plastic Annual · ${input.fy} · ${input.entity_role} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-waste-management-engine',
  });
  return r;
}
export function listPlasticAnnualReturns(filter: { fy?: string } = {}): PlasticAnnualReturn[] {
  return readJson<PlasticAnnualReturn[]>(PW_AR, []).filter((r) => !filter.fy || r.fy === filter.fy);
}

// ═══ MODULE 4 · Battery Waste Rules 2022 ═════════════════════════════
export type BatteryChemistry = 'lead_acid' | 'lithium_ion' | 'nickel_cadmium' | 'other';

export interface BatteryForm1 {
  id: string;
  producer_id: string;
  registration_number: string;
  chemistry: BatteryChemistry;
  issued_date: string;
  expiry_date: string;
  status: AuthStatus;
}

export interface BatteryForm5 {
  id: string;
  fy: string;
  producer_id: string;
  placed_market_mt: number;
  collected_mt: number;
  recycled_mt: number;
  epr_target_pct: number;
  epr_achieved_pct: number;
  filing_status: FilingStatus;
}

const BW_F1 = 'erp_bw_form1', BW_F5 = 'erp_bw_form5';

export function recordBatteryForm1(input: Omit<BatteryForm1, 'id'>, by_bap: BAPAccountId): BatteryForm1 {
  const r: BatteryForm1 = { ...input, id: uid('bwf1') };
  const all = readJson<BatteryForm1[]>(BW_F1, []); all.push(r); writeJson(BW_F1, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('battery_form1'),
    recordId: r.id, recordLabel: `Battery Form 1 · ${input.registration_number} · ${input.chemistry} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-waste-management-engine',
  });
  return r;
}
export function listBatteryForm1(): BatteryForm1[] { return readJson<BatteryForm1[]>(BW_F1, []); }

export function recordBatteryForm5(input: Omit<BatteryForm5, 'id'>, by_bap: BAPAccountId): BatteryForm5 {
  const r: BatteryForm5 = { ...input, id: uid('bwf5') };
  const all = readJson<BatteryForm5[]>(BW_F5, []); all.push(r); writeJson(BW_F5, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('battery_form5'),
    recordId: r.id, recordLabel: `Battery Form 5 · ${input.fy} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-waste-management-engine',
  });
  return r;
}
export function listBatteryForm5(filter: { fy?: string } = {}): BatteryForm5[] {
  return readJson<BatteryForm5[]>(BW_F5, []).filter((r) => !filter.fy || r.fy === filter.fy);
}

// ═══ MODULE 5 · Bio-Medical Waste Rules ══════════════════════════════
export type BMWFacilityType = 'hospital' | 'clinic' | 'laboratory' | 'cbwtf';

export interface BioMedicalForm2 {
  id: string;
  facility_id: string;
  facility_type: BMWFacilityType;
  authorisation_number: string;
  issued_date: string;
  expiry_date: string;
  beds_count: number;
  status: AuthStatus;
}

export interface BioMedicalForm4 {
  id: string;
  fy: string;
  facility_id: string;
  yellow_kg: number;
  red_kg: number;
  white_kg: number;
  blue_kg: number;
  filing_status: FilingStatus;
}

const BMW_F2 = 'erp_bmw_form2', BMW_F4 = 'erp_bmw_form4';

export function recordBioMedicalForm2(input: Omit<BioMedicalForm2, 'id'>, by_bap: BAPAccountId): BioMedicalForm2 {
  const r: BioMedicalForm2 = { ...input, id: uid('bmwf2') };
  const all = readJson<BioMedicalForm2[]>(BMW_F2, []); all.push(r); writeJson(BMW_F2, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('biomedical_form2'),
    recordId: r.id, recordLabel: `BMW Form II · ${input.authorisation_number} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-waste-management-engine',
  });
  return r;
}
export function listBioMedicalForm2(): BioMedicalForm2[] { return readJson<BioMedicalForm2[]>(BMW_F2, []); }

export function recordBioMedicalForm4(input: Omit<BioMedicalForm4, 'id'>, by_bap: BAPAccountId): BioMedicalForm4 {
  const r: BioMedicalForm4 = { ...input, id: uid('bmwf4') };
  const all = readJson<BioMedicalForm4[]>(BMW_F4, []); all.push(r); writeJson(BMW_F4, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('biomedical_form4'),
    recordId: r.id, recordLabel: `BMW Form IV · ${input.fy} · ${input.facility_id} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-waste-management-engine',
  });
  return r;
}
export function listBioMedicalForm4(filter: { fy?: string } = {}): BioMedicalForm4[] {
  return readJson<BioMedicalForm4[]>(BMW_F4, []).filter((r) => !filter.fy || r.fy === filter.fy);
}

// ═══ MODULE 6 · EPR Consolidated Tracker ═════════════════════════════
export type EPRRegime = 'e-waste' | 'plastic' | 'battery';

export interface EPRConsolidatedEntry {
  id: string;
  fy: string;
  regime: EPRRegime;
  producer_id: string;
  target_mt: number;
  achieved_mt: number;
  shortfall_mt: number;
  environmental_compensation_inr: number;
  status: 'on_track' | 'shortfall' | 'achieved';
}

const EPR_KEY = 'erp_epr_consolidated';

export function recordEPRConsolidated(input: Omit<EPRConsolidatedEntry, 'id'>, by_bap: BAPAccountId): EPRConsolidatedEntry {
  const r: EPRConsolidatedEntry = { ...input, id: uid('epr') };
  const all = readJson<EPRConsolidatedEntry[]>(EPR_KEY, []); all.push(r); writeJson(EPR_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('epr_consolidated'),
    recordId: r.id, recordLabel: `EPR · ${input.regime} · ${input.fy} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-waste-management-engine',
  });
  return r;
}
export function listEPRConsolidated(filter: { fy?: string; regime?: EPRRegime } = {}): EPRConsolidatedEntry[] {
  return readJson<EPRConsolidatedEntry[]>(EPR_KEY, []).filter((r) => {
    if (filter.fy && r.fy !== filter.fy) return false;
    if (filter.regime && r.regime !== filter.regime) return false;
    return true;
  });
}

// ═══ Consolidated Compliance Summary ═════════════════════════════════
export interface WasteManagementComplianceSummary {
  hazardous_active_auth_count: number;
  ewaste_active_auth_count: number;
  plastic_active_reg_count: number;
  battery_active_reg_count: number;
  biomedical_active_auth_count: number;
  expiring_auths_next_90_days: number;
  annual_returns_filed_current_fy: number;
  epr_shortfall_count: number;
  overall_status: 'compliant' | 'attention_required' | 'non_compliant';
}

export function getWasteManagementComplianceSummary(fy: string): WasteManagementComplianceSummary {
  const ninetyDays = Date.now() + 90 * 24 * 3600 * 1000;
  const hw = listHazardousForm1();
  const ew = listEWasteForm1();
  const pw = listPlasticForm1();
  const bw = listBatteryForm1();
  const bmw = listBioMedicalForm2();

  const hazardous_active_auth_count = hw.filter((r) => r.status === 'active').length;
  const ewaste_active_auth_count = ew.filter((r) => r.status === 'active').length;
  const plastic_active_reg_count = pw.filter((r) => r.status === 'active').length;
  const battery_active_reg_count = bw.filter((r) => r.status === 'active').length;
  const biomedical_active_auth_count = bmw.filter((r) => r.status === 'active').length;

  const expiring_auths_next_90_days = [
    ...hw, ...ew, ...pw, ...bw, ...bmw,
  ].filter((r) => r.status === 'active' && new Date(r.expiry_date).getTime() <= ninetyDays).length;

  const annual_returns_filed_current_fy =
    listHazardousForm4({ fy }).filter((r) => r.filing_status === 'filed').length +
    listEWasteForm1A({ fy }).filter((r) => r.filing_status === 'filed').length +
    listPlasticAnnualReturns({ fy }).filter((r) => r.filing_status === 'filed').length +
    listBatteryForm5({ fy }).filter((r) => r.filing_status === 'filed').length +
    listBioMedicalForm4({ fy }).filter((r) => r.filing_status === 'filed').length;

  const epr_shortfall_count = listEPRConsolidated({ fy }).filter((r) => r.status === 'shortfall').length;

  let overall_status: WasteManagementComplianceSummary['overall_status'] = 'compliant';
  if (expiring_auths_next_90_days > 0 || epr_shortfall_count > 0) overall_status = 'attention_required';
  if (annual_returns_filed_current_fy === 0 &&
    (hazardous_active_auth_count + ewaste_active_auth_count + plastic_active_reg_count +
     battery_active_reg_count + biomedical_active_auth_count) > 0) overall_status = 'non_compliant';

  return {
    hazardous_active_auth_count, ewaste_active_auth_count, plastic_active_reg_count,
    battery_active_reg_count, biomedical_active_auth_count,
    expiring_auths_next_90_days, annual_returns_filed_current_fy, epr_shortfall_count,
    overall_status,
  };
}
