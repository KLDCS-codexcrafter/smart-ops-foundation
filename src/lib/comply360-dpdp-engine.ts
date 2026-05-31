/**
 * @file        src/lib/comply360-dpdp-engine.ts
 * @sibling     NEW @ Sprint 92 · Comply360 Floor 5.4 · Q36 DPDP Act 2023
 * @realizes    Digital Personal Data Protection Act 2023 framework:
 *              Privacy Policy generator · Data Principal rights workflow
 *              (access/correction/erasure/grievance/nominate) · Consent
 *              management (granular/withdrawable) · Significant Data
 *              Fiduciary obligations (DPO + DPIA) · 72-hour Breach
 *              Notification automation. 21st USE-SITE READ at MAXIMUM SCALE.
 * @reads-from  audit-trail-engine · comply360-audit-trail-aggregator-engine ·
 *              servicedesk-engine (grievance routing) ·
 *              peoplepay-skill-engine (DPDP employee training tracker)
 * @sprint      Sprint 92 · T-Phase-5.F.5.4 · Floor 5.4 · Q36
 * [JWT] Phase 8: POST /api/comply360/dpdp/{privacy-policy,data-principal,consent,dpo,dpia,breach}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
    'servicedesk-engine',
    'peoplepay-skill-engine',
  ],
  storage_keys: [
    'erp_dpdp_privacy_policy',
    'erp_dpdp_data_principal_requests',
    'erp_dpdp_consent_records',
    'erp_dpdp_dpo_register',
    'erp_dpdp_dpia_register',
    'erp_dpdp_breach_notifications',
    'erp_dpdp_nominations',
    'erp_dpdp_grievances',
  ],
} as const;

// 8 NEW audit entity types · DESIGN-DECISION-FLAG: ComplianceModule union does
// not include 'dpdp' (would require §H 0-DIFF mutation of health-score-engine).
// Using 'other' module bucket pending future v1.32 union extension.
registerAuditEntityType({ id: 'dpdp_privacy_policy',   module: 'other', label: 'DPDP Privacy Policy' });
registerAuditEntityType({ id: 'dpdp_dp_request',       module: 'other', label: 'DPDP Data Principal Request' });
registerAuditEntityType({ id: 'dpdp_consent',          module: 'other', label: 'DPDP Consent Record' });
registerAuditEntityType({ id: 'dpdp_dpo',              module: 'other', label: 'DPDP Data Protection Officer' });
registerAuditEntityType({ id: 'dpdp_dpia',             module: 'other', label: 'DPDP Impact Assessment' });
registerAuditEntityType({ id: 'dpdp_breach',           module: 'other', label: 'DPDP Breach Notification (72hr)' });
registerAuditEntityType({ id: 'dpdp_nomination',       module: 'other', label: 'DPDP Nomination' });
registerAuditEntityType({ id: 'dpdp_grievance',        module: 'other', label: 'DPDP Grievance' });

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

// ═══ MODULE 1 · Privacy Policy ═══════════════════════════════════════
export interface PrivacyPolicy {
  id: string;
  version: string;
  effective_date: string;
  data_categories: string[];
  purposes: string[];
  retention_period_days: number;
  cross_border_transfers: boolean;
  published: boolean;
}

const PP_KEY = 'erp_dpdp_privacy_policy';

export function publishPrivacyPolicy(input: Omit<PrivacyPolicy, 'id'>, by_bap: BAPAccountId): PrivacyPolicy {
  const r: PrivacyPolicy = { ...input, id: uid('pp') };
  const all = readJson<PrivacyPolicy[]>(PP_KEY, []); all.push(r); writeJson(PP_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('dpdp_privacy_policy'),
    recordId: r.id, recordLabel: `Privacy Policy v${input.version} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-dpdp-engine',
  });
  return r;
}
export function listPrivacyPolicies(): PrivacyPolicy[] { return readJson<PrivacyPolicy[]>(PP_KEY, []); }

// ═══ MODULE 2 · Data Principal Requests (Section 11-14) ══════════════
export type DPRequestType = 'access' | 'correction' | 'erasure' | 'grievance' | 'nominate';
export type DPRequestStatus = 'received' | 'in_progress' | 'fulfilled' | 'rejected';

export interface DataPrincipalRequest {
  id: string;
  request_type: DPRequestType;
  principal_id: string;
  principal_name: string;
  received_date: string;
  due_date: string;
  status: DPRequestStatus;
  resolution_notes: string | null;
}

const DPR_KEY = 'erp_dpdp_data_principal_requests';

export function recordDPRequest(input: Omit<DataPrincipalRequest, 'id'>, by_bap: BAPAccountId): DataPrincipalRequest {
  const r: DataPrincipalRequest = { ...input, id: uid('dpr') };
  const all = readJson<DataPrincipalRequest[]>(DPR_KEY, []); all.push(r); writeJson(DPR_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('dpdp_dp_request'),
    recordId: r.id, recordLabel: `DP ${input.request_type} · ${input.principal_name} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-dpdp-engine',
  });
  return r;
}
export function listDPRequests(filter: { status?: DPRequestStatus; type?: DPRequestType } = {}): DataPrincipalRequest[] {
  return readJson<DataPrincipalRequest[]>(DPR_KEY, []).filter((r) => {
    if (filter.status && r.status !== filter.status) return false;
    if (filter.type && r.request_type !== filter.type) return false;
    return true;
  });
}

// ═══ MODULE 3 · Consent Management (Section 6) ═══════════════════════
export type ConsentStatus = 'granted' | 'withdrawn' | 'expired';

export interface ConsentRecord {
  id: string;
  principal_id: string;
  purpose: string;
  granted_at: string;
  withdrawn_at: string | null;
  status: ConsentStatus;
  granular_scopes: string[];
}

const CONSENT_KEY = 'erp_dpdp_consent_records';

export function recordConsent(input: Omit<ConsentRecord, 'id'>, by_bap: BAPAccountId): ConsentRecord {
  const r: ConsentRecord = { ...input, id: uid('csn') };
  const all = readJson<ConsentRecord[]>(CONSENT_KEY, []); all.push(r); writeJson(CONSENT_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('dpdp_consent'),
    recordId: r.id, recordLabel: `Consent · ${input.principal_id} · ${input.purpose} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-dpdp-engine',
  });
  return r;
}
export function withdrawConsent(id: string, by_bap: BAPAccountId): ConsentRecord | null {
  const all = readJson<ConsentRecord[]>(CONSENT_KEY, []);
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], status: 'withdrawn', withdrawn_at: new Date().toISOString() };
  writeJson(CONSENT_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD('dpdp_consent'),
    recordId: id, recordLabel: `Consent withdrawn (by ${by_bap})`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-dpdp-engine',
  });
  return all[idx];
}
export function listConsents(filter: { status?: ConsentStatus } = {}): ConsentRecord[] {
  return readJson<ConsentRecord[]>(CONSENT_KEY, []).filter((r) => !filter.status || r.status === filter.status);
}

// ═══ MODULE 4 · DPO Register (Significant Data Fiduciary) ════════════
export interface DPOEntry {
  id: string;
  name: string;
  email: string;
  phone: string;
  appointed_date: string;
  active: boolean;
}

const DPO_KEY = 'erp_dpdp_dpo_register';

export function registerDPO(input: Omit<DPOEntry, 'id'>, by_bap: BAPAccountId): DPOEntry {
  const r: DPOEntry = { ...input, id: uid('dpo') };
  const all = readJson<DPOEntry[]>(DPO_KEY, []); all.push(r); writeJson(DPO_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('dpdp_dpo'),
    recordId: r.id, recordLabel: `DPO · ${input.name} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-dpdp-engine',
  });
  return r;
}
export function listDPOs(): DPOEntry[] { return readJson<DPOEntry[]>(DPO_KEY, []); }

// ═══ MODULE 5 · DPIA Register ════════════════════════════════════════
export type DPIAStatus = 'draft' | 'reviewed' | 'approved';

export interface DPIAEntry {
  id: string;
  process_name: string;
  data_categories: string[];
  risk_score: number;
  mitigation_summary: string;
  status: DPIAStatus;
  assessed_date: string;
}

const DPIA_KEY = 'erp_dpdp_dpia_register';

export function recordDPIA(input: Omit<DPIAEntry, 'id'>, by_bap: BAPAccountId): DPIAEntry {
  const r: DPIAEntry = { ...input, id: uid('dpia') };
  const all = readJson<DPIAEntry[]>(DPIA_KEY, []); all.push(r); writeJson(DPIA_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('dpdp_dpia'),
    recordId: r.id, recordLabel: `DPIA · ${input.process_name} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-dpdp-engine',
  });
  return r;
}
export function listDPIAs(filter: { status?: DPIAStatus } = {}): DPIAEntry[] {
  return readJson<DPIAEntry[]>(DPIA_KEY, []).filter((r) => !filter.status || r.status === filter.status);
}

// ═══ MODULE 6 · 72-hour Breach Notification (Section 8(6)) ═══════════
export type BreachSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BreachStatus = 'detected' | 'notified_board' | 'notified_principals' | 'closed';

export interface BreachNotification {
  id: string;
  detected_at: string;
  reported_at: string | null;
  hours_to_report: number | null;       // computed; >72 → late
  severity: BreachSeverity;
  affected_principal_count: number;
  description: string;
  status: BreachStatus;
}

const BREACH_KEY = 'erp_dpdp_breach_notifications';

export function recordBreach(input: Omit<BreachNotification, 'id' | 'hours_to_report'>, by_bap: BAPAccountId): BreachNotification {
  const hours = input.reported_at
    ? Math.round((new Date(input.reported_at).getTime() - new Date(input.detected_at).getTime()) / 3_600_000)
    : null;
  const r: BreachNotification = { ...input, id: uid('brch'), hours_to_report: hours };
  const all = readJson<BreachNotification[]>(BREACH_KEY, []); all.push(r); writeJson(BREACH_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('dpdp_breach'),
    recordId: r.id, recordLabel: `Breach · ${input.severity} · ${input.affected_principal_count} principals (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-dpdp-engine',
  });
  return r;
}
export function listBreaches(filter: { status?: BreachStatus } = {}): BreachNotification[] {
  return readJson<BreachNotification[]>(BREACH_KEY, []).filter((r) => !filter.status || r.status === filter.status);
}
export function isBreachLate(b: BreachNotification): boolean {
  return b.hours_to_report !== null && b.hours_to_report > 72;
}

// ═══ Consolidated DPDP Compliance Summary ════════════════════════════
export interface DPDPComplianceSummary {
  privacy_policy_published: boolean;
  open_dp_requests: number;
  overdue_dp_requests: number;
  active_consents: number;
  withdrawn_consents: number;
  active_dpos: number;
  approved_dpias: number;
  late_breach_notifications: number;
  overall_status: 'compliant' | 'attention_required' | 'non_compliant';
}

export function getDPDPComplianceSummary(): DPDPComplianceSummary {
  const pp = listPrivacyPolicies().some((p) => p.published);
  const dprs = listDPRequests();
  const now = Date.now();
  const overdue = dprs.filter((r) => r.status !== 'fulfilled' && r.status !== 'rejected' && new Date(r.due_date).getTime() < now).length;
  const open = dprs.filter((r) => r.status === 'received' || r.status === 'in_progress').length;
  const consents = listConsents();
  const dpos = listDPOs().filter((d) => d.active).length;
  const dpias = listDPIAs({ status: 'approved' }).length;
  const lateBreach = listBreaches().filter(isBreachLate).length;

  let overall_status: DPDPComplianceSummary['overall_status'] = 'compliant';
  if (overdue > 0 || lateBreach > 0) overall_status = 'attention_required';
  if (!pp || dpos === 0) overall_status = 'non_compliant';

  return {
    privacy_policy_published: pp,
    open_dp_requests: open,
    overdue_dp_requests: overdue,
    active_consents: consents.filter((c) => c.status === 'granted').length,
    withdrawn_consents: consents.filter((c) => c.status === 'withdrawn').length,
    active_dpos: dpos,
    approved_dpias: dpias,
    late_breach_notifications: lateBreach,
    overall_status,
  };
}
