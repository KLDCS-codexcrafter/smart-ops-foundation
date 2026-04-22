/**
 * demo-bom-data.ts — Seed fixtures for BOM Master (Sprint T10-pre.2a-S1a).
 *
 * Per D-081: every new master ships with:
 *   - happy-path fixture (1 BOM, simple single-level, no byproducts)
 *   - edge-case fixture (1 BOM, multi-level placeholder, byproducts, wastage, overhead)
 *
 * S1a intentionally does NOT auto-load these into localStorage. The seed-loader
 * framework (useDemoSeedLoader, Sprint future) will consume this file.
 *
 * For early manual testing, a developer can copy the arrays into the browser
 * console:
 *   localStorage.setItem('erp_bom_SMRT', JSON.stringify(DEMO_BOM_HAPPY_PATH));
 *
 * [JWT] Replace with /api/demo-seeds endpoint.
 */

import type { Bom } from '@/types/bom';

/** Happy path — a simple FG made from 2 raw materials, no byproduct, no overhead. */
export const DEMO_BOM_HAPPY_PATH: Bom[] = [
  {
    id: 'bom-demo-hp-001',
    entity_id: 'SMRT',
    product_item_id: 'item-demo-fg-tablet-pack',
    product_item_code: 'FG-TAB-001',
    product_item_name: 'Paracetamol 500mg — 10-Tab Pack',
    version_no: 1,
    output_qty: 1,
    output_uom: 'PACK',
    valid_from: '2025-04-01',
    valid_to: null,
    is_active: true,
    components: [
      {
        id: 'bcomp-demo-hp-001-a',
        item_id: 'item-demo-rm-paracetamol',
        item_code: 'RM-PARA-500',
        item_name: 'Paracetamol API 500mg',
        component_type: 'raw_material',
        qty: 10,
        uom: 'TAB',
        wastage_percent: 0,
        sub_bom_id: null,
      },
      {
        id: 'bcomp-demo-hp-001-b',
        item_id: 'item-demo-pkg-blister',
        item_code: 'PKG-BLISTER-10',
        item_name: 'Blister Pack 10-tab',
        component_type: 'consumable',
        qty: 1,
        uom: 'NOS',
        wastage_percent: 2,
        sub_bom_id: null,
      },
    ],
    byproducts: [],
    overhead_ledger_id: null,
    overhead_ledger_name: null,
    notes: 'Standard retail pack. No secondary packaging.',
    created_at: '2025-04-01T10:00:00.000Z',
    updated_at: '2025-04-01T10:00:00.000Z',
    created_by: 'demo-seed',
  },
];

/** Edge case — multi-level BOM with Semi-Finished sub-BOM reference,
    byproduct, wastage, and overhead allocation. */
export const DEMO_BOM_EDGE_CASE: Bom[] = [
  // First the sub-BOM for the Semi-Finished item
  {
    id: 'bom-demo-edge-sub-001',
    entity_id: 'SMRT',
    product_item_id: 'item-demo-sf-granulate',
    product_item_code: 'SF-GRAN-001',
    product_item_name: 'Paracetamol Granulate',
    version_no: 1,
    output_qty: 100,
    output_uom: 'KG',
    valid_from: '2025-04-01',
    valid_to: null,
    is_active: true,
    components: [
      {
        id: 'bcomp-demo-edge-sub-a',
        item_id: 'item-demo-rm-paracetamol-bulk',
        item_code: 'RM-PARA-BULK',
        item_name: 'Paracetamol API Bulk',
        component_type: 'raw_material',
        qty: 95,
        uom: 'KG',
        wastage_percent: 1,
        sub_bom_id: null,
      },
      {
        id: 'bcomp-demo-edge-sub-b',
        item_id: 'item-demo-rm-starch',
        item_code: 'RM-STARCH',
        item_name: 'Corn Starch',
        component_type: 'raw_material',
        qty: 5,
        uom: 'KG',
        wastage_percent: 0,
        sub_bom_id: null,
      },
    ],
    byproducts: [],
    overhead_ledger_id: null,
    overhead_ledger_name: null,
    notes: 'Granulate used by tablet FG line. No byproducts expected.',
    created_at: '2025-04-01T10:05:00.000Z',
    updated_at: '2025-04-01T10:05:00.000Z',
    created_by: 'demo-seed',
  },
  // Now the parent BOM that references it
  {
    id: 'bom-demo-edge-main-001',
    entity_id: 'SMRT',
    product_item_id: 'item-demo-fg-tablet-bulk',
    product_item_code: 'FG-TAB-BULK-001',
    product_item_name: 'Paracetamol 500mg — Bulk Tablets (per 100k)',
    version_no: 1,
    output_qty: 100000,
    output_uom: 'TAB',
    valid_from: '2025-04-01',
    valid_to: null,
    is_active: true,
    components: [
      {
        id: 'bcomp-demo-edge-main-a',
        item_id: 'item-demo-sf-granulate',
        item_code: 'SF-GRAN-001',
        item_name: 'Paracetamol Granulate',
        component_type: 'semi_finished',
        qty: 52,
        uom: 'KG',
        wastage_percent: 3,
        sub_bom_id: 'bom-demo-edge-sub-001',
      },
      {
        id: 'bcomp-demo-edge-main-b',
        item_id: 'item-demo-cons-lubricant',
        item_code: 'CONS-LUB-001',
        item_name: 'Magnesium Stearate (Lubricant)',
        component_type: 'consumable',
        qty: 0.5,
        uom: 'KG',
        wastage_percent: 5,
        sub_bom_id: null,
      },
    ],
    byproducts: [
      {
        id: 'bbp-demo-edge-001',
        item_id: 'item-demo-byp-powder',
        item_code: 'BYP-POWDER-001',
        item_name: 'Rejected Powder (rework)',
        qty_per_batch: 1.5,
        uom: 'KG',
        recovery_ledger_id: 'led-demo-byproduct-recovery',
        recovery_ledger_name: 'Byproduct Recovery Income',
      },
    ],
    overhead_ledger_id: 'led-demo-manufacturing-overhead',
    overhead_ledger_name: 'Manufacturing Overhead Absorbed',
    notes: 'Bulk tablet run. Byproduct: rejected powder goes to rework. Multi-level — sub-BOM is granulate.',
    created_at: '2025-04-01T10:10:00.000Z',
    updated_at: '2025-04-01T10:10:00.000Z',
    created_by: 'demo-seed',
  },
];

/** Combined seed — what a demo-seed-loader would install. */
export const DEMO_BOMS_ALL: Bom[] = [...DEMO_BOM_HAPPY_PATH, ...DEMO_BOM_EDGE_CASE];
