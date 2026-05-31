/**
 * @file        src/lib/comply360-quality-standards-engine.ts
 * @sibling     NEW @ Sprint 93 · Comply360 Floor 5.5 · Q37 Quality/Pharma/Food/Standards
 * @realizes    Schedule H/H1 (Drugs Rules) · FSSAI Food licensing · BIS ISI/Hallmark ·
 *              ISO 9001/14001/27001/45001 management systems · NABL lab accreditation ·
 *              Legal Metrology (Packaged Commodities). 23rd USE-SITE READ at MAXIMUM SCALE.
 * @reads-from  audit-trail-engine · comply360-audit-trail-aggregator-engine
 * @sprint      Sprint 93 · T-Phase-5.F.5.5 · Floor 5.5 · Q37
 * [JWT] Phase 8: POST /api/comply360/quality-standards/{schedule-h,fssai,bis,iso,nabl,legal-metrology}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: ['audit-trail-engine', 'comply360-audit-trail-aggregator-engine'],
  storage_keys: [
    'erp_quality_schedule_h',
    'erp_quality_fssai_licenses',
    'erp_quality_bis_certs',
    'erp_quality_iso_certs',
    'erp_quality_nabl_scopes',
    'erp_quality_legal_metrology',
    'erp_quality_recalls',
    'erp_quality_h1_register',
    'erp_quality_audits',
  ],
} as const;

// 9 NEW audit entity types · ComplianceModule union constraint applied (v68 policy):
// Quality/Standards semantically maps to 'licenses' (existing union member) · NO §H breach.
registerAuditEntityType({ id: 'quality_schedule_h',    module: 'licenses', label: 'Schedule H / H1 Drug Record' });
registerAuditEntityType({ id: 'quality_h1_register',   module: 'licenses', label: 'Schedule H1 Sale Register' });
registerAuditEntityType({ id: 'quality_fssai_license', module: 'licenses', label: 'FSSAI Food License' });
registerAuditEntityType({ id: 'quality_bis_cert',      module: 'licenses', label: 'BIS ISI / Hallmark Certificate' });
registerAuditEntityType({ id: 'quality_iso_cert',      module: 'licenses', label: 'ISO Management System Cert' });
registerAuditEntityType({ id: 'quality_nabl_scope',    module: 'licenses', label: 'NABL Lab Accreditation Scope' });
registerAuditEntityType({ id: 'quality_legal_metrology', module: 'licenses', label: 'Legal Metrology Declaration' });
registerAuditEntityType({ id: 'quality_recall',        module: 'licenses', label: 'Product Recall Notice' });
registerAuditEntityType({ id: 'quality_audit',         module: 'licenses', label: 'Quality Internal Audit' });

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

// ═══ MODULE 1 · Schedule H / H1 Drug Records ═════════════════════════
export type DrugScheduleClass = 'H' | 'H1' | 'X';
export interface ScheduleHRecord {
  id: string;
  drug_name: string;
  schedule_class: DrugScheduleClass;
  batch_no: string;
  qty_dispensed: number;
  prescriber: string;
  patient_name: string;
  dispensed_at: string;
}
const SH_KEY = 'erp_quality_schedule_h';
export function recordScheduleHDispense(input: Omit<ScheduleHRecord, 'id'>, by_bap: BAPAccountId): ScheduleHRecord {
  const r: ScheduleHRecord = { ...input, id: uid('shd') };
  const all = readJson<ScheduleHRecord[]>(SH_KEY, []); all.push(r); writeJson(SH_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('quality_schedule_h'),
    recordId: r.id, recordLabel: `Schedule ${input.schedule_class} · ${input.drug_name} · ${input.batch_no} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-quality-standards-engine',
  });
  return r;
}
export function listScheduleHRecords(filter: { schedule_class?: DrugScheduleClass } = {}): ScheduleHRecord[] {
  return readJson<ScheduleHRecord[]>(SH_KEY, []).filter((r) => !filter.schedule_class || r.schedule_class === filter.schedule_class);
}

// ═══ MODULE 2 · Schedule H1 Sale Register (3-year retention) ═════════
export interface ScheduleH1RegisterEntry {
  id: string;
  drug_name: string;
  qty: number;
  prescription_ref: string;
  prescriber_reg_no: string;
  patient_name: string;
  patient_address: string;
  dispensed_at: string;
}
const H1_KEY = 'erp_quality_h1_register';
export function recordH1Sale(input: Omit<ScheduleH1RegisterEntry, 'id'>, by_bap: BAPAccountId): ScheduleH1RegisterEntry {
  const r: ScheduleH1RegisterEntry = { ...input, id: uid('h1') };
  const all = readJson<ScheduleH1RegisterEntry[]>(H1_KEY, []); all.push(r); writeJson(H1_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('quality_h1_register'),
    recordId: r.id, recordLabel: `H1 Sale · ${input.drug_name} · ${input.patient_name} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-quality-standards-engine',
  });
  return r;
}
export function listH1Sales(): ScheduleH1RegisterEntry[] { return readJson<ScheduleH1RegisterEntry[]>(H1_KEY, []); }

// ═══ MODULE 3 · FSSAI Food License ═══════════════════════════════════
export type FSSAILicenseTier = 'basic' | 'state' | 'central';
export type FSSAIStatus = 'active' | 'expired' | 'suspended' | 'revoked';
export interface FSSAILicense {
  id: string;
  license_no: string;
  tier: FSSAILicenseTier;
  fbo_name: string;
  issued_on: string;
  valid_until: string;
  status: FSSAIStatus;
}
const FSSAI_KEY = 'erp_quality_fssai_licenses';
export function registerFSSAILicense(input: Omit<FSSAILicense, 'id'>, by_bap: BAPAccountId): FSSAILicense {
  const r: FSSAILicense = { ...input, id: uid('fss') };
  const all = readJson<FSSAILicense[]>(FSSAI_KEY, []); all.push(r); writeJson(FSSAI_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('quality_fssai_license'),
    recordId: r.id, recordLabel: `FSSAI ${input.tier} · ${input.license_no} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-quality-standards-engine',
  });
  return r;
}
export function listFSSAILicenses(filter: { status?: FSSAIStatus } = {}): FSSAILicense[] {
  return readJson<FSSAILicense[]>(FSSAI_KEY, []).filter((r) => !filter.status || r.status === filter.status);
}

// ═══ MODULE 4 · BIS ISI / Hallmark ═══════════════════════════════════
export type BISKind = 'isi' | 'hallmark' | 'crs';
export interface BISCertificate {
  id: string;
  kind: BISKind;
  cm_license_no: string;
  product: string;
  is_standard: string;
  issued_on: string;
  valid_until: string;
}
const BIS_KEY = 'erp_quality_bis_certs';
export function registerBISCert(input: Omit<BISCertificate, 'id'>, by_bap: BAPAccountId): BISCertificate {
  const r: BISCertificate = { ...input, id: uid('bis') };
  const all = readJson<BISCertificate[]>(BIS_KEY, []); all.push(r); writeJson(BIS_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('quality_bis_cert'),
    recordId: r.id, recordLabel: `BIS ${input.kind} · ${input.is_standard} · ${input.product} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-quality-standards-engine',
  });
  return r;
}
export function listBISCerts(): BISCertificate[] { return readJson<BISCertificate[]>(BIS_KEY, []); }

// ═══ MODULE 5 · ISO Management System Certificates ═══════════════════
export type ISOStandard = '9001' | '14001' | '27001' | '45001';
export interface ISOCertificate {
  id: string;
  standard: ISOStandard;
  certifying_body: string;
  cert_no: string;
  scope: string;
  issued_on: string;
  valid_until: string;
  last_surveillance_audit: string | null;
}
const ISO_KEY = 'erp_quality_iso_certs';
export function registerISOCert(input: Omit<ISOCertificate, 'id'>, by_bap: BAPAccountId): ISOCertificate {
  const r: ISOCertificate = { ...input, id: uid('iso') };
  const all = readJson<ISOCertificate[]>(ISO_KEY, []); all.push(r); writeJson(ISO_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('quality_iso_cert'),
    recordId: r.id, recordLabel: `ISO ${input.standard} · ${input.cert_no} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-quality-standards-engine',
  });
  return r;
}
export function listISOCerts(filter: { standard?: ISOStandard } = {}): ISOCertificate[] {
  return readJson<ISOCertificate[]>(ISO_KEY, []).filter((r) => !filter.standard || r.standard === filter.standard);
}

// ═══ MODULE 6 · NABL Lab Accreditation Scope ═════════════════════════
export interface NABLScope {
  id: string;
  lab_name: string;
  cert_no: string;
  discipline: string;
  parameters: string[];
  valid_until: string;
}
const NABL_KEY = 'erp_quality_nabl_scopes';
export function registerNABLScope(input: Omit<NABLScope, 'id'>, by_bap: BAPAccountId): NABLScope {
  const r: NABLScope = { ...input, id: uid('nabl') };
  const all = readJson<NABLScope[]>(NABL_KEY, []); all.push(r); writeJson(NABL_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('quality_nabl_scope'),
    recordId: r.id, recordLabel: `NABL · ${input.cert_no} · ${input.discipline} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-quality-standards-engine',
  });
  return r;
}
export function listNABLScopes(): NABLScope[] { return readJson<NABLScope[]>(NABL_KEY, []); }

// ═══ MODULE 7 · Legal Metrology Packaged Commodities ═════════════════
export interface LegalMetrologyDecl {
  id: string;
  product: string;
  net_qty: string;
  mrp_paise: number;
  mfg_date: string;
  packer_name: string;
  declared_on: string;
}
const LM_KEY = 'erp_quality_legal_metrology';
export function recordLegalMetrology(input: Omit<LegalMetrologyDecl, 'id'>, by_bap: BAPAccountId): LegalMetrologyDecl {
  const r: LegalMetrologyDecl = { ...input, id: uid('lm') };
  const all = readJson<LegalMetrologyDecl[]>(LM_KEY, []); all.push(r); writeJson(LM_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('quality_legal_metrology'),
    recordId: r.id, recordLabel: `LM · ${input.product} · ${input.net_qty} · ₹${(input.mrp_paise / 100).toFixed(2)} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-quality-standards-engine',
  });
  return r;
}
export function listLegalMetrology(): LegalMetrologyDecl[] { return readJson<LegalMetrologyDecl[]>(LM_KEY, []); }

// ═══ MODULE 8 · Product Recall ═══════════════════════════════════════
export type RecallSeverity = 'class_i' | 'class_ii' | 'class_iii';
export type RecallStatus = 'initiated' | 'in_progress' | 'closed';
export interface RecallNotice {
  id: string;
  product: string;
  batch_no: string;
  severity: RecallSeverity;
  reason: string;
  initiated_on: string;
  closed_on: string | null;
  status: RecallStatus;
}
const REC_KEY = 'erp_quality_recalls';
export function initiateRecall(input: Omit<RecallNotice, 'id'>, by_bap: BAPAccountId): RecallNotice {
  const r: RecallNotice = { ...input, id: uid('rec') };
  const all = readJson<RecallNotice[]>(REC_KEY, []); all.push(r); writeJson(REC_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('quality_recall'),
    recordId: r.id, recordLabel: `Recall ${input.severity} · ${input.product} · ${input.batch_no} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-quality-standards-engine',
  });
  return r;
}
export function listRecalls(filter: { status?: RecallStatus } = {}): RecallNotice[] {
  return readJson<RecallNotice[]>(REC_KEY, []).filter((r) => !filter.status || r.status === filter.status);
}

// ═══ MODULE 9 · Quality Internal Audit ═══════════════════════════════
export interface QualityAuditEntry {
  id: string;
  standard: string;
  scope: string;
  performed_on: string;
  ncs_open: number;
  ncs_closed: number;
}
const QA_KEY = 'erp_quality_audits';
export function recordQualityAudit(input: Omit<QualityAuditEntry, 'id'>, by_bap: BAPAccountId): QualityAuditEntry {
  const r: QualityAuditEntry = { ...input, id: uid('qa') };
  const all = readJson<QualityAuditEntry[]>(QA_KEY, []); all.push(r); writeJson(QA_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('quality_audit'),
    recordId: r.id, recordLabel: `Quality Audit · ${input.standard} · ${input.scope} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-quality-standards-engine',
  });
  return r;
}
export function listQualityAudits(): QualityAuditEntry[] { return readJson<QualityAuditEntry[]>(QA_KEY, []); }

// ═══ Consolidated Quality Compliance Summary ═════════════════════════
export interface QualityComplianceSummary {
  fssai_active: number;
  fssai_expired: number;
  bis_certs: number;
  iso_certs: number;
  nabl_scopes: number;
  open_recalls: number;
  overall_status: 'compliant' | 'attention_required' | 'non_compliant';
}

export function getQualityComplianceSummary(): QualityComplianceSummary {
  const fssai = listFSSAILicenses();
  const fssai_active = fssai.filter((l) => l.status === 'active').length;
  const fssai_expired = fssai.filter((l) => l.status === 'expired' || l.status === 'suspended' || l.status === 'revoked').length;
  const openRecalls = listRecalls().filter((r) => r.status !== 'closed').length;

  let overall_status: QualityComplianceSummary['overall_status'] = 'compliant';
  if (fssai_expired > 0) overall_status = 'attention_required';
  if (openRecalls > 0) overall_status = 'non_compliant';

  return {
    fssai_active,
    fssai_expired,
    bis_certs: listBISCerts().length,
    iso_certs: listISOCerts().length,
    nabl_scopes: listNABLScopes().length,
    open_recalls: openRecalls,
    overall_status,
  };
}
