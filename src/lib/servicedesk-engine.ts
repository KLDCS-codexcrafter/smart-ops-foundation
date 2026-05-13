/**
 * @file        src/lib/servicedesk-engine.ts
 * @purpose     ServiceDesk Path B own entity engine · 7th Path B consumer (matches maintainpro-engine 6th precedent)
 * @who         ServiceDesk module
 * @when        2026-05-14
 * @sprint      T-Phase-1.C.1a · Block B · v2 spec
 * @whom        Audit Owner
 * @decisions   D-NEW-CW REGISTER 20th canonical (7th Path B consumer) · D-NEW-DJ POSSIBLE 32nd · D-NEW-DI POSSIBLE 33rd
 * @iso        Functional Suitability + Reliability + Performance Efficiency
 * @disciplines FR-22 · FR-24 · FR-30 · FR-54
 * @reuses      AMCRecord + AMCProposal + ServiceEngineerProfile + HappyCodeFeedback + CallTypeConfigurationReplica from @/types/servicedesk
 * @[JWT]       Phase 2 wires real backend
 */

import type {
  AMCRecord,
  AMCStatus,
  AMCLifecycleStage,
  AMCProposal,
  AMCProposalStatus,
  ServiceEngineerProfile,
  ServiceEngineerRole,
  HappyCodeFeedback,
  CallTypeConfigurationReplica,
  AuditEntry,
  InstallationVerification,
} from '@/types/servicedesk';
import {
  amcRecordKey,
  amcProposalKey,
  serviceEngineerProfileKey,
  happyCodeFeedbackKey,
  ticketOTPKey,
  installationVerificationKey,
} from '@/types/servicedesk';
import { STANDARD_CALL_TYPES, callTypeConfigurationKey } from '@/types/call-type';
import type { CallTypeConfiguration } from '@/types/call-type';
import { getRiskEngineSettings } from './cc-compliance-settings';

const newId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const nowIso = (): string => new Date().toISOString();

const DEFAULT_ENTITY = 'OPRX';

const readJson = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
};

const writeJson = <T>(key: string, list: T[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* quota silent */
  }
};

const appendAudit = (
  trail: AuditEntry[],
  by: string,
  action: string,
  reason?: string,
): AuditEntry[] => [
  ...trail,
  { at: nowIso(), by, action, reason },
];

// ============================================================================
// AMC RECORD CRUD
// ============================================================================

export function listAMCRecords(filters?: {
  status?: AMCStatus;
  entity_id?: string;
  branch_id?: string;
  customer_id?: string;
}): AMCRecord[] {
  // [JWT] GET /api/servicedesk/amc-records
  const entity = filters?.entity_id ?? DEFAULT_ENTITY;
  const list = readJson<AMCRecord>(amcRecordKey(entity));
  return list.filter((r) => {
    if (filters?.status && r.status !== filters.status) return false;
    if (filters?.branch_id && r.branch_id !== filters.branch_id) return false;
    if (filters?.customer_id && r.customer_id !== filters.customer_id) return false;
    return true;
  });
}

export function getAMCRecord(id: string, entity_id: string = DEFAULT_ENTITY): AMCRecord | null {
  return readJson<AMCRecord>(amcRecordKey(entity_id)).find((r) => r.id === id) ?? null;
}

export function createAMCRecord(
  input: Omit<AMCRecord, 'id' | 'created_at' | 'updated_at' | 'audit_trail'>,
): AMCRecord {
  const now = nowIso();
  const record: AMCRecord = {
    ...input,
    id: newId('amc'),
    created_at: now,
    updated_at: now,
    audit_trail: [{ at: now, by: input.created_by, action: 'created' }],
  };
  const list = readJson<AMCRecord>(amcRecordKey(record.entity_id));
  // [JWT] POST /api/servicedesk/amc-records
  writeJson(amcRecordKey(record.entity_id), [...list, record]);
  return record;
}

export function updateAMCRecord(
  id: string,
  updates: Partial<AMCRecord>,
  updated_by: string,
  entity_id: string = DEFAULT_ENTITY,
): AMCRecord {
  const list = readJson<AMCRecord>(amcRecordKey(entity_id));
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error(`AMC record ${id} not found`);
  const next: AMCRecord = {
    ...list[idx],
    ...updates,
    id,
    updated_at: nowIso(),
    audit_trail: appendAudit(list[idx].audit_trail, updated_by, 'updated'),
  };
  list[idx] = next;
  // [JWT] PUT /api/servicedesk/amc-records/:id
  writeJson(amcRecordKey(entity_id), list);
  return next;
}

export function deleteAMCRecord(
  id: string,
  deleted_by: string,
  entity_id: string = DEFAULT_ENTITY,
): boolean {
  const list = readJson<AMCRecord>(amcRecordKey(entity_id));
  const target = list.find((r) => r.id === id);
  if (!target) return false;
  // Audit-log the deletion BEFORE removing · immutable deletion log (FR-39 §B)
  const finalAudit = appendAudit(target.audit_trail, deleted_by, 'deleted');
  const delLogKey = `servicedesk_v1_amc_deleted_${entity_id}`;
  const delLog = readJson<AMCRecord>(delLogKey);
  writeJson(delLogKey, [...delLog, { ...target, audit_trail: finalAudit }]);
  const next = list.filter((r) => r.id !== id);
  // [JWT] DELETE /api/servicedesk/amc-records/:id
  writeJson(amcRecordKey(entity_id), next);
  return true;
}

// ============================================================================
// AMC APPLICABILITY DECISION (Q1-Q4 founder lock · MANUAL ONLY)
// ============================================================================

export function decideAMCApplicability(
  amc_record_id: string,
  applicable: boolean,
  decided_by: string,
  reason?: string,
  entity_id: string = DEFAULT_ENTITY,
): AMCRecord {
  const list = readJson<AMCRecord>(amcRecordKey(entity_id));
  const idx = list.findIndex((r) => r.id === amc_record_id);
  if (idx === -1) throw new Error(`AMC record ${amc_record_id} not found`);
  const now = nowIso();
  const next: AMCRecord = {
    ...list[idx],
    amc_applicable: applicable,
    applicability_decided_at: now,
    applicability_decided_by: decided_by,
    applicability_reason: reason ?? '',
    status: applicable ? 'proposal_draft' : 'not_applicable',
    lifecycle_stage: applicable ? 'proposal' : 'lapsed',
    updated_at: now,
    audit_trail: appendAudit(list[idx].audit_trail, decided_by, 'applicability_decided', reason),
  };
  list[idx] = next;
  writeJson(amcRecordKey(entity_id), list);
  return next;
}

// ============================================================================
// AMC PROPOSAL CRUD + STATE MACHINE
// ============================================================================

export function createAMCProposal(
  input: Omit<AMCProposal, 'id' | 'created_at' | 'updated_at' | 'audit_trail'>,
): AMCProposal {
  const now = nowIso();
  const proposal: AMCProposal = {
    ...input,
    id: newId('amcprop'),
    created_at: now,
    updated_at: now,
    audit_trail: [{ at: now, by: input.created_by, action: 'created' }],
  };
  const list = readJson<AMCProposal>(amcProposalKey(input.entity_id));
  // [JWT] POST /api/servicedesk/amc-proposals
  writeJson(amcProposalKey(input.entity_id), [...list, proposal]);
  return proposal;
}

export function transitionProposalStatus(
  proposal_id: string,
  new_status: AMCProposalStatus,
  transitioned_by: string,
  reason?: string,
  entity_id: string = DEFAULT_ENTITY,
): AMCProposal {
  const list = readJson<AMCProposal>(amcProposalKey(entity_id));
  const idx = list.findIndex((p) => p.id === proposal_id);
  if (idx === -1) throw new Error(`Proposal ${proposal_id} not found`);
  const now = nowIso();
  const prev = list[idx];
  const updates: Partial<AMCProposal> = { status: new_status, updated_at: now };
  if (new_status === 'sent') updates.sent_at = now;
  if (new_status === 'accepted') updates.accepted_at = now;
  if (new_status === 'rejected') {
    updates.rejected_at = now;
    updates.rejection_reason = reason ?? '';
  }
  const next: AMCProposal = {
    ...prev,
    ...updates,
    audit_trail: appendAudit(prev.audit_trail, transitioned_by, `transition_to_${new_status}`, reason),
  };
  list[idx] = next;
  // [JWT] PUT /api/servicedesk/amc-proposals/:id/transition
  writeJson(amcProposalKey(entity_id), list);
  return next;
}

export function listAMCProposals(entity_id: string = DEFAULT_ENTITY): AMCProposal[] {
  return readJson<AMCProposal>(amcProposalKey(entity_id));
}

// ============================================================================
// SERVICE ENGINEER PROFILE CRUD (Sarathi REUSE)
// ============================================================================

export function createServiceEngineerProfile(
  input: Omit<ServiceEngineerProfile, 'id' | 'created_at' | 'updated_at'>,
): ServiceEngineerProfile {
  const now = nowIso();
  const profile: ServiceEngineerProfile = {
    ...input,
    id: newId('eng'),
    created_at: now,
    updated_at: now,
  };
  const list = readJson<ServiceEngineerProfile>(serviceEngineerProfileKey(input.entity_id));
  // [JWT] POST /api/servicedesk/engineers
  writeJson(serviceEngineerProfileKey(input.entity_id), [...list, profile]);
  return profile;
}

export function getServiceEngineerProfile(
  id: string,
  entity_id: string = DEFAULT_ENTITY,
): ServiceEngineerProfile | null {
  return (
    readJson<ServiceEngineerProfile>(serviceEngineerProfileKey(entity_id)).find(
      (p) => p.id === id,
    ) ?? null
  );
}

export function listServiceEngineers(filters?: {
  oem_authorization?: string;
  service_role?: ServiceEngineerRole;
  entity_id?: string;
}): ServiceEngineerProfile[] {
  const entity = filters?.entity_id ?? DEFAULT_ENTITY;
  return readJson<ServiceEngineerProfile>(serviceEngineerProfileKey(entity)).filter((p) => {
    if (filters?.service_role && p.service_role !== filters.service_role) return false;
    if (filters?.oem_authorization && !p.oem_authorizations.includes(filters.oem_authorization))
      return false;
    return true;
  });
}

export function updateServiceEngineerLocation(
  id: string,
  lat: number,
  lng: number,
  entity_id: string = DEFAULT_ENTITY,
): ServiceEngineerProfile {
  const list = readJson<ServiceEngineerProfile>(serviceEngineerProfileKey(entity_id));
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Engineer ${id} not found`);
  const now = nowIso();
  list[idx] = {
    ...list[idx],
    current_lat: lat,
    current_lng: lng,
    current_location_updated_at: now,
    updated_at: now,
  };
  // [JWT] PUT /api/servicedesk/engineers/:id/location
  writeJson(serviceEngineerProfileKey(entity_id), list);
  return list[idx];
}

// ============================================================================
// CALL TYPE CONFIGURATION REPLICA helpers (FR-13 · reads CC master)
// ============================================================================

function readCallTypes(entity: string): CallTypeConfiguration[] {
  try {
    const raw = localStorage.getItem(callTypeConfigurationKey(entity));
    if (raw) return JSON.parse(raw) as CallTypeConfiguration[];
    // First-run seed · WRITE BACK so subsequent edits persist alongside seed (AC-T2-7)
    localStorage.setItem(callTypeConfigurationKey(entity), JSON.stringify(STANDARD_CALL_TYPES));
    return STANDARD_CALL_TYPES;
  } catch {
    return STANDARD_CALL_TYPES;
  }
}

export function getCallTypeConfiguration(
  call_type_code: string,
  entity_id: string = DEFAULT_ENTITY,
): CallTypeConfigurationReplica | null {
  const ct = readCallTypes(entity_id).find((c) => c.call_type_code === call_type_code);
  if (!ct) return null;
  return {
    id: ct.id,
    call_type_code: ct.call_type_code,
    display_name: ct.display_name,
    default_sla_severity: ct.default_sla_severity,
    default_assignment_rule: ct.default_assignment_rule,
    escalation_matrix: ct.escalation_matrix,
    language_pref: ct.language_pref,
    is_active: ct.is_active,
  };
}

export function listActiveCallTypes(
  entity_id: string = DEFAULT_ENTITY,
): CallTypeConfigurationReplica[] {
  return readCallTypes(entity_id)
    .filter((c) => c.is_active)
    .map((ct) => ({
      id: ct.id,
      call_type_code: ct.call_type_code,
      display_name: ct.display_name,
      default_sla_severity: ct.default_sla_severity,
      default_assignment_rule: ct.default_assignment_rule,
      escalation_matrix: ct.escalation_matrix,
      language_pref: ct.language_pref,
      is_active: ct.is_active,
    }));
}

// ============================================================================
// RISK ENGINE (5-factor · Smart Power riskCalculation.ts mirror · weights from CC settings)
// ============================================================================

export function computeAMCRiskScore(
  amc_record_id: string,
  entity_id: string = DEFAULT_ENTITY,
): {
  risk_score: number;
  risk_bucket: 'low' | 'medium' | 'high';
  renewal_probability: number;
  factor_breakdown: Record<string, number>;
} {
  const record = getAMCRecord(amc_record_id, entity_id);
  if (!record) {
    return {
      risk_score: 0,
      risk_bucket: 'low',
      renewal_probability: 0,
      factor_breakdown: {},
    };
  }
  const settings = getRiskEngineSettings(entity_id);
  const w = settings.risk_factor_weights;

  // Factor 1 · payment_history (outstanding / contract_value)
  const paymentScore = record.contract_value_paise > 0
    ? Math.min(100, (record.outstanding_paise / record.contract_value_paise) * 100)
    : 0;
  // Factor 2 · expiry_proximity (days to expiry · sooner = higher risk)
  const expiryScore = record.contract_end
    ? Math.max(0, Math.min(100, 100 - Math.max(0, daysUntil(record.contract_end))))
    : 50;
  // Factor 3 · contract_value (higher value = higher renewal incentive · inverse risk)
  const valueScore = record.contract_value_paise > 50_00_000_00 ? 30 : 60;
  // Factor 4 · service_status (active = lower risk)
  const serviceScore = record.status === 'active' ? 20 : 70;
  // Factor 5 · customer_activity (placeholder · would consume customer 360 in Phase 2)
  const activityScore = 50;  // [JWT] Phase 2 wires customer 360° score from InsightX

  const total =
    (paymentScore * w.payment_history +
      expiryScore * w.expiry_proximity +
      valueScore * w.contract_value +
      serviceScore * w.service_status +
      activityScore * w.customer_activity) /
    (w.payment_history + w.expiry_proximity + w.contract_value + w.service_status + w.customer_activity);

  const risk_score = Math.round(total);
  const risk_bucket: 'low' | 'medium' | 'high' =
    risk_score >= settings.risk_threshold_high
      ? 'high'
      : risk_score >= settings.risk_threshold_medium
        ? 'medium'
        : 'low';
  const renewal_probability = Math.max(0, Math.min(100, 100 - risk_score));

  return {
    risk_score,
    risk_bucket,
    renewal_probability,
    factor_breakdown: {
      payment_history: Math.round(paymentScore),
      expiry_proximity: Math.round(expiryScore),
      contract_value: valueScore,
      service_status: serviceScore,
      customer_activity: activityScore,
    },
  };
}

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// ============================================================================
// CROSS-CARD CONSUMER QUERIES
// ============================================================================

export function getAMCsByCustomer(
  customer_id: string,
  entity_id: string = DEFAULT_ENTITY,
): AMCRecord[] {
  return listAMCRecords({ entity_id, customer_id });
}

export function getAMCsByInvoice(
  sales_invoice_id: string,
  entity_id: string = DEFAULT_ENTITY,
): AMCRecord[] {
  return readJson<AMCRecord>(amcRecordKey(entity_id)).filter(
    (r) => r.sales_invoice_id === sales_invoice_id,
  );
}

export function getAMCsExpiringInDays(
  days: number,
  entity_id: string = DEFAULT_ENTITY,
): AMCRecord[] {
  return readJson<AMCRecord>(amcRecordKey(entity_id)).filter((r) => {
    if (!r.contract_end) return false;
    const d = daysUntil(r.contract_end);
    return d >= 0 && d <= days;
  });
}

// ============================================================================
// HAPPYCODE OTP GATE (Channel 1 · MANDATORY ticket-close gate)
// ============================================================================

interface TicketOTPEntry {
  ticket_id: string;
  otp: string;
  expires_at: string;
  verified: boolean;
}

const OTP_EXPIRY_MINUTES = 15;  // v5 §3 / v4 §3.1 spec lock

export function generateOTPForTicketClose(
  ticket_id: string,
  entity_id: string = DEFAULT_ENTITY,
): { otp: string; expires_at: string } {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expires_at = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
  const list = readJson<TicketOTPEntry>(ticketOTPKey(entity_id));
  const next = list.filter((e) => e.ticket_id !== ticket_id);
  next.push({ ticket_id, otp, expires_at, verified: false });
  // [JWT] POST /api/servicedesk/tickets/:id/otp
  writeJson(ticketOTPKey(entity_id), next);
  return { otp, expires_at };
}

export function verifyOTPForTicketClose(
  ticket_id: string,
  otp_input: string,
  entity_id: string = DEFAULT_ENTITY,
): boolean {
  const list = readJson<TicketOTPEntry>(ticketOTPKey(entity_id));
  const idx = list.findIndex((e) => e.ticket_id === ticket_id);
  if (idx === -1) return false;
  const entry = list[idx];
  if (entry.otp !== otp_input) return false;
  if (new Date(entry.expires_at).getTime() < Date.now()) return false;
  list[idx] = { ...entry, verified: true };
  // [JWT] POST /api/servicedesk/tickets/:id/otp/verify
  writeJson(ticketOTPKey(entity_id), list);
  return true;
}

export function captureHappyCodeFeedback(
  input: Omit<HappyCodeFeedback, 'id' | 'created_at' | 'updated_at'>,
): HappyCodeFeedback {
  const now = nowIso();
  const feedback: HappyCodeFeedback = {
    ...input,
    id: newId('happy'),
    created_at: now,
    updated_at: now,
  };
  const list = readJson<HappyCodeFeedback>(happyCodeFeedbackKey(input.entity_id));
  // [JWT] POST /api/servicedesk/happy-code
  writeJson(happyCodeFeedbackKey(input.entity_id), [...list, feedback]);
  return feedback;
}

// ============================================================================
// C.1b · Block A · Lifecycle helpers + cascade + InstallationVerification CRUD
// ============================================================================

// A.1 · Lifecycle stage filter
export function getAMCsByLifecycleStage(
  stage: AMCLifecycleStage,
  entity_id: string = DEFAULT_ENTITY,
): AMCRecord[] {
  return readJson<AMCRecord>(amcRecordKey(entity_id)).filter((r) => r.lifecycle_stage === stage);
}

// A.2 · Applicability decision pending
export function getAMCsAwaitingApplicabilityDecision(
  entity_id: string = DEFAULT_ENTITY,
): AMCRecord[] {
  return readJson<AMCRecord>(amcRecordKey(entity_id)).filter((r) => r.amc_applicable === null);
}

// A.3 · Renewal cascade fire
export interface CascadeFireRecord {
  id: string;
  amc_record_id: string;
  stage: 'first' | 'second' | 'third' | 'final';
  fired_at: string;
  fired_by: string;
  template_id: string | null;
  email_sent: boolean;
  notes: string;
}

const cascadeFireKey = (e: string): string => `servicedesk_v1_cascade_fire_${e}`;

export function fireRenewalCascadeStage(
  amc_record_id: string,
  stage: CascadeFireRecord['stage'],
  fired_by: string,
  template_id: string | null = null,
  entity_id: string = DEFAULT_ENTITY,
): CascadeFireRecord {
  const fire: CascadeFireRecord = {
    id: newId('cascade'),
    amc_record_id,
    stage,
    fired_at: nowIso(),
    fired_by,
    template_id,
    email_sent: false,
    notes: `Renewal cascade ${stage} stage fired`,
  };
  const list = readJson<CascadeFireRecord>(cascadeFireKey(entity_id));
  // [JWT] POST /api/servicedesk/cascade/fire
  writeJson(cascadeFireKey(entity_id), [...list, fire]);
  return fire;
}

export function listCascadeFiresForAMC(
  amc_record_id: string,
  entity_id: string = DEFAULT_ENTITY,
): CascadeFireRecord[] {
  return readJson<CascadeFireRecord>(cascadeFireKey(entity_id)).filter(
    (f) => f.amc_record_id === amc_record_id,
  );
}

import { getRenewalCascadeSettings } from './cc-compliance-settings';

export function getCascadeStageForAMC(
  amc_record_id: string,
  entity_id: string = DEFAULT_ENTITY,
): 'first' | 'second' | 'third' | 'final' | null {
  const amc = getAMCRecord(amc_record_id, entity_id);
  if (!amc?.contract_end) return null;
  const days = Math.ceil((new Date(amc.contract_end).getTime() - Date.now()) / (86400 * 1000));
  const settings = getRenewalCascadeSettings(entity_id);
  if (days <= settings.final_reminder_days) return 'final';
  if (days <= settings.third_reminder_days) return 'third';
  if (days <= settings.second_reminder_days) return 'second';
  if (days <= settings.first_reminder_days) return 'first';
  return null;
}

// A.4 · InstallationVerification CRUD
export function createInstallationVerification(
  input: Omit<InstallationVerification, 'id' | 'created_at' | 'updated_at' | 'audit_trail'>,
): InstallationVerification {
  const now = nowIso();
  const iv: InstallationVerification = {
    ...input,
    id: newId('iv'),
    created_at: now,
    updated_at: now,
    audit_trail: [{ at: now, by: input.created_by, action: 'created' }],
  };
  const list = readJson<InstallationVerification>(installationVerificationKey(input.entity_id));
  // [JWT] POST /api/servicedesk/installation-verifications
  writeJson(installationVerificationKey(input.entity_id), [...list, iv]);
  return iv;
}

export function getInstallationVerification(
  id: string,
  entity_id: string = DEFAULT_ENTITY,
): InstallationVerification | null {
  return (
    readJson<InstallationVerification>(installationVerificationKey(entity_id)).find(
      (v) => v.id === id,
    ) ?? null
  );
}

export function listInstallationVerifications(filters?: {
  entity_id?: string;
  amc_record_id?: string;
  status?: InstallationVerification['status'];
}): InstallationVerification[] {
  const entity = filters?.entity_id ?? DEFAULT_ENTITY;
  return readJson<InstallationVerification>(installationVerificationKey(entity)).filter((v) => {
    if (filters?.amc_record_id && v.amc_record_id !== filters.amc_record_id) return false;
    if (filters?.status && v.status !== filters.status) return false;
    return true;
  });
}

export function markVerificationComplete(
  id: string,
  verified_by: string,
  entity_id: string = DEFAULT_ENTITY,
): InstallationVerification {
  const list = readJson<InstallationVerification>(installationVerificationKey(entity_id));
  const idx = list.findIndex((v) => v.id === id);
  if (idx === -1) throw new Error(`InstallationVerification ${id} not found`);
  const iv = list[idx];
  // 7-point checklist gate
  const allChecked =
    iv.functional_check_passed &&
    iv.spare_inventory_verified &&
    iv.service_tier_config_verified &&
    iv.customer_briefing_done &&
    iv.emergency_contact_shared &&
    iv.documentation_handed_over &&
    iv.customer_acknowledgement;
  if (!allChecked) {
    throw new Error('Cannot mark verified · all 7 checklist items required');
  }
  const now = nowIso();
  list[idx] = {
    ...iv,
    status: 'verified',
    verified_by,
    verified_at: now,
    updated_at: now,
    audit_trail: appendAudit(iv.audit_trail, verified_by, 'marked_verified'),
  };
  // [JWT] PUT /api/servicedesk/installation-verifications/:id/verify
  writeJson(installationVerificationKey(entity_id), list);
  return list[idx];
}

export function isAMCKickoffBlocked(
  amc_record_id: string,
  entity_id: string = DEFAULT_ENTITY,
): boolean {
  const verifications = listInstallationVerifications({ entity_id, amc_record_id });
  return !verifications.some((v) => v.status === 'verified');
}

// A.5 · Risk re-compute on settings update
export function recomputeAllAMCRiskScores(
  entity_id: string = DEFAULT_ENTITY,
  triggered_by: string = 'system',
): { recomputed: number; ids: string[] } {
  const list = readJson<AMCRecord>(amcRecordKey(entity_id));
  const updated: AMCRecord[] = list.map((r) => {
    const score = computeAMCRiskScore(r.id, entity_id);
    return {
      ...r,
      risk_score: score.risk_score,
      risk_bucket: score.risk_bucket,
      renewal_probability: score.renewal_probability,
      updated_at: nowIso(),
      audit_trail: appendAudit(r.audit_trail, triggered_by, 'risk_recomputed_from_settings'),
    };
  });
  // [JWT] POST /api/servicedesk/amc-records/recompute-all-risk
  writeJson(amcRecordKey(entity_id), updated);
  return { recomputed: updated.length, ids: updated.map((r) => r.id) };
}
