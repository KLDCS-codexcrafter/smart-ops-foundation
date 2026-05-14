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

type HappyCodeFeedbackInput = Omit<
  HappyCodeFeedback,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'audit_trail'
  | 'channel_2_email_sent_at'
  | 'channel_2_jwt_token'
  | 'channel_2_jwt_expires_at'
  | 'channel_2_clicked_at'
  | 'channel_2_responded_at'
  | 'channel_2_nps_score'
  | 'channel_2_comment'
  | 'channel_3_captured_at'
  | 'channel_3_captured_by_engineer_id'
  | 'channel_3_nps_score'
  | 'channel_3_happiness_score'
  | 'channel_3_comment'
>;

export function captureHappyCodeFeedback(input: HappyCodeFeedbackInput): HappyCodeFeedback {
  const now = nowIso();
  const feedback: HappyCodeFeedback = {
    ...input,
    id: newId('happy'),
    channel_2_email_sent_at: null,
    channel_2_jwt_token: null,
    channel_2_jwt_expires_at: null,
    channel_2_clicked_at: null,
    channel_2_responded_at: null,
    channel_2_nps_score: null,
    channel_2_comment: '',
    channel_3_captured_at: null,
    channel_3_captured_by_engineer_id: null,
    channel_3_nps_score: null,
    channel_3_happiness_score: null,
    channel_3_comment: '',
    created_at: now,
    updated_at: now,
    audit_trail: [{ at: now, by: input.verbal_captured_by ?? 'system', action: 'happy_code_created' }],
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

// ============================================================================
// C.1c · BLOCK B · Service Ticket + Repair Route + Standby Loan + Customer Vouchers + Spares Issue
// All additive · existing exports ABSOLUTE preserved
// ============================================================================
import type {
  ServiceTicket,
  ServiceTicketStatus,
  ServiceTicketSeverity,
  ServiceTicketChannel,
} from '@/types/service-ticket';
import { serviceTicketKey } from '@/types/service-ticket';
import type { RepairRoute, RepairRouteType, RepairRouteStatus } from '@/types/repair-route';
import { repairRouteKey } from '@/types/repair-route';
import type { StandbyLoan } from '@/types/standby-loan';
import { standbyLoanKey } from '@/types/standby-loan';
import type { CustomerInVoucher, CustomerOutVoucher } from '@/types/customer-voucher';
import { customerInVoucherKey, customerOutVoucherKey } from '@/types/customer-voucher';
import type { SparesIssueRecord } from '@/types/spares-issue';
import { sparesIssueKey } from '@/types/spares-issue';

// ----------------------------------------------------------------------------
// B.1 · ServiceTicket CRUD + 8-state machine
// ----------------------------------------------------------------------------
function nextTicketNo(entity_id: string): string {
  const list = readJson<ServiceTicket>(serviceTicketKey(entity_id));
  const n = list.length + 1;
  return `ST/${entity_id}/${String(n).padStart(6, '0')}`;
}

export function raiseServiceTicket(
  input: Omit<
    ServiceTicket,
    | 'id'
    | 'ticket_no'
    | 'created_at'
    | 'updated_at'
    | 'audit_trail'
    | 'status'
    | 'raised_at'
    | 'acked_at'
    | 'started_at'
    | 'on_hold_since'
    | 'resolved_at'
    | 'closed_at'
    | 'reopened_count'
    | 'reopened_at'
  >,
): ServiceTicket {
  const now = nowIso();
  const ticket: ServiceTicket = {
    ...input,
    id: newId('st'),
    ticket_no: nextTicketNo(input.entity_id),
    status: 'raised',
    raised_at: now,
    acked_at: null,
    started_at: null,
    on_hold_since: null,
    resolved_at: null,
    closed_at: null,
    reopened_count: 0,
    reopened_at: null,
    created_at: now,
    updated_at: now,
    audit_trail: [{ at: now, by: input.created_by, action: 'raised' }],
  };
  const list = readJson<ServiceTicket>(serviceTicketKey(input.entity_id));
  // [JWT] POST /api/servicedesk/service-tickets
  writeJson(serviceTicketKey(input.entity_id), [...list, ticket]);
  return ticket;
}

export function getServiceTicket(id: string, entity_id: string = DEFAULT_ENTITY): ServiceTicket | null {
  return readJson<ServiceTicket>(serviceTicketKey(entity_id)).find((t) => t.id === id) ?? null;
}

export function listServiceTickets(filters?: {
  entity_id?: string;
  status?: ServiceTicketStatus;
  severity?: ServiceTicketSeverity;
  channel?: ServiceTicketChannel;
  assigned_engineer_id?: string;
  customer_id?: string;
}): ServiceTicket[] {
  const entity = filters?.entity_id ?? DEFAULT_ENTITY;
  return readJson<ServiceTicket>(serviceTicketKey(entity)).filter((t) => {
    if (filters?.status && t.status !== filters.status) return false;
    if (filters?.severity && t.severity !== filters.severity) return false;
    if (filters?.channel && t.channel !== filters.channel) return false;
    if (filters?.assigned_engineer_id && t.assigned_engineer_id !== filters.assigned_engineer_id) return false;
    if (filters?.customer_id && t.customer_id !== filters.customer_id) return false;
    return true;
  });
}

function transitionTicketState(
  ticket_id: string,
  to_status: ServiceTicketStatus,
  actor: string,
  patch: Partial<ServiceTicket>,
  reason: string | undefined,
  entity_id: string = DEFAULT_ENTITY,
): ServiceTicket {
  const list = readJson<ServiceTicket>(serviceTicketKey(entity_id));
  const idx = list.findIndex((t) => t.id === ticket_id);
  if (idx === -1) throw new Error(`ServiceTicket ${ticket_id} not found`);
  const now = nowIso();
  const next: ServiceTicket = {
    ...list[idx],
    ...patch,
    status: to_status,
    updated_at: now,
    audit_trail: appendAudit(list[idx].audit_trail, actor, `transition_to_${to_status}`, reason),
  };
  list[idx] = next;
  writeJson(serviceTicketKey(entity_id), list);
  return next;
}

export function acknowledgeTicket(id: string, actor: string, entity_id: string = DEFAULT_ENTITY): ServiceTicket {
  return transitionTicketState(id, 'acknowledged', actor, { acked_at: nowIso() }, undefined, entity_id);
}

export function assignTicketToEngineer(
  id: string,
  engineer_id: string,
  actor: string,
  entity_id: string = DEFAULT_ENTITY,
): ServiceTicket {
  return transitionTicketState(id, 'assigned', actor, { assigned_engineer_id: engineer_id }, undefined, entity_id);
}

export function startTicketWork(id: string, actor: string, entity_id: string = DEFAULT_ENTITY): ServiceTicket {
  return transitionTicketState(id, 'in_progress', actor, { started_at: nowIso() }, undefined, entity_id);
}

export function putTicketOnHold(id: string, actor: string, reason: string, entity_id: string = DEFAULT_ENTITY): ServiceTicket {
  return transitionTicketState(id, 'on_hold', actor, { on_hold_since: nowIso() }, reason, entity_id);
}

export function markTicketResolved(id: string, actor: string, entity_id: string = DEFAULT_ENTITY): ServiceTicket {
  return transitionTicketState(id, 'resolved', actor, { resolved_at: nowIso() }, undefined, entity_id);
}

/** Close ticket · ENFORCES HappyCode Ch1 OTP gate (Q-LOCK-7) */
export function closeTicket(
  id: string,
  actor: string,
  otp_verified: boolean,
  entity_id: string = DEFAULT_ENTITY,
): ServiceTicket {
  if (!otp_verified) {
    throw new Error('HappyCode Ch1 OTP verification required before close · per v5 §3 / v4 §3.1 spec lock');
  }
  return transitionTicketState(
    id,
    'closed',
    actor,
    { closed_at: nowIso(), happy_code_otp_verified: true },
    undefined,
    entity_id,
  );
}

export function reopenTicket(id: string, actor: string, reason: string, entity_id: string = DEFAULT_ENTITY): ServiceTicket {
  const list = readJson<ServiceTicket>(serviceTicketKey(entity_id));
  const idx = list.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error(`ServiceTicket ${id} not found`);
  const now = nowIso();
  const prev = list[idx];
  const next: ServiceTicket = {
    ...prev,
    status: 'reopened',
    reopened_count: prev.reopened_count + 1,
    reopened_at: now,
    resolved_at: null,
    closed_at: null,
    updated_at: now,
    audit_trail: appendAudit(prev.audit_trail, actor, 'reopened', reason),
  };
  list[idx] = next;
  writeJson(serviceTicketKey(entity_id), list);
  return next;
}

// ----------------------------------------------------------------------------
// B.2 · RepairRoute CRUD
// ----------------------------------------------------------------------------
export function createRepairRoute(
  input: Omit<
    RepairRoute,
    'id' | 'created_at' | 'updated_at' | 'audit_trail' | 'status' | 'repair_in_at' | 'turnaround_days'
  >,
): RepairRoute {
  const now = nowIso();
  const route: RepairRoute = {
    ...input,
    id: newId('rr'),
    status: 'routed',
    repair_in_at: null,
    turnaround_days: null,
    created_at: now,
    updated_at: now,
    audit_trail: [{ at: now, by: input.created_by, action: `routed_to_${input.route_type}` }],
  };
  const list = readJson<RepairRoute>(repairRouteKey(input.entity_id));
  // [JWT] POST /api/servicedesk/repair-routes
  writeJson(repairRouteKey(input.entity_id), [...list, route]);
  return route;
}

export function markRouteInRepair(id: string, actor: string, entity_id: string = DEFAULT_ENTITY): RepairRoute {
  const list = readJson<RepairRoute>(repairRouteKey(entity_id));
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error(`RepairRoute ${id} not found`);
  const now = nowIso();
  list[idx] = {
    ...list[idx],
    status: 'in_repair',
    updated_at: now,
    audit_trail: appendAudit(list[idx].audit_trail, actor, 'in_repair'),
  };
  writeJson(repairRouteKey(entity_id), list);
  return list[idx];
}

export function markReturnedFromRepair(
  id: string,
  actor: string,
  final_cost_paise: number,
  entity_id: string = DEFAULT_ENTITY,
): RepairRoute {
  const list = readJson<RepairRoute>(repairRouteKey(entity_id));
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error(`RepairRoute ${id} not found`);
  const now = nowIso();
  const outAt = new Date(list[idx].repair_out_at).getTime();
  const inAt = Date.now();
  const turnaround_days = Math.max(0, Math.ceil((inAt - outAt) / (86400 * 1000)));
  list[idx] = {
    ...list[idx],
    status: 'returned',
    repair_in_at: now,
    turnaround_days,
    cost_paise: final_cost_paise,
    updated_at: now,
    audit_trail: appendAudit(list[idx].audit_trail, actor, 'returned_from_repair'),
  };
  writeJson(repairRouteKey(entity_id), list);
  return list[idx];
}

export function markRouteRejected(
  id: string,
  actor: string,
  reason: string,
  entity_id: string = DEFAULT_ENTITY,
): RepairRoute {
  const list = readJson<RepairRoute>(repairRouteKey(entity_id));
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error(`RepairRoute ${id} not found`);
  const now = nowIso();
  list[idx] = {
    ...list[idx],
    status: 'rejected',
    rejection_reason: reason,
    updated_at: now,
    audit_trail: appendAudit(list[idx].audit_trail, actor, 'rejected', reason),
  };
  writeJson(repairRouteKey(entity_id), list);
  return list[idx];
}

export function listRoutesForTicket(
  ticket_id: string,
  entity_id: string = DEFAULT_ENTITY,
): RepairRoute[] {
  return readJson<RepairRoute>(repairRouteKey(entity_id)).filter((r) => r.ticket_id === ticket_id);
}

export function listRepairRoutes(filters?: {
  entity_id?: string;
  route_type?: RepairRouteType;
  status?: RepairRouteStatus;
}): RepairRoute[] {
  const entity = filters?.entity_id ?? DEFAULT_ENTITY;
  return readJson<RepairRoute>(repairRouteKey(entity)).filter((r) => {
    if (filters?.route_type && r.route_type !== filters.route_type) return false;
    if (filters?.status && r.status !== filters.status) return false;
    return true;
  });
}

// ----------------------------------------------------------------------------
// B.3 · StandbyLoan CRUD + overdue
// ----------------------------------------------------------------------------
export function createStandbyLoan(
  input: Omit<
    StandbyLoan,
    | 'id'
    | 'created_at'
    | 'updated_at'
    | 'audit_trail'
    | 'status'
    | 'returned_at'
    | 'total_cost_paise'
    | 'damage_on_return'
    | 'damage_charge_paise'
  >,
): StandbyLoan {
  const now = nowIso();
  const loan: StandbyLoan = {
    ...input,
    id: newId('sb'),
    status: 'out',
    returned_at: null,
    total_cost_paise: 0,
    damage_on_return: false,
    damage_charge_paise: 0,
    created_at: now,
    updated_at: now,
    audit_trail: [{ at: now, by: input.created_by, action: 'loaned_out' }],
  };
  const list = readJson<StandbyLoan>(standbyLoanKey(input.entity_id));
  writeJson(standbyLoanKey(input.entity_id), [...list, loan]);
  return loan;
}

export function returnStandbyLoan(
  id: string,
  actor: string,
  damage: boolean,
  damage_charge_paise: number,
  entity_id: string = DEFAULT_ENTITY,
): StandbyLoan {
  const list = readJson<StandbyLoan>(standbyLoanKey(entity_id));
  const idx = list.findIndex((l) => l.id === id);
  if (idx === -1) throw new Error(`StandbyLoan ${id} not found`);
  const now = nowIso();
  const loan = list[idx];
  const outAt = new Date(loan.loaned_out_at).getTime();
  const days = Math.max(1, Math.ceil((Date.now() - outAt) / (86400 * 1000)));
  const total_cost_paise = days * loan.daily_cost_paise + (damage ? damage_charge_paise : 0);
  list[idx] = {
    ...loan,
    status: 'returned',
    returned_at: now,
    total_cost_paise,
    damage_on_return: damage,
    damage_charge_paise: damage ? damage_charge_paise : 0,
    updated_at: now,
    audit_trail: appendAudit(loan.audit_trail, actor, 'returned'),
  };
  writeJson(standbyLoanKey(entity_id), list);
  return list[idx];
}

export function listOverdueStandbyLoans(entity_id: string = DEFAULT_ENTITY): StandbyLoan[] {
  const now = Date.now();
  return readJson<StandbyLoan>(standbyLoanKey(entity_id)).filter(
    (l) => l.status === 'out' && new Date(l.expected_return_date).getTime() < now,
  );
}

export function listStandbyLoansForTicket(ticket_id: string, entity_id: string = DEFAULT_ENTITY): StandbyLoan[] {
  return readJson<StandbyLoan>(standbyLoanKey(entity_id)).filter((l) => l.ticket_id === ticket_id);
}

export function listStandbyLoans(entity_id: string = DEFAULT_ENTITY): StandbyLoan[] {
  return readJson<StandbyLoan>(standbyLoanKey(entity_id));
}

// ----------------------------------------------------------------------------
// B.4 · CustomerIn + CustomerOut voucher CRUD
// ----------------------------------------------------------------------------
function nextCustomerVoucherNo(prefix: string, entity_id: string, count: number): string {
  return `${prefix}/${entity_id}/${String(count + 1).padStart(6, '0')}`;
}

export function createCustomerInVoucher(
  input: Omit<CustomerInVoucher, 'id' | 'voucher_no' | 'created_at' | 'updated_at' | 'audit_trail'>,
): CustomerInVoucher {
  const now = nowIso();
  const list = readJson<CustomerInVoucher>(customerInVoucherKey(input.entity_id));
  const voucher: CustomerInVoucher = {
    ...input,
    id: newId('cin'),
    voucher_no: nextCustomerVoucherNo('CIN', input.entity_id, list.length),
    created_at: now,
    updated_at: now,
    audit_trail: [{ at: now, by: input.received_by, action: 'customer_in_received' }],
  };
  writeJson(customerInVoucherKey(input.entity_id), [...list, voucher]);
  return voucher;
}

export function createCustomerOutVoucher(
  input: Omit<CustomerOutVoucher, 'id' | 'voucher_no' | 'created_at' | 'updated_at' | 'audit_trail'>,
): CustomerOutVoucher {
  const now = nowIso();
  const list = readJson<CustomerOutVoucher>(customerOutVoucherKey(input.entity_id));
  const voucher: CustomerOutVoucher = {
    ...input,
    id: newId('cout'),
    voucher_no: nextCustomerVoucherNo('COUT', input.entity_id, list.length),
    created_at: now,
    updated_at: now,
    audit_trail: [{ at: now, by: input.created_by, action: 'customer_out_delivered' }],
  };
  writeJson(customerOutVoucherKey(input.entity_id), [...list, voucher]);
  return voucher;
}

export function listCustomerInVouchers(entity_id: string = DEFAULT_ENTITY): CustomerInVoucher[] {
  return readJson<CustomerInVoucher>(customerInVoucherKey(entity_id));
}

export function listCustomerOutVouchers(entity_id: string = DEFAULT_ENTITY): CustomerOutVoucher[] {
  return readJson<CustomerOutVoucher>(customerOutVoucherKey(entity_id));
}

// ----------------------------------------------------------------------------
// B.5 · SparesIssue CRUD
// ----------------------------------------------------------------------------
export function createSparesIssue(
  input: Omit<SparesIssueRecord, 'id' | 'audit_trail'>,
): SparesIssueRecord {
  const now = nowIso();
  const issue: SparesIssueRecord = {
    ...input,
    id: newId('sp'),
    audit_trail: [{ at: now, by: input.engineer_id, action: 'spares_issued_from_field' }],
  };
  const list = readJson<SparesIssueRecord>(sparesIssueKey(input.entity_id));
  writeJson(sparesIssueKey(input.entity_id), [...list, issue]);
  return issue;
}

export function listSparesForTicket(
  ticket_id: string,
  entity_id: string = DEFAULT_ENTITY,
): SparesIssueRecord[] {
  return readJson<SparesIssueRecord>(sparesIssueKey(entity_id)).filter((s) => s.ticket_id === ticket_id);
}

export function listAllSparesIssues(entity_id: string = DEFAULT_ENTITY): SparesIssueRecord[] {
  return readJson<SparesIssueRecord>(sparesIssueKey(entity_id));
}

// ============================================================================
// C.1d · BLOCK B.2 · HappyCode Channel 2 · Email 7-day JWT
// ============================================================================
const CH2_JWT_EXPIRY_DAYS = 7;
const CH2_JWT_SECRET = 'phase1_dev_secret_replaced_at_phase2_backend';  // [JWT] Phase 2

function makeChannel2Token(feedback_id: string, expires_at_iso: string): string {
  const payload = JSON.stringify({ fid: feedback_id, exp: expires_at_iso, sig: CH2_JWT_SECRET });
  return btoa(payload).replace(/=/g, '');
}

function decodeChannel2Token(token: string): { fid: string; exp: string } | null {
  try {
    const pad = (4 - (token.length % 4)) % 4;
    const padded = token + '='.repeat(pad);
    const payload = JSON.parse(atob(padded));
    if (payload.sig !== CH2_JWT_SECRET) return null;
    return { fid: payload.fid, exp: payload.exp };
  } catch { return null; }
}

export function triggerChannel2EmailRequest(
  feedback_id: string,
  entity_id: string = DEFAULT_ENTITY,
): { token: string; expires_at: string } {
  const list = readJson<HappyCodeFeedback>(happyCodeFeedbackKey(entity_id));
  const idx = list.findIndex((f) => f.id === feedback_id);
  if (idx === -1) throw new Error(`HappyCodeFeedback ${feedback_id} not found`);
  const expires_at = new Date(Date.now() + CH2_JWT_EXPIRY_DAYS * 86400 * 1000).toISOString();
  const token = makeChannel2Token(feedback_id, expires_at);
  list[idx] = {
    ...list[idx],
    channel_2_email_sent_at: nowIso(),
    channel_2_jwt_token: token,
    channel_2_jwt_expires_at: expires_at,
    updated_at: nowIso(),
    audit_trail: appendAudit(list[idx].audit_trail, 'system', 'ch2_email_triggered'),
  };
  writeJson(happyCodeFeedbackKey(entity_id), list);
  return { token, expires_at };
}

export function verifyChannel2JWT(token: string): { feedback_id: string } | { error: string } {
  const decoded = decodeChannel2Token(token);
  if (!decoded) return { error: 'invalid_token' };
  if (new Date(decoded.exp).getTime() < Date.now()) return { error: 'expired' };
  return { feedback_id: decoded.fid };
}

export function submitChannel2Feedback(
  token: string,
  nps_score: number,
  comment: string,
  entity_id: string = DEFAULT_ENTITY,
): HappyCodeFeedback {
  const verified = verifyChannel2JWT(token);
  if ('error' in verified) throw new Error(`Channel 2 JWT ${verified.error}`);
  const list = readJson<HappyCodeFeedback>(happyCodeFeedbackKey(entity_id));
  const idx = list.findIndex((f) => f.id === verified.feedback_id);
  if (idx === -1) throw new Error(`HappyCodeFeedback ${verified.feedback_id} not found`);
  const now = nowIso();
  if (!list[idx].channel_2_clicked_at) {
    list[idx].channel_2_clicked_at = now;
  }
  list[idx] = {
    ...list[idx],
    channel_2_responded_at: now,
    channel_2_nps_score: nps_score,
    channel_2_comment: comment,
    updated_at: now,
    audit_trail: appendAudit(list[idx].audit_trail, 'customer_via_ch2', 'ch2_responded'),
  };
  writeJson(happyCodeFeedbackKey(entity_id), list);
  return list[idx];
}

// ============================================================================
// C.1d · BLOCK B.3 · HappyCode Channel 3 · Verbal NPS+Happiness inline
// ============================================================================
export function captureChannel3VerbalFeedback(
  feedback_id: string,
  engineer_id: string,
  nps_score: number,
  happiness_score: number,
  comment: string,
  entity_id: string = DEFAULT_ENTITY,
): HappyCodeFeedback {
  const list = readJson<HappyCodeFeedback>(happyCodeFeedbackKey(entity_id));
  const idx = list.findIndex((f) => f.id === feedback_id);
  if (idx === -1) throw new Error(`HappyCodeFeedback ${feedback_id} not found`);
  const now = nowIso();
  list[idx] = {
    ...list[idx],
    channel_3_captured_at: now,
    channel_3_captured_by_engineer_id: engineer_id,
    channel_3_nps_score: nps_score,
    channel_3_happiness_score: happiness_score,
    channel_3_comment: comment,
    updated_at: now,
    audit_trail: appendAudit(list[idx].audit_trail, engineer_id, 'ch3_verbal_captured'),
  };
  writeJson(happyCodeFeedbackKey(entity_id), list);
  return list[idx];
}

// ============================================================================
// C.1d · BLOCK B.4 · Variance + Profitability helpers
// ============================================================================
export interface TicketVariance {
  ticket_id: string;
  timeline_variance_days: number;
  cost_variance_paise: number;
  route_changed: boolean;
  spares_variance_qty: number;
  trust_score: number;
}

export function computeTicketVariance(
  ticket_id: string,
  estimated: { timeline_days: number; cost_paise: number; route_type: string; spares_qty: number },
  entity_id: string = DEFAULT_ENTITY,
): TicketVariance | null {
  const ticket = getServiceTicket(ticket_id, entity_id);
  if (!ticket || !ticket.closed_at) return null;
  const actual_days = Math.ceil(
    (new Date(ticket.closed_at).getTime() - new Date(ticket.raised_at).getTime()) / (86400 * 1000),
  );
  const routes = listRoutesForTicket(ticket_id, entity_id);
  const spares = listSparesForTicket(ticket_id, entity_id);
  const total_cost = routes.reduce((s, r) => s + (r.cost_paise ?? 0), 0)
    + spares.reduce((s, sp) => s + (sp.total_cost_paise ?? 0), 0);
  const actual_spares_qty = spares.reduce((s, sp) => s + sp.qty, 0);
  const actual_route = routes[0]?.route_type ?? estimated.route_type;
  const timeline_pct = Math.max(0, 100 - Math.abs((actual_days - estimated.timeline_days) / Math.max(1, estimated.timeline_days)) * 100);
  const cost_pct = Math.max(0, 100 - Math.abs((total_cost - estimated.cost_paise) / Math.max(1, estimated.cost_paise)) * 100);
  const route_pct = actual_route === estimated.route_type ? 100 : 0;
  const spares_pct = Math.max(0, 100 - Math.abs((actual_spares_qty - estimated.spares_qty) / Math.max(1, estimated.spares_qty)) * 100);
  const trust_score = Math.round((timeline_pct * 0.3 + cost_pct * 0.3 + route_pct * 0.2 + spares_pct * 0.2));
  return {
    ticket_id,
    timeline_variance_days: actual_days - estimated.timeline_days,
    cost_variance_paise: total_cost - estimated.cost_paise,
    route_changed: actual_route !== estimated.route_type,
    spares_variance_qty: actual_spares_qty - estimated.spares_qty,
    trust_score,
  };
}

export interface AMCProfitability {
  amc_record_id: string;
  revenue_paise: number;
  cost_paise: number;
  margin_paise: number;
  margin_pct: number;
}

export function computeAMCProfitability(
  amc_record_id: string,
  entity_id: string = DEFAULT_ENTITY,
): AMCProfitability | null {
  const amc = getAMCRecord(amc_record_id, entity_id);
  if (!amc) return null;
  const tickets = listServiceTickets({ entity_id, customer_id: amc.customer_id })
    .filter((t) => t.amc_record_id === amc_record_id);
  let cost = 0;
  for (const t of tickets) {
    cost += listRoutesForTicket(t.id, entity_id).reduce((s, r) => s + (r.cost_paise ?? 0), 0);
    cost += listStandbyLoansForTicket(t.id, entity_id).reduce((s, l) => s + (l.total_cost_paise ?? 0), 0);
    cost += listSparesForTicket(t.id, entity_id).reduce((s, sp) => s + (sp.total_cost_paise ?? 0), 0);
  }
  const revenue = amc.billed_to_date_paise;
  const margin = revenue - cost;
  const margin_pct = revenue > 0 ? Math.round((margin / revenue) * 100) : 0;
  return { amc_record_id, revenue_paise: revenue, cost_paise: cost, margin_paise: margin, margin_pct };
}

// ============================================================================
// C.1d · BLOCK B.5 · Read helpers for HappyCodeFeedback (CSAT report)
// ============================================================================
export function listHappyCodeFeedback(filters?: {
  entity_id?: string;
  ticket_id?: string;
  customer_id?: string;
}): HappyCodeFeedback[] {
  const entity = filters?.entity_id ?? DEFAULT_ENTITY;
  return readJson<HappyCodeFeedback>(happyCodeFeedbackKey(entity)).filter((f) => {
    if (filters?.ticket_id && f.ticket_id !== filters.ticket_id) return false;
    if (filters?.customer_id && f.customer_id !== filters.customer_id) return false;
    return true;
  });
}

export function getHappyCodeFeedback(
  feedback_id: string,
  entity_id: string = DEFAULT_ENTITY,
): HappyCodeFeedback | null {
  return readJson<HappyCodeFeedback>(happyCodeFeedbackKey(entity_id)).find((f) => f.id === feedback_id) ?? null;
}

// ============================================================================
// C.1e · BLOCK B.1 · CustomerServiceTier CRUD
// ============================================================================
import type { CustomerServiceTier, ServiceTierLevel } from '@/types/customer-service-tier';
import { customerServiceTierKey, TIER_BENEFITS } from '@/types/customer-service-tier';
import type { CustomerReminder, ReminderChannel } from '@/types/customer-reminder';
import { customerReminderKey } from '@/types/customer-reminder';
import { emitRenewalEmailToTemplateEngine } from './servicedesk-bridges';

export function assignCustomerServiceTier(
  input: Omit<CustomerServiceTier, 'id' | 'created_at' | 'updated_at' | 'audit_trail'>,
): CustomerServiceTier {
  const now = nowIso();
  const list = readJson<CustomerServiceTier>(customerServiceTierKey(input.entity_id));
  const updated = list.map((t) =>
    t.customer_id === input.customer_id
      ? { ...t, updated_at: now, audit_trail: appendAudit(t.audit_trail, input.assigned_by, 'tier_superseded') }
      : t,
  );
  const tier: CustomerServiceTier = {
    ...input,
    id: newId('tier'),
    created_at: now,
    updated_at: now,
    audit_trail: [{ at: now, by: input.assigned_by, action: `tier_assigned_${input.tier}` }],
  };
  // [JWT] POST /api/servicedesk/customer-service-tiers
  writeJson(customerServiceTierKey(input.entity_id), [...updated, tier]);
  return tier;
}

export function getActiveCustomerTier(
  customer_id: string,
  entity_id: string = DEFAULT_ENTITY,
): CustomerServiceTier | null {
  const list = readJson<CustomerServiceTier>(customerServiceTierKey(entity_id))
    .filter((t) => t.customer_id === customer_id)
    .sort((a, b) => b.assigned_at.localeCompare(a.assigned_at));
  return list[0] ?? null;
}

export function listCustomerTiers(filters?: {
  entity_id?: string;
  tier?: ServiceTierLevel;
}): CustomerServiceTier[] {
  const entity = filters?.entity_id ?? DEFAULT_ENTITY;
  return readJson<CustomerServiceTier>(customerServiceTierKey(entity)).filter((t) =>
    !filters?.tier || t.tier === filters.tier,
  );
}

export function getTierBenefits(tier: ServiceTierLevel): typeof TIER_BENEFITS[ServiceTierLevel] {
  return TIER_BENEFITS[tier];
}

export function applyTierToSLAHours(
  base_hours: number,
  customer_id: string,
  entity_id: string = DEFAULT_ENTITY,
): number {
  const tier = getActiveCustomerTier(customer_id, entity_id);
  if (!tier) return base_hours;
  const benefits = getTierBenefits(tier.tier);
  return Math.ceil(base_hours * benefits.sla_multiplier);
}

// ============================================================================
// C.1e · BLOCK B.2 · CustomerReminder CRUD + FR-75 fire wire
// ============================================================================
export function createCustomerReminder(
  input: Omit<CustomerReminder, 'id' | 'created_at' | 'updated_at' | 'audit_trail' | 'status' | 'fired_at' | 'fired_via_channel' | 'snoozed_until'>,
): CustomerReminder {
  const now = nowIso();
  const reminder: CustomerReminder = {
    ...input,
    id: newId('rem'),
    status: 'pending',
    fired_at: null,
    fired_via_channel: null,
    snoozed_until: null,
    created_at: now,
    updated_at: now,
    audit_trail: [{ at: now, by: input.created_by, action: `reminder_created_${input.reminder_type}` }],
  };
  const list = readJson<CustomerReminder>(customerReminderKey(input.entity_id));
  // [JWT] POST /api/servicedesk/customer-reminders
  writeJson(customerReminderKey(input.entity_id), [...list, reminder]);
  return reminder;
}

export function fireReminderNow(
  reminder_id: string,
  actor: string,
  channel: ReminderChannel,
  entity_id: string = DEFAULT_ENTITY,
): CustomerReminder {
  const list = readJson<CustomerReminder>(customerReminderKey(entity_id));
  const idx = list.findIndex((r) => r.id === reminder_id);
  if (idx === -1) throw new Error(`CustomerReminder ${reminder_id} not found`);
  const now = nowIso();
  const target = list[idx];
  list[idx] = {
    ...target,
    status: 'fired',
    fired_at: now,
    fired_via_channel: channel,
    updated_at: now,
    audit_trail: appendAudit(target.audit_trail, actor, `reminder_fired_via_${channel}`),
  };
  // [JWT] Phase 2 wires real email/sms · Phase 1 reuses FR-75 emit pattern
  if (channel === 'email' && target.template_id) {
    emitRenewalEmailToTemplateEngine({
      amc_record_id: '',
      customer_id: target.customer_id,
      template_id: target.template_id,
      cascade_stage: 'first',
      language: 'en',
    });
  }
  writeJson(customerReminderKey(entity_id), list);
  return list[idx];
}

export function snoozeReminder(
  reminder_id: string,
  actor: string,
  snooze_until_iso: string,
  entity_id: string = DEFAULT_ENTITY,
): CustomerReminder {
  const list = readJson<CustomerReminder>(customerReminderKey(entity_id));
  const idx = list.findIndex((r) => r.id === reminder_id);
  if (idx === -1) throw new Error(`CustomerReminder ${reminder_id} not found`);
  const now = nowIso();
  list[idx] = {
    ...list[idx],
    status: 'snoozed',
    snoozed_until: snooze_until_iso,
    updated_at: now,
    audit_trail: appendAudit(list[idx].audit_trail, actor, 'reminder_snoozed'),
  };
  writeJson(customerReminderKey(entity_id), list);
  return list[idx];
}

export function dismissReminder(
  reminder_id: string,
  actor: string,
  reason: string,
  entity_id: string = DEFAULT_ENTITY,
): CustomerReminder {
  const list = readJson<CustomerReminder>(customerReminderKey(entity_id));
  const idx = list.findIndex((r) => r.id === reminder_id);
  if (idx === -1) throw new Error(`CustomerReminder ${reminder_id} not found`);
  const now = nowIso();
  list[idx] = {
    ...list[idx],
    status: 'dismissed',
    updated_at: now,
    audit_trail: appendAudit(list[idx].audit_trail, actor, 'reminder_dismissed', reason),
  };
  writeJson(customerReminderKey(entity_id), list);
  return list[idx];
}

export function listUpcomingReminders(
  days_ahead: number = 30,
  entity_id: string = DEFAULT_ENTITY,
): CustomerReminder[] {
  const cutoff = new Date(Date.now() + days_ahead * 86400 * 1000).toISOString();
  return readJson<CustomerReminder>(customerReminderKey(entity_id)).filter(
    (r) => r.status === 'pending' && r.trigger_date <= cutoff,
  ).sort((a, b) => a.trigger_date.localeCompare(b.trigger_date));
}

export function listAllRemindersForCustomer(
  customer_id: string,
  entity_id: string = DEFAULT_ENTITY,
): CustomerReminder[] {
  return readJson<CustomerReminder>(customerReminderKey(entity_id))
    .filter((r) => r.customer_id === customer_id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ============================================================================
// C.1e · BLOCK B.3 · ServiceAvailed (OOB-21 AMC stock consumption tracker)
// ============================================================================
export interface ServiceAvailedRecord {
  id: string;
  entity_id: string;
  amc_record_id: string;
  ticket_id: string;
  service_count_incremented_at: string;
  remaining_service_count: number;
  spares_value_paise: number;
  audit_trail: AuditEntry[];
}

const serviceAvailedKey = (e: string): string => `servicedesk_v1_service_availed_${e}`;

export function recordServiceAvailed(
  amc_record_id: string,
  ticket_id: string,
  spares_value_paise: number,
  entity_id: string = DEFAULT_ENTITY,
): ServiceAvailedRecord {
  const amc = getAMCRecord(amc_record_id, entity_id);
  if (!amc) throw new Error(`AMCRecord ${amc_record_id} not found`);
  const includedRaw = (amc as unknown as { included_service_count?: number }).included_service_count;
  const included = typeof includedRaw === 'number' ? includedRaw : 999;
  const availedSoFar = listServiceAvailedForAMC(amc_record_id, entity_id).length;
  const remaining = Math.max(0, included - availedSoFar - 1);
  const now = nowIso();
  const record: ServiceAvailedRecord = {
    id: newId('avail'),
    entity_id,
    amc_record_id,
    ticket_id,
    service_count_incremented_at: now,
    remaining_service_count: remaining,
    spares_value_paise,
    audit_trail: [{ at: now, by: 'system', action: 'service_availed_recorded' }],
  };
  const list = readJson<ServiceAvailedRecord>(serviceAvailedKey(entity_id));
  // [JWT] POST /api/servicedesk/service-availed
  writeJson(serviceAvailedKey(entity_id), [...list, record]);
  return record;
}

export function listServiceAvailedForAMC(
  amc_record_id: string,
  entity_id: string = DEFAULT_ENTITY,
): ServiceAvailedRecord[] {
  return readJson<ServiceAvailedRecord>(serviceAvailedKey(entity_id))
    .filter((r) => r.amc_record_id === amc_record_id);
}

export function computeRemainingServices(
  amc_record_id: string,
  entity_id: string = DEFAULT_ENTITY,
): { included: number; availed: number; remaining: number } {
  const amc = getAMCRecord(amc_record_id, entity_id);
  if (!amc) return { included: 0, availed: 0, remaining: 0 };
  const includedRaw = (amc as unknown as { included_service_count?: number }).included_service_count;
  const included = typeof includedRaw === 'number' ? includedRaw : 0;
  const availed = listServiceAvailedForAMC(amc_record_id, entity_id).length;
  return { included, availed, remaining: Math.max(0, included - availed) };
}

// ============================================================================
// C.1f · BLOCK B · Tier 2/3 OOBs + Future Task Register
// ============================================================================
import type { EngineerMarketplaceProfile, EngagementType } from '@/types/engineer-marketplace';
import { engineerMarketplaceKey } from '@/types/engineer-marketplace';
import type { RefurbishedUnit, RefurbStatus, RefurbGrade } from '@/types/refurbished-unit';
import { refurbishedUnitKey } from '@/types/refurbished-unit';
import type { FutureTaskEntry, FTStatus } from '@/types/future-task-register';
import { futureTaskKey } from '@/types/future-task-register';
import type { SparesIssueRecord as _SparesIssueRecord } from '@/types/spares-issue';
import { sparesIssueKey as _sparesIssueKeyC1f } from '@/types/spares-issue';
import { getSLAMatrixSettings } from './cc-compliance-settings';

// --- B.1 EngineerMarketplace CRUD (S27) ---
export function registerEngineerMarketplaceProfile(
  input: Omit<EngineerMarketplaceProfile, 'id' | 'created_at' | 'updated_at' | 'audit_trail'>,
): EngineerMarketplaceProfile {
  // [JWT] POST /api/servicedesk/engineer-marketplace
  const now = nowIso();
  const profile: EngineerMarketplaceProfile = {
    ...input,
    id: newId('eng_mkt'),
    created_at: now,
    updated_at: now,
    audit_trail: [{ at: now, by: 'system', action: `marketplace_registered_${input.engagement_type}` }],
  };
  const list = readJson<EngineerMarketplaceProfile>(engineerMarketplaceKey(input.entity_id));
  writeJson(engineerMarketplaceKey(input.entity_id), [...list, profile]);
  return profile;
}

export function listEngineerMarketplaceProfiles(filters?: {
  entity_id?: string;
  engagement_type?: EngagementType;
}): EngineerMarketplaceProfile[] {
  // [JWT] GET /api/servicedesk/engineer-marketplace
  const entity = filters?.entity_id ?? DEFAULT_ENTITY;
  return readJson<EngineerMarketplaceProfile>(engineerMarketplaceKey(entity)).filter((p) =>
    !filters?.engagement_type || p.engagement_type === filters.engagement_type,
  );
}

export function listAvailableEngineers(filters?: {
  entity_id?: string;
  engagement_type?: EngagementType;
  skill_tag?: string;
}): EngineerMarketplaceProfile[] {
  const entity = filters?.entity_id ?? DEFAULT_ENTITY;
  return readJson<EngineerMarketplaceProfile>(engineerMarketplaceKey(entity)).filter((p) => {
    if (!p.is_available) return false;
    if (filters?.engagement_type && p.engagement_type !== filters.engagement_type) return false;
    if (filters?.skill_tag && !p.skill_tags.includes(filters.skill_tag)) return false;
    return true;
  });
}

export function matchEngineerToTicket(
  required_skills: string[],
  entity_id: string = DEFAULT_ENTITY,
): EngineerMarketplaceProfile[] {
  return listAvailableEngineers({ entity_id })
    .filter((e) => required_skills.some((s) => e.skill_tags.includes(s)))
    .sort((a, b) => b.capacity_hours_per_week - a.capacity_hours_per_week);
}

// --- B.2 RefurbishedUnit CRUD + 4-state machine (S29 ⭐) ---
export function createRefurbishedUnit(
  input: Omit<RefurbishedUnit, 'id' | 'created_at' | 'updated_at' | 'audit_trail' | 'margin_paise' | 'status' | 'sold_at' | 'sold_to_customer_id' | 'recycled_at'>,
): RefurbishedUnit {
  // [JWT] POST /api/servicedesk/refurbished-units
  const now = nowIso();
  const unit: RefurbishedUnit = {
    ...input,
    id: newId('refurb'),
    margin_paise: input.resale_price_paise - input.refurb_cost_paise,
    status: 'in_refurb',
    sold_at: null,
    sold_to_customer_id: null,
    recycled_at: null,
    created_at: now,
    updated_at: now,
    audit_trail: [{ at: now, by: 'system', action: `refurb_grade_${input.refurb_grade}_acquired_${input.acquired_via}` }],
  };
  const list = readJson<RefurbishedUnit>(refurbishedUnitKey(input.entity_id));
  writeJson(refurbishedUnitKey(input.entity_id), [...list, unit]);
  return unit;
}

function transitionRefurb(
  id: string, to: RefurbStatus, actor: string, patch: Partial<RefurbishedUnit>, entity_id: string = DEFAULT_ENTITY,
): RefurbishedUnit {
  const list = readJson<RefurbishedUnit>(refurbishedUnitKey(entity_id));
  const idx = list.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error(`RefurbishedUnit ${id} not found`);
  const now = nowIso();
  list[idx] = {
    ...list[idx],
    ...patch,
    status: to,
    updated_at: now,
    audit_trail: appendAudit(list[idx].audit_trail, actor, `refurb_transition_to_${to}`),
  };
  writeJson(refurbishedUnitKey(entity_id), list);
  return list[idx];
}

export function markRefurbReady(id: string, actor: string, entity_id: string = DEFAULT_ENTITY): RefurbishedUnit {
  return transitionRefurb(id, 'ready', actor, {}, entity_id);
}

export function markRefurbSold(id: string, actor: string, customer_id: string, entity_id: string = DEFAULT_ENTITY): RefurbishedUnit {
  return transitionRefurb(id, 'sold', actor, { sold_at: nowIso(), sold_to_customer_id: customer_id }, entity_id);
}

export function markRefurbRecycled(id: string, actor: string, entity_id: string = DEFAULT_ENTITY): RefurbishedUnit {
  return transitionRefurb(id, 'recycled', actor, { recycled_at: nowIso() }, entity_id);
}

export function listRefurbishedUnits(filters?: {
  entity_id?: string;
  status?: RefurbStatus;
  refurb_grade?: RefurbGrade;
}): RefurbishedUnit[] {
  // [JWT] GET /api/servicedesk/refurbished-units
  const entity = filters?.entity_id ?? DEFAULT_ENTITY;
  return readJson<RefurbishedUnit>(refurbishedUnitKey(entity)).filter((u) => {
    if (filters?.status && u.status !== filters.status) return false;
    if (filters?.refurb_grade && u.refurb_grade !== filters.refurb_grade) return false;
    return true;
  });
}

export function computeRefurbMarginByGrade(
  entity_id: string = DEFAULT_ENTITY,
): Record<RefurbGrade, { count: number; total_margin: number }> {
  const list = readJson<RefurbishedUnit>(refurbishedUnitKey(entity_id)).filter((u) => u.status === 'sold');
  const result: Record<RefurbGrade, { count: number; total_margin: number }> = {
    A: { count: 0, total_margin: 0 },
    B: { count: 0, total_margin: 0 },
    C: { count: 0, total_margin: 0 },
  };
  for (const u of list) {
    result[u.refurb_grade].count++;
    result[u.refurb_grade].total_margin += u.margin_paise;
  }
  return result;
}

// --- B.3 FutureTaskEntry CRUD + 5 seeded entries ---
const SEEDED_FT_ENTRIES: Omit<FutureTaskEntry, 'id' | 'created_at' | 'updated_at' | 'audit_trail'>[] = [
  { ft_code: 'FT-SDESK-001', title: 'Real OEM API integration', description: 'Replace Procure360 stub consumer with real OEM portal API integration · Voltas/Daikin/Bluestar starter', status: 'planned', priority: 'p1', target_phase: 'phase_2', estimated_loc: 800, unblock_dependencies: [], parent_card_id: 'servicedesk' },
  { ft_code: 'FT-SDESK-002', title: 'SMS gateway integration for Ch2/Ch3 + reminders', description: 'Wire real SMS provider (Twilio/MSG91) for HappyCode Ch2 + reminder fire channels', status: 'planned', priority: 'p1', target_phase: 'phase_2', estimated_loc: 400, unblock_dependencies: [], parent_card_id: 'servicedesk' },
  { ft_code: 'FT-SDESK-003', title: 'Real JWT backend for HappyCode Ch2', description: 'Replace Phase 1 btoa() token with real JWT (HS256 signing · server-issued · revocation list)', status: 'planned', priority: 'p1', target_phase: 'phase_2', estimated_loc: 300, unblock_dependencies: [], parent_card_id: 'servicedesk' },
  { ft_code: 'FT-SDESK-004', title: 'ML-powered Service Quote Optimizer', description: 'Upgrade S32 rule-based optimizer to ML model trained on historical ticket/quote/win data', status: 'planned', priority: 'p2', target_phase: 'phase_2', estimated_loc: 600, unblock_dependencies: ['FT-SDESK-001'], parent_card_id: 'servicedesk' },
  { ft_code: 'FT-SDESK-005', title: 'NLP for Voice-of-Customer', description: 'Upgrade S35 keyword-frequency to real NLP (sentiment + topic extraction + trend detection)', status: 'planned', priority: 'p2', target_phase: 'phase_2', estimated_loc: 500, unblock_dependencies: [], parent_card_id: 'servicedesk' },
];

export function seedFutureTaskRegister(entity_id: string = DEFAULT_ENTITY): FutureTaskEntry[] {
  // [JWT] POST /api/servicedesk/future-task-register/seed
  const existing = readJson<FutureTaskEntry>(futureTaskKey(entity_id));
  if (existing.length > 0) return existing;
  const now = nowIso();
  const entries: FutureTaskEntry[] = SEEDED_FT_ENTRIES.map((e) => ({
    ...e,
    id: newId('ft'),
    created_at: now,
    updated_at: now,
    audit_trail: [{ at: now, by: 'system', action: 'ft_seeded' }],
  }));
  writeJson(futureTaskKey(entity_id), entries);
  return entries;
}

export function listFutureTasks(filters?: { entity_id?: string; status?: FTStatus }): FutureTaskEntry[] {
  const entity = filters?.entity_id ?? DEFAULT_ENTITY;
  return readJson<FutureTaskEntry>(futureTaskKey(entity)).filter((t) =>
    !filters?.status || t.status === filters.status,
  );
}

export function updateFutureTaskStatus(
  id: string, status: FTStatus, actor: string, entity_id: string = DEFAULT_ENTITY,
): FutureTaskEntry {
  const list = readJson<FutureTaskEntry>(futureTaskKey(entity_id));
  const idx = list.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error(`FutureTaskEntry ${id} not found`);
  const now = nowIso();
  list[idx] = {
    ...list[idx],
    status,
    updated_at: now,
    audit_trail: appendAudit(list[idx].audit_trail, actor, `ft_status_${status}`),
  };
  writeJson(futureTaskKey(entity_id), list);
  return list[idx];
}

// --- B.4 S30 / S31 / S32 helpers ---
export function listSparesByTier(
  tier: 'A' | 'B' | 'C',
  entity_id: string = DEFAULT_ENTITY,
): _SparesIssueRecord[] {
  return readJson<_SparesIssueRecord>(_sparesIssueKeyC1f(entity_id))
    .filter((s) => {
      const notes = (s as unknown as { notes?: string }).notes ?? '';
      return notes.includes(`[TIER:${tier}]`);
    });
}

export interface EngineerBurnoutFlag {
  engineer_id: string;
  tickets_this_week: number;
  is_burnout_flag: boolean;
  computed_at: string;
}

export function detectEngineerBurnout(entity_id: string = DEFAULT_ENTITY): EngineerBurnoutFlag[] {
  const oneWeekAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
  const tickets = listServiceTickets({ entity_id }).filter(
    (t) => t.created_at >= oneWeekAgo && t.assigned_engineer_id,
  );
  const counts = new Map<string, number>();
  for (const t of tickets) {
    const eid = t.assigned_engineer_id as string;
    counts.set(eid, (counts.get(eid) ?? 0) + 1);
  }
  const now = nowIso();
  return Array.from(counts.entries()).map(([engineer_id, count]) => ({
    engineer_id,
    tickets_this_week: count,
    is_burnout_flag: count > 15,
    computed_at: now,
  }));
}

export interface QuoteSuggestion {
  call_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggested_response_hours: number;
  suggested_resolution_hours: number;
  suggested_charge_paise: number;
  confidence: 'low' | 'medium' | 'high';
}

export function suggestServiceQuote(
  call_type: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  entity_id: string = DEFAULT_ENTITY,
): QuoteSuggestion {
  const matrix = getSLAMatrixSettings(entity_id);
  const sevMap = { low: 'sev4_low', medium: 'sev3_medium', high: 'sev2_high', critical: 'sev1_critical' } as const;
  const cell = matrix.matrix.find(
    (c) => c.call_type_code === call_type && c.severity === sevMap[severity],
  );
  const severityMultiplier: Record<typeof severity, number> = {
    low: 1, medium: 1.5, high: 2.5, critical: 4,
  };
  return {
    call_type,
    severity,
    suggested_response_hours: cell?.response_hours ?? 24,
    suggested_resolution_hours: cell?.resolution_hours ?? 72,
    suggested_charge_paise: Math.round(500 * 100 * severityMultiplier[severity]),
    confidence: cell ? 'high' : 'low',
  };
}

// --- B.5 S35 Voice-of-Customer keyword aggregation ---
const STOP_WORDS = new Set([
  'the','and','for','was','with','that','this','have','has','had','not','but','from','are','were',
  'you','your','our','can','will','they','them','its','it','is','of','to','in','on','a','an','at',
  'as','or','be','by','if','no','so','do','i','we','my','me','too','very','more','any','all','one',
]);

export interface KeywordFrequency { keyword: string; count: number }

export function aggregateVoiceOfCustomerKeywords(
  entity_id: string = DEFAULT_ENTITY,
  topK: number = 50,
): KeywordFrequency[] {
  const feedback = listHappyCodeFeedback({ entity_id });
  const tokens = new Map<string, number>();
  const harvest = (text: string | null | undefined): void => {
    if (!text) return;
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    for (const w of words) {
      if (w.length < 3 || STOP_WORDS.has(w)) continue;
      tokens.set(w, (tokens.get(w) ?? 0) + 1);
    }
  };
  for (const f of feedback) {
    const fb = f as unknown as Record<string, unknown>;
    harvest(fb.channel_1_comment as string | undefined);
    harvest(fb.channel_2_comment as string | undefined);
    harvest(fb.channel_3_comment as string | undefined);
    harvest(fb.comment as string | undefined);
  }
  return Array.from(tokens.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topK);
}

// --- B.6 S28 Customer P&L aggregator ---
export interface CustomerPnLRow {
  customer_id: string;
  revenue_paise: number;
  cost_paise: number;
  margin_paise: number;
  margin_pct: number;
}

export function computeCustomerPnL(entity_id: string = DEFAULT_ENTITY): CustomerPnLRow[] {
  const amcs = listAMCRecords({ entity_id });
  const map = new Map<string, CustomerPnLRow>();
  for (const amc of amcs) {
    const prof = computeAMCProfitability(amc.id, entity_id);
    if (!prof) continue;
    const cur = map.get(amc.customer_id) ?? {
      customer_id: amc.customer_id, revenue_paise: 0, cost_paise: 0, margin_paise: 0, margin_pct: 0,
    };
    cur.revenue_paise += prof.revenue_paise;
    cur.cost_paise += prof.cost_paise;
    map.set(amc.customer_id, cur);
  }
  return Array.from(map.values()).map((r) => {
    const margin = r.revenue_paise - r.cost_paise;
    return { ...r, margin_paise: margin, margin_pct: r.revenue_paise > 0 ? Math.round((margin / r.revenue_paise) * 100) : 0 };
  });
}
