/**
 * @file     production-engine.ts
 * @sprint   T-Phase-1.3-3a-pre-1
 * @purpose  Production Order engine · CRUD · 5-state machine · stock-hold resolver · 3-layer cost.
 * @decisions D-502 · D-291 · D-309 · D-410 · D-511 · D-512 · D-515
 */

import type {
  ProductionOrder,
  ProductionOrderLine,
  ProductionOrderStatus,
  ProductionOrderStatusEvent,
  SalesOrderLineMapping,
  QCScenario,
} from '@/types/production-order';
import type {
  ProductionCostStructure,
  ProductionCostLayer,
  CostRateBasis,
} from '@/types/production-cost';
import type { Bom } from '@/types/bom';
import type { InventoryItem } from '@/types/inventory-item';
import type { QualiCheckConfig, ProductionConfig } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import { productionOrdersKey } from '@/types/production-order';
import { emptyCostStructure } from '@/types/production-cost';
import { generateDocNo } from '@/lib/finecore-engine';
import { emitLeakEvent } from '@/lib/leak-register-engine';

// ════════════════════════════════════════════════════════════════════
// 1. CRUD · CREATE
// ════════════════════════════════════════════════════════════════════

export interface CreateProductionOrderInput {
  entity_id: string;
  bom_id: string;
  output_item_id: string;
  planned_qty: number;
  start_date: string;
  target_end_date: string;
  department_id: string;
  source_godown_id?: string;
  output_godown_id?: string;
  project_id?: string;
  project_milestone_id?: string;
  customer_id?: string;
  sales_order_line_mappings?: SalesOrderLineMapping[];
  business_unit_id?: string;
  batch_no?: string;
  is_export_project?: boolean;
  export_destination_country?: string;
  export_regulatory_body?: string;
  qc_required?: boolean;
  qc_scenario?: QCScenario;
  shift_id?: string;
  notes?: string;
  created_by: string;
}

export function createProductionOrder(
  input: CreateProductionOrderInput,
  bom: Bom,
  itemMasters: InventoryItem[],
  config: ProductionConfig,
  qcConfig: QualiCheckConfig,
  user: { id: string; name: string },
): ProductionOrder {
  if (input.planned_qty <= 0) throw new Error('planned_qty must be positive');
  if (new Date(input.target_end_date) < new Date(input.start_date))
    throw new Error('target_end_date must be after start_date');
  if (input.is_export_project && !input.export_destination_country)
    throw new Error('Export production requires export_destination_country');

  const doc_no = generateDocNo('MO', input.entity_id);

  const lines: ProductionOrderLine[] = bom.components.map((c, i) => ({
    id: `pol-${doc_no.replace(/\//g, '-')}-${i + 1}`,
    line_no: i + 1,
    bom_component_id: c.id,
    item_id: c.item_id,
    item_code: c.item_code,
    item_name: c.item_name,
    required_qty: c.qty * input.planned_qty * (1 + (c.wastage_percent || 0) / 100),
    issued_qty: 0,
    uom: c.uom,
    reservation_id: null,
    batch_no: null,
    serial_nos: [],
    heat_no: null,
  }));

  const output_godown_id = resolveFGOutputGodown(
    { qc_required: input.qc_required, output_godown_id: input.output_godown_id },
    qcConfig,
  );

  const cost_structure = emptyCostStructure();
  cost_structure.master = computeMasterCost(bom, input.planned_qty, itemMasters);
  cost_structure.master_snapshot_at = new Date().toISOString();
  cost_structure.budget_rate_basis = config.defaultCostingBasis as CostRateBasis;

  const now = new Date().toISOString();
  const po: ProductionOrder = {
    id: `po-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entity_id: input.entity_id,
    doc_no,
    bom_id: input.bom_id,
    bom_version: bom.version_no || 1,
    output_item_id: input.output_item_id,
    output_item_name: bom.product_item_name || '',
    output_item_code: bom.product_item_code || '',
    planned_qty: input.planned_qty,
    uom: bom.output_uom || 'nos',
    start_date: input.start_date,
    target_end_date: input.target_end_date,
    actual_completion_date: null,
    status: 'draft',
    department_id: input.department_id,
    department_name: '',
    source_godown_id: input.source_godown_id || null,
    wip_godown_id: null,
    output_godown_id,
    reservation_ids: [],
    project_id: input.project_id || null,
    project_milestone_id: input.project_milestone_id || null,
    project_centre_id: null,
    reference_project_id: null,
    sales_order_id: input.sales_order_line_mappings?.[0]?.sales_order_id || null,
    sales_order_line_mappings: input.sales_order_line_mappings || [],
    sales_plan_id: null,
    customer_id: input.customer_id || null,
    customer_name: null,
    business_unit_id: input.business_unit_id || null,
    batch_no: input.batch_no || null,
    is_export_project: input.is_export_project || false,
    production_site_id: null,
    nature_of_processing: null,
    is_job_work_in: false,
    linked_job_work_out_order_ids: [],
    qc_required: input.qc_required ?? qcConfig.enableQualiCheck,
    qc_scenario: input.qc_scenario || (input.is_export_project ? 'export_oriented' : null),
    linked_test_report_ids: [],
    production_plan_id: null,
    shift_id: input.shift_id || null,
    production_team_id: null,
    export_destination_country: input.export_destination_country || null,
    export_regulatory_body: input.export_regulatory_body || null,
    linked_letter_of_credit_id: null,
    cost_structure,
    lines,
    approval_history: [],
    status_history: [makeInitialStatusEvent(user, now)],
    notes: input.notes || '',
    created_at: now,
    created_by: user.name,
    updated_at: now,
    updated_by: user.name,
  };

  const all = readPOs(input.entity_id);
  all.push(po);
  writePOs(input.entity_id, all);

  return po;
}

// ════════════════════════════════════════════════════════════════════
// 2. STATE MACHINE
// ════════════════════════════════════════════════════════════════════

const ALLOWED_TRANSITIONS: Record<ProductionOrderStatus, ProductionOrderStatus[]> = {
  draft:       ['released', 'cancelled'],
  released:    ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed:   [],
  cancelled:   [],
};

export function canTransition(from: ProductionOrderStatus, to: ProductionOrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function transitionState(
  po: ProductionOrder,
  to: ProductionOrderStatus,
  user: { id: string; name: string },
  note: string,
): ProductionOrder {
  if (!canTransition(po.status, to))
    throw new Error(`Cannot transition from ${po.status} to ${to}`);
  const event: ProductionOrderStatusEvent = {
    id: `pose-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    from_status: po.status,
    to_status: to,
    changed_by_id: user.id,
    changed_by_name: user.name,
    changed_at: new Date().toISOString(),
    note,
  };
  return {
    ...po,
    status: to,
    status_history: [...po.status_history, event],
    updated_at: event.changed_at,
    updated_by: user.name,
  };
}

// ════════════════════════════════════════════════════════════════════
// 3. RELEASE · creates D-186 reservation stubs · snapshots budget cost
// ════════════════════════════════════════════════════════════════════

export function releaseProductionOrder(
  po: ProductionOrder,
  itemMasters: InventoryItem[],
  config: ProductionConfig,
  user: { id: string; name: string },
): ProductionOrder {
  if (po.status !== 'draft') throw new Error('Only DRAFT orders can be released');

  const reservation_ids: string[] = [];
  const updated_lines = po.lines.map((line, idx) => {
    const reservationId = `res-mo-${po.id}-${idx}-${Date.now()}`;
    reservation_ids.push(reservationId);
    return { ...line, reservation_id: reservationId };
  });

  const budget = computeBudgetCost(
    po.bom_id,
    po.planned_qty,
    itemMasters,
    config.defaultCostingBasis as CostRateBasis,
    config,
  );

  const updated_cost_structure: ProductionCostStructure = {
    ...po.cost_structure,
    budget,
    budget_snapshot_at: new Date().toISOString(),
    budget_rate_basis: config.defaultCostingBasis as CostRateBasis,
  };

  updated_cost_structure.variance.master_vs_budget = computeVariance(
    po.cost_structure.master,
    budget,
    config.leakVarianceThresholdPct,
  );

  if (
    updated_cost_structure.variance.master_vs_budget.threshold_breached &&
    config.enableLeakEmissionOnVariance
  ) {
    emitLeakEvent({
      entity_id: po.entity_id,
      category: 'cost',
      sub_kind: 'production_planning_variance',
      ref_type: 'po',
      ref_id: po.id,
      ref_label: po.doc_no,
      amount: updated_cost_structure.variance.master_vs_budget.total_amount,
      variance_pct: updated_cost_structure.variance.master_vs_budget.total_pct,
      notes: `Production Order ${po.doc_no} · planning variance ${updated_cost_structure.variance.master_vs_budget.total_pct.toFixed(1)}% exceeds threshold ${config.leakVarianceThresholdPct}%`,
      emitted_by: user.id,
    });
  }

  const released = transitionState(
    po,
    'released',
    user,
    `Released · ${reservation_ids.length} reservations created`,
  );
  released.lines = updated_lines;
  released.reservation_ids = reservation_ids;
  released.cost_structure = updated_cost_structure;

  const all = readPOs(po.entity_id);
  const idx = all.findIndex(x => x.id === po.id);
  if (idx >= 0) all[idx] = released; else all.push(released);
  writePOs(po.entity_id, all);

  return released;
}

// ════════════════════════════════════════════════════════════════════
// 4. CANCEL (DRAFT-only · D-410)
// ════════════════════════════════════════════════════════════════════

export function cancelProductionOrder(
  po: ProductionOrder,
  user: { id: string; name: string },
  reason: string,
): ProductionOrder {
  if (po.status !== 'draft')
    throw new Error('Only DRAFT orders can be cancelled (per D-410)');
  return transitionState(po, 'cancelled', user, `Cancelled · ${reason}`);
}

// ════════════════════════════════════════════════════════════════════
// 5. STOCK-HOLD RESOLVER (D-515)
// ════════════════════════════════════════════════════════════════════

export function resolveFGOutputGodown(
  input: { qc_required?: boolean; output_godown_id?: string | null } | ProductionOrder,
  qcConfig: QualiCheckConfig,
): string {
  const requires_qc =
    'qc_required' in input
      ? (input.qc_required ?? qcConfig.enableQualiCheck)
      : qcConfig.enableQualiCheck;

  if (qcConfig.enableOutgoingInspection && requires_qc)
    return qcConfig.quarantineGodownId || '';

  const og = (input as { output_godown_id?: string | null }).output_godown_id;
  return og || '';
}

// ════════════════════════════════════════════════════════════════════
// 6. COST COMPUTATION (D-512 · placeholder for 3a-pre-2/3)
// ════════════════════════════════════════════════════════════════════

export function computeMasterCost(
  bom: Bom,
  outputQty: number,
  itemMasters: InventoryItem[],
): ProductionCostLayer {
  let direct_material = 0;
  for (const c of bom.components) {
    const item = itemMasters.find(i => i.id === c.item_id);
    const rate = item?.std_cost_rate ?? 0;
    direct_material += c.qty * outputQty * (1 + (c.wastage_percent || 0) / 100) * rate;
  }
  const total = direct_material;
  return {
    direct_material,
    direct_labour: 0,
    direct_expense: 0,
    manufacturing_overhead: 0,
    other_direct_costs: 0,
    total,
    per_unit: outputQty > 0 ? total / outputQty : 0,
  };
}

export function computeBudgetCost(
  _bomId: string,
  outputQty: number,
  _itemMasters: InventoryItem[],
  _rateBasis: CostRateBasis,
  _config: ProductionConfig,
): ProductionCostLayer {
  // 3a-pre-1 placeholder · proper budget computation in 3a-pre-2
  void _bomId; void _itemMasters; void _rateBasis; void _config;
  const total = 0;
  return {
    direct_material: 0,
    direct_labour: 0,
    direct_expense: 0,
    manufacturing_overhead: 0,
    other_direct_costs: 0,
    total,
    per_unit: outputQty > 0 ? total / outputQty : 0,
  };
}

export function computeVariance(
  baseline: ProductionCostLayer,
  comparison: ProductionCostLayer,
  thresholdPct: number,
) {
  const total_amount = comparison.total - baseline.total;
  const total_pct = baseline.total > 0 ? (total_amount / baseline.total) * 100 : 0;
  return {
    total_amount,
    total_pct,
    is_unfavourable: total_amount > 0,
    threshold_breached: Math.abs(total_pct) > thresholdPct,
    by_component: {
      direct_material: comparison.direct_material - baseline.direct_material,
      direct_labour: comparison.direct_labour - baseline.direct_labour,
      direct_expense: comparison.direct_expense - baseline.direct_expense,
      manufacturing_overhead: comparison.manufacturing_overhead - baseline.manufacturing_overhead,
      other_direct_costs: comparison.other_direct_costs - baseline.other_direct_costs,
    },
    by_variance_type: {
      quantity_variance: 0,
      price_variance: 0,
      mix_variance: 0,
      yield_variance: 0,
      efficiency_variance: 0,
      rate_variance: 0,
      overhead_variance: 0,
    },
  };
}

// ════════════════════════════════════════════════════════════════════
// 7. UTILITIES
// ════════════════════════════════════════════════════════════════════

function readPOs(entityCode: string): ProductionOrder[] {
  try {
    const raw = localStorage.getItem(productionOrdersKey(entityCode));
    return raw ? (JSON.parse(raw) as ProductionOrder[]) : [];
  } catch { return []; }
}

function writePOs(entityCode: string, pos: ProductionOrder[]): void {
  // [JWT] PUT /api/production-orders/:entityCode
  localStorage.setItem(productionOrdersKey(entityCode), JSON.stringify(pos));
}

function makeInitialStatusEvent(
  user: { id: string; name: string },
  now: string,
): ProductionOrderStatusEvent {
  return {
    id: `pose-init-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    from_status: null,
    to_status: 'draft',
    changed_by_id: user.id,
    changed_by_name: user.name,
    changed_at: now,
    note: 'Production Order created',
  };
}

export function listProductionOrders(entityCode: string): ProductionOrder[] {
  return readPOs(entityCode);
}
