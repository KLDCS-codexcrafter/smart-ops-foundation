/**
 * Sprint T-Phase-1.C.1a · Block I.2 · ServiceDesk bridges tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  consumeSalesInvoiceForAMC,
  consumeReceiptForAMCPayment,
  consumeSiteXCommissioningForAMC,
  consumeInternalTicketEscalation,
  consumeMaintainProPMScheduleForAutoTicket,
  consumeCallTypeConfigUpdate,
  consumeRiskWeightsUpdate,
  consumeAMCReminderFromCalendar,
  consumeAMCEnquiryFromCustomerHub,
} from '@/lib/servicedesk-bridges';

const at = new Date().toISOString();
beforeEach(() => localStorage.clear());

describe('servicedesk-bridges · 9 INBOUND consumers', () => {
  it('consumes SalesX invoice → creates AMC applicability_pending record', () => {
    const rec = consumeSalesInvoiceForAMC({
      type: 'salesx:invoice.send_to_amc',
      sales_invoice_id: 'INV-1', entity_id: 'OPRX', branch_id: 'BR-1',
      customer_id: 'C-1', invoice_value_paise: 100000, oem_name: 'Voltas', emitted_at: at,
    });
    expect(rec.status).toBe('applicability_pending');
    expect(rec.sales_invoice_id).toBe('INV-1');
  });
  it('handles ReceivX AMC payment (returns null if record absent)', () => {
    const result = consumeReceiptForAMCPayment({
      type: 'receivx:receipt.amc_payment',
      receipt_id: 'R-1', amc_record_id: 'amc-missing', paid_amount_paise: 50000, emitted_at: at,
    });
    expect(result).toBeNull();
  });
  it('consumes SiteX commissioning handoff with entity/branch from event', () => {
    const rec = consumeSiteXCommissioningForAMC({
      type: 'sitex:commissioning.handoff', site_id: 'S-1',
      entity_id: 'OPRX', branch_id: 'BR-MUM',
      customer_id: 'C-1', capex_value_paise: 5000000, equipment_name: 'AC-1',
      installation_date: '2026-05-01', warranty_end: '2027-05-01', oem_name: 'Daikin', emitted_at: at,
    });
    expect(rec.oem_name).toBe('Daikin');
    expect(rec.entity_id).toBe('OPRX');
    expect(rec.branch_id).toBe('BR-MUM');
  });
  it('ack MaintainPro escalation', () => {
    const r = consumeInternalTicketEscalation({
      type: 'maintenance:ticket.escalated', ticket_id: 'TK-1', ticket_no: 'TK/001',
      escalation_level: 2, category: 'electrical', severity: 'high', emitted_at: at,
    });
    expect(r.ack).toBe(true);
  });
  it('ack MaintainPro PM schedule', () => {
    expect(consumeMaintainProPMScheduleForAutoTicket({ type: 'maintenance:pm.schedule_due', pm_template_id: 'PM-1', customer_id: 'C-1', scheduled_date: '2026-06-01', emitted_at: at }).ack).toBe(true);
  });
  it('ack CC call type update', () => {
    expect(consumeCallTypeConfigUpdate({ type: 'cc:call_type.updated', call_type_code: 'REPAIR', emitted_at: at }).ack).toBe(true);
  });
  it('ack risk weights update', () => {
    expect(consumeRiskWeightsUpdate({ type: 'cc:risk_weights.updated', entity_id: 'OPRX', emitted_at: at }).ack).toBe(true);
  });
  it('ack AMC reminder from calendar', () => {
    expect(consumeAMCReminderFromCalendar({ type: 'calendar:amc.reminder', amc_record_id: 'amc-1', reminder_window_days: 30, emitted_at: at }).ack).toBe(true);
  });
  it('ack AMC enquiry from Customer Hub', () => {
    expect(consumeAMCEnquiryFromCustomerHub({ type: 'customer_hub:amc.enquiry', customer_id: 'C-1', enquiry_notes: 'test', emitted_at: at }).ack).toBe(true);
  });
});
