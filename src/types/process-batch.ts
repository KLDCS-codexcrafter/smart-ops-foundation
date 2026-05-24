/**
 * @file     process-batch.ts
 * @sprint   T-Phase-3.PROD-3.5.PASS1 · ST1
 * @purpose  Process/continuous-flow batch type definitions.
 *           Q-LOCK-3 Option A · SEPARATE entity from ProductionOrder.
 *           Q-LOCK-9 Option A · own state machine · own storage key.
 *           ProductionOrder 6-state machine stays 0-diff (invariant #3).
 */

/** Process batch 8-state lifecycle (vs discrete 6-state ProductionOrder). */
export type ProcessBatchStatus =
  | 'draft'
  | 'running'
  | 'paused'
  | 'changeover'
  | 'cip_clean'
  | 'sampling'
  | 'holding'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface ProcessBatchStatusEvent {
  id: string;
  from_status: ProcessBatchStatus | null;
  to_status: ProcessBatchStatus;
  changed_by_id: string;
  changed_by_name: string;
  changed_at: string;
  note: string;
}

/** Raw material lot consumed in batch (genealogy traceability). */
export interface ProcessBatchRawMaterialLot {
  raw_material_id: string;
  raw_material_name: string;
  lot_no: string;
  vendor_lot_no: string;
  qty_consumed: number;
  uom: string;
  consumed_at: string;
}

/** By-product produced concurrently (revenue credit). */
export interface ProcessBatchByProduct {
  item_id: string;
  item_name: string;
  qty: number;
  uom: string;
  revenue_credit_per_uom: number;
  total_revenue_credit: number;
}

/** Co-product produced concurrently (joint-product allocation). */
export interface ProcessBatchCoProduct {
  item_id: string;
  item_name: string;
  qty: number;
  uom: string;
  cost_allocation_basis: 'physical' | 'sales_value' | 'split_off';
  allocated_cost: number;
}

/** In-process sample for QC testing. */
export interface ProcessBatchSample {
  id: string;
  sample_no: string;
  taken_at: string;
  taken_by: string;
  test_parameters: string[];
  results: Record<string, number | string>;
  pass: boolean | null;
  qc_inspection_id?: string;
}

/** Process parameter trace point. */
export interface ProcessParameterTrace {
  parameter: string;
  value: number;
  unit: string;
  recorded_at: string;
  source: 'manual' | 'iot' | 'simulated';
  within_spec: boolean;
}

/** CIP (Clean-In-Place) record post-batch. */
export interface CIPRecord {
  cip_id: string;
  reactor_id: string;
  start_time: string;
  end_time: string;
  cleaning_agent: string;
  validated: boolean;
  validation_by: string;
  next_batch_allowed: boolean;
}

/** Process batch entity (parallels ProductionOrder · separate domain). */
export interface ProcessBatch {
  id: string;
  entity_id: string;
  fiscal_year_id?: string;
  batch_no: string;
  recipe_id: string;
  recipe_name: string;
  recipe_version: string;
  planned_yield: number;
  actual_yield: number | null;
  yield_uom: string;
  start_time: string | null;
  end_time: string | null;
  reactor_id: string | null;
  operator_ids: string[];
  shift_id: string | null;
  status: ProcessBatchStatus;
  raw_material_lots: ProcessBatchRawMaterialLot[];
  by_products: ProcessBatchByProduct[];
  co_products: ProcessBatchCoProduct[];
  in_process_samples: ProcessBatchSample[];
  process_parameters: ProcessParameterTrace[];
  yield_variance: number;
  status_history: ProcessBatchStatusEvent[];
  cip_record: CIPRecord | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

/** Storage key for process batches (FR-26 entity-scoped). */
export const processBatchesKey = (entityCode: string): string =>
  `process_batches_${entityCode}`;
