/**
 * packing-material.ts — Packaging material master (Sprint 15b)
 * Tracks cartons, tape, bubble wrap, labels, pallets, etc.
 * Consumed per DLN post via packing-bom-engine.
 * [JWT] GET/POST /api/dispatch/packing-materials
 */

export type PackingMaterialKind =
  | 'carton'
  | 'tape'
  | 'bubble_wrap'
  | 'foam'
  | 'label'
  | 'strapping'
  | 'stretch_film'
  | 'pallet'
  | 'crate'
  | 'ice_pack'
  | 'other';

export type PackingMaterialUOM =
  | 'piece'
  | 'meter'
  | 'roll'
  | 'kg'
  | 'sheet';

export type MaterialPricingSource =
  | 'latest_purchase'
  | 'weighted_average'
  | 'manual';

export interface PackingMaterial {
  id: string;
  entity_id: string;
  code: string;                    // human-readable, e.g. 'CRT-MED-01'
  name: string;                    // 'Medium Carton 30x20x20cm'
  kind: PackingMaterialKind;
  uom: PackingMaterialUOM;

  // Dimensions (applicable for cartons, optional for others)
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  weight_g?: number | null;        // material's own weight (empty carton weight)

  // Pricing
  cost_per_uom_paise: number;
  pricing_source: MaterialPricingSource;
  price_effective_from: string;

  // Inventory
  opening_stock: number;
  current_stock: number;
  reorder_level: number;
  reorder_qty: number;

  // Reusability (pallets, crates)
  is_reusable: boolean;
  return_expected_days?: number | null;  // for reusables

  // Expiry tracking (for adhesives, some tapes)
  tracks_expiry: boolean;
  shelf_life_days?: number | null;

  // Status
  active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const packingMaterialsKey = (e: string) => `erp_packing_materials_${e}`;

/** Stock movement entry — debit/credit ledger for materials */
export type MaterialMovementKind =
  | 'opening'
  | 'purchase'
  | 'dln_consumption'       // auto-deduction on DLN post
  | 'manual_adjustment'
  | 'return_credit'         // reusable material returned
  | 'waste_writeoff';

export interface MaterialMovement {
  id: string;
  entity_id: string;
  material_id: string;
  material_code: string;
  kind: MaterialMovementKind;
  qty: number;                   // positive for in, negative for out
  ref_type?: 'dln' | 'po' | 'manual' | 'return';
  ref_id?: string;
  ref_label?: string;            // e.g. DLN voucher_no
  notes?: string;
  created_at: string;
  created_by: string;
}

export const materialMovementsKey = (e: string) => `erp_material_movements_${e}`;
