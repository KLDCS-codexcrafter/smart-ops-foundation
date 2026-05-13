/**
 * @file        src/types/service-ticket.ts
 * @purpose     ServiceTicket canonical · 8-state lifecycle · Q-LOCK-1/2 · OOB-7 omnichannel
 * @who         ServiceDesk module
 * @when        2026-05-14
 * @sprint      T-Phase-1.C.1c · Block A.1
 * @whom        Audit Owner
 * @decisions   D-NEW-DJ FR-72 promotion threshold contributor
 * @iso        Functional Suitability + Maintainability + Reliability
 * @disciplines FR-30 · FR-39 audit trail discipline
 * @reuses      AuditEntry from @/types/servicedesk
 * @[JWT]       Phase 2 wires real backend
 */
import type { AuditEntry } from '@/types/servicedesk';

// 6 channels per OOB-7 omnichannel intake
export type ServiceTicketChannel = 'whatsapp' | 'email' | 'phone' | 'walkin' | 'web' | 'auto_pms';

// 8-state lifecycle (Q-LOCK-2)
export type ServiceTicketStatus =
  | 'raised'
  | 'acknowledged'
  | 'assigned'
  | 'in_progress'
  | 'on_hold'
  | 'resolved'
  | 'closed'
  | 'reopened';

// SLA severities (FR-12 propagation from CC call_type master)
export type ServiceTicketSeverity = 'sev1_critical' | 'sev2_high' | 'sev3_medium' | 'sev4_low';

export interface ServiceTicketSparesConsumed {
  spare_id: string;
  qty: number;
  cost_paise: number;
}

export interface ServiceTicketPhoto {
  id: string;
  url: string;        // [JWT] Phase 2 wires storage
  caption: string;
  captured_at: string;
}

export interface ServiceTicket {
  id: string;
  ticket_no: string;
  entity_id: string;
  branch_id: string;
  customer_id: string;
  amc_record_id: string | null;
  call_type_code: string;
  channel: ServiceTicketChannel;
  severity: ServiceTicketSeverity;
  description: string;
  // SLA + escalation
  sla_response_due_at: string | null;
  sla_resolution_due_at: string | null;
  flash_timer_minutes_remaining: number;
  escalation_level: 0 | 1 | 2 | 3;
  // Assignment
  assigned_engineer_id: string | null;
  // Lifecycle timestamps
  raised_at: string;
  acked_at: string | null;
  started_at: string | null;
  on_hold_since: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  // Reopen tracking
  reopened_count: number;
  reopened_at: string | null;
  // Cross-card links
  repair_route_id: string | null;
  standby_loan_id: string | null;
  customer_in_voucher_id: string | null;
  customer_out_voucher_id: string | null;
  // HappyCode close gate
  happy_code_otp_verified: boolean;
  happy_code_feedback_id: string | null;
  // Capture
  spares_consumed: ServiceTicketSparesConsumed[];
  photos: ServiceTicketPhoto[];
  // Standard
  status: ServiceTicketStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
  audit_trail: AuditEntry[];
}

export const serviceTicketKey = (e: string): string => `servicedesk_v1_service_ticket_${e}`;
