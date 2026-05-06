/**
 * wastage-snapshot.ts — Wastage Dashboard data model (Q36=ALL polymorphic + Q40=c custom 12)
 * Sprint T-Phase-1.3-3-PlantOps-pre-3b · D-605
 *
 * Polymorphic view modes · all 3 taxonomies supported · user picks via dashboard header.
 * Source data from JobCards (existing wastage_qty + wastage_reason fields · NO schema change).
 * 12-Category mode (Q40=c) is comprehensive superset of Lean 6 Big Losses + TIM WOODS Wastes.
 *
 * [JWT] GET /api/plant-ops/wastage-source-rows
 */
import type { JobCardWastageReason } from '@/types/job-card';

export type WastageViewMode = '6_reason' | '12_category' | 'template_driven';

/**
 * Q40=c · Comprehensive 12-Category taxonomy
 * Lean 6 Big Losses + TIM WOODS Wastes + existing JC values · curated superset.
 */
export type WastageCategory12 =
  // ── Lean 6 Big Losses ──
  | 'equipment_failure'
  | 'setup_adjustments'
  | 'process_defects'
  | 'idling_minor_stops'
  | 'reduced_speed'
  | 'reduced_yield_startup'
  // ── TIM WOODS Wastes ──
  | 'waiting'
  | 'over_production'
  | 'over_processing'
  // ── Preserved from existing JC ──
  | 'material_shortage'
  | 'rework'
  | 'other';

export interface WastageSourceRow {
  id: string;
  entity_id: string;
  factory_id: string;
  machine_id: string;
  date: string;

  source_jc_id: string;
  source_jc_doc_no: string;

  reason_6: JobCardWastageReason;
  category_12: WastageCategory12;
  is_auto_derived: boolean;

  template_kpi_key: string | null;

  wastage_qty: number;
  wastage_value: number;
  wastage_notes: string;

  computed_at: string;
}

export interface WastageRow {
  view_mode: WastageViewMode;
  group_key: string;
  group_label: string;

  total_qty: number;
  total_value: number;
  occurrence_count: number;
  pct_of_total: number;
  cumulative_pct: number;

  source_jc_ids: string[];
  contributing_machines: string[];
}

export const wastageSourceRowsKey = (entityCode: string): string =>
  `erp_wastage_source_rows_${entityCode}`;

export const REASON_TO_CATEGORY_MAP: Record<NonNullable<JobCardWastageReason>, WastageCategory12> = {
  setup: 'setup_adjustments',
  breakdown: 'equipment_failure',
  quality_failure: 'process_defects',
  material_shortage: 'material_shortage',
  rework: 'rework',
  other: 'other',
};

export const CATEGORY_12_LABELS: Record<WastageCategory12, string> = {
  equipment_failure: 'Equipment Failure',
  setup_adjustments: 'Setup & Adjustments',
  process_defects: 'Process Defects',
  idling_minor_stops: 'Idling & Minor Stops',
  reduced_speed: 'Reduced Speed',
  reduced_yield_startup: 'Reduced Yield (Startup)',
  waiting: 'Waiting',
  over_production: 'Over-Production',
  over_processing: 'Over-Processing',
  material_shortage: 'Material Shortage',
  rework: 'Rework',
  other: 'Other',
};
