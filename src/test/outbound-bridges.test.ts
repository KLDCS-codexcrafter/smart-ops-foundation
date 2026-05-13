/**
 * @file        src/test/outbound-bridges.test.ts
 * @sprint      T-Phase-1.C.1b · Block I.5 · D-NEW-DJ Layer 3 validation
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  emitAMCInvoiceToFinCore,
  emitCommissionToPeoplePay,
  emitTellicallerWorkItem,
  emitSalesmanActivityToSalesX,
  emitRenewalEmailToTemplateEngine,
  emitAMCReminderToCalendar,
  consumeTellicallerWorkItemFromServiceDesk,
  listSalesXTellicallerStubs,
} from '@/lib/servicedesk-bridges';

beforeEach(() => localStorage.clear());

describe('6 OUTBOUND emit functions · LIVE at C.1b', () => {
  it('emitAMCInvoiceToFinCore returns event with correct envelope', () => {
    const e = emitAMCInvoiceToFinCore({
      amc_record_id: 'a-1', invoice_no: 'AI/1', voucher_type_id: 'vt-amc-invoice',
      entity_id: 'OPRX', branch_id: 'BR-1', amount_paise: 1000,
    });
    expect(e.type).toBe('servicedesk:amc_invoice.post');
    expect(e.originating_card_id).toBe('servicedesk');
    expect(e.emitted_at).toBeTruthy();
  });
  it('emitCommissionToPeoplePay envelope', () => {
    const e = emitCommissionToPeoplePay({
      amc_record_id: 'a', entity_id: 'OPRX', payee_id: 'p', payee_role: 'salesman',
      amount_paise: 100, basis_invoice_id: 'INV',
    });
    expect(e.type).toBe('servicedesk:commission.accrue');
  });
  it('emitTellicallerWorkItem invokes Layer 3 stub consumer (D-NEW-DJ first execution)', () => {
    const e = emitTellicallerWorkItem({
      work_item_id: 'wi-1', customer_id: 'c-1', amc_record_id: 'a-1',
      trigger_reason: 'cascade_first', priority: 'medium', script_id: 's',
      language_pref: 'hi', assigned_telecaller_id: null,
    });
    expect(e.originating_card_id).toBe('servicedesk');
    const stubs = listSalesXTellicallerStubs();
    expect(stubs).toHaveLength(1);
    expect(stubs[0].work_item_id).toBe('wi-1');
  });
  it('emitSalesmanActivityToSalesX envelope', () => {
    const e = emitSalesmanActivityToSalesX({
      amc_record_id: 'a', salesman_id: 's', activity_type: 'renewal_call', notes: 'n',
    });
    expect(e.type).toBe('servicedesk:salesman.activity');
  });
  it('emitRenewalEmailToTemplateEngine envelope', () => {
    const e = emitRenewalEmailToTemplateEngine({
      amc_record_id: 'a', customer_id: 'c', template_id: 't', cascade_stage: 'first', language: 'hi',
    });
    expect(e.type).toBe('servicedesk:renewal_email.send');
  });
  it('emitAMCReminderToCalendar envelope', () => {
    const e = emitAMCReminderToCalendar({
      amc_record_id: 'a', reminder_date: '2026-06-01', reminder_type: 'renewal_window', notes: 'n',
    });
    expect(e.type).toBe('servicedesk:amc_reminder.create');
  });
  it('consumeTellicallerWorkItemFromServiceDesk returns ack+stubbed', () => {
    const e = emitTellicallerWorkItem({
      work_item_id: 'wi-2', customer_id: 'c', amc_record_id: 'a',
      trigger_reason: 'r', priority: 'low', script_id: 's', language_pref: 'hi', assigned_telecaller_id: null,
    });
    const r = consumeTellicallerWorkItemFromServiceDesk(e);
    expect(r.ack).toBe(true);
    expect(r.stubbed).toBe(true);
  });
});
