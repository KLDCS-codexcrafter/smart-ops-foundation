/**
 * @file        src/test/customer-voucher-spares.test.ts
 * @purpose     CustomerIn/Out vouchers + SparesIssue + bridge emissions
 * @sprint      T-Phase-1.C.1c · Block H.4
 * @iso        Reliability + Functional Suitability
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCustomerInVoucher,
  createCustomerOutVoucher,
  listCustomerInVouchers,
  listCustomerOutVouchers,
  createSparesIssue,
  listSparesForTicket,
  listAllSparesIssues,
} from '@/lib/servicedesk-engine';
import {
  emitFinalInvoiceToFinCore,
  emitSparesIssueToInventoryHub,
} from '@/lib/servicedesk-bridges';
import { DEFAULT_NON_FINECORE_VOUCHER_TYPES } from '@/lib/non-fincore-voucher-type-registry';

const ENTITY = 'OPRX';

describe('Customer vouchers + Spares', () => {
  beforeEach(() => localStorage.clear());

  it('voucher type registry includes customer_in and customer_out', () => {
    const ids = DEFAULT_NON_FINECORE_VOUCHER_TYPES.map((v) => v.id);
    expect(ids).toContain('vt-customer-in');
    expect(ids).toContain('vt-customer-out');
  });

  it('createCustomerInVoucher emits CIN no with sequence', () => {
    const v = createCustomerInVoucher({
      entity_id: ENTITY,
      ticket_id: 'st-001',
      customer_id: 'CUST-001',
      equipment_serial: 'SN-1',
      condition_notes: 'cracked panel',
      received_by: 'desk_user',
      received_at: new Date().toISOString(),
      photos: [],
    });
    expect(v.voucher_no).toMatch(/^CIN\/OPRX\/000001$/);
    expect(listCustomerInVouchers(ENTITY)).toHaveLength(1);
  });

  it('createCustomerOutVoucher + FinCore bridge round-trip', () => {
    const v = createCustomerOutVoucher({
      entity_id: ENTITY,
      branch_id: 'BR-1',
      ticket_id: 'st-001',
      customer_id: 'CUST-001',
      equipment_serial: 'SN-1',
      delivered_by: 'ENG-1',
      amount_paise: 350000,
      gst_paise: 63000,
      total_paise: 413000,
      created_by: 'desk_user',
    });
    expect(v.voucher_no).toMatch(/^COUT/);
    expect(listCustomerOutVouchers(ENTITY)).toHaveLength(1);
    const ev = emitFinalInvoiceToFinCore({
      service_ticket_id: 'st-001',
      customer_out_voucher_id: v.id,
      entity_id: ENTITY,
      branch_id: 'BR-1',
      voucher_type_id: 'vt-customer-out',
      amount_paise: 413000,
    });
    expect(ev.type).toBe('servicedesk:final_invoice.post');
    expect(ev.amount_paise).toBe(413000);
  });

  it('createSparesIssue + InventoryHub bridge', () => {
    const s = createSparesIssue({
      entity_id: ENTITY,
      ticket_id: 'st-001',
      spare_id: 'SP-1',
      spare_name: 'Capacitor 50uF',
      qty: 2,
      unit_cost_paise: 12000,
      total_cost_paise: 24000,
      engineer_id: 'ENG-1',
      van_stock_id: 'VAN-1',
      billable_to_customer: true,
      issued_at: new Date().toISOString(),
    });
    expect(s.id).toMatch(/^sp/);
    expect(listSparesForTicket('st-001', ENTITY)).toHaveLength(1);
    expect(listAllSparesIssues(ENTITY)).toHaveLength(1);
    const ev = emitSparesIssueToInventoryHub({
      spares_issue_id: s.id,
      spare_id: 'SP-1',
      qty: 2,
      engineer_id: 'ENG-1',
    });
    expect(ev.type).toBe('servicedesk:spares_issue.field');
  });
});
