/**
 * demo-mfg-journal-data.ts — Seed fixtures for Manufacturing Journal
 * (Sprint T10-pre.2a-S1b).
 *
 * Per D-081: every new voucher ships with:
 *   - happy-path fixture (1 Mfg JV posting against simple single-level BOM)
 *   - edge-case fixture (1 Mfg JV with multi-level sub-BOM reference,
 *     byproducts, overhead)
 *
 * Both fixtures reference BOMs from demo-bom-data.ts (S1a seeds). They form
 * a coherent end-to-end demo when loaded together by the future
 * demo-seed-loader.
 *
 * Valuation is qty-as-placeholder per S1b decision Q1 (matches StockAdjustment
 * precedent at StockAdjustment.tsx:171).
 *
 * [JWT] Replace with /api/demo-seeds endpoint.
 */

import type { Voucher } from '@/types/voucher';

/** Happy path — Mfg JV against demo-bom-hp-001 (single-level Paracetamol pack) */
export const DEMO_MFG_JV_HAPPY_PATH: Voucher[] = [
  {
    id: 'mj-demo-hp-001',
    voucher_no: 'MJ-0001',
    voucher_type_id: 'vt-manufacturing-journal',
    voucher_type_name: 'Manufacturing Journal',
    base_voucher_type: 'Manufacturing Journal',
    entity_id: 'SMRT',
    date: '2025-04-10',
    effective_date: '2025-04-10',
    ref_no: 'BATCH-2025-04-A',
    department_id: 'dept-pharma-production',
    department_name: 'Pharma Production',
    inventory_lines: [
      // Consumption of Paracetamol API (neg qty)
      {
        id: 'inv-mj-hp-c1', item_id: 'item-demo-rm-paracetamol', item_code: 'RM-PARA-500',
        item_name: 'Paracetamol API 500mg', hsn_sac_code: '',
        godown_id: '', godown_name: 'Main Production',
        qty: -10, uom: 'TAB', rate: 0,
        discount_percent: 0, discount_amount: 0, taxable_value: 0,
        gst_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0,
        cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0,
        total: 0, gst_type: 'non_gst', gst_source: 'none',
      },
      // Consumption of blister (neg qty, with 2% wastage → 1.02)
      {
        id: 'inv-mj-hp-c2', item_id: 'item-demo-pkg-blister', item_code: 'PKG-BLISTER-10',
        item_name: 'Blister Pack 10-tab', hsn_sac_code: '',
        godown_id: '', godown_name: 'Main Production',
        qty: -1.02, uom: 'NOS', rate: 0,
        discount_percent: 0, discount_amount: 0, taxable_value: 0,
        gst_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0,
        cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0,
        total: 0, gst_type: 'non_gst', gst_source: 'none',
      },
      // Production of 1 Paracetamol pack
      {
        id: 'inv-mj-hp-p1', item_id: 'item-demo-fg-tablet-pack', item_code: 'FG-TAB-001',
        item_name: 'Paracetamol 500mg — 10-Tab Pack', hsn_sac_code: '',
        godown_id: '', godown_name: 'Main Production',
        qty: 1, uom: 'PACK', rate: 0,
        discount_percent: 0, discount_amount: 0, taxable_value: 0,
        gst_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0,
        cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0,
        total: 0, gst_type: 'non_gst', gst_source: 'none',
      },
    ],
    ledger_lines: [
      {
        id: 'll-mj-hp-cons', ledger_id: '', ledger_code: '',
        ledger_name: '[Pending] Raw Material Stock', ledger_group_code: '',
        dr_amount: 0, cr_amount: 11.02,
        narration: 'Manufacturing Journal — consumption (qty-as-placeholder, pending real valuation)',
      },
      {
        id: 'll-mj-hp-prod', ledger_id: '', ledger_code: '',
        ledger_name: '[Pending] Finished Goods Stock', ledger_group_code: '',
        dr_amount: 1, cr_amount: 0,
        narration: 'Manufacturing Journal — production (qty-as-placeholder, pending real valuation)',
      },
    ],
    gross_amount: 0, total_discount: 0, total_taxable: 0,
    total_cgst: 0, total_sgst: 0, total_igst: 0, total_cess: 0,
    total_tax: 0, round_off: 0, net_amount: 0,
    tds_applicable: false,
    narration: 'First demo batch. References BOM bom-demo-hp-001.',
    terms_conditions: '', payment_enforcement: '', payment_instrument: '',
    status: 'posted',
    created_at: '2025-04-10T09:00:00.000Z',
    updated_at: '2025-04-10T09:00:00.000Z',
    created_by: 'demo-seed',
  },
];

/** Edge case — Mfg JV against demo-bom-edge-main-001 (multi-level with Granulate sub-BOM, byproduct, overhead) */
export const DEMO_MFG_JV_EDGE_CASE: Voucher[] = [
  {
    id: 'mj-demo-edge-001',
    voucher_no: 'MJ-0002',
    voucher_type_id: 'vt-manufacturing-journal',
    voucher_type_name: 'Manufacturing Journal',
    base_voucher_type: 'Manufacturing Journal',
    entity_id: 'SMRT',
    date: '2025-04-15',
    effective_date: '2025-04-15',
    ref_no: 'BATCH-2025-04-BULK',
    department_id: 'dept-pharma-production',
    department_name: 'Pharma Production',
    inventory_lines: [
      // Consumption of Granulate (semi-finished — not exploded in this seed; user can explode)
      {
        id: 'inv-mj-edge-c1', item_id: 'item-demo-sf-granulate', item_code: 'SF-GRAN-001',
        item_name: 'Paracetamol Granulate', hsn_sac_code: '',
        godown_id: '', godown_name: 'Bulk Prod Shed',
        qty: -53.56, uom: 'KG', rate: 0,   // 52 kg * 1.03 (wastage)
        discount_percent: 0, discount_amount: 0, taxable_value: 0,
        gst_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0,
        cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0,
        total: 0, gst_type: 'non_gst', gst_source: 'none',
      },
      // Consumption of lubricant (consumable, 5% wastage)
      {
        id: 'inv-mj-edge-c2', item_id: 'item-demo-cons-lubricant', item_code: 'CONS-LUB-001',
        item_name: 'Magnesium Stearate (Lubricant)', hsn_sac_code: '',
        godown_id: '', godown_name: 'Bulk Prod Shed',
        qty: -0.525, uom: 'KG', rate: 0,
        discount_percent: 0, discount_amount: 0, taxable_value: 0,
        gst_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0,
        cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0,
        total: 0, gst_type: 'non_gst', gst_source: 'none',
      },
      // Production of 100,000 bulk tablets
      {
        id: 'inv-mj-edge-p1', item_id: 'item-demo-fg-tablet-bulk', item_code: 'FG-TAB-BULK-001',
        item_name: 'Paracetamol 500mg — Bulk Tablets (per 100k)', hsn_sac_code: '',
        godown_id: '', godown_name: 'Bulk Prod Shed',
        qty: 100000, uom: 'TAB', rate: 0,
        discount_percent: 0, discount_amount: 0, taxable_value: 0,
        gst_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0,
        cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0,
        total: 0, gst_type: 'non_gst', gst_source: 'none',
      },
      // Byproduct: 1.5 kg rejected powder
      {
        id: 'inv-mj-edge-bp1', item_id: 'item-demo-byp-powder', item_code: 'BYP-POWDER-001',
        item_name: 'Rejected Powder (rework)', hsn_sac_code: '',
        godown_id: '', godown_name: 'Bulk Prod Shed',
        qty: 1.5, uom: 'KG', rate: 0,
        discount_percent: 0, discount_amount: 0, taxable_value: 0,
        gst_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0,
        cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0,
        total: 0, gst_type: 'non_gst', gst_source: 'none',
      },
    ],
    ledger_lines: [
      {
        id: 'll-mj-edge-cons', ledger_id: '', ledger_code: '',
        ledger_name: '[Pending] Raw Material Stock', ledger_group_code: '',
        dr_amount: 0, cr_amount: 54.085,   // sum of consumption qty
        narration: 'Manufacturing Journal — consumption (qty-as-placeholder, pending real valuation)',
      },
      {
        id: 'll-mj-edge-prod', ledger_id: '', ledger_code: '',
        ledger_name: '[Pending] Finished Goods Stock', ledger_group_code: '',
        dr_amount: 100000, cr_amount: 0,
        narration: 'Manufacturing Journal — production (qty-as-placeholder, pending real valuation)',
      },
      {
        id: 'll-mj-edge-bp', ledger_id: 'led-demo-byproduct-recovery', ledger_code: '',
        ledger_name: 'Byproduct Recovery Income', ledger_group_code: '',
        dr_amount: 0, cr_amount: 1.5,
        narration: 'Byproduct: Rejected Powder (rework) (qty-as-placeholder)',
      },
      {
        id: 'll-mj-edge-oh', ledger_id: 'led-demo-manufacturing-overhead', ledger_code: '',
        ledger_name: 'Manufacturing Overhead Absorbed', ledger_group_code: '',
        dr_amount: 0, cr_amount: 0,
        narration: 'Manufacturing overhead absorbed',
      },
    ],
    gross_amount: 0, total_discount: 0, total_taxable: 0,
    total_cgst: 0, total_sgst: 0, total_igst: 0, total_cess: 0,
    total_tax: 0, round_off: 0, net_amount: 0,
    tds_applicable: false,
    narration: 'Bulk tablet batch. Sub-BOM (Granulate) not exploded at post time — user opted to treat Semi-Finished as already-produced input. References BOM bom-demo-edge-main-001.',
    terms_conditions: '', payment_enforcement: '', payment_instrument: '',
    status: 'posted',
    created_at: '2025-04-15T11:30:00.000Z',
    updated_at: '2025-04-15T11:30:00.000Z',
    created_by: 'demo-seed',
  },
];

/** Combined seed — what a demo-seed-loader would install. */
export const DEMO_MFG_JVS_ALL: Voucher[] = [
  ...DEMO_MFG_JV_HAPPY_PATH,
  ...DEMO_MFG_JV_EDGE_CASE,
];
