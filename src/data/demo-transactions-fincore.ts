/**
 * demo-transactions-finecore.ts — Demo seed data for FineCore vouchers
 * [JWT] Replace with REST endpoints as annotated
 */
import type { Voucher } from '@/types/voucher';

const now = new Date().toISOString();

function makeVoucher(overrides: Partial<Voucher>): Voucher {
  return {
    id: `v-demo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    voucher_no: '', voucher_type_id: '', voucher_type_name: '',
    base_voucher_type: 'Sales', entity_id: '', date: '2026-04-01',
    party_name: '', ref_voucher_no: '', vendor_bill_no: '',
    net_amount: 0, narration: '', terms_conditions: '',
    payment_enforcement: '', payment_instrument: '',
    from_ledger_name: '', to_ledger_name: '',
    from_godown_name: '', to_godown_name: '',
    ledger_lines: [], gross_amount: 0, total_discount: 0,
    total_taxable: 0, total_cgst: 0, total_sgst: 0, total_igst: 0,
    total_cess: 0, total_tax: 0, round_off: 0, tds_applicable: false,
    status: 'posted', created_by: 'demo-seed', created_at: now, updated_at: now,
    ...overrides,
  };
}

export const DEMO_VOUCHERS: Voucher[] = [
  makeVoucher({
    voucher_no: 'SI/2026/0001', voucher_type_name: 'Sales Invoice',
    base_voucher_type: 'Sales', date: '2026-04-02',
    party_name: 'Acme Trading Co.', net_amount: 118000,
    total_taxable: 100000, total_cgst: 9000, total_sgst: 9000, total_tax: 18000,
    narration: 'Sale of finished goods — April batch',
  }),
  makeVoucher({
    voucher_no: 'SI/2026/0002', voucher_type_name: 'Sales Invoice',
    base_voucher_type: 'Sales', date: '2026-04-05',
    party_name: 'Beta Industries Pvt Ltd', net_amount: 59000,
    total_taxable: 50000, total_cgst: 4500, total_sgst: 4500, total_tax: 9000,
    narration: 'Sale of packaging material',
  }),
  makeVoucher({
    voucher_no: 'PI/2026/0001', voucher_type_name: 'Purchase Invoice',
    base_voucher_type: 'Purchase', date: '2026-04-03',
    party_name: 'Delta Suppliers', vendor_bill_no: 'DSL/24-25/1045',
    net_amount: 236000, total_taxable: 200000, total_igst: 36000, total_tax: 36000,
    narration: 'Purchase of raw material — inter-state',
  }),
  makeVoucher({
    voucher_no: 'PI/2026/0002', voucher_type_name: 'Purchase Invoice',
    base_voucher_type: 'Purchase', date: '2026-04-08',
    party_name: 'Gamma Chemicals', vendor_bill_no: 'GC/1192',
    net_amount: 47200, total_taxable: 40000, total_cgst: 3600, total_sgst: 3600, total_tax: 7200,
    narration: 'Cleaning supplies purchase',
  }),
  makeVoucher({
    voucher_no: 'RV/2026/0001', voucher_type_name: 'Receipt',
    base_voucher_type: 'Receipt', date: '2026-04-06',
    party_name: 'Acme Trading Co.', net_amount: 118000,
    payment_instrument: 'NEFT: UTR2026040612345',
    from_ledger_name: 'Acme Trading Co.', to_ledger_name: 'HDFC Bank Current A/c',
    narration: 'Receipt against SI/2026/0001',
  }),
  makeVoucher({
    voucher_no: 'PV/2026/0001', voucher_type_name: 'Payment',
    base_voucher_type: 'Payment', date: '2026-04-10',
    party_name: 'Delta Suppliers', net_amount: 236000,
    payment_instrument: 'RTGS: RTGS2026041098765',
    from_ledger_name: 'ICICI Bank Current A/c', to_ledger_name: 'Delta Suppliers',
    narration: 'Payment against PI/2026/0001', tds_applicable: true,
  }),
  makeVoucher({
    voucher_no: 'JV/2026/0001', voucher_type_name: 'Journal',
    base_voucher_type: 'Journal', date: '2026-04-07',
    net_amount: 5000, narration: 'Depreciation entry — April 2026',
    from_ledger_name: 'Depreciation A/c', to_ledger_name: 'Accumulated Depreciation',
  }),
  makeVoucher({
    voucher_no: 'GRN/2026/0001', voucher_type_name: 'Receipt Note',
    base_voucher_type: 'Receipt Note', date: '2026-04-04',
    party_name: 'Delta Suppliers', ref_voucher_no: 'DSL/DC/1045',
    to_godown_name: 'Main Store', narration: 'GRN for PI/2026/0001',
  }),
  makeVoucher({
    voucher_no: 'CN/2026/0001', voucher_type_name: 'Credit Note',
    base_voucher_type: 'Credit Note', date: '2026-04-12',
    party_name: 'Beta Industries Pvt Ltd', ref_voucher_no: 'SI/2026/0002',
    net_amount: 11800, total_taxable: 10000, total_cgst: 900, total_sgst: 900, total_tax: 1800,
    narration: 'Credit note for quality rejection — partial return',
  }),
  makeVoucher({
    voucher_no: 'SJ/2026/0001', voucher_type_name: 'Stock Journal',
    base_voucher_type: 'Stock Journal', date: '2026-04-09',
    from_godown_name: 'Main Store', to_godown_name: 'Production Floor',
    narration: 'RM issue to production — April batch',
  }),
];

export function loadFineCoreTransactions(entityCode: string): void {
  const key = `erp_group_vouchers_${entityCode}`;
  // [JWT] GET /api/accounting/vouchers
  const existing = localStorage.getItem(key);
  if (existing) {
    const parsed = JSON.parse(existing);
    if (Array.isArray(parsed) && parsed.length > 0) return;
  }
  // [JWT] POST /api/accounting/vouchers/seed
  localStorage.setItem(key, JSON.stringify(DEMO_VOUCHERS));
}
