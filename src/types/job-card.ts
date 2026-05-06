/**
 * job-card.ts — Job Card transaction (Q23 + Q24 + Q30=a)
 * Sprint T-Phase-1.3-3-PlantOps-pre-2 · D-578
 *
 * Atomic unit of production work · captures operator × machine × shift × PO with start/end timestamps.
 * Aggregates into Daily Work Register (Q24=a 3-tuple) via dwr-aggregation-engine.
 * 'JC' doc-no prefix · 1 NEW concession matching MO/PC/JWO/JWR/PP lineage.
 *
 * [JWT] GET/POST/PUT/DELETE /api/plant-ops/job-cards
 */
import type { ApprovalEvent } from '@/types/material-indent';

export type JobCardStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'on_hold';

export type JobCardWastageReason =
  | 'setup'
  | 'breakdown'
  | 'quality_failure'
  | 'material_shortage'
  | 'rework'
  | 'other'
  | null;

export interface JobCardStatusEvent {
  id: string;
  from_status: JobCardStatus | null;
  to_status: JobCardStatus;
  changed_by_id: string;
  changed_by_name: string;
  changed_at: string;
  note: string;
}

export interface JobCard {
  id: string;
  entity_id: string;
  doc_no: string;

  factory_id: string;
  work_center_id: string;
  machine_id: string;

  production_order_id: string;
  production_order_no: string;
  production_order_line_id: string | null;

  employee_id: string;
  employee_name: string;
  employee_code: string;
  shift_id: string;
  shift_name: string;

  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;

  planned_qty: number;
  produced_qty: number;
  rejected_qty: number;
  rework_qty: number;
  uom: string;

  wastage_qty: number;
  wastage_reason: JobCardWastageReason;
  wastage_notes: string;

  labour_cost: number;
  machine_cost: number;
  total_cost: number;

  status: JobCardStatus;

  remarks: string;
  breakdown_notes: string;

  approval_history: ApprovalEvent[];
  status_history: JobCardStatusEvent[];

  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export const jobCardsKey = (entityCode: string): string =>
  `erp_job_cards_${entityCode}`;
