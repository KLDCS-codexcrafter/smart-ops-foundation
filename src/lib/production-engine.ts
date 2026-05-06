/**
 * @file     production-engine.ts
 * @sprint   T-Phase-1.3-3a-pre-1
 * @purpose  Production Order engine · CRUD · 5-state machine · stock-hold resolver · 3-layer cost.
 * @decisions D-502 · D-291 · D-309 · D-410 · D-511 · D-512 · D-515
 */

import type {
  ProductionOrder,
  ProductionOrderLine,
  ProductionOrderOutput,
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
import type { Bom, BomComponentType } from '@/types/bom';
import type { InventoryItem } from '@/types/inventory-item';
import type { QualiCheckConfig, ProductionConfig } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import { productionOrdersKey } from '@/types/production-order';
import { emptyCostStructure } from '@/types/production-cost';
import { generateDocNo } from '@/lib/finecore-engine';
import { emitLeakEvent } from '@/lib/leak-register-engine';
import { createProductionOrderReservations } from '@/lib/stock-reservation-engine';
import { getProductionPlanById, linkProductionOrder } from '@/lib/production-plan-engine';

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
  project_centre_id?: string;
  reference_project_id?: string;
  sales_plan_id?: string;
  production_site_id?: string;
  nature_of_processing?: string;
  is_job_work_in?: boolean;
  production_team_id?: string;
  production_plan_id?: string;
  linked_production_plan_ids?: string[];
  outputs?: ProductionOrderOutput[];
  linked_letter_of_credit_id?: string;
  notes?: string;
  created_by: string;
}

// ════════════════════════════════════════════════════════════════════
// 1a. Multi-level BOM explosion (Sprint 3a-pre-2 · Block A · D-528 · Q3=a)
// ════════════════════════════════════════════════════════════════════

export interface ExplodedBomComponent {
  item_id: string;
  item_code: string;
  item_name: string;
  component_type: BomComponentType;
  required_qty: number;
  uom: string;
  bom_component_ids: string[];     // for traceability
  bom_path: string[];              // 'TopBOM@L0', 'SubBOM@L1' for audit trail
}

/**
 * Recursively explode a BOM into a flat list of raw-material requirements.
 * Per Q3=a · Sprint 3a-pre-2 · D-528 lineage.
 *
 * If a BomComponent.sub_bom_id is non-null AND component_type === 'semi_finished',
 * the function recursively resolves the sub-BOM and accumulates its components.
 * Wastage compounds at each level: effective_qty = qty * (1 + wastage_pct/100).
 *
 * Backward-compatible: a BOM with no semi-finished components produces the
 * same flat list the legacy single-level path would.
 */
export function explodeBOM(
  bom: Bom,
  outputQty: number,
  allBoms: Bom[],
  maxDepth: number = 5,
): ExplodedBomComponent[] {
  const accumulator = new Map<string, ExplodedBomComponent>();
  explodeBOMRecursive(bom, outputQty, allBoms, accumulator, maxDepth, 0);
  return Array.from(accumulator.values());
}

function explodeBOMRecursive(
  bom: Bom,
  outputQty: number,
  allBoms: Bom[],
  acc: Map<string, ExplodedBomComponent>,
  maxDepth: number,
  currentDepth: number,
): void {
  if (currentDepth > maxDepth) {
    console.warn(`[explodeBOM] Max depth ${maxDepth} reached at BOM ${bom.id} · semi-finished components beyond this depth treated as RM`);
    return;
  }
  for (const c of bom.components) {
    const effectiveQty = c.qty * outputQty * (1 + (c.wastage_percent || 0) / 100);

    if (c.component_type === 'semi_finished' && c.sub_bom_id) {
      const subBom = allBoms.find(b => b.id === c.sub_bom_id && b.is_active);
      if (subBom) {
        explodeBOMRecursive(subBom, effectiveQty, allBoms, acc, maxDepth, currentDepth + 1);
        continue;
      }
      console.warn(`[explodeBOM] sub_bom_id ${c.sub_bom_id} not found · treating as RM`);
    }

    const existing = acc.get(c.item_id);
    if (existing) {
      existing.required_qty += effectiveQty;
      existing.bom_component_ids.push(c.id);
      existing.bom_path.push(`${bom.product_item_code}@L${currentDepth}`);
    } else {
      acc.set(c.item_id, {
        item_id: c.item_id,
        item_code: c.item_code,
        item_name: c.item_name,
        component_type: c.component_type,
        required_qty: effectiveQty,
        uom: c.uom,
        bom_component_ids: [c.id],
        bom_path: [`${bom.product_item_code}@L${currentDepth}`],
      });
    }
  }
}

// ════════════════════════════════════════════════════════════════════
// 1b. CRUD · CREATE
// ════════════════════════════════════════════════════════════════════

export function createProductionOrder(
  input: CreateProductionOrderInput,
  bom: Bom,
  itemMasters: InventoryItem[],
  config: ProductionConfig,
  qcConfig: QualiCheckConfig,
  user: { id: string; name: string },
  allBoms?: Bom[],
): ProductionOrder {
  if (input.planned_qty <= 0) throw new Error('planned_qty must be positive');
  if (new Date(input.target_end_date) < new Date(input.start_date))
    throw new Error('target_end_date must be after start_date');
  if (input.is_export_project && !input.export_destination_country)
    throw new Error('Export production requires export_destination_country');

  const doc_no = generateDocNo('MO', input.entity_id);

  // Block A · D-528 · multi-level explosion (flattens semi-finished sub-BOMs).
  // For single-level BOMs (no sub_bom_id) result equals the legacy single-level mapping.
  const exploded = explodeBOM(bom, input.planned_qty, allBoms ?? [bom]);
  const lines: ProductionOrderLine[] = exploded.map((c, i) => ({
    id: `pol-${doc_no.replace(/\//g, '-')}-${i + 1}`,
    line_no: i + 1,
    bom_component_id: c.bom_component_ids[0],
    item_id: c.item_id,
    item_code: c.item_code,
    item_name: c.item_name,
    required_qty: c.required_qty,
    issued_qty: 0,
    uom: c.uom,
    reservation_id: null,
    batch_no: null,
    serial_nos: [],
    heat_no: null,
    // Substitution defaults (D-543 · 3a-pre-2.5)
    original_bom_item_id: c.item_id,
    original_bom_qty: c.required_qty,
    is_substituted: false,
    substitute_reason: null,
    substitute_item_substitute_id: null,
    substitute_notes: '',
    substituted_by: null,
    substituted_at: null,
    original_unit_rate: 0,
    substituted_unit_rate: 0,
    cost_variance_amount: 0,
    cost_variance_pct: 0,
    yield_impact_pct: 0,
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
    project_centre_id: input.project_centre_id || null,
    reference_project_id: input.reference_project_id || null,
    sales_order_id: input.sales_order_line_mappings?.[0]?.sales_order_id || null,
    sales_order_line_mappings: input.sales_order_line_mappings || [],
    sales_plan_id: input.sales_plan_id || null,
    customer_id: input.customer_id || null,
    customer_name: null,
    business_unit_id: input.business_unit_id || null,
    batch_no: input.batch_no || null,
    is_export_project: input.is_export_project || false,
    production_site_id: input.production_site_id || null,
    nature_of_processing: input.nature_of_processing || null,
    is_job_work_in: input.is_job_work_in || false,
    linked_job_work_out_order_ids: [],
    qc_required: input.qc_required ?? qcConfig.enableQualiCheck,
    qc_scenario: input.qc_scenario || (input.is_export_project ? 'export_oriented' : null),
    linked_test_report_ids: [],
    routed_to_quarantine: false,
    production_plan_id: input.production_plan_id || null,
    shift_id: input.shift_id || null,
    production_team_id: input.production_team_id || null,
    export_destination_country: input.export_destination_country || null,
    export_regulatory_body: input.export_regulatory_body || null,
    linked_letter_of_credit_id: input.linked_letter_of_credit_id || null,
    cost_structure,
    lines,
    outputs: input.outputs && input.outputs.length > 0 ? input.outputs : [{
      id: `pout-${doc_no.replace(/\//g, '-')}-1`,
      output_no: 1,
      output_kind: 'main',
      item_id: input.output_item_id,
      item_code: bom.product_item_code || '',
      item_name: bom.product_item_name || '',
      planned_qty: input.planned_qty,
      uom: bom.output_uom || 'nos',
      bom_id: input.bom_id,
      bom_version: bom.version_no || 1,
      batch_no: input.batch_no || null,
      qc_required: input.qc_required ?? qcConfig.enableQualiCheck,
      qc_scenario: input.qc_scenario || (input.is_export_project ? 'export_oriented' : null),
      linked_test_report_ids: [],
      output_cost_master: cost_structure.master.total,
      output_cost_budget: 0,
      output_cost_actual: 0,
      cost_allocation_basis: 'qty',
      cost_allocation_pct: 100,
      actual_qty: null,
      yield_pct: null,
      output_godown_id,
    }],
    linked_production_plan_ids: input.linked_production_plan_ids ?? (input.production_plan_id ? [input.production_plan_id] : []),
    approval_history: [],
    status_history: [makeInitialStatusEvent(user, now)],
    closed_at: null,
    closed_by_user_id: null,
    closed_by_name: null,
    closure_approval: null,
    closure_remarks: '',
    closed_cost_snapshot: null,
    closed_variance_id: null,
    notes: input.notes || '',
    created_at: now,
    created_by: user.name,
    updated_at: now,
    updated_by: user.name,
  };

  const all = readPOs(input.entity_id);
  all.push(po);
  writePOs(input.entity_id, all);

  // Block J · D-551 · Q14=a — back-link plan(s) → PO (M:N)
  const planIds = po.linked_production_plan_ids ?? [];
  for (const pid of planIds) {
    const plan = getProductionPlanById(input.entity_id, pid);
    if (plan) linkProductionOrder(plan, po.id, user);
  }

  return po;
}

// ════════════════════════════════════════════════════════════════════
// 2. STATE MACHINE
// ════════════════════════════════════════════════════════════════════

const ALLOWED_TRANSITIONS: Record<ProductionOrderStatus, ProductionOrderStatus[]> = {
  draft:       ['released', 'cancelled'],
  released:    ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed:   ['closed'],
  closed:      [],
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
  bom: Bom,
  itemMasters: InventoryItem[],
  config: ProductionConfig,
  user: { id: string; name: string },
): ProductionOrder {
  if (po.status !== 'draft') throw new Error('Only DRAFT orders can be released');

  const reservations = createProductionOrderReservations(
    po.entity_id,
    po.id,
    po.doc_no,
    po.lines.map(l => ({ item_name: l.item_name, qty: l.required_qty })),
  );
  const reservationIdByItem = new Map(reservations.map(r => [r.item_name, r.id]));
  const reservation_ids = reservations.map(r => r.id);
  const updated_lines = po.lines.map(line => ({
    ...line,
    reservation_id: reservationIdByItem.get(line.item_name) ?? null,
  }));

  const budget = computeBudgetCost(
    bom,
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
  bom: Bom,
  outputQty: number,
  itemMasters: InventoryItem[],
  rateBasis: CostRateBasis,
  config: ProductionConfig,
): ProductionCostLayer {
  void config; // reserved for 3a-pre-2 (allocation overrides)
  let direct_material = 0;
  for (const c of bom.components) {
    const item = itemMasters.find(i => i.id === c.item_id);
    if (!item) continue;
    const stdRate = item.std_cost_rate ?? 0;
    const lastRate = item.last_purchase_rate ?? stdRate;
    const rate =
      rateBasis === 'last_purchase'   ? lastRate :
      rateBasis === 'master_standard' ? stdRate :
      rateBasis === 'budget_rate'     ? stdRate :
      rateBasis === 'current_rate'    ? lastRate :
      stdRate;
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

// ════════════════════════════════════════════════════════════════════
// 6. CLOSURE · Q19=b maker-checker + cost freeze + variance freeze (D-559)
// ════════════════════════════════════════════════════════════════════
import type { ApprovalEvent } from '@/types/material-indent';
import {
  computeProductionVariance,
  persistProductionVariance,
  freezeProductionVariance,
} from '@/lib/production-variance-engine';
import { listMaterialIssues } from '@/lib/material-issue-engine';
import { listProductionConfirmations } from '@/lib/production-confirmation-engine';
import { listJobWorkOutOrders } from '@/lib/job-work-out-engine';
import { listJobWorkReceipts } from '@/lib/job-work-receipt-engine';
import { isPeriodLocked, periodLockMessage } from '@/lib/period-lock-engine';

export interface CloseProductionOrderInput {
  po: ProductionOrder;
  closureRemarks: string;
  closer: { id: string; name: string };
  thresholdPct: number;
}

export function closeProductionOrder(input: CloseProductionOrderInput): ProductionOrder {
  const { po, closureRemarks, closer, thresholdPct } = input;

  if (po.status !== 'completed') {
    throw new Error(`Cannot close PO in '${po.status}' status · must be 'completed' first`);
  }
  const today = new Date().toISOString().slice(0, 10);
  if (isPeriodLocked(today, po.entity_id)) {
    throw new Error(periodLockMessage(today, po.entity_id) ?? 'Period locked');
  }
  // Q19=b · Maker-checker
  if (closer.id === po.created_by || closer.name === po.created_by) {
    throw new Error('Maker-checker · PO creator cannot close (Q19=b)');
  }
  const pcs = listProductionConfirmations(po.entity_id).filter(pc => pc.production_order_id === po.id);
  if (pcs.length > 0) {
    const latestPC = pcs.reduce((latest, pc) =>
      new Date(pc.confirmation_date) > new Date(latest.confirmation_date) ? pc : latest, pcs[0]);
    if (closer.id === latestPC.confirmed_by_user_id) {
      throw new Error('Maker-checker · latest PC creator cannot close (Q19=b)');
    }
  }
  const mins = listMaterialIssues(po.entity_id).filter(m => m.production_order_id === po.id);
  if (mins.some(m => m.status === 'draft')) {
    throw new Error('Cannot close · pending DRAFT Material Issues exist');
  }
  const jwos = listJobWorkOutOrders(po.entity_id).filter(j => j.production_order_id === po.id);
  const jwrs = listJobWorkReceipts(po.entity_id);
  for (const jwo of jwos) {
    if (jwo.status === 'sent' || jwo.status === 'partially_received') {
      throw new Error(`Cannot close · JWO ${jwo.doc_no} has unreceived stock`);
    }
  }

  // Compute & freeze variance
  const variance = computeProductionVariance({ po, mins, pcs, jwos, jwrs, thresholdPct });
  persistProductionVariance(po.entity_id, variance);
  freezeProductionVariance(po.entity_id, po.id, closer);

  // Cost freeze snapshot
  const closed_cost_snapshot: ProductionCostStructure = JSON.parse(JSON.stringify(po.cost_structure));

  const now = new Date().toISOString();
  const closure_approval: ApprovalEvent = {
    id: `apv-${Date.now()}`,
    approver_user_id: closer.id,
    approver_role: 'closer',
    action: 'approved',
    remarks: closureRemarks,
    acted_at: now,
  };

  const updated: ProductionOrder = {
    ...po,
    status: 'closed',
    closed_at: now,
    closed_by_user_id: closer.id,
    closed_by_name: closer.name,
    closure_approval,
    closure_remarks: closureRemarks,
    closed_cost_snapshot,
    closed_variance_id: variance.id,
    status_history: [
      ...po.status_history,
      {
        id: `pose-${Date.now()}`,
        from_status: 'completed',
        to_status: 'closed',
        changed_by_id: closer.id,
        changed_by_name: closer.name,
        changed_at: now,
        note: `Closed (maker-checker · ${variance.threshold_breach_count} breaches · ₹${variance.total_variance_amount} total)`,
      },
    ],
    updated_at: now,
    updated_by: closer.name,
  };

  const all = readPOs(po.entity_id);
  const idx = all.findIndex(p => p.id === po.id);
  if (idx >= 0) {
    all[idx] = updated;
    writePOs(po.entity_id, all);
  }
  return updated;
}

// ════════════════════════════════════════════════════════════════════
// Sprint 3b-pre-1 · Block C · D-617 · Q45=c · QC auto-create on PO completion
// Backward-compat additive · existing transitionState() preserved
// ════════════════════════════════════════════════════════════════════
import { createQaInspectionFromPO } from '@/lib/qa-inspection-production-bridge';
import type { ManufacturingTemplate } from '@/config/manufacturing-templates';
import type { ItemQCParam } from '@/types/item-qc-param';
import type { QaPlan } from '@/types/qa-plan';

export interface CompletePOQCContext {
  productionConfig: ProductionConfig;
  template?: ManufacturingTemplate;
  itemQCParams: ItemQCParam[];
  qaPlans: QaPlan[];
}

export function completeProductionOrder(
  po: ProductionOrder,
  user: { id: string; name: string },
  qcContext?: CompletePOQCContext,
): ProductionOrder {
  const transitioned = transitionState(po, 'completed', user, 'Completed');
  if (!qcContext || !transitioned.qc_required) return transitioned;
  if (!qcContext.productionConfig.enableProductionQC) return transitioned;
  const mode = qcContext.productionConfig.qcAutoCreateMode ?? 'config_per_scenario';
  let shouldCreate = false;
  if (mode === 'always') shouldCreate = true;
  else if (mode === 'config_per_scenario')
    shouldCreate = transitioned.qc_scenario === 'internal_dept' || transitioned.qc_scenario === 'third_party_agency';
  if (!shouldCreate) return transitioned;
  try {
    const insp = createQaInspectionFromPO({
      po: transitioned,
      inspector_user_id: user.id,
      inspection_location: 'Production Floor',
      template: qcContext.template,
      itemQCParams: qcContext.itemQCParams,
      qaPlans: qcContext.qaPlans,
    });
    return { ...transitioned, linked_test_report_ids: [...transitioned.linked_test_report_ids, insp.id] };
  } catch (e) { console.error('[production-engine] QC auto-create failed', e); return transitioned; }
}
