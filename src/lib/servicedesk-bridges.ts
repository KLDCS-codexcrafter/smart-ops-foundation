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
import type { AMCRecord, TellicallerWorkItemEvent } from '@/types/servicedesk';

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
// C.1b · OUTBOUND bridge event payload types · 6 LIVE
// ============================================================================
export interface AMCInvoicePostToFinCoreEvent {
  type: 'servicedesk:amc_invoice.post';
  amc_record_id: string;
  invoice_no: string;
  voucher_type_id:
    | 'vt-amc-invoice'
    | 'vt-amc-receipt'
    | 'vt-amc-proposal'
    | 'vt-service-invoice'
    | 'vt-oem-claim-cn';
  entity_id: string;
  branch_id: string;
  amount_paise: number;
  emitted_at: string;
  originating_card_id: 'servicedesk';
}

export interface CommissionToPeoplePayEvent {
  type: 'servicedesk:commission.accrue';
  amc_record_id: string;
  entity_id: string;
  payee_id: string;
  payee_role: 'salesman' | 'receiver' | 'amc';
  amount_paise: number;
  basis_invoice_id: string;
  emitted_at: string;
  originating_card_id: 'servicedesk';
}

export interface SalesmanActivityToSalesXEvent {
  type: 'servicedesk:salesman.activity';
  amc_record_id: string;
  salesman_id: string;
  activity_type: 'renewal_call' | 'proposal_meeting' | 'site_visit' | 'follow_up';
  notes: string;
  emitted_at: string;
  originating_card_id: 'servicedesk';
}

export interface RenewalEmailToTemplateEngineEvent {
  type: 'servicedesk:renewal_email.send';
  amc_record_id: string;
  customer_id: string;
  template_id: string;
  cascade_stage: 'first' | 'second' | 'third' | 'final';
  language: string;
  emitted_at: string;
  originating_card_id: 'servicedesk';
}

export interface AMCReminderToCalendarEvent {
  type: 'servicedesk:amc_reminder.create';
  amc_record_id: string;
  reminder_date: string;
  reminder_type: 'renewal_window' | 'service_due' | 'inspection_due';
  notes: string;
  emitted_at: string;
  originating_card_id: 'servicedesk';
}

// ============================================================================
// 6 OUTBOUND emit functions · LIVE at C.1b · FR-19 sibling sequencing
// ============================================================================

/** OUTBOUND 1 · ServiceDesk → FinCore · AMC billing event (D-NEW-CM "Fin Core" naming compliance) */
export function emitAMCInvoiceToFinCore(
  payload: Omit<AMCInvoicePostToFinCoreEvent, 'type' | 'emitted_at' | 'originating_card_id'>,
): AMCInvoicePostToFinCoreEvent {
  const event: AMCInvoicePostToFinCoreEvent = {
    type: 'servicedesk:amc_invoice.post',
    emitted_at: new Date().toISOString(),
    originating_card_id: 'servicedesk',
    ...payload,
  };
  // [JWT] Phase 2: eventBus.emit(event.type, event)
  return event;
}

/** OUTBOUND 2 · ServiceDesk → PeoplePay · 3-role commission accrual */
export function emitCommissionToPeoplePay(
  payload: Omit<CommissionToPeoplePayEvent, 'type' | 'emitted_at' | 'originating_card_id'>,
): CommissionToPeoplePayEvent {
  const event: CommissionToPeoplePayEvent = {
    type: 'servicedesk:commission.accrue',
    emitted_at: new Date().toISOString(),
    originating_card_id: 'servicedesk',
    ...payload,
  };
  // [JWT] Phase 2: eventBus.emit
  return event;
}

/** OUTBOUND 3 · ServiceDesk → SalesX (D-NEW-DJ Three-Layer · Layer 2 emit · ⭐ Layer 3 first execution at C.1b) */
export function emitTellicallerWorkItem(
  payload: Omit<TellicallerWorkItemEvent, 'type' | 'emitted_at' | 'originating_card_id'>,
): TellicallerWorkItemEvent {
  const event: TellicallerWorkItemEvent = {
    type: 'tellicaller:work_item.created',
    emitted_at: new Date().toISOString(),
    originating_card_id: 'servicedesk',
    ...payload,
  };
  // [JWT] Phase 2: eventBus.emit · C.1b wires SalesX consumer stub for D-NEW-DJ validation
  consumeTellicallerWorkItemFromServiceDesk(event);
  return event;
}

/** OUTBOUND 4 · ServiceDesk → SalesX · Engineer renewal-call activity → Sales activity log */
export function emitSalesmanActivityToSalesX(
  payload: Omit<SalesmanActivityToSalesXEvent, 'type' | 'emitted_at' | 'originating_card_id'>,
): SalesmanActivityToSalesXEvent {
  const event: SalesmanActivityToSalesXEvent = {
    type: 'servicedesk:salesman.activity',
    emitted_at: new Date().toISOString(),
    originating_card_id: 'servicedesk',
    ...payload,
  };
  // [JWT] Phase 2: eventBus.emit
  return event;
}

/** OUTBOUND 5 · ServiceDesk → CC Email Template Engine · Renewal cascade trigger */
export function emitRenewalEmailToTemplateEngine(
  payload: Omit<RenewalEmailToTemplateEngineEvent, 'type' | 'emitted_at' | 'originating_card_id'>,
): RenewalEmailToTemplateEngineEvent {
  const event: RenewalEmailToTemplateEngineEvent = {
    type: 'servicedesk:renewal_email.send',
    emitted_at: new Date().toISOString(),
    originating_card_id: 'servicedesk',
    ...payload,
  };
  // [JWT] Phase 2: eventBus.emit · Email Template Engine subscribes
  return event;
}

/** OUTBOUND 6 · ServiceDesk → Calendar · AMC reminder calendar entry */
export function emitAMCReminderToCalendar(
  payload: Omit<AMCReminderToCalendarEvent, 'type' | 'emitted_at' | 'originating_card_id'>,
): AMCReminderToCalendarEvent {
  const event: AMCReminderToCalendarEvent = {
    type: 'servicedesk:amc_reminder.create',
    emitted_at: new Date().toISOString(),
    originating_card_id: 'servicedesk',
    ...payload,
  };
  // [JWT] Phase 2: eventBus.emit · Calendar card subscribes
  return event;
}

// ============================================================================
// 1 OUTBOUND bridge · PLANNED for C.1e+ (1 was promoted to LIVE at C.1d below)
// ============================================================================
/* C.1c+ · emitInternalNumberToInventoryHub  — Serial registry (planned · C.1e if needed) */
/* C.1e · emitCustomerHealthScoreToInsightX — Cross-card 360° */

// ============================================================================
// D-NEW-DJ Three-Layer Pattern · Layer 3 stub consumer (SalesX side · stub at C.1b)
// FR-72 promotion path: 3 consumers at C.1b · 4th at C.1c · FR-79 at C.2
// [JWT] Phase 2: SalesX wires real work-item entity · Phase 1.B-C territory
// ============================================================================
const tellicallerStubKey = 'salesx_tellicaller_stub_v1';

interface TellicallerStubEntry {
  work_item_id: string;
  amc_record_id: string;
  customer_id: string;
  originating_card_id: string;
  received_at: string;
}

export function consumeTellicallerWorkItemFromServiceDesk(
  event: TellicallerWorkItemEvent,
): { ack: true; stubbed: true; work_item_id: string } {
  try {
    const raw = localStorage.getItem(tellicallerStubKey);
    const list: TellicallerStubEntry[] = raw ? JSON.parse(raw) : [];
    list.push({
      work_item_id: event.work_item_id,
      amc_record_id: event.amc_record_id,
      customer_id: event.customer_id,
      originating_card_id: event.originating_card_id,
      received_at: new Date().toISOString(),
    });
    localStorage.setItem(tellicallerStubKey, JSON.stringify(list));
  } catch {
    /* quota silent */
  }
  return { ack: true, stubbed: true, work_item_id: event.work_item_id };
}

export function listSalesXTellicallerStubs(): TellicallerStubEntry[] {
  try {
    const raw = localStorage.getItem(tellicallerStubKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ============================================================================
// C.1c · 3 NEW OUTBOUND bridges LIVE (D-NEW-DJ 4th consumer · FR-72 promotion ⭐)
// ============================================================================

export interface ServiceTicketToMaintainProEvent {
  type: 'servicedesk:service_ticket.route_in_house';
  service_ticket_id: string;
  service_ticket_no: string;
  customer_id: string;
  equipment_serial: string;
  category: string;
  severity: string;
  emitted_at: string;
  originating_card_id: 'servicedesk';
}

export interface FinalInvoiceToFinCoreEvent {
  type: 'servicedesk:final_invoice.post';
  service_ticket_id: string;
  customer_out_voucher_id: string;
  entity_id: string;
  branch_id: string;
  voucher_type_id: 'vt-customer-out';
  amount_paise: number;
  emitted_at: string;
  originating_card_id: 'servicedesk';
}

export interface SparesIssueToInventoryHubEvent {
  type: 'servicedesk:spares_issue.field';
  spares_issue_id: string;
  spare_id: string;
  qty: number;
  engineer_id: string;
  emitted_at: string;
  originating_card_id: 'servicedesk';
}

/** OUTBOUND 7 · ServiceDesk → MaintainPro · 4-Way Repair In-House route (⭐ D-NEW-DJ 4th consumer · FR-72 threshold) */
export function emitServiceTicketToMaintainPro(
  payload: Omit<ServiceTicketToMaintainProEvent, 'type' | 'emitted_at' | 'originating_card_id'>,
): ServiceTicketToMaintainProEvent {
  const event: ServiceTicketToMaintainProEvent = {
    type: 'servicedesk:service_ticket.route_in_house',
    emitted_at: new Date().toISOString(),
    originating_card_id: 'servicedesk',
    ...payload,
  };
  // [JWT] Phase 2: eventBus.emit · C.1c wires MaintainPro consumer stub for D-NEW-DJ 4th consumer
  consumeServiceTicketFromServiceDesk(event);
  return event;
}

/** OUTBOUND 8 · ServiceDesk → FinCore · Final invoice on Customer-Out */
export function emitFinalInvoiceToFinCore(
  payload: Omit<FinalInvoiceToFinCoreEvent, 'type' | 'emitted_at' | 'originating_card_id'>,
): FinalInvoiceToFinCoreEvent {
  const event: FinalInvoiceToFinCoreEvent = {
    type: 'servicedesk:final_invoice.post',
    emitted_at: new Date().toISOString(),
    originating_card_id: 'servicedesk',
    ...payload,
  };
  // [JWT] Phase 2: eventBus.emit
  return event;
}

/** OUTBOUND 9 · ServiceDesk → InventoryHub · Spares issued from field */
export function emitSparesIssueToInventoryHub(
  payload: Omit<SparesIssueToInventoryHubEvent, 'type' | 'emitted_at' | 'originating_card_id'>,
): SparesIssueToInventoryHubEvent {
  const event: SparesIssueToInventoryHubEvent = {
    type: 'servicedesk:spares_issue.field',
    emitted_at: new Date().toISOString(),
    originating_card_id: 'servicedesk',
    ...payload,
  };
  // [JWT] Phase 2: eventBus.emit · InventoryHub stock decrement
  return event;
}

// ============================================================================
// MaintainPro stub consumer (D-NEW-DJ Layer 3 · 4th consumer ⭐)
// FR-72 promotion threshold MET when this lands · D-NEW-DJ promotes to FR-75 canonical
// [JWT] Phase 2: MaintainPro wires real Internal Helpdesk ticket creation
// ============================================================================
const maintainproServiceDeskTicketKey = 'maintainpro_servicedesk_ticket_stub_v1';

interface MaintainProTicketStubEntry {
  service_ticket_id: string;
  service_ticket_no: string;
  customer_id: string;
  equipment_serial: string;
  received_at: string;
}

export function consumeServiceTicketFromServiceDesk(
  event: ServiceTicketToMaintainProEvent,
): { ack: true; stubbed: true; service_ticket_id: string } {
  try {
    const raw = localStorage.getItem(maintainproServiceDeskTicketKey);
    const list: MaintainProTicketStubEntry[] = raw ? JSON.parse(raw) : [];
    list.push({
      service_ticket_id: event.service_ticket_id,
      service_ticket_no: event.service_ticket_no,
      customer_id: event.customer_id,
      equipment_serial: event.equipment_serial,
      received_at: new Date().toISOString(),
    });
    localStorage.setItem(maintainproServiceDeskTicketKey, JSON.stringify(list));
  } catch {
    /* quota silent */
  }
  return { ack: true, stubbed: true, service_ticket_id: event.service_ticket_id };
}

export function listMaintainProServiceDeskTicketStubs(): MaintainProTicketStubEntry[] {
  try {
    const raw = localStorage.getItem(maintainproServiceDeskTicketKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
