/**
 * @file        src/lib/servicedesk-bridges.ts
 * @purpose     ServiceDesk cross-card bridges · 9 INBOUND active + 10 OUTBOUND planned
 * @sprint      T-Phase-1.C.1a · Block C · v2 spec · Q-LOCK-7
 * @decisions   D-NEW-DJ Three-Layer Tellicaller POSSIBLE 32nd · Layer 2 emit
 * @iso        Compatibility + Maintainability
 * @disciplines FR-19 sibling · FR-53 inter-dept · FR-73.1 absolute
 * @reuses      Pattern matches sitex-bridges.ts + maintainpro-bridges.ts (sibling)
 * @[JWT]       Phase 2 eventBus.emit wires real cross-card subscribers
 */

import { createAMCRecord, updateAMCRecord } from './servicedesk-engine';
import type { AMCRecord } from '@/types/servicedesk';

// ============================================================================
// Bridge event payload types
// ============================================================================
export interface SalesInvoiceForAMCEvent {
  type: 'salesx:invoice.send_to_amc';
  sales_invoice_id: string;
  entity_id: string;
  branch_id: string;
  customer_id: string;
  invoice_value_paise: number;
  oem_name: string;
  emitted_at: string;
}

export interface ReceiptForAMCPaymentEvent {
  type: 'receivx:receipt.amc_payment';
  receipt_id: string;
  amc_record_id: string;
  paid_amount_paise: number;
  emitted_at: string;
}

export interface SiteXCommissioningHandoffEvent {
  type: 'sitex:commissioning.handoff';
  site_id: string;
  entity_id: string;
  branch_id: string;
  customer_id: string;
  capex_value_paise: number;
  equipment_name: string;
  installation_date: string;
  warranty_end: string;
  oem_name: string;
  emitted_at: string;
}

export interface MaintainProTicketEscalationEvent {
  type: 'maintenance:ticket.escalated';
  ticket_id: string;
  ticket_no: string;
  escalation_level: 1 | 2 | 3;
  category: string;
  severity: string;
  emitted_at: string;
}

export interface MaintainProPMScheduleEvent {
  type: 'maintenance:pm.schedule_due';
  pm_template_id: string;
  customer_id: string;
  scheduled_date: string;
  emitted_at: string;
}

export interface CallTypeConfigUpdateEvent {
  type: 'cc:call_type.updated';
  call_type_code: string;
  emitted_at: string;
}

export interface RiskWeightsUpdateEvent {
  type: 'cc:risk_weights.updated';
  entity_id: string;
  emitted_at: string;
}

export interface AMCReminderEvent {
  type: 'calendar:amc.reminder';
  amc_record_id: string;
  reminder_window_days: number;
  emitted_at: string;
}

export interface AMCEnquiryFromCustomerHubEvent {
  type: 'customer_hub:amc.enquiry';
  customer_id: string;
  enquiry_notes: string;
  emitted_at: string;
}

// ============================================================================
// 9 INBOUND bridges · ACTIVE at C.1a
// ============================================================================

/** BRIDGE 1 · SalesX → ServiceDesk · "send to AMC team" trigger */
export function consumeSalesInvoiceForAMC(event: SalesInvoiceForAMCEvent): AMCRecord {
  return createAMCRecord({
    entity_id: event.entity_id,
    branch_id: event.branch_id,
    customer_id: event.customer_id,
    sales_invoice_id: event.sales_invoice_id,
    amc_applicable: null,
    applicability_decided_at: null,
    applicability_decided_by: null,
    applicability_reason: '',
    amc_code: '',
    amc_type: 'comprehensive',
    contract_start: null,
    contract_end: null,
    billing_cycle: 'upfront',
    contract_value_paise: 0,
    billed_to_date_paise: 0,
    outstanding_paise: 0,
    commission_salesman_pct: 0,
    commission_receiver_pct: 0,
    commission_amc_pct: 0,
    risk_score: 0,
    risk_bucket: 'low',
    renewal_probability: 0,
    status: 'applicability_pending',
    lifecycle_stage: 'applicability_decision',
    oem_name: event.oem_name,
    oem_sla_hours: null,
    iot_device_ids: [],
    whatsapp_lifecycle_phase: 'post_install',
    created_by: 'system_bridge',
  });
}

/** BRIDGE 2 · ReceivX → ServiceDesk · AMC payment tracking */
export function consumeReceiptForAMCPayment(event: ReceiptForAMCPaymentEvent): AMCRecord | null {
  // Phase 1 stub · Phase 2 reads engine + decrements outstanding
  try {
    return updateAMCRecord(
      event.amc_record_id,
      { billed_to_date_paise: event.paid_amount_paise },
      'system_bridge',
    );
  } catch {
    return null;
  }
}

/** BRIDGE 3 · SiteX → ServiceDesk · CAPEX install → AMC eligibility (A.15a emitServiceDeskHandoff consumer) */
export function consumeSiteXCommissioningForAMC(
  event: SiteXCommissioningHandoffEvent,
): AMCRecord {
  return createAMCRecord({
    entity_id: event.entity_id,
    branch_id: event.branch_id,
    customer_id: event.customer_id,
    sales_invoice_id: null,
    amc_applicable: null,
    applicability_decided_at: null,
    applicability_decided_by: null,
    applicability_reason: `SiteX commissioning handoff · site ${event.site_id}`,
    amc_code: '',
    amc_type: 'comprehensive',
    contract_start: event.warranty_end,
    contract_end: null,
    billing_cycle: 'upfront',
    contract_value_paise: 0,
    billed_to_date_paise: 0,
    outstanding_paise: 0,
    commission_salesman_pct: 0,
    commission_receiver_pct: 0,
    commission_amc_pct: 0,
    risk_score: 0,
    risk_bucket: 'low',
    renewal_probability: 0,
    status: 'applicability_pending',
    lifecycle_stage: 'applicability_decision',
    oem_name: event.oem_name,
    oem_sla_hours: null,
    iot_device_ids: [],
    whatsapp_lifecycle_phase: 'post_install',
    created_by: 'system_bridge',
  });
}

/** BRIDGE 4 · MaintainPro → ServiceDesk · Internal helpdesk escalation
 *  STATUS: registered · stub-only at C.1a · payload-consuming wiring lands in C.1c when ServiceTicket entity exists.
 */
export function consumeInternalTicketEscalation(
  event: MaintainProTicketEscalationEvent,
): { ack: true; ticket_id: string } {
  // [JWT] C.1c wires actual ServiceTicket creation here
  return { ack: true, ticket_id: event.ticket_id };
}

/** BRIDGE 5 · MaintainPro → ServiceDesk · Auto-PMS (Sangam S8)
 *  STATUS: registered · stub-only at C.1a · payload-consuming wiring lands in C.1c (ticket auto-create from PM).
 */
export function consumeMaintainProPMScheduleForAutoTicket(
  event: MaintainProPMScheduleEvent,
): { ack: true; pm_template_id: string } {
  return { ack: true, pm_template_id: event.pm_template_id };
}

/** BRIDGE 6 · CC → ServiceDesk · Call Type config propagation (FR-12)
 *  STATUS: registered · stub-only at C.1a · payload-consuming wiring lands in C.1b (config replication).
 */
export function consumeCallTypeConfigUpdate(
  event: CallTypeConfigUpdateEvent,
): { ack: true; call_type_code: string } {
  return { ack: true, call_type_code: event.call_type_code };
}

/** BRIDGE 7 · CC → ServiceDesk · Risk weights config propagation
 *  STATUS: registered · stub-only at C.1a · payload-consuming wiring lands in C.1b (re-score on update).
 */
export function consumeRiskWeightsUpdate(
  event: RiskWeightsUpdateEvent,
): { ack: true; entity_id: string } {
  return { ack: true, entity_id: event.entity_id };
}

/** BRIDGE 8 · Calendar → ServiceDesk · AMC reminder
 *  STATUS: registered · stub-only at C.1a · payload-consuming wiring lands in C.1b (renewal cascade).
 */
export function consumeAMCReminderFromCalendar(
  event: AMCReminderEvent,
): { ack: true; amc_record_id: string } {
  return { ack: true, amc_record_id: event.amc_record_id };
}

/** BRIDGE 9 · Customer Hub → ServiceDesk · Self-service AMC enquiry (FR-13)
 *  STATUS: registered · stub-only at C.1a · payload-consuming wiring lands in C.1b (enquiry queue).
 */
export function consumeAMCEnquiryFromCustomerHub(
  event: AMCEnquiryFromCustomerHubEvent,
): { ack: true; customer_id: string } {
  return { ack: true, customer_id: event.customer_id };
}

// ============================================================================
// 10 OUTBOUND bridges · PLANNED for C.1b-C.1f activation (signatures only)
// ============================================================================

/* C.1b · emitAMCInvoiceToFinCore       — AMC billing → FinCore voucher post */
/* C.1b · emitCommissionToPeoplePay      — Commission accrual → PeoplePay payroll */
/* C.1b · emitTellicallerWorkItem        — D-NEW-DJ Layer 2 first execution · POSSIBLE 32nd */
/* C.1b · emitSalesmanActivityToSalesX   — Engineer activity → Sales activity log */
/* C.1b · emitRenewalEmailToTemplateEngine — Renewal cascade email send */
/* C.1b · emitAMCReminderToCalendar      — AMC reminder calendar entry */
/* C.1c · emitServiceTicketToMaintainPro — 4-Way Repair In-House route */
/* C.1d · emitOEMClaimPacketToProcure360 — D-NEW-DJ 4th consumer · FR-79 promotion */
/* C.1c · emitInternalNumberToInventoryHub — Serial registry */
/* C.1d · emitCustomerHealthScoreToInsightX — Cross-card 360° */
