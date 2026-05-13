/**
 * @file        src/types/servicedesk.ts
 * @purpose     ServiceDesk canonical types · AMC + Service Ticket + Service Engineer + HappyCode
 * @who         ServiceDesk module (Tier 1 #13 · 12th card on Shell)
 * @when        2026-05-14
 * @sprint      T-Phase-1.C.1a · Block A · v2 spec
 * @whom        Audit Owner
 * @decisions   D-NEW-CW Path B 7th consumer · D-NEW-DJ Three-Layer Tellicaller POSSIBLE 32nd · D-NEW-DI Sarathi REUSE POSSIBLE 33rd
 * @iso        Functional Suitability + Maintainability
 * @disciplines FR-30 · FR-54 CC SSOT (inline literal filter types · zero CC core modification)
 * @reuses      Mirror of maintainpro/sitex type patterns
 * @[JWT]       Phase 2 wires real backend
 */

// ============================================================================
// Inline literal filter types (Q-LOCK-5 Reframing-1 · ServiceDesk-side filters · zero CC core modification)
// ============================================================================
export type ServiceDeskVendorTypeFilter = 'oem_authorized_service' | 'telecaller_partner';
export type ServiceDeskStockGroupFilter = 'service_packages' | 'warranty_services' | 'services';
export type ServiceDeskGodownTypeFilter = 'service_godown';

// ============================================================================
// AMC Records (Q1-Q4 founder lock)
// ============================================================================
export type AMCStatus =
  | 'applicability_pending'
  | 'not_applicable'
  | 'proposal_draft'
  | 'proposal_sent'
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'renewed';

export type BillingCycle = 'upfront' | 'quarterly' | 'monthly';

export type AMCLifecycleStage =
  | 'applicability_decision'
  | 'proposal'
  | 'negotiation'
  | 'active'
  | 'service_delivery'
  | 'renewal_window'
  | 'renewed'
  | 'lapsed';

export interface AuditEntry {
  at: string;
  by: string;
  action: string;
  reason?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface AMCRecord {
  id: string;
  entity_id: string;
  branch_id: string;
  customer_id: string;
  sales_invoice_id: string | null;
  // Applicability decision
  amc_applicable: boolean | null;
  applicability_decided_at: string | null;
  applicability_decided_by: string | null;
  applicability_reason: string;
  // Contract terms
  amc_code: string;
  amc_type: 'comprehensive' | 'non_comprehensive' | 'labour_only';
  contract_start: string | null;
  contract_end: string | null;
  billing_cycle: BillingCycle;
  // Financial (paise integers)
  contract_value_paise: number;
  billed_to_date_paise: number;
  outstanding_paise: number;
  commission_salesman_pct: number;
  commission_receiver_pct: number;
  commission_amc_pct: number;
  // Risk + forecast
  risk_score: number;
  risk_bucket: 'low' | 'medium' | 'high';
  renewal_probability: number;
  // Lifecycle
  status: AMCStatus;
  lifecycle_stage: AMCLifecycleStage;
  // OEM context
  oem_name: string;
  oem_sla_hours: number | null;
  // IoT stub (Phase 2)
  iot_device_ids: string[];
  // WhatsApp lifecycle
  whatsapp_lifecycle_phase: 'pre_sale' | 'post_install' | 'renewal_window' | 'lapsed' | null;
  // Audit
  created_at: string;
  updated_at: string;
  created_by: string;
  audit_trail: AuditEntry[];
}

// ============================================================================
// AMC Proposal (5-state lifecycle)
// ============================================================================
export type AMCProposalStatus = 'draft' | 'sent' | 'negotiating' | 'accepted' | 'rejected';

export interface AMCProposal {
  id: string;
  entity_id: string;
  amc_record_id: string;
  customer_id: string;
  proposal_code: string;
  proposal_date: string;
  valid_until: string;
  proposed_value_paise: number;
  proposed_start: string;
  proposed_end: string;
  proposed_billing_cycle: BillingCycle;
  oem_name: string;
  service_inclusions: string[];
  service_exclusions: string[];
  email_template_id: string | null;
  language: string;
  status: AMCProposalStatus;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  audit_trail: AuditEntry[];
}

// ============================================================================
// Service Engineer Profile (Sarathi REUSE pattern · Q-LOCK-9)
// ============================================================================
export type ServiceEngineerRole = 'service_engineer' | 'service_call_center_agent';

export interface ServiceEngineerCertification {
  id: string;
  oem_name: string;
  cert_name: string;
  cert_no: string;
  issued_on: string;
  valid_until: string | null;
}

export interface ServiceEngineerProfile {
  id: string;
  entity_id: string;
  sam_person_id: string;
  service_role: ServiceEngineerRole;
  skills: string[];
  oem_authorizations: string[];
  certifications: ServiceEngineerCertification[];
  // Current location + assignments
  current_lat: number | null;
  current_lng: number | null;
  current_location_updated_at: string | null;
  active_ticket_ids: string[];
  daily_capacity: number;
  // Reputation
  total_tickets_resolved: number;
  avg_csat_score: number;
  avg_happy_code_score: number;
  // Standard
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Tellicaller Work Item Event (D-NEW-DJ Three-Layer · Layer 2 emit · originating_card_id servicedesk)
// ============================================================================
export interface TellicallerWorkItemEvent {
  type: 'tellicaller:work_item.created';
  work_item_id: string;
  originating_card_id: 'servicedesk';
  customer_id: string;
  amc_record_id: string;
  trigger_reason: string;
  priority: 'low' | 'medium' | 'high';
  script_id: string;
  language_pref: string;
  assigned_telecaller_id: string | null;
  emitted_at: string;
}

export interface TellicallerOutcomeEvent {
  type: 'tellicaller:outcome.captured';
  work_item_id: string;
  outcome: 'contacted_interested' | 'contacted_not_interested' | 'no_answer' | 'wrong_number' | 'callback_scheduled';
  notes: string;
  next_call_at: string | null;
  emitted_at: string;
}

// ============================================================================
// Call Type Configuration REPLICA (FR-13 · ServiceDesk READS · CC OWNS)
// ============================================================================
export type SLASeverity = 'sev1_critical' | 'sev2_high' | 'sev3_medium' | 'sev4_low';

export interface EscalationLevel {
  level: number;
  trigger_after_minutes: number;
  notify_role: string;
}

export interface CallTypeConfigurationReplica {
  id: string;
  call_type_code: string;
  display_name: string;
  default_sla_severity: SLASeverity;
  default_assignment_rule: 'round_robin' | 'territory' | 'skill_based' | 'manual';
  escalation_matrix: EscalationLevel[];
  language_pref?: string;
  is_active: boolean;
}

// ============================================================================
// HappyCode Feedback (3-channel · Channel 1 OTP MANDATORY ticket-close gate)
// ============================================================================
export type FeedbackSource = 'otp_channel' | 'email_channel' | 'verbal_channel';

export interface HappyCodeFeedback {
  id: string;
  entity_id: string;
  ticket_id: string;
  customer_id: string;
  source: FeedbackSource;
  // Channel 1: OTP gate
  otp_verified: boolean;
  otp_verified_at: string | null;
  // Channel 2: email NPS
  email_nps_score: number | null;
  email_response_at: string | null;
  // Channel 3: verbal happiness
  verbal_nps_score: number | null;
  verbal_happiness_score: number | null;
  verbal_captured_at: string | null;
  verbal_captured_by: string | null;
  notes: string;
  // Channel 2 · Email 7-day JWT (Q-LOCK-4 · C.1d NEW)
  channel_2_email_sent_at: string | null;
  channel_2_jwt_token: string | null;
  channel_2_jwt_expires_at: string | null;
  channel_2_clicked_at: string | null;
  channel_2_responded_at: string | null;
  channel_2_nps_score: number | null;
  channel_2_comment: string;
  // Channel 3 · Verbal NPS+Happiness inline at customer-out (Q-LOCK-5 · C.1d NEW)
  channel_3_captured_at: string | null;
  channel_3_captured_by_engineer_id: string | null;
  channel_3_nps_score: number | null;
  channel_3_happiness_score: number | null;
  channel_3_comment: string;
  created_at: string;
  updated_at: string;
  audit_trail: AuditEntry[];
}

// ============================================================================
// localStorage keys (namespaced 'servicedesk_v1')
// ============================================================================
export const amcRecordKey = (e: string): string => `servicedesk_v1_amc_record_${e}`;
export const amcProposalKey = (e: string): string => `servicedesk_v1_amc_proposal_${e}`;
export const serviceEngineerProfileKey = (e: string): string => `servicedesk_v1_engineer_${e}`;
export const happyCodeFeedbackKey = (e: string): string => `servicedesk_v1_happy_${e}`;
export const ticketOTPKey = (e: string): string => `servicedesk_v1_ticket_otp_${e}`;

// ============================================================================
// Installation Verification at AMC Kickoff (v5 §2 boundary #4 · v7 §4 Open #4c NEW · C.1b)
// Distinct from SiteX Commissioning Report · proves AMC contract terms observable at customer site
// ============================================================================
export type InstallationVerificationStatus = 'pending' | 'in_progress' | 'verified' | 'failed';

export interface InstallationVerificationPhoto {
  id: string;
  url: string;          // [JWT] Phase 2 wires to storage
  caption: string;
  captured_at: string;
}

export interface InstallationVerification {
  id: string;
  entity_id: string;
  amc_record_id: string;            // FK to AMCRecord
  site_visit_date: string;
  // 7-point checklist
  functional_check_passed: boolean;
  spare_inventory_verified: boolean;
  service_tier_config_verified: boolean;
  customer_briefing_done: boolean;
  emergency_contact_shared: boolean;
  documentation_handed_over: boolean;
  customer_acknowledgement: boolean;
  // Capture
  photos: InstallationVerificationPhoto[];
  customer_signature_url: string | null;  // [JWT] Phase 2 signature pad
  notes: string;
  // Verifier
  verifier_engineer_id: string;
  // Status + audit
  status: InstallationVerificationStatus;
  verified_by: string | null;
  verified_at: string | null;
  // Standard
  created_at: string;
  updated_at: string;
  created_by: string;
  audit_trail: AuditEntry[];
}

export const installationVerificationKey = (e: string): string =>
  `servicedesk_v1_installation_verification_${e}`;
