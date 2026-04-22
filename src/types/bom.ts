/**
 * bom.ts — Bill of Materials data model
 *
 * A BOM describes how one unit of a Finished Goods / Semi-Finished item is
 * produced from raw-material / semi-finished / consumable components,
 * with optional byproducts and overhead allocation.
 *
 * Multi-level BOMs: a component can itself be a Semi-Finished item with its
 * own BOM. The recursive explosion logic lives in the Manufacturing Journal
 * voucher (Sprint T10-pre.2a-S1b), NOT here. This file defines only the
 * data model and exposes enough metadata for validation.
 *
 * Versioning: each product has at most ONE active BOM version at a time.
 * Creating a new version marks prior versions inactive but keeps them for
 * historical voucher traceability.
 *
 * [JWT] Replace all localStorage calls with /api/bom endpoints.
 */

export type BomComponentType = 'raw_material' | 'semi_finished' | 'consumable';

export interface BomComponent {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  component_type: BomComponentType;
  qty: number;                   // qty per one unit of output
  uom: string;
  wastage_percent: number;       // 0-100, effective_qty = qty * (1 + wastage/100)
  /** For multi-level BOMs: if component is Semi-Finished AND has its own BOM,
      S1b's explosion logic will recursively resolve this. NULL for raw-material. */
  sub_bom_id?: string | null;
}

export interface BomByProduct {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  qty_per_batch: number;
  uom: string;
  recovery_ledger_id?: string | null;   // Cr ledger when byproduct is produced
  recovery_ledger_name?: string | null;
}

export interface Bom {
  id: string;
  entity_id: string;             // scoped per entity (entityCode)
  product_item_id: string;
  product_item_code: string;
  product_item_name: string;
  version_no: number;            // 1, 2, 3...
  output_qty: number;            // batch size: components consumed produce this many units
  output_uom: string;
  valid_from: string;            // ISO date
  valid_to?: string | null;      // ISO date, null = open-ended
  is_active: boolean;            // exactly one active version per product at a time
  components: BomComponent[];
  byproducts: BomByProduct[];
  overhead_ledger_id?: string | null;
  overhead_ledger_name?: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export const bomKey = (entityCode: string): string => `erp_bom_${entityCode}`;

/** Lookup key format for finding the active BOM for a product on a given date.
    Used by S1b's Mfg JV. Not implemented here — just exported for consistency. */
export interface BomLookupRequest {
  product_item_id: string;
  as_of_date: string;            // ISO date
}
