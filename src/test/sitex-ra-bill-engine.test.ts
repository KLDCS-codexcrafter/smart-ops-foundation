/**
 * sitex-ra-bill-engine.test.ts — A.15b T2 catch-up · Block G.2
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRABill, addRABillLineItem, submitForApproval, approveRABill, markPaid,
  listRABills,
} from '@/lib/sitex-ra-bill-engine';
import { siteRaBillsKey, raBillLinesKey, raBillApprovalsKey } from '@/types/sitex';

const E = 'TEST';
beforeEach(() => {
  localStorage.removeItem(siteRaBillsKey(E));
  localStorage.removeItem(raBillLinesKey(E));
  localStorage.removeItem(raBillApprovalsKey(E));
});

const mkInput = (vt: 'supplier' | 'sub_contractor' | 'transporter'): Parameters<typeof createRABill>[1] => ({
  site_id: 'SITE-1', vendor_id: 'V-1', vendor_type: vt,
  bill_no: 'RA-001', period_from: '2026-05-01', period_to: '2026-05-31',
});

describe('sitex-ra-bill-engine', () => {
  it('creates RA bill when vendor_type=sub_contractor', () => {
    const r = createRABill(E, mkInput('sub_contractor'));
    expect(r.allowed).toBe(true);
  });
  it('REJECTS vendor_type=supplier', () => {
    expect(createRABill(E, mkInput('supplier')).allowed).toBe(false);
  });
  it('REJECTS vendor_type=transporter', () => {
    expect(createRABill(E, mkInput('transporter')).allowed).toBe(false);
  });
  it('addRABillLineItem computes amount = qty × rate', () => {
    const r = createRABill(E, mkInput('sub_contractor'));
    const line = addRABillLineItem(E, r.ra_bill_id!, {
      description: 'concreting', uom: 'cum',
      quantity_this_period: 10, rate_per_unit: 5000, notes: '',
    });
    expect(line.allowed).toBe(true);
    expect(listRABills(E)[0].total_value).toBe(50000);
  });
  it('cumulative_quantity accumulates across line items', () => {
    const r = createRABill(E, mkInput('sub_contractor'));
    addRABillLineItem(E, r.ra_bill_id!, {
      description: 'X', uom: 'nos', quantity_this_period: 5, rate_per_unit: 100, notes: '',
    });
    addRABillLineItem(E, r.ra_bill_id!, {
      description: 'X', uom: 'nos', quantity_this_period: 3, rate_per_unit: 100, notes: '',
    });
    expect(listRABills(E)[0].total_value).toBe(800);
  });
  it('submitForApproval transitions draft → submitted', () => {
    const r = createRABill(E, mkInput('sub_contractor'));
    expect(submitForApproval(E, r.ra_bill_id!, 'mgr').allowed).toBe(true);
    expect(listRABills(E)[0].status).toBe('submitted');
  });
  it('approveRABill submitted → approved', () => {
    const r = createRABill(E, mkInput('sub_contractor'));
    submitForApproval(E, r.ra_bill_id!, 'mgr');
    expect(approveRABill(E, r.ra_bill_id!, 'fin', '').allowed).toBe(true);
    expect(listRABills(E)[0].status).toBe('approved');
  });
  it('markPaid approved → paid with payment voucher link', () => {
    const r = createRABill(E, mkInput('sub_contractor'));
    submitForApproval(E, r.ra_bill_id!, 'mgr');
    approveRABill(E, r.ra_bill_id!, 'fin', '');
    expect(markPaid(E, r.ra_bill_id!, 'VOU-1').allowed).toBe(true);
    expect(listRABills(E)[0].status).toBe('paid');
  });
});
