/**
 * heat-number.ts — Heat / Cast Number traceability for steel + alloy items.
 * Sprint T-Phase-1.2.3 · Card #2 sub-sprint 3/6
 *
 * Sinha-critical: Every steel plate from a foundry has a unique heat number.
 * The mill test certificate (MTC) records chemistry + mechanical properties.
 *
 * Storage: erp_heat_numbers_{entityCode}
 * [JWT] GET/POST /api/inventory/heat-numbers
 */

export type HeatStatus = 'received' | 'in_production' | 'consumed' | 'rejected';

// ── Identification ───────────────────────────────────────────────────
export interface HeatIdentification {
  heat_no: string;
  cast_no?: string | null;
  mill_name?: string | null;
  mill_batch_ref?: string | null;
  supplier_id?: string | null;
  supplier_name?: string | null;
  supplier_batch_ref?: string | null;
}

// ── Chemistry (% by weight) ─────────────────────────────────────────
export interface HeatChemistry {
  carbon_pct?: number | null;
  manganese_pct?: number | null;
  silicon_pct?: number | null;
  sulphur_pct?: number | null;
  phosphorus_pct?: number | null;
  chromium_pct?: number | null;
  molybdenum_pct?: number | null;
  nickel_pct?: number | null;
}

// ── Mechanical properties ───────────────────────────────────────────
export interface HeatMechanical {
  yield_strength_mpa?: number | null;
  tensile_strength_mpa?: number | null;
  elongation_pct?: number | null;
  hardness_brinell?: number | null;
  impact_energy_joules?: number | null;
}

// ── Certification ───────────────────────────────────────────────────
export interface HeatCertification {
  certificate_no?: string | null;
  certificate_date?: string | null;
  standard?: string | null;
  mtc_document_url?: string | null;
  mtc_uploaded_at?: string | null;
  mtc_uploaded_by?: string | null;
}

// ── Heat record ─────────────────────────────────────────────────────
export interface HeatNumber extends HeatIdentification, HeatChemistry, HeatMechanical, HeatCertification {
  id: string;
  entity_id: string;

  // Linkage
  item_id: string;
  item_code: string;
  item_name: string;

  // GRN linkage
  source_grn_id?: string | null;
  source_grn_no?: string | null;
  received_date?: string | null;
  received_qty?: number | null;
  uom?: string | null;

  // Status
  status: HeatStatus;
  available_qty?: number | null;
  consumed_qty?: number | null;

  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export const heatNumbersKey = (entityCode: string) => `erp_heat_numbers_${entityCode}`;

export const HEAT_STATUS_LABELS: Record<HeatStatus, string> = {
  received: 'Received',
  in_production: 'In Production',
  consumed: 'Consumed',
  rejected: 'Rejected',
};

export const HEAT_STATUS_COLORS: Record<HeatStatus, string> = {
  received: 'bg-blue-500/10 text-blue-700',
  in_production: 'bg-amber-500/10 text-amber-700',
  consumed: 'bg-slate-500/10 text-slate-600',
  rejected: 'bg-rose-500/10 text-rose-700',
};

/** Common steel standards in Indian fab shops (90% coverage). */
export const COMMON_HEAT_STANDARDS: readonly string[] = [
  'EN 10025-2 S355',
  'EN 10025-2 S275',
  'EN 10210 S355J2H',
  'IS 2062 E250',
  'IS 2062 E350',
  'IS 1239 (Pipes)',
  'IS 4923 (Hollow Sections)',
  'IS 800 (General)',
  'IS 1786 (TMT)',
  'ASTM A36',
  'ASTM A572 Gr 50',
];

// Forward traceability helper
export interface HeatTraceability {
  heat: HeatNumber;
  consumed_in_min_ids: string[];
  consumed_in_ce_ids: string[];
}
