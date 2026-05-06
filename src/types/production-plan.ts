/**
 * @file     production-plan.ts
 * @sprint   T-Phase-1.3-3a-pre-2.5 · D-541
 * @purpose  Production Planning Voucher (v6 · Q15=a) · 8 plan_types · polymorphic
 *           source_links · always multi-line. 'PP' doc-no prefix.
 */
import type { ApprovalEvent } from '@/types/material-indent';

export type ProductionPlanType =
  | 'standalone'
  | 'sales_plan'
  | 'sales_order'
  | 'project_milestone'
  | 'job_work_out'
  | 'reorder_replenishment'
  | 'campaign_batch'
  | 'master_production_schedule';

export const PRODUCTION_PLAN_TYPE_LABELS: Record<ProductionPlanType, string> = {
  standalone:                 'Standalone (Founder/PM-driven)',
  sales_plan:                 'Sales Plan (Forecast · MTS)',
  sales_order:                'Sales Order (MTO)',
  project_milestone:          'Project Milestone (ETO)',
  job_work_out:               'Job Work Out Commitment',
  reorder_replenishment:      'Reorder Replenishment',
  campaign_batch:             'Campaign Batch',
  master_production_schedule: 'MPS (Phase 2)',
};

export type ProductionPlanStatus =
  | 'draft' | 'approved' | 'in_execution' | 'closed' | 'cancelled';

export const PRODUCTION_PLAN_STATUS_LABELS: Record<ProductionPlanStatus, string> = {
  draft:        'Draft',
  approved:     'Approved',
  in_execution: 'In Execution',
  closed:       'Closed',
  cancelled:    'Cancelled',
};

export const PRODUCTION_PLAN_STATUS_COLORS: Record<ProductionPlanStatus, string> = {
  draft:        'bg-muted text-muted-foreground border-muted',
  approved:     'bg-primary/10 text-primary border-primary/30',
  in_execution: 'bg-warning/10 text-warning border-warning/30',
  closed:       'bg-success/10 text-success border-success/30',
  cancelled:    'bg-destructive/10 text-destructive border-destructive/30',
};

export interface ProductionPlanSourceLinks {
  sales_plan_id?: string | null;
  sales_order_ids?: string[];
  project_id?: string | null;
  project_milestone_id?: string | null;
  job_work_out_order_ids?: string[];
  reorder_item_ids?: string[];
  campaign_id?: string | null;
  mps_id?: string | null;
}

export type CapacityCheckStatus = 'not_run' | 'pass' | 'warn' | 'fail';

export interface ProductionPlanLine {
  id: string;
  line_no: number;

  item_id: string;
  item_code: string;
  item_name: string;
  planned_qty: number;
  uom: string;
  target_date: string;

  suggested_bom_id: string | null;

  suggested_batch_size: number | null;
  min_batch_size: number | null;
  max_batch_size: number | null;

  is_critical_path: boolean;
  is_export_line: boolean;

  ordered_qty: number;
  produced_qty: number;
  variance_pct: number;

  notes: string;
}

export interface ProductionPlanStatusEvent {
  id: string;
  from_status: ProductionPlanStatus | null;
  to_status: ProductionPlanStatus;
  changed_by_id: string;
  changed_by_name: string;
  changed_at: string;
  note: string;
}

export interface ProductionPlan {
  id: string;
  entity_id: string;
  doc_no: string;

  plan_period_start: string;
  plan_period_end: string;
  plan_type: ProductionPlanType;

  status: ProductionPlanStatus;

  source_links: ProductionPlanSourceLinks;

  department_id: string;
  business_unit_id: string | null;

  lines: ProductionPlanLine[];

  linked_production_order_ids: string[];

  total_planned_qty: number;
  total_ordered_qty: number;
  total_produced_qty: number;
  fulfillment_pct: number;

  approval_history: ApprovalEvent[];
  status_history: ProductionPlanStatusEvent[];

  capacity_check_status: CapacityCheckStatus;
  capacity_warnings: string[];
  // 🆕 D-596 · Q25=a · 3-PlantOps-pre-3a · capacity check ACTIVATION
  capacity_check_run_at: string | null;
  capacity_check_details: Record<string, unknown>;

  notes: string;

  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export const productionPlansKey = (entityCode: string): string =>
  `erp_production_plans_${entityCode}`;
