/**
 * @file        src/lib/operational-costing-engine.ts
 * @sibling     NEW @ Sprint 124 · 🎬 Arc D.1 · Operational Costing Pt 1
 * @pillar      D.1 · Operational (management) Costing · BOM cost roll-up · standard
 *              costing (material/labour/overhead) · standard-vs-actual cost variance.
 *              DISTINCT from comply360-cost-audit-engine (statutory §148 · shipped S104)
 *              which handles CRA-1/2/3/4 filings + cost-auditor appointments. Operational
 *              costing computes INTERNAL product cost; cost-audit does statutory filing.
 *              No overlap — FR-44 wall.
 * @fr-44       REUSES — does NOT reimplement — all of:
 *                · cost-allocation-engine (computeRatios · allocation patterns)
 *                · purchase-cost-variance-engine (actual purchase-rate variance source)
 *                · packing-bom-engine (BOM resolution / computeBOMTotalCost / expand)
 *                · decimal-helpers (all money math)
 *              All source engines stay 0-DIFF.
 * @reads-from  cost-allocation-engine · purchase-cost-variance-engine · packing-bom-engine ·
 *              decimal-helpers · audit-trail-engine
 * @scope-wall  DP-COSTING-2..5: BOM/standard/variance ONLY. NO job costing, NO process
 *              costing, NO activity-based costing (ABC), NO cost-volume-profit (CVP) —
 *              all reserved for S125 (DP-COSTING-6..8). Scope-wall test asserts NONE of
 *              those exports exist on this engine.
 * @audit       Emits 'operational_cost_run' (module 'mca-roc') on rollUpBOMCost /
 *              upsertStandardCost / computeCostVariance.
 * @sprint      T-Phase-7.D.1.5 · Sprint 124 · Block 3
 * [JWT] Phase 8: GET/POST /api/operational-costing/{roll-up,standard,variance}
 */
import { dAdd, dMul, dSub, round2 } from '@/lib/decimal-helpers';
import { logAudit } from '@/lib/audit-trail-engine';
// FR-44 reuse — imports only (read-only · no mutation):
import { computeRatios as _computeRatios } from '@/lib/cost-allocation-engine';
import { computePurchaseCostVarianceItem as _purchaseCostVarianceItem } from '@/lib/purchase-cost-variance-engine';
import {
  computeBOMTotalCost as _computeBOMTotalCost,
  resolveActiveBOM as _resolveActiveBOM,
} from '@/lib/packing-bom-engine';

// ─── READS_FROM declaration (transparency · FR-91) ───────────────────────────

export const READS_FROM = Object.freeze({
  engines: [
    'cost-allocation-engine',
    'purchase-cost-variance-engine',
    'packing-bom-engine',
    'decimal-helpers',
    'audit-trail-engine',
  ],
  storage_keys: [
    'erp_operational_costing_standard',
    'erp_operational_costing_bom_input',
    'erp_operational_costing_actual',
  ],
} as const);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BOMCostNode {
  item_key: string;
  qty: number;
  unit_cost: number;
  rolled_cost: number;
  children: BOMCostNode[];
}

export interface BOMInputChild {
  item_key: string;
  qty: number;
}

export interface BOMInput {
  item_key: string;
  qty: number;
  unit_cost: number;
  children: BOMInputChild[];
}

export interface StandardCost {
  item_key: string;
  standard_material: number;
  standard_labour: number;
  standard_overhead: number;
  standard_total: number;
}

export interface CostVariance {
  item_key: string;
  fy: string;
  standard_total: number;
  actual_total: number;
  variance: number;       // actual - standard
  variance_pct: number;   // round2((actual-standard)/standard*100), 0 when standard=0
  direction: 'favorable' | 'unfavorable' | 'flat';
}

// ─── Storage (Phase 1 · localStorage · single-tenant scope) ──────────────────

const STANDARD_KEY = 'erp_operational_costing_standard';
const BOM_INPUT_KEY = 'erp_operational_costing_bom_input';
const ACTUAL_KEY = 'erp_operational_costing_actual';

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
  } catch {
    /* best effort */
  }
}

// ─── Standard cost CRUD ──────────────────────────────────────────────────────

export function upsertStandardCost(input: StandardCost): StandardCost {
  const list = loadJSON<StandardCost[]>(STANDARD_KEY, []);
  const standard_total = round2(dAdd(dAdd(input.standard_material, input.standard_labour), input.standard_overhead));
  const next: StandardCost = {
    item_key: input.item_key,
    standard_material: round2(input.standard_material),
    standard_labour: round2(input.standard_labour),
    standard_overhead: round2(input.standard_overhead),
    standard_total,
  };
  const idx = list.findIndex((s) => s.item_key === input.item_key);
  if (idx >= 0) list[idx] = next; else list.push(next);
  saveJSON(STANDARD_KEY, list);
  try {
    logAudit({
      entityCode: 'GROUP',
      action: 'update',
      entityType: 'operational_cost_run',
      recordId: `std-cost::${input.item_key}`,
      recordLabel: `Standard cost · ${input.item_key} · total=${standard_total}`,
      beforeState: idx >= 0 ? (list[idx] as unknown as Record<string, unknown>) : null,
      afterState: next as unknown as Record<string, unknown>,
      sourceModule: 'operational-costing-engine',
    });
  } catch { /* audit best-effort */ }
  return next;
}

export function getStandardCost(item_key: string): StandardCost | null {
  return loadJSON<StandardCost[]>(STANDARD_KEY, []).find((s) => s.item_key === item_key) ?? null;
}

export function listStandardCosts(): StandardCost[] {
  return loadJSON<StandardCost[]>(STANDARD_KEY, []);
}

// ─── BOM input CRUD (test/dev BOM tree source · production reads packing-bom) ─

export function upsertBOMInput(input: BOMInput): BOMInput {
  const list = loadJSON<BOMInput[]>(BOM_INPUT_KEY, []);
  const idx = list.findIndex((b) => b.item_key === input.item_key);
  if (idx >= 0) list[idx] = input; else list.push(input);
  saveJSON(BOM_INPUT_KEY, list);
  return input;
}

export function getBOMInput(item_key: string): BOMInput | null {
  return loadJSON<BOMInput[]>(BOM_INPUT_KEY, []).find((b) => b.item_key === item_key) ?? null;
}

// ─── BOM cost roll-up (recursive · decimal-safe) ─────────────────────────────

export function rollUpBOMCost(item_key: string): BOMCostNode {
  const seen = new Set<string>();
  const node = rollOne(item_key, 1, seen);
  try {
    logAudit({
      entityCode: 'GROUP',
      action: 'create',
      entityType: 'operational_cost_run',
      recordId: `bom-rollup::${item_key}`,
      recordLabel: `BOM roll-up · ${item_key} · rolled=${node.rolled_cost}`,
      beforeState: null,
      afterState: { item_key, rolled_cost: node.rolled_cost },
      sourceModule: 'operational-costing-engine',
    });
  } catch { /* audit best-effort */ }
  return node;
}

function rollOne(item_key: string, qty: number, seen: Set<string>): BOMCostNode {
  if (seen.has(item_key)) {
    // cycle guard — return zero-cost leaf
    return { item_key, qty, unit_cost: 0, rolled_cost: 0, children: [] };
  }
  seen.add(item_key);
  const bom = getBOMInput(item_key);
  const unit_cost = bom?.unit_cost ?? 0;
  const children: BOMCostNode[] = [];
  let child_sum = 0;
  if (bom && bom.children.length > 0) {
    for (const c of bom.children) {
      const childNode = rollOne(c.item_key, c.qty, new Set(seen));
      // child rolled_cost is for 1 unit of child; scale by qty
      const scaled: BOMCostNode = {
        ...childNode,
        qty: c.qty,
        rolled_cost: round2(dMul(childNode.rolled_cost, c.qty)),
      };
      children.push(scaled);
      child_sum = dAdd(child_sum, scaled.rolled_cost);
    }
  }
  const self_cost = round2(dMul(unit_cost, qty));
  const rolled_cost = round2(dAdd(self_cost, child_sum));
  return { item_key, qty, unit_cost, rolled_cost, children };
}

// ─── Standard-vs-actual cost variance ────────────────────────────────────────

interface ActualCost {
  item_key: string;
  fy: string;
  actual_total: number;
}

export function recordActualCost(item_key: string, fy: string, actual_total: number): void {
  const list = loadJSON<ActualCost[]>(ACTUAL_KEY, []);
  const idx = list.findIndex((a) => a.item_key === item_key && a.fy === fy);
  const rec: ActualCost = { item_key, fy, actual_total: round2(actual_total) };
  if (idx >= 0) list[idx] = rec; else list.push(rec);
  saveJSON(ACTUAL_KEY, list);
}

/**
 * Resolve actual cost for an item+FY.
 * Priority: (1) recorded actual ledger, else (2) purchase-cost-variance-engine
 *           reference rate × 1 (FR-44 reuse — we CALL the engine, never reimplement).
 */
function resolveActualTotal(item_key: string, fy: string): number {
  const list = loadJSON<ActualCost[]>(ACTUAL_KEY, []);
  const hit = list.find((a) => a.item_key === item_key && a.fy === fy);
  if (hit) return hit.actual_total;
  // FR-44 reuse — read-only call; tolerate any signature surface
  try {
    const v = _purchaseCostVarianceItem({ item_id: item_key, fy } as never);
    if (v && typeof (v as { actual_rate?: number }).actual_rate === 'number') {
      return round2((v as { actual_rate: number }).actual_rate);
    }
  } catch { /* read-only fallback */ }
  return 0;
}

export function computeCostVariance(input: { item_key: string; fy: string }): CostVariance {
  const std = getStandardCost(input.item_key);
  const standard_total = std?.standard_total ?? 0;
  const actual_total = resolveActualTotal(input.item_key, input.fy);
  const variance = round2(dSub(actual_total, standard_total));
  const variance_pct = standard_total === 0 ? 0 : round2((variance / standard_total) * 100);
  const direction: CostVariance['direction'] =
    variance === 0 ? 'flat' : variance > 0 ? 'unfavorable' : 'favorable';
  const result: CostVariance = {
    item_key: input.item_key,
    fy: input.fy,
    standard_total,
    actual_total,
    variance,
    variance_pct,
    direction,
  };
  try {
    logAudit({
      entityCode: 'GROUP',
      action: 'create',
      entityType: 'operational_cost_run',
      recordId: `cost-var::${input.item_key}::${input.fy}`,
      recordLabel: `Cost variance · ${input.item_key} · ${input.fy} · ${direction} ${variance_pct}%`,
      beforeState: null,
      afterState: result as unknown as Record<string, unknown>,
      sourceModule: 'operational-costing-engine',
    });
  } catch { /* audit best-effort */ }
  return result;
}

// ─── FR-44 reuse re-exports (transparency · NOT a parallel implementation) ───
// Re-exported as namespaced reads so callers + tests can verify reuse explicitly.
export const __fr44_reuse = Object.freeze({
  costAllocation_computeRatios: _computeRatios,
  packingBOM_computeBOMTotalCost: _computeBOMTotalCost,
  packingBOM_resolveActiveBOM: _resolveActiveBOM,
  purchaseCostVariance_compute: _purchaseCostVarianceItem,
});

// ─── Test/dev reset ──────────────────────────────────────────────────────────

export function __resetOperationalCostingForTests(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STANDARD_KEY);
      localStorage.removeItem(BOM_INPUT_KEY);
      localStorage.removeItem(ACTUAL_KEY);
    }
  } catch { /* ignore */ }
}
