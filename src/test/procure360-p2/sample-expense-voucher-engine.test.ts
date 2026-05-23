/**
 * sample-expense-voucher-engine.test.ts — Sprint 46 Pass 2 · B.4 + B.5
 * 25th SIBLING engine tests.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { SampleOutwardMemo } from '@/types/sample-outward-memo';
import type { DemoOutwardMemo } from '@/types/demo-outward-memo';
import type { Voucher, JournalEntry, StockEntry } from '@/types/voucher';
import {
  postSampleExpenseVoucherForSOM,
  postMarketingExpenseVoucherForDOM,
  postStockTransferForReturnedSampleSOM,
} from '@/lib/sample-expense-voucher-engine';
import { vouchersKey, journalKey, stockLedgerKey } from '@/lib/fincore-engine';

const E = 'SETEST';

function mkSOM(overrides: Partial<SampleOutwardMemo> = {}): SampleOutwardMemo {
  return {
    id: 'som-1', entity_id: E, memo_no: 'SOM/25-26/0001',
    memo_date: '2026-04-01',
    raised_by_person_id: 'u1', raised_by_person_name: 'U', raised_by_person_type: 'salesman',
    recipient_name: 'Arch A', recipient_company: null, recipient_phone: null, recipient_address: null,
    purpose: 'architect_trial', purpose_note: null,
    items: [{ id: 'i1', item_name: 'Tile', description: null, qty: 2, uom: 'NOS', unit_value: 500, amount: 1000 }],
    expect_return: false, return_due_date: null, returned_at: null, attachments: [],
    status: 'completed',
    dispatched_at: '2026-04-01T10:00:00Z',
    completed_at: '2026-04-15T10:00:00Z',
    customer_id: null, customer_name: null, salesman_id: null, salesman_name: null,
    agent_id: null, agent_name: null, broker_id: null, broker_name: null,
    engineer_emp_id: null, engineer_name: null,
    is_refundable: false,
    outward_godown_id: null, outward_godown_name: null,
    issued_by_dispatch: true, dispatch_issued_at: '2026-04-01T11:00:00Z', dispatch_issued_by: 'd1',
    unit_value: 500, total_value: 1000, pending_expense_voucher: true,
    created_at: '2026-04-01T09:00:00Z', updated_at: '2026-04-15T10:00:00Z',
    ...overrides,
  };
}

function mkDOM(overrides: Partial<DemoOutwardMemo> = {}): DemoOutwardMemo {
  return {
    id: 'dom-1', entity_id: E, memo_no: 'DOM/25-26/0001',
    memo_date: '2026-04-01',
    raised_by_person_id: 'u1', raised_by_person_name: 'U', raised_by_person_type: 'salesman',
    recipient_name: 'Prospect P', recipient_company: null, recipient_phone: null, recipient_address: null,
    items: [{ id: 'di1', item_name: 'Demo Unit', description: null, qty: 1, uom: 'NOS', serial_no: 'S001', unit_value: 25000, amount: 25000 }],
    demo_period_days: 30, demo_start_date: '2026-04-01', demo_end_date: '2026-05-01',
    return_condition: null, returned_at: null,
    converted_so_no: null, converted_at: null, lost_reason: 'no_interest',
    service_desk_ticket_id: null, attachments: [],
    status: 'lost',
    dispatched_at: '2026-04-01T10:00:00Z',
    customer_id: null, customer_name: null, salesman_id: null, salesman_name: null,
    agent_id: null, agent_name: null, broker_id: null, broker_name: null,
    engineer_emp_id: null, engineer_name: null,
    outward_godown_id: 'gd-samples', outward_godown_name: 'Samples & Demos - Out with 3rd Party',
    issued_by_dispatch: true, dispatch_issued_at: '2026-04-01T11:00:00Z', dispatch_issued_by: 'd1',
    pending_expense_voucher: true,
    created_at: '2026-04-01T09:00:00Z', updated_at: '2026-04-01T11:00:00Z',
    ...overrides,
  };
}

beforeEach(() => { localStorage.clear(); });

describe('postSampleExpenseVoucherForSOM (B.4)', () => {
  it('posts JV when status=completed AND !is_refundable AND total_value > 0', () => {
    const r = postSampleExpenseVoucherForSOM(mkSOM(), E);
    expect(r.posted).toBe(true);
    expect(r.voucher_no).toMatch(/^JV/);
  });

  it('writes voucher to vouchersKey', () => {
    postSampleExpenseVoucherForSOM(mkSOM(), E);
    const vouchers = JSON.parse(localStorage.getItem(vouchersKey(E))!) as Voucher[];
    expect(vouchers).toHaveLength(1);
    expect(vouchers[0].base_voucher_type).toBe('Journal');
    expect(vouchers[0].status).toBe('posted');
  });

  it('writes balanced Dr/Cr journal lines', () => {
    postSampleExpenseVoucherForSOM(mkSOM(), E);
    const entries = JSON.parse(localStorage.getItem(journalKey(E))!) as JournalEntry[];
    expect(entries).toHaveLength(2);
    const dr = entries.reduce((s, e) => s + e.dr_amount, 0);
    const cr = entries.reduce((s, e) => s + e.cr_amount, 0);
    expect(dr).toBe(cr);
    expect(dr).toBe(1000);
  });

  it('Dr leg is Sample Expense (Marketing)', () => {
    postSampleExpenseVoucherForSOM(mkSOM(), E);
    const entries = JSON.parse(localStorage.getItem(journalKey(E))!) as JournalEntry[];
    const dr = entries.find(e => e.dr_amount > 0)!;
    expect(dr.ledger_name).toBe('Sample Expense (Marketing)');
  });

  it('Cr leg is Sample Stock Issued', () => {
    postSampleExpenseVoucherForSOM(mkSOM(), E);
    const entries = JSON.parse(localStorage.getItem(journalKey(E))!) as JournalEntry[];
    const cr = entries.find(e => e.cr_amount > 0)!;
    expect(cr.ledger_name).toBe('Sample Stock Issued');
  });

  it('refuses when status != completed', () => {
    const r = postSampleExpenseVoucherForSOM(mkSOM({ status: 'dispatched' }), E);
    expect(r.posted).toBe(false);
    expect(r.reason).toBe('status_not_completed');
  });

  it('refuses when is_refundable=true', () => {
    const r = postSampleExpenseVoucherForSOM(mkSOM({ is_refundable: true }), E);
    expect(r.posted).toBe(false);
    expect(r.reason).toBe('is_refundable');
  });

  it('refuses when total_value=0', () => {
    const r = postSampleExpenseVoucherForSOM(mkSOM({ total_value: 0 }), E);
    expect(r.posted).toBe(false);
    expect(r.reason).toBe('zero_value');
  });

  it('uses completed_at as voucher date', () => {
    postSampleExpenseVoucherForSOM(mkSOM(), E);
    const vouchers = JSON.parse(localStorage.getItem(vouchersKey(E))!) as Voucher[];
    expect(vouchers[0].date).toBe('2026-04-15');
  });

  it('falls back to memo_date when completed_at null', () => {
    postSampleExpenseVoucherForSOM(mkSOM({ completed_at: null }), E);
    const vouchers = JSON.parse(localStorage.getItem(vouchersKey(E))!) as Voucher[];
    expect(vouchers[0].date).toBe('2026-04-01');
  });

  it('cross-references memo via ref_voucher_id/no', () => {
    postSampleExpenseVoucherForSOM(mkSOM(), E);
    const vouchers = JSON.parse(localStorage.getItem(vouchersKey(E))!) as Voucher[];
    expect(vouchers[0].ref_voucher_id).toBe('som-1');
    expect(vouchers[0].ref_voucher_no).toBe('SOM/25-26/0001');
  });

  it('entity-scopes storage', () => {
    postSampleExpenseVoucherForSOM(mkSOM(), E);
    expect(localStorage.getItem(vouchersKey('OTHER'))).toBeNull();
  });
});

describe('postMarketingExpenseVoucherForDOM (B.4)', () => {
  it('posts JV when status=lost AND pending_expense_voucher=true', () => {
    const r = postMarketingExpenseVoucherForDOM(mkDOM(), E);
    expect(r.posted).toBe(true);
  });

  it('posts JV when status=converted AND pending_expense_voucher=true', () => {
    const r = postMarketingExpenseVoucherForDOM(
      mkDOM({ status: 'converted', converted_at: '2026-04-20T00:00:00Z' }),
      E,
    );
    expect(r.posted).toBe(true);
  });

  it('refuses when status not lost/converted', () => {
    const r = postMarketingExpenseVoucherForDOM(mkDOM({ status: 'returned' }), E);
    expect(r.posted).toBe(false);
    expect(r.reason).toBe('status_not_lost_or_converted');
  });

  it('refuses when pending_expense_voucher=false', () => {
    const r = postMarketingExpenseVoucherForDOM(mkDOM({ pending_expense_voucher: false }), E);
    expect(r.posted).toBe(false);
    expect(r.reason).toBe('no_pending_hook');
  });

  it('computes amount from sum(items.amount)', () => {
    postMarketingExpenseVoucherForDOM(mkDOM(), E);
    const v = (JSON.parse(localStorage.getItem(vouchersKey(E))!) as Voucher[])[0];
    expect(v.net_amount).toBe(25000);
  });

  it('Dr leg is Marketing Expense (Demo Loss)', () => {
    postMarketingExpenseVoucherForDOM(mkDOM(), E);
    const entries = JSON.parse(localStorage.getItem(journalKey(E))!) as JournalEntry[];
    const dr = entries.find(e => e.dr_amount > 0)!;
    expect(dr.ledger_name).toBe('Marketing Expense (Demo Loss)');
  });

  it('Cr leg is Demo Stock Issued', () => {
    postMarketingExpenseVoucherForDOM(mkDOM(), E);
    const entries = JSON.parse(localStorage.getItem(journalKey(E))!) as JournalEntry[];
    const cr = entries.find(e => e.cr_amount > 0)!;
    expect(cr.ledger_name).toBe('Demo Stock Issued');
  });

  it('balanced Dr/Cr', () => {
    postMarketingExpenseVoucherForDOM(mkDOM(), E);
    const entries = JSON.parse(localStorage.getItem(journalKey(E))!) as JournalEntry[];
    const dr = entries.reduce((s, e) => s + e.dr_amount, 0);
    const cr = entries.reduce((s, e) => s + e.cr_amount, 0);
    expect(dr).toBe(cr);
  });

  it('refuses when items sum to 0', () => {
    const r = postMarketingExpenseVoucherForDOM(
      mkDOM({ items: [{ id: 'd', item_name: 'X', description: null, qty: 0, uom: 'NOS', serial_no: null, unit_value: 0, amount: 0 }] }),
      E,
    );
    expect(r.posted).toBe(false);
    expect(r.reason).toBe('zero_value');
  });
});

describe('postStockTransferForReturnedSampleSOM (B.5)', () => {
  it('posts Stock Transfer voucher when status=returned AND is_refundable=true', () => {
    const r = postStockTransferForReturnedSampleSOM(
      mkSOM({
        status: 'returned',
        is_refundable: true,
        outward_godown_id: 'gd-samples',
        outward_godown_name: 'Samples & Demos - Out with 3rd Party',
        returned_at: '2026-04-20T10:00:00Z',
      }),
      E,
    );
    expect(r.posted).toBe(true);
    expect(r.voucher_no).toMatch(/^ST/);
  });

  it('refuses when status != returned', () => {
    const r = postStockTransferForReturnedSampleSOM(
      mkSOM({ status: 'completed', is_refundable: true }), E,
    );
    expect(r.posted).toBe(false);
    expect(r.reason).toBe('status_not_returned');
  });

  it('refuses when is_refundable=false', () => {
    const r = postStockTransferForReturnedSampleSOM(
      mkSOM({ status: 'returned', is_refundable: false }), E,
    );
    expect(r.posted).toBe(false);
    expect(r.reason).toBe('not_refundable');
  });

  it('uses to_godown gd-main / Main Store (Q3=a)', () => {
    postStockTransferForReturnedSampleSOM(
      mkSOM({ status: 'returned', is_refundable: true, returned_at: '2026-04-20T10:00:00Z' }), E,
    );
    const v = (JSON.parse(localStorage.getItem(vouchersKey(E))!) as Voucher[])[0];
    expect(v.receive_dept_id).toBe('gd-main');
    expect(v.receive_dept_name).toBe('Main Store');
    expect(v.to_godown_name).toBe('Main Store');
  });

  it('from_godown comes from memo.outward_godown_*', () => {
    postStockTransferForReturnedSampleSOM(
      mkSOM({
        status: 'returned', is_refundable: true,
        outward_godown_id: 'gd-samples',
        outward_godown_name: 'Samples & Demos - Out with 3rd Party',
        returned_at: '2026-04-20T10:00:00Z',
      }), E,
    );
    const v = (JSON.parse(localStorage.getItem(vouchersKey(E))!) as Voucher[])[0];
    expect(v.dispatch_dept_id).toBe('gd-samples');
    expect(v.from_godown_name).toBe('Samples & Demos - Out with 3rd Party');
  });

  it('inventory lines mirror memo.items qty/rate', () => {
    postStockTransferForReturnedSampleSOM(
      mkSOM({ status: 'returned', is_refundable: true, returned_at: '2026-04-20T10:00:00Z' }), E,
    );
    const v = (JSON.parse(localStorage.getItem(vouchersKey(E))!) as Voucher[])[0];
    expect(v.inventory_lines).toHaveLength(1);
    expect(v.inventory_lines![0].qty).toBe(2);
    expect(v.inventory_lines![0].rate).toBe(500);
  });

  it('writes stock entries', () => {
    postStockTransferForReturnedSampleSOM(
      mkSOM({ status: 'returned', is_refundable: true, returned_at: '2026-04-20T10:00:00Z' }), E,
    );
    const stocks = JSON.parse(localStorage.getItem(stockLedgerKey(E))!) as StockEntry[];
    expect(stocks.length).toBeGreaterThan(0);
  });

  it('uses returned_at as voucher date', () => {
    postStockTransferForReturnedSampleSOM(
      mkSOM({ status: 'returned', is_refundable: true, returned_at: '2026-04-20T10:00:00Z' }), E,
    );
    const v = (JSON.parse(localStorage.getItem(vouchersKey(E))!) as Voucher[])[0];
    expect(v.date).toBe('2026-04-20');
  });

  it('base_voucher_type is Stock Transfer', () => {
    postStockTransferForReturnedSampleSOM(
      mkSOM({ status: 'returned', is_refundable: true, returned_at: '2026-04-20T10:00:00Z' }), E,
    );
    const v = (JSON.parse(localStorage.getItem(vouchersKey(E))!) as Voucher[])[0];
    expect(v.base_voucher_type).toBe('Stock Transfer');
  });

  it('uses non_gst tax type (samples are stock movement, no GST)', () => {
    postStockTransferForReturnedSampleSOM(
      mkSOM({ status: 'returned', is_refundable: true, returned_at: '2026-04-20T10:00:00Z' }), E,
    );
    const v = (JSON.parse(localStorage.getItem(vouchersKey(E))!) as Voucher[])[0];
    expect(v.inventory_lines![0].gst_type).toBe('non_gst');
  });
});

describe('structural · 25th SIBLING discipline', () => {
  it('exports 3 entry points', async () => {
    const mod = await import('@/lib/sample-expense-voucher-engine');
    expect(typeof mod.postSampleExpenseVoucherForSOM).toBe('function');
    expect(typeof mod.postMarketingExpenseVoucherForDOM).toBe('function');
    expect(typeof mod.postStockTransferForReturnedSampleSOM).toBe('function');
  });

  it('returns SampleExpenseVoucherResult-shaped object always', () => {
    const r1 = postSampleExpenseVoucherForSOM(mkSOM({ status: 'draft' }), E);
    expect(r1).toHaveProperty('posted');
    expect(r1).toHaveProperty('reason');
  });

  it('engine never throws on valid inputs', () => {
    expect(() => postSampleExpenseVoucherForSOM(mkSOM(), E)).not.toThrow();
    expect(() => postMarketingExpenseVoucherForDOM(mkDOM(), E)).not.toThrow();
    expect(() =>
      postStockTransferForReturnedSampleSOM(
        mkSOM({ status: 'returned', is_refundable: true, returned_at: '2026-04-20T10:00:00Z' }), E,
      ),
    ).not.toThrow();
  });
});
