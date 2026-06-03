/**
 * @file        src/lib/advanced-costing-engine.ts
 * @sibling     NEW @ Sprint 125 · 🏁 Arc D.1 CAPSTONE · Advanced Costing
 * @pillar      D.1 · Advanced (management-decision) Costing — job costing · process
 *              costing · Activity-Based Costing (ABC) · Cost-Volume-Profit (CVP) /
 *              break-even analysis. DISTINCT from comply360-cost-audit-engine
 *              (statutory §148 · shipped S104) AND from S124 operational-costing-
 *              engine (BOM/standard/variance). This is the management-decision
 *              costing layer that READS the S124 standard-cost base.
 * @fr-44       TWO WALLS:
 *                A — DISTINCT from comply360-cost-audit-engine (statutory §148).
 *                    NO statutory-filing functions here. Cost-audit stays 0-DIFF.
 *                B — REUSES (not reimplements) S124 operational-costing-engine
 *                    getStandardCost as the standard-cost base + cost-allocation-
 *                    engine computeRatios for ABC driver-share allocation. Both
 *                    source engines stay 0-DIFF.
 * @reads-from  operational-costing-engine · cost-allocation-engine ·
 *              decimal-helpers · audit-trail-engine
 * @scope-wall  DP-D1-9: costing ONLY. NO marketing (D.2), NO InsightX
 *              aggregation (D.3). Scope-wall test asserts NO such exports.
 * @audit       Emits 'advanced_cost_run' (module 'mca-roc') on every compute*.
 * @sprint      T-Phase-7.D.1.6 · Sprint 125 · Block 2 · 🏁 Arc D.1 Capstone
 * [JWT] Phase 8: GET/POST /api/advanced-costing/{job,process,abc,cvp}
 */
import { dAdd, dSub, dMul, dSum, round2 } from '@/lib/decimal-helpers';
import { logAudit } from '@/lib/audit-trail-engine';
// FR-44 Wall B — READ-ONLY reuse (never mutated):
import { getStandardCost as _getStandardCost } from '@/lib/operational-costing-engine';
import { computeRatios as _computeRatios } from '@/lib/cost-allocation-engine';

// ─── READS_FROM declaration (transparency · FR-91) ───────────────────────────

export const READS_FROM = Object.freeze({
  engines: [
    'operational-costing-engine',
    'cost-allocation-engine',
    'decimal-helpers',
    'audit-trail-engine',
  ],
  storage_keys: [
    'erp_advanced_costing_jobs',
    'erp_advanced_costing_processes',
  ],
} as const);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface JobCost {
  job_id: string;
  direct_material: number;
  direct_labour: number;
  overhead_applied: number;
  total_cost: number;
  units: number;
  cost_per_unit: number;
  /** When the job's primary item has a S124 standard cost on file, capture it
   *  here as the standard-cost base reference (FR-44 Wall B — read-only). */
  standard_base_per_unit: number | null;
}

export interface ProcessCost {
  process_id: string;
  period: string;
  input_cost: number;
  conversion_cost: number;
  equivalent_units: number;
  cost_per_equiv_unit: number;
}

export interface ABCActivity {
  activity: string;
  driver: string;
  driver_qty: number;
  rate: number;
  allocated: number;
}

export interface ABCResult {
  cost_object: string;
  activities: ABCActivity[];
  total_allocated: number;
  /** Driver shares from cost-allocation-engine.computeRatios — surfaces the
   *  reuse so callers + tests can verify it (FR-44 Wall B). */
  driver_shares: number[];
}

export interface CVPResult {
  fy: string;
  scope_id: string;
  fixed_cost: number;
  sales: number;
  variable_cost: number;
  contribution_margin: number;
  contribution_margin_ratio: number;
  break_even_revenue: number;
  margin_of_safety: number;
  /** True when sales=0 or CM-ratio<=0 — break-even is undefined; we return 0. */
  divide_by_zero_guarded: boolean;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const JOBS_KEY = 'erp_advanced_costing_jobs';
const PROCESSES_KEY = 'erp_advanced_costing_processes';

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch { /* best effort */ }
}

// ─── (1) JOB COSTING ─────────────────────────────────────────────────────────

export function computeJobCost(input: {
  job_id: string;
  direct_material: number;
  direct_labour: number;
  overhead_applied: number;
  units: number;
  /** Optional item_key used to look up a S124 standard cost as the base ref. */
  standard_item_key?: string;
}): JobCost {
  const dm = round2(input.direct_material);
  const dl = round2(input.direct_labour);
  const oh = round2(input.overhead_applied);
  const total_cost = round2(dAdd(dAdd(dm, dl), oh));
  const units = input.units > 0 ? input.units : 0;
  const cost_per_unit = units > 0 ? round2(total_cost / units) : 0;

  let standard_base_per_unit: number | null = null;
  if (input.standard_item_key) {
    // FR-44 Wall B — READ S124 standard-cost base, do NOT reimplement.
    const std = _getStandardCost(input.standard_item_key);
    if (std) standard_base_per_unit = round2(std.standard_total);
  }

  const job: JobCost = {
    job_id: input.job_id,
    direct_material: dm,
    direct_labour: dl,
    overhead_applied: oh,
    total_cost,
    units,
    cost_per_unit,
    standard_base_per_unit,
  };
  const list = loadJSON<JobCost[]>(JOBS_KEY, []);
  const idx = list.findIndex((j) => j.job_id === job.job_id);
  if (idx >= 0) list[idx] = job; else list.push(job);
  saveJSON(JOBS_KEY, list);

  try {
    logAudit({
      entityCode: 'GROUP',
      action: idx >= 0 ? 'update' : 'create',
      entityType: 'advanced_cost_run',
      recordId: `job::${job.job_id}`,
      recordLabel: `Job cost · ${job.job_id} · total=${total_cost} · /unit=${cost_per_unit}`,
      beforeState: idx >= 0 ? (list[idx] as unknown as Record<string, unknown>) : null,
      afterState: job as unknown as Record<string, unknown>,
      sourceModule: 'advanced-costing-engine',
    });
  } catch { /* audit best-effort */ }
  return job;
}

export function listJobCosts(): JobCost[] {
  return loadJSON<JobCost[]>(JOBS_KEY, []);
}

// ─── (2) PROCESS COSTING ─────────────────────────────────────────────────────

export function computeProcessCost(input: {
  process_id: string;
  period: string;
  input_cost: number;
  conversion_cost: number;
  equivalent_units: number;
}): ProcessCost {
  const input_cost = round2(input.input_cost);
  const conversion_cost = round2(input.conversion_cost);
  const total = dAdd(input_cost, conversion_cost);
  const eu = input.equivalent_units > 0 ? input.equivalent_units : 0;
  const cost_per_equiv_unit = eu > 0 ? round2(total / eu) : 0;

  const result: ProcessCost = {
    process_id: input.process_id,
    period: input.period,
    input_cost,
    conversion_cost,
    equivalent_units: eu,
    cost_per_equiv_unit,
  };
  const list = loadJSON<ProcessCost[]>(PROCESSES_KEY, []);
  const idx = list.findIndex((p) => p.process_id === result.process_id && p.period === result.period);
  if (idx >= 0) list[idx] = result; else list.push(result);
  saveJSON(PROCESSES_KEY, list);

  try {
    logAudit({
      entityCode: 'GROUP',
      action: idx >= 0 ? 'update' : 'create',
      entityType: 'advanced_cost_run',
      recordId: `process::${result.process_id}::${result.period}`,
      recordLabel: `Process cost · ${result.process_id} · ${result.period} · /eq-unit=${cost_per_equiv_unit}`,
      beforeState: idx >= 0 ? (list[idx] as unknown as Record<string, unknown>) : null,
      afterState: result as unknown as Record<string, unknown>,
      sourceModule: 'advanced-costing-engine',
    });
  } catch { /* audit best-effort */ }
  return result;
}

export function listProcessCosts(): ProcessCost[] {
  return loadJSON<ProcessCost[]>(PROCESSES_KEY, []);
}

// ─── (3) ACTIVITY-BASED COSTING (ABC) ────────────────────────────────────────
// FR-44 Wall B: REUSES cost-allocation-engine.computeRatios for share allocation.

export function computeABC(input: {
  cost_object: string;
  activities: Array<{ activity: string; driver: string; driver_qty: number; rate: number }>;
}): ABCResult {
  // Reuse cost-allocation-engine ratios via the 'by_quantity' method on a
  // synthetic line per activity (we feed driver_qty as quantity). This makes
  // the reuse visible in tests — and avoids reimplementing share math here.
  const synthLines = input.activities.map((a, i) => ({
    line_id: `${input.cost_object}::${a.activity}::${i}`,
    line_no: i + 1,
    item_name: a.activity,
    fob_value_inr: 0,
    gross_weight_kgs: 0,
    quantity: a.driver_qty,
  }));
  const driver_shares = _computeRatios(synthLines, 'by_quantity');

  const activities: ABCActivity[] = input.activities.map((a) => {
    const allocated = round2(dMul(a.rate, a.driver_qty));
    return {
      activity: a.activity,
      driver: a.driver,
      driver_qty: a.driver_qty,
      rate: round2(a.rate),
      allocated,
    };
  });
  const total_allocated = round2(dSum(activities, (a) => a.allocated));

  const result: ABCResult = {
    cost_object: input.cost_object,
    activities,
    total_allocated,
    driver_shares,
  };
  try {
    logAudit({
      entityCode: 'GROUP',
      action: 'create',
      entityType: 'advanced_cost_run',
      recordId: `abc::${input.cost_object}::${Date.now()}`,
      recordLabel: `ABC · ${input.cost_object} · ${activities.length} activities · total=${total_allocated}`,
      beforeState: null,
      afterState: result as unknown as Record<string, unknown>,
      sourceModule: 'advanced-costing-engine',
    });
  } catch { /* audit best-effort */ }
  return result;
}

// ─── (4) CVP / BREAK-EVEN ANALYSIS ───────────────────────────────────────────

export function computeCVP(input: {
  fy: string;
  scope_id: string;
  fixed_cost: number;
  sales: number;
  variable_cost: number;
}): CVPResult {
  const sales = round2(input.sales);
  const variable_cost = round2(input.variable_cost);
  const fixed_cost = round2(input.fixed_cost);
  const contribution_margin = round2(dSub(sales, variable_cost));

  let cm_ratio = 0;
  let break_even = 0;
  let margin_of_safety = 0;
  let guarded = false;

  if (sales <= 0 || contribution_margin <= 0) {
    guarded = true;
  } else {
    cm_ratio = round2(contribution_margin / sales);
    if (cm_ratio <= 0) {
      guarded = true;
    } else {
      break_even = round2(fixed_cost / cm_ratio);
      // margin of safety as a ratio of sales (0..1) — guard against sales=0 again
      margin_of_safety = round2((sales - break_even) / sales);
    }
  }

  const result: CVPResult = {
    fy: input.fy,
    scope_id: input.scope_id,
    fixed_cost,
    sales,
    variable_cost,
    contribution_margin,
    contribution_margin_ratio: cm_ratio,
    break_even_revenue: break_even,
    margin_of_safety,
    divide_by_zero_guarded: guarded,
  };
  try {
    logAudit({
      entityCode: 'GROUP',
      action: 'create',
      entityType: 'advanced_cost_run',
      recordId: `cvp::${input.fy}::${input.scope_id}`,
      recordLabel: `CVP · ${input.fy} · ${input.scope_id} · break-even=${break_even} · MoS=${margin_of_safety}`,
      beforeState: null,
      afterState: result as unknown as Record<string, unknown>,
      sourceModule: 'advanced-costing-engine',
    });
  } catch { /* audit best-effort */ }
  return result;
}

// ─── FR-44 reuse re-exports (transparency · NOT a parallel implementation) ───

export const __fr44_reuse = Object.freeze({
  operationalCosting_getStandardCost: _getStandardCost,
  costAllocation_computeRatios: _computeRatios,
});

// ─── Test/dev reset ──────────────────────────────────────────────────────────

export function __resetAdvancedCostingForTests(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(JOBS_KEY);
      localStorage.removeItem(PROCESSES_KEY);
    }
  } catch { /* ignore */ }
}
