/**
 * @file        atp-engine.ts
 * @sprint      A.2 · T-A2-Production-ATP · Pillar-A CLOSE
 * @realizes    A.2 · Available-to-Promise · CONSUMES production-plan-engine.runCapacityCheck
 *              + existing production load. NO capacity logic re-implemented here.
 * @honest      OEE live-sensor-feed-adjusted ATP = Wave-2 (excluded from A.2).
 *              When load data is absent we return promise_date = null + an explicit
 *              "capacity data unavailable" warning. We NEVER fabricate a date.
 * @consumes    runCapacityCheck (production-plan-engine) · ProductionPlan shape ·
 *              localStorage production-plans store (entity-scoped) for current load.
 * @walls       production-plan-engine · oee-engine · process-genealogy-engine ·
 *              SalesX quote/order save logic — all 0-DIFF.
 * @[JWT]       Wave-2: OEE live-sensor feed → ATP date adjustment.
 */

import { runCapacityCheck } from '@/lib/production-plan-engine';
import { logAudit } from '@/lib/audit-trail-engine';
import type {
  ProductionPlan,
  ProductionPlanLine,
} from '@/types/production-plan';
import { productionPlansKey } from '@/types/production-plan';

export interface ATPLineInput {
  item_id: string;
  item_name: string;
  qty: number;
  requested_date: string; // YYYY-MM-DD
}

export type ATPStatus = 'available' | 'over_capacity' | 'partial';
export type ATPLineStatus = 'available' | 'over_capacity';

export interface ATPLineResult {
  item_id: string;
  item_name: string;
  qty: number;
  requested_date: string;
  status: ATPLineStatus;
  warnings: string[];
  capacity_check_status: 'pass' | 'warn' | 'fail' | 'not_run';
}

export interface ATPResult {
  status: ATPStatus;
  promise_date: string | null;
  warnings: string[];
  per_line: ATPLineResult[];
  /** Honest flag · true when load data was absent (NO fabricated date). */
  load_data_available: boolean;
  computed_at: string;
}

export interface ATPInput {
  lines: ATPLineInput[];
  entityCode: string;
  /** Source surface for audit (advisory only). */
  source?: 'quotation' | 'sales_order' | 'enquiry';
  source_doc_no?: string | null;
}

// ════════════════════════════════════════════════════════════════════
// Internals · consume existing load + delegate to runCapacityCheck
// ════════════════════════════════════════════════════════════════════

/** Read entity production plans (current load source). Honest [] on miss. */
function readProductionLoad(entityCode: string): ProductionPlan[] {
  try {
    // [JWT] GET /api/production-plans/:entityCode (read-only · ATP probe)
    const raw = localStorage.getItem(productionPlansKey(entityCode));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProductionPlan[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Build a transient single-line ProductionPlan to probe runCapacityCheck. */
function buildProbePlan(entityCode: string, line: ATPLineInput): ProductionPlan {
  const probeLine: ProductionPlanLine = {
    id: `atp-probe-${line.item_id}`,
    line_no: 1,
    item_id: line.item_id,
    item_code: line.item_id,
    item_name: line.item_name,
    planned_qty: line.qty,
    uom: 'NOS',
    target_date: line.requested_date,
    suggested_bom_id: null,
    suggested_batch_size: null,
    min_batch_size: null,
    max_batch_size: null,
    is_critical_path: false,
    is_export_line: false,
    ordered_qty: 0,
    produced_qty: 0,
    variance_pct: 0,
    notes: 'ATP probe (transient · never persisted)',
  };
  return {
    id: `atp-probe-${Date.now()}-${line.item_id}`,
    entity_id: entityCode,
    doc_no: 'ATP-PROBE',
    plan_period_start: line.requested_date,
    plan_period_end: line.requested_date,
    plan_type: 'sales_order',
    status: 'draft',
    source_links: {},
    department_id: 'atp',
    business_unit_id: null,
    lines: [probeLine],
    linked_production_order_ids: [],
    total_planned_qty: line.qty,
    total_ordered_qty: 0,
    total_produced_qty: 0,
    fulfillment_pct: 0,
    approval_history: [],
    status_history: [],
    capacity_check_status: 'not_run',
    capacity_warnings: [],
    capacity_check_run_at: null,
    capacity_check_details: {},
    notes: '',
    created_at: new Date().toISOString(),
    created_by: 'atp-engine',
    updated_at: new Date().toISOString(),
    updated_by: 'atp-engine',
  };
}

// ════════════════════════════════════════════════════════════════════
// Public API
// ════════════════════════════════════════════════════════════════════

/**
 * Honest promise_date.
 * Returns the requested_date when current load shows headroom for the line.
 * Pushes out by a heuristic lead time when capacity is tight (warn/fail).
 * Returns null when load data is absent — NEVER fabricates.
 */
export function computePromiseDate(
  requestedDate: string,
  capacityStatus: 'pass' | 'warn' | 'fail' | 'not_run',
  loadDataAvailable: boolean,
): string | null {
  if (!loadDataAvailable) return null;
  if (capacityStatus === 'pass') return requestedDate;
  // Honest pushback: warn = +7 calendar days · fail = +14 calendar days.
  const days = capacityStatus === 'fail' ? 14 : 7;
  const base = new Date(`${requestedDate}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return null;
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** Earliest-clear aggregator across per-line promise dates. */
function aggregatePromiseDate(perLine: ATPLineResult[], loadDataAvailable: boolean): string | null {
  if (!loadDataAvailable) return null;
  const dates = perLine
    .map(l => computePromiseDate(l.requested_date, l.capacity_check_status, true))
    .filter((d): d is string => !!d);
  if (dates.length === 0) return null;
  // Latest-of-earliest-clear so every line is honored.
  return dates.sort().slice(-1)[0];
}

/**
 * Available-to-Promise probe.
 * Consumes runCapacityCheck (production-plan-engine) per line. NEVER rebuilds capacity logic.
 */
export function checkAvailableToPromise(input: ATPInput): ATPResult {
  const computed_at = new Date().toISOString();
  const warnings: string[] = [];

  if (!input.lines || input.lines.length === 0) {
    return {
      status: 'available',
      promise_date: null,
      warnings: ['No lines to check'],
      per_line: [],
      load_data_available: false,
      computed_at,
    };
  }

  const load = readProductionLoad(input.entityCode);
  const loadDataAvailable = load.length > 0;
  if (!loadDataAvailable) {
    warnings.push(
      'Capacity data unavailable for this entity — promise date cannot be computed (honest null). Wire up production plans to enable ATP.',
    );
  }

  const perLine: ATPLineResult[] = input.lines.map(line => {
    const probe = buildProbePlan(input.entityCode, line);
    const cap = runCapacityCheck(probe); // ← delegated · no re-implementation
    const status: ATPLineStatus =
      cap.status === 'fail' ? 'over_capacity' : 'available';
    return {
      item_id: line.item_id,
      item_name: line.item_name,
      qty: line.qty,
      requested_date: line.requested_date,
      status,
      warnings: cap.warnings,
      capacity_check_status: cap.status,
    };
  });

  const overCount = perLine.filter(l => l.status === 'over_capacity').length;
  const aggregateStatus: ATPStatus =
    overCount === 0
      ? 'available'
      : overCount === perLine.length
        ? 'over_capacity'
        : 'partial';

  const promise_date = aggregatePromiseDate(perLine, loadDataAvailable);

  // Surface advisory audit on every gating ATP check (no mutation of records).
  try {
    logAudit({
      entity_type: 'sales_order' as never,
      entity_id: input.source_doc_no || 'atp-probe',
      action_type: 'view' as never,
      summary: `ATP check · ${aggregateStatus} · ${input.lines.length} line(s)`,
      details: {
        atp_status: aggregateStatus,
        promise_date,
        load_data_available: loadDataAvailable,
        source: input.source ?? 'quotation',
      },
    } as never);
  } catch {
    // Audit must never break the advisory path.
  }

  return {
    status: aggregateStatus,
    promise_date,
    warnings,
    per_line: perLine,
    load_data_available: loadDataAvailable,
    computed_at,
  };
}
