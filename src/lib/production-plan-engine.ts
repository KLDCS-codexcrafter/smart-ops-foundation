/**
 * @file     production-plan-engine.ts
 * @sprint   T-Phase-1.3-3a-pre-2.5 · Block C · D-541 · Q15=a
 * @purpose  Production Plan voucher engine: CRUD · 5-state machine · capacity stub ·
 *           rollup of total_planned/ordered/produced and fulfillment_pct.
 *           PP doc-no prefix · always multi-line · 8 plan_types.
 */

import type {
  ProductionPlan,
  ProductionPlanLine,
  ProductionPlanStatus,
  ProductionPlanStatusEvent,
  ProductionPlanType,
  ProductionPlanSourceLinks,
  CapacityCheckStatus,
} from '@/types/production-plan';
import { productionPlansKey } from '@/types/production-plan';
import { generateDocNo } from '@/lib/finecore-engine';

// ════════════════════════════════════════════════════════════════════
// Persistence helpers
// ════════════════════════════════════════════════════════════════════

function readPlans(entityCode: string): ProductionPlan[] {
  try {
    // [JWT] GET /api/production-plans/:entityCode
    const raw = localStorage.getItem(productionPlansKey(entityCode));
    return raw ? (JSON.parse(raw) as ProductionPlan[]) : [];
  } catch {
    return [];
  }
}

function writePlans(entityCode: string, plans: ProductionPlan[]): void {
  // [JWT] PUT /api/production-plans/:entityCode
  localStorage.setItem(productionPlansKey(entityCode), JSON.stringify(plans));
}

function upsertPlan(entityCode: string, plan: ProductionPlan): void {
  const all = readPlans(entityCode);
  const idx = all.findIndex(p => p.id === plan.id);
  if (idx >= 0) all[idx] = plan;
  else all.push(plan);
  writePlans(entityCode, all);
}

function nowIso(): string {
  return new Date().toISOString();
}

// ════════════════════════════════════════════════════════════════════
// State machine
// ════════════════════════════════════════════════════════════════════

const TRANSITIONS: Record<ProductionPlanStatus, ProductionPlanStatus[]> = {
  draft:        ['approved', 'cancelled'],
  approved:     ['in_execution', 'cancelled'],
  in_execution: ['closed', 'cancelled'],
  closed:       [],
  cancelled:    [],
};

export function canTransition(
  from: ProductionPlanStatus,
  to: ProductionPlanStatus,
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

function makeStatusEvent(
  from: ProductionPlanStatus | null,
  to: ProductionPlanStatus,
  user: { id: string; name: string },
  note: string = '',
): ProductionPlanStatusEvent {
  return {
    id: `pps-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from_status: from,
    to_status: to,
    changed_by_id: user.id,
    changed_by_name: user.name,
    changed_at: nowIso(),
    note,
  };
}

// ════════════════════════════════════════════════════════════════════
// CREATE
// ════════════════════════════════════════════════════════════════════

export interface CreateProductionPlanLineInput {
  item_id: string;
  item_code: string;
  item_name: string;
  planned_qty: number;
  uom: string;
  target_date: string;
  suggested_bom_id?: string | null;
  suggested_batch_size?: number | null;
  min_batch_size?: number | null;
  max_batch_size?: number | null;
  is_critical_path?: boolean;
  is_export_line?: boolean;
  notes?: string;
}

export interface CreateProductionPlanInput {
  entity_id: string;
  plan_period_start: string;
  plan_period_end: string;
  plan_type: ProductionPlanType;
  department_id: string;
  business_unit_id?: string | null;
  source_links?: ProductionPlanSourceLinks;
  lines: CreateProductionPlanLineInput[];
  notes?: string;
  created_by: string;
}

export function createProductionPlan(
  input: CreateProductionPlanInput,
  user: { id: string; name: string },
): ProductionPlan {
  if (!input.lines || input.lines.length === 0)
    throw new Error('Production Plan requires at least one line');
  if (new Date(input.plan_period_end) < new Date(input.plan_period_start))
    throw new Error('plan_period_end must be on/after plan_period_start');
  for (const l of input.lines) {
    if (l.planned_qty <= 0)
      throw new Error(`Line for ${l.item_name} must have positive planned_qty`);
  }

  const doc_no = generateDocNo('PP', input.entity_id);
  const now = nowIso();

  const lines: ProductionPlanLine[] = input.lines.map((l, i) => ({
    id: `ppl-${doc_no.replace(/\//g, '-')}-${i + 1}`,
    line_no: i + 1,
    item_id: l.item_id,
    item_code: l.item_code,
    item_name: l.item_name,
    planned_qty: l.planned_qty,
    uom: l.uom,
    target_date: l.target_date,
    suggested_bom_id: l.suggested_bom_id ?? null,
    suggested_batch_size: l.suggested_batch_size ?? null,
    min_batch_size: l.min_batch_size ?? null,
    max_batch_size: l.max_batch_size ?? null,
    is_critical_path: l.is_critical_path ?? false,
    is_export_line: l.is_export_line ?? false,
    ordered_qty: 0,
    produced_qty: 0,
    variance_pct: 0,
    notes: l.notes ?? '',
  }));

  const total_planned_qty = lines.reduce((s, l) => s + l.planned_qty, 0);

  const plan: ProductionPlan = {
    id: `pp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entity_id: input.entity_id,
    doc_no,
    plan_period_start: input.plan_period_start,
    plan_period_end: input.plan_period_end,
    plan_type: input.plan_type,
    status: 'draft',
    source_links: input.source_links ?? {},
    department_id: input.department_id,
    business_unit_id: input.business_unit_id ?? null,
    lines,
    linked_production_order_ids: [],
    total_planned_qty,
    total_ordered_qty: 0,
    total_produced_qty: 0,
    fulfillment_pct: 0,
    approval_history: [],
    status_history: [makeStatusEvent(null, 'draft', user, 'Plan created')],
    capacity_check_status: 'not_run',
    capacity_warnings: [],
    capacity_check_run_at: null,
    capacity_check_details: {},
    notes: input.notes ?? '',
    created_at: now,
    created_by: user.name,
    updated_at: now,
    updated_by: user.name,
  };

  upsertPlan(input.entity_id, plan);
  return plan;
}

// ════════════════════════════════════════════════════════════════════
// State transitions
// ════════════════════════════════════════════════════════════════════

function transition(
  plan: ProductionPlan,
  next: ProductionPlanStatus,
  user: { id: string; name: string },
  note: string,
): ProductionPlan {
  if (!canTransition(plan.status, next))
    throw new Error(`Invalid transition: ${plan.status} → ${next}`);
  const updated: ProductionPlan = {
    ...plan,
    status: next,
    status_history: [...plan.status_history, makeStatusEvent(plan.status, next, user, note)],
    updated_at: nowIso(),
    updated_by: user.name,
  };
  upsertPlan(plan.entity_id, updated);
  return updated;
}

export function approveProductionPlan(
  plan: ProductionPlan,
  user: { id: string; name: string },
  note: string = '',
): ProductionPlan {
  return transition(plan, 'approved', user, note || 'Approved');
}

export function startProductionPlanExecution(
  plan: ProductionPlan,
  user: { id: string; name: string },
  note: string = '',
): ProductionPlan {
  return transition(plan, 'in_execution', user, note || 'Execution started');
}

export function closeProductionPlan(
  plan: ProductionPlan,
  user: { id: string; name: string },
  note: string = '',
): ProductionPlan {
  return transition(plan, 'closed', user, note || 'Plan closed');
}

export function cancelProductionPlan(
  plan: ProductionPlan,
  user: { id: string; name: string },
  reason: string,
): ProductionPlan {
  if (!reason || !reason.trim())
    throw new Error('Cancellation reason is required');
  return transition(plan, 'cancelled', user, `Cancelled: ${reason}`);
}

// ════════════════════════════════════════════════════════════════════
// PO linkage + rollup
// ════════════════════════════════════════════════════════════════════

export function linkProductionOrder(
  plan: ProductionPlan,
  productionOrderId: string,
  user: { id: string; name: string },
): ProductionPlan {
  if (plan.linked_production_order_ids.includes(productionOrderId)) return plan;
  const updated: ProductionPlan = {
    ...plan,
    linked_production_order_ids: [...plan.linked_production_order_ids, productionOrderId],
    updated_at: nowIso(),
    updated_by: user.name,
  };
  upsertPlan(plan.entity_id, updated);
  return updated;
}

/**
 * Recompute ordered/produced rollups from given line snapshots, and update
 * fulfillment_pct = total_produced / total_planned * 100.
 */
export function rollupFulfillment(
  plan: ProductionPlan,
  lineUpdates: Array<{ line_id: string; ordered_qty: number; produced_qty: number }>,
  user: { id: string; name: string },
): ProductionPlan {
  const map = new Map(lineUpdates.map(u => [u.line_id, u]));
  const lines = plan.lines.map(l => {
    const u = map.get(l.id);
    if (!u) return l;
    const variance_pct = l.planned_qty > 0
      ? ((u.produced_qty - l.planned_qty) / l.planned_qty) * 100
      : 0;
    return {
      ...l,
      ordered_qty: u.ordered_qty,
      produced_qty: u.produced_qty,
      variance_pct,
    };
  });
  const total_ordered_qty = lines.reduce((s, l) => s + l.ordered_qty, 0);
  const total_produced_qty = lines.reduce((s, l) => s + l.produced_qty, 0);
  const fulfillment_pct = plan.total_planned_qty > 0
    ? (total_produced_qty / plan.total_planned_qty) * 100
    : 0;

  const updated: ProductionPlan = {
    ...plan,
    lines,
    total_ordered_qty,
    total_produced_qty,
    fulfillment_pct,
    updated_at: nowIso(),
    updated_by: user.name,
  };
  upsertPlan(plan.entity_id, updated);
  return updated;
}

// ════════════════════════════════════════════════════════════════════
// Capacity check (Phase-1 stub · D-541)
// ════════════════════════════════════════════════════════════════════

export interface CapacityCheckResult {
  status: CapacityCheckStatus;
  warnings: string[];
}

/**
 * Lightweight Phase-1 capacity check. Flags WARN if any single line's
 * planned_qty exceeds (max_batch_size * 30) — i.e. > 30 batches in the period
 * for that item. FAIL if planned_qty <= 0 (defensive). Otherwise PASS.
 * Real MRP/capacity engine arrives in Phase-2.
 */
export function runCapacityCheck(plan: ProductionPlan): CapacityCheckResult {
  const warnings: string[] = [];
  let status: CapacityCheckStatus = 'pass';
  for (const l of plan.lines) {
    if (l.planned_qty <= 0) {
      warnings.push(`Line ${l.line_no} (${l.item_name}): non-positive planned qty`);
      status = 'fail';
      continue;
    }
    if (l.max_batch_size && l.max_batch_size > 0) {
      const batches = l.planned_qty / l.max_batch_size;
      if (batches > 30) {
        warnings.push(
          `Line ${l.line_no} (${l.item_name}): ${batches.toFixed(1)} batches needed · capacity tight`,
        );
        if (status === 'pass') status = 'warn';
      }
    }
  }
  return { status, warnings };
}

export function applyCapacityCheck(
  plan: ProductionPlan,
  user: { id: string; name: string },
): ProductionPlan {
  const result = runCapacityCheck(plan);
  const updated: ProductionPlan = {
    ...plan,
    capacity_check_status: result.status,
    capacity_warnings: result.warnings,
    updated_at: nowIso(),
    updated_by: user.name,
  };
  upsertPlan(plan.entity_id, updated);
  return updated;
}

// ════════════════════════════════════════════════════════════════════
// Read helpers
// ════════════════════════════════════════════════════════════════════

export function listProductionPlans(entityCode: string): ProductionPlan[] {
  return readPlans(entityCode);
}

export function getProductionPlanById(
  entityCode: string,
  id: string,
): ProductionPlan | null {
  return readPlans(entityCode).find(p => p.id === id) ?? null;
}
