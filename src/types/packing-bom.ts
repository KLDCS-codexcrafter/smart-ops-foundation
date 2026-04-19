/**
 * packing-bom.ts — Standard Bill of Materials for packing an item (Sprint 15b)
 * Each BOM line: how much of WHICH material is consumed per X units of item.
 * Example: '1L bottle' BOM =
 *   - 1 medium carton per 12 bottles (so 0.0833 carton per bottle)
 *   - 2 fragile labels per bottle
 *   - 0.5 meter bubble wrap per bottle
 * [JWT] GET/POST /api/dispatch/packing-boms
 */

export interface PackingBOMLine {
  id: string;
  material_id: string;
  material_code: string;
  material_name: string;
  material_uom: string;
  qty_per_unit: number;          // material qty per 1 unit of the item
  is_optional: boolean;           // optional materials (insurance wrapping etc.)
  notes?: string;
}

export interface PackingBOM {
  id: string;
  entity_id: string;
  item_id: string;               // from existing item master
  item_code: string;
  item_name: string;

  lines: PackingBOMLine[];

  total_packing_cost_paise: number;   // sum of line cost per unit item

  active: boolean;
  effective_from: string;
  effective_to: string | null;        // null = currently active

  notes?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export const packingBOMsKey = (e: string) => `erp_packing_boms_${e}`;

/** Per-shipment override captured on PackingSlipPrint */
export interface PackingBOMActual {
  id: string;
  entity_id: string;
  dln_voucher_id: string;
  packing_slip_id: string;
  item_id: string;
  material_id: string;
  standard_qty: number;           // from BOM
  actual_qty: number;             // what packer actually used
  variance_qty: number;           // actual - standard
  variance_pct: number;           // (variance / standard) * 100
  reason?: string;                // packer-provided justification
  packer_id?: string;
  packer_name?: string;
  captured_at: string;
}

export const packingBOMActualsKey = (e: string) => `erp_packing_bom_actuals_${e}`;

/** Variance severity classification */
export type VarianceSeverity = 'acceptable' | 'concerning' | 'high';

export const classifyVariance = (variancePct: number): VarianceSeverity => {
  const abs = Math.abs(variancePct);
  if (abs < 5) return 'acceptable';
  if (abs < 10) return 'concerning';
  return 'high';
};
