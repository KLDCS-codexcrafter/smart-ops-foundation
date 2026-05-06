/**
 * oee-snapshot.ts — OEE data model (Q35=ALL polymorphic · Q39=b)
 * Sprint T-Phase-1.3-3-PlantOps-pre-3a · D-593
 */

export type OEEFormulaMode = 'classic_apq' | 'simplified_aq' | 'template_weighted';
export type OEEClassification = 'world_class' | 'good' | 'fair' | 'poor';

export interface OEESourceData {
  entity_id: string;
  factory_id: string;
  machine_id: string;
  date: string;
  shift_id: string | null;
  source_dwr_entry_ids: string[];
  source_job_card_ids: string[];
  planned_production_time: number;
  actual_run_time: number;
  theoretical_max_qty: number;
  actual_qty: number;
  good_qty: number;
  primary_kpis: string[];
  computed_at: string;
}

export interface OEEResult {
  mode: OEEFormulaMode;
  availability_pct: number | null;
  performance_pct: number | null;
  quality_pct: number | null;
  kpi_breakdown: Record<string, number> | null;
  template_id: string | null;
  oee_pct: number;
  classification: OEEClassification;
  formula_label: string;
  contributing_factors: string[];
}

export const oeeSourceDataKey = (entityCode: string): string =>
  `erp_oee_source_data_${entityCode}`;
