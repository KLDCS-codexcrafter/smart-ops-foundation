/**
 * @file        src/lib/sample-expense-voucher-engine.ts
 * @purpose     Sprint 46 Pass 2 · B.4 + B.5 · 25th SIBLING ⭐
 *              SOM Sample Expense Journal (status='completed' + !is_refundable)
 *              DOM Marketing Expense Journal (status='lost'|'converted' via pending_expense_voucher hookpoint)
 *              SOM refundable return → Stock Transfer voucher (status='returned' + is_refundable)
 * @disciplines FR-19 SIBLING (25th application) · FR-22 canonical voucher type · FR-26 entity-scoped
 *              · Hard Rule #20 zero-touch type extensions (engine consumes empirical SOM/DOM fields only)
 * @[JWT]       postVoucher() → erp_group_vouchers_<E>, erp_journal_<E>, erp_stock_ledger_<E>
 */
import type { SampleOutwardMemo } from '@/types/sample-outward-memo';
import type { DemoOutwardMemo } from '@/types/demo-outward-memo';
import type { Voucher, VoucherLedgerLine, VoucherInventoryLine } from '@/types/voucher';
import { postVoucher, generateVoucherNo } from '@/lib/fincore-engine';
import { getCurrentUserId } from '@/lib/auth-helpers';

// ── Ledger name constants (resolution to ledger_id deferred · placeholder names) ──
const LEDGER_SAMPLE_EXPENSE_NAME = 'Sample Expense (Marketing)';
const LEDGER_SAMPLE_STOCK_NAME = 'Sample Stock Issued';
const LEDGER_DEMO_EXPENSE_NAME = 'Marketing Expense (Demo Loss)';
const LEDGER_DEMO_STOCK_NAME = 'Demo Stock Issued';

// ── B.5 godown defaults (Q3=a · gd-main convention per demo seed precedent) ──
const MAIN_STORE_GODOWN_ID = 'gd-main';
const MAIN_STORE_GODOWN_NAME = 'Main Store';

function nowIso(): string { return new Date().toISOString(); }
function rid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildLedgerLine(
  name: string,
  group: string,
  dr: number,
  cr: number,
  narration: string,
): VoucherLedgerLine {
  return {
    id: rid('vll'),
    ledger_id: `placeholder-${name.toLowerCase().replace(/\s+/g, '-')}`,
    ledger_code: '',
    ledger_name: name,
    ledger_group_code: group,
    dr_amount: dr,
    cr_amount: cr,
    narration,
  };
}

// ────────────────────────────────────────────────────────────────────
// B.4 · SOM Sample Expense Journal
// Trigger: status='completed' AND is_refundable=false AND total_value > 0
// ────────────────────────────────────────────────────────────────────

export interface SampleExpenseVoucherResult {
  posted: boolean;
  voucher_id?: string;
  voucher_no?: string;
  reason?: string;
}

export function postSampleExpenseVoucherForSOM(
  memo: SampleOutwardMemo,
  entityCode: string,
): SampleExpenseVoucherResult {
  if (memo.status !== 'completed') return { posted: false, reason: 'status_not_completed' };
  if (memo.is_refundable) return { posted: false, reason: 'is_refundable' };
  if (!memo.total_value || memo.total_value <= 0) return { posted: false, reason: 'zero_value' };

  const amount = memo.total_value;
  const narration = `Sample expense booked for SOM ${memo.memo_no} · recipient ${memo.recipient_name}`;
  const now = nowIso();
  const userId = getCurrentUserId();
  const voucherNo = generateVoucherNo('JV', entityCode);

  const voucher: Voucher = {
    id: rid('v-som-exp'),
    voucher_no: voucherNo,
    voucher_type_id: 'jv-sample-expense',
    voucher_type_name: 'Journal',
    base_voucher_type: 'Journal',
    entity_id: entityCode,
    date: memo.completed_at?.slice(0, 10) || memo.memo_date,
    ledger_lines: [
      buildLedgerLine(LEDGER_SAMPLE_EXPENSE_NAME, 'INDIRECT_EXPENSE', amount, 0, narration),
      buildLedgerLine(LEDGER_SAMPLE_STOCK_NAME, 'CURRENT_ASSET', 0, amount, narration),
    ],
    gross_amount: amount,
    total_discount: 0,
    total_taxable: amount,
    total_cgst: 0, total_sgst: 0, total_igst: 0, total_cess: 0, total_tax: 0,
    round_off: 0,
    net_amount: amount,
    tds_applicable: false,
    narration,
    terms_conditions: '',
    payment_enforcement: '',
    payment_instrument: '',
    ref_voucher_id: memo.id,
    ref_voucher_no: memo.memo_no,
    status: 'draft',
    created_by: userId,
    created_at: now,
    updated_at: now,
  };

  postVoucher(voucher, entityCode);
  return { posted: true, voucher_id: voucher.id, voucher_no: voucher.voucher_no };
}

// ────────────────────────────────────────────────────────────────────
// B.4 · DOM Marketing Expense Journal
// Trigger: status='lost' OR 'converted' AND pending_expense_voucher hookpoint
// ────────────────────────────────────────────────────────────────────

export function postMarketingExpenseVoucherForDOM(
  memo: DemoOutwardMemo,
  entityCode: string,
): SampleExpenseVoucherResult {
  if (memo.status !== 'lost' && memo.status !== 'converted') {
    return { posted: false, reason: 'status_not_lost_or_converted' };
  }
  if (!memo.pending_expense_voucher) return { posted: false, reason: 'no_pending_hook' };

  const amount = memo.items.reduce((s, i) => s + (i.amount || 0), 0);
  if (amount <= 0) return { posted: false, reason: 'zero_value' };

  const narration = `Demo ${memo.status} · marketing expense booked for DOM ${memo.memo_no} · recipient ${memo.recipient_name}`;
  const now = nowIso();
  const userId = getCurrentUserId();
  const voucherNo = generateVoucherNo('JV', entityCode);
  const dateBasis =
    memo.status === 'converted' ? memo.converted_at : memo.dispatched_at;

  const voucher: Voucher = {
    id: rid('v-dom-exp'),
    voucher_no: voucherNo,
    voucher_type_id: 'jv-demo-marketing',
    voucher_type_name: 'Journal',
    base_voucher_type: 'Journal',
    entity_id: entityCode,
    date: (dateBasis || memo.memo_date).slice(0, 10),
    ledger_lines: [
      buildLedgerLine(LEDGER_DEMO_EXPENSE_NAME, 'INDIRECT_EXPENSE', amount, 0, narration),
      buildLedgerLine(LEDGER_DEMO_STOCK_NAME, 'CURRENT_ASSET', 0, amount, narration),
    ],
    gross_amount: amount,
    total_discount: 0,
    total_taxable: amount,
    total_cgst: 0, total_sgst: 0, total_igst: 0, total_cess: 0, total_tax: 0,
    round_off: 0,
    net_amount: amount,
    tds_applicable: false,
    narration,
    terms_conditions: '',
    payment_enforcement: '',
    payment_instrument: '',
    ref_voucher_id: memo.id,
    ref_voucher_no: memo.memo_no,
    status: 'draft',
    created_by: userId,
    created_at: now,
    updated_at: now,
  };

  postVoucher(voucher, entityCode);
  return { posted: true, voucher_id: voucher.id, voucher_no: voucher.voucher_no };
}

// ────────────────────────────────────────────────────────────────────
// B.5 · Refundable SOM Return → Stock Transfer voucher
// Trigger: status='returned' AND is_refundable=true
// from = memo.outward_godown_* → to = gd-main / Main Store (Q3=a)
// ────────────────────────────────────────────────────────────────────

export function postStockTransferForReturnedSampleSOM(
  memo: SampleOutwardMemo,
  entityCode: string,
): SampleExpenseVoucherResult {
  if (memo.status !== 'returned') return { posted: false, reason: 'status_not_returned' };
  if (!memo.is_refundable) return { posted: false, reason: 'not_refundable' };
  if (!memo.items.length) return { posted: false, reason: 'no_items' };

  const now = nowIso();
  const userId = getCurrentUserId();
  const voucherNo = generateVoucherNo('ST', entityCode);

  const inventory_lines: VoucherInventoryLine[] = memo.items.map((it) => ({
    id: rid('vil'),
    item_id: `placeholder-${it.id}`,
    item_code: '',
    item_name: it.item_name,
    hsn_sac_code: it.hsn_sac_code || '',
    godown_id: MAIN_STORE_GODOWN_ID,
    godown_name: MAIN_STORE_GODOWN_NAME,
    qty: it.qty,
    uom: it.uom || 'NOS',
    rate: it.unit_value || 0,
    discount_percent: 0,
    discount_amount: 0,
    taxable_value: it.amount || 0,
    gst_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0,
    cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0,
    total: it.amount || 0,
    gst_type: 'non_gst',
    gst_source: 'none',
  }));

  const amount = inventory_lines.reduce((s, l) => s + l.total, 0);
  const narration = `Refundable sample returned · SOM ${memo.memo_no} · recipient ${memo.recipient_name}`;

  const voucher: Voucher = {
    id: rid('v-som-ret'),
    voucher_no: voucherNo,
    voucher_type_id: 'st-sample-return',
    voucher_type_name: 'Stock Transfer',
    base_voucher_type: 'Stock Transfer',
    entity_id: entityCode,
    date: (memo.returned_at || memo.memo_date).slice(0, 10),
    ledger_lines: [],
    inventory_lines,
    gross_amount: amount,
    total_discount: 0,
    total_taxable: amount,
    total_cgst: 0, total_sgst: 0, total_igst: 0, total_cess: 0, total_tax: 0,
    round_off: 0,
    net_amount: amount,
    tds_applicable: false,
    narration,
    terms_conditions: '',
    payment_enforcement: '',
    payment_instrument: '',
    ref_voucher_id: memo.id,
    ref_voucher_no: memo.memo_no,
    from_godown_name: memo.outward_godown_name || 'Samples & Demos - Out with 3rd Party',
    to_godown_name: MAIN_STORE_GODOWN_NAME,
    dispatch_dept_id: memo.outward_godown_id || undefined,
    dispatch_dept_name: memo.outward_godown_name || undefined,
    receive_dept_id: MAIN_STORE_GODOWN_ID,
    receive_dept_name: MAIN_STORE_GODOWN_NAME,
    status: 'draft',
    created_by: userId,
    created_at: now,
    updated_at: now,
  };

  postVoucher(voucher, entityCode);
  return { posted: true, voucher_id: voucher.id, voucher_no: voucher.voucher_no };
}
