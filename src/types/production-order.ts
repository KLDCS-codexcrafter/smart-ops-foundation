/**
 * @file     production-order.ts
 * @sprint   T-Phase-1.3-3a-pre-1
 * @purpose  Universal Production Order type with 22 nullable hookpoints and 3-layer cost structure.
 * @decisions D-501 · D-291 · D-218 · D-298 · D-350 · D-512 · D-515
 */

import type { ProductionCostStructure } from './production-cost';
import type { ApprovalEvent } from './material-indent';

export type ProductionOrderStatus = 'draft' | 'released' | 'in_progress' | 'completed' | 'closed' | 'cancelled';

export const PRODUCTION_ORDER_STATUS_LABELS: Record<ProductionOrderStatus, string> = {
  draft:       'Draft',
  released:    'Released',
  in_progress: 'In Progress',
  completed:   'Completed',
  closed:      'Closed',
  cancelled:   'Cancelled',
};

export const PRODUCTION_ORDER_STATUS_COLORS: Record<ProductionOrderStatus, string> = {
  draft:       'bg-muted text-muted-foreground border-muted',
  released:    'bg-primary/10 text-primary border-primary/30',
  in_progress: 'bg-warning/10 text-warning border-warning/30',
  completed:   'bg-success/10 text-success border-success/30',
  closed:      'bg-secondary text-secondary-foreground border-border',
  cancelled:   'bg-destructive/10 text-destructive border-destructive/30',
};

export type QCScenario = 'internal_dept' | 'customer_inspection' | 'third_party_agency' | 'export_oriented';

export interface SalesOrderLineMapping {
  sales_order_id: string;
  sales_order_no: string;
  sales_order_line_id: string;
  fulfilled_qty: number;
  required_by_date: string;
}

export interface ProductionOrderStatusEvent {
  id: string;
  from_status: ProductionOrderStatus | null;
  to_status: ProductionOrderStatus;
  changed_by_id: string;
  changed_by_name: string;
  changed_at: string;
  note: string;
}

/**
 * Multi-item Production Order output · Q13=a · 3a-pre-2.5
 */
export type ProductionOrderOutputKind =
  | 'main' | 'co_product' | 'by_product' | 'scrap';

export type CostAllocationBasis = 'qty' | 'value' | 'manual_pct';

export interface ProductionOrderOutput {
  id: string;
  output_no: number;
  output_kind: ProductionOrderOutputKind;

  item_id: string;
  item_code: string;
  item_name: string;
  planned_qty: number;
  uom: string;

  bom_id: string;
  bom_version: number;

  batch_no: string | null;
  qc_required: boolean;
  qc_scenario: QCScenario | null;
  linked_test_report_ids: string[];

  output_cost_master: number;
  output_cost_budget: number;
  output_cost_actual: number;
  cost_allocation_basis: CostAllocationBasis;
  cost_allocation_pct: number;

  actual_qty: number | null;
  yield_pct: number | null;

  output_godown_id: string;
}

/** BOM-line substitution reasons · D-543 · 3a-pre-2.5 */
export type SubstituteReason =
  | 'stock_unavailable' | 'cost_optimization' | 'quality_upgrade'
  | 'sourcing_constraint' | 'customer_specification' | 'export_compliance' | 'other';

export interface ProductionOrderLine {
  id: string;
  line_no: number;
  bom_component_id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  required_qty: number;
  issued_qty: number;
  uom: string;
  reservation_id: string | null;
  batch_no: string | null;
  serial_nos: string[];
  heat_no: string | null;

  // 🆕 Substitution tracking (D-543 · 3a-pre-2.5)
  original_bom_item_id: string;
  original_bom_qty: number;
  is_substituted: boolean;
  substitute_reason: SubstituteReason | null;
  substitute_item_substitute_id: string | null;
  substitute_notes: string;
  substituted_by: string | null;
  substituted_at: string | null;
  original_unit_rate: number;
  substituted_unit_rate: number;
  cost_variance_amount: number;
  cost_variance_pct: number;
  yield_impact_pct: number;
}

export interface ProductionOrder {
  id: string;
  entity_id: string;
  doc_no: string;

  bom_id: string;
  bom_version: number;
  output_item_id: string;
  output_item_name: string;
  output_item_code: string;
  planned_qty: number;
  uom: string;

  start_date: string;
  target_end_date: string;
  actual_completion_date: string | null;

  status: ProductionOrderStatus;

  department_id: string;
  department_name: string;
  source_godown_id: string | null;
  wip_godown_id: string | null;
  output_godown_id: string;

  reservation_ids: string[];

  // 22 universal hookpoints (D-291 nullable)
  project_id: string | null;
  project_milestone_id: string | null;
  project_centre_id: string | null;
  reference_project_id: string | null;

  sales_order_id: string | null;
  sales_order_line_mappings: SalesOrderLineMapping[];
  sales_plan_id: string | null;
  customer_id: string | null;
  customer_name: string | null;

  business_unit_id: string | null;
  batch_no: string | null;
  is_export_project: boolean;

  production_site_id: string | null;
  nature_of_processing: string | null;
  is_job_work_in: boolean;

  linked_job_work_out_order_ids: string[];

  qc_required: boolean;
  qc_scenario: QCScenario | null;
  linked_test_report_ids: string[];
  // 🆕 D-615 · Card 3b 3b-pre-1 · Q47=c routing on FAIL (additive)
  routed_to_quarantine: boolean;
  production_plan_id: string | null;

  shift_id: string | null;
  production_team_id: string | null;

  export_destination_country: string | null;
  export_regulatory_body: string | null;
  linked_letter_of_credit_id: string | null;

  cost_structure: ProductionCostStructure;

  lines: ProductionOrderLine[];

  // 🆕 Multi-item outputs (Q13=a · 3a-pre-2.5)
  outputs: ProductionOrderOutput[];

  // 🆕 Plan linkage (Q14=a · M:N · 3a-pre-2.5)
  linked_production_plan_ids: string[];

  approval_history: ApprovalEvent[];
  status_history: ProductionOrderStatusEvent[];

  // 🆕 Closure (Q19=b maker-checker · Sprint 3a-pre-3 · D-558)
  closed_at: string | null;
  closed_by_user_id: string | null;
  closed_by_name: string | null;
  closure_approval: ApprovalEvent | null;
  closure_remarks: string;
  closed_cost_snapshot: ProductionCostStructure | null;
  closed_variance_id: string | null;

  notes: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export const productionOrdersKey = (entityCode: string): string =>
  `erp_production_orders_${entityCode}`;

export function getPrimarySO(po: ProductionOrder): { id: string; no: string } | null {
  const m = po.sales_order_line_mappings[0];
  return m ? { id: m.sales_order_id, no: m.sales_order_no } : null;
}
