/**
 * @file     production-output-allocation-engine.ts
 * @sprint   T-Phase-1.3-3a-pre-2.5 · Block F · Q13=a
 * @purpose  Multi-item Production Order output cost-allocation engine.
 *           Allocates total master/budget/actual cost across outputs[] using
 *           one of three bases: 'qty' · 'value' · 'manual_pct'.
 *           Updates output_cost_master/budget/actual + cost_allocation_pct
 *           and recomputes yield_pct from actual_qty when present.
 */

import type {
  ProductionOrder,
  ProductionOrderOutput,
  CostAllocationBasis,
} from '@/types/production-order';
import { productionOrdersKey } from '@/types/production-order';

// ════════════════════════════════════════════════════════════════════
// Allocation calculator
// ════════════════════════════════════════════════════════════════════

export interface AllocationWeight {
  output_id: string;
  weight: number;          // qty / value / manual_pct
  pct: number;             // 0..100 normalized
}

/**
 * Compute per-output cost allocation percentages for a list of outputs
 * using the given basis. Scrap is given a fixed `scrapPct` (default 0)
 * and does NOT participate in main/co/by-product allocation.
 *
 * Pure function · returns a map keyed by output_id.
 */
export function computeAllocationWeights(
  outputs: ReadonlyArray<ProductionOrderOutput>,
  basis: CostAllocationBasis,
  /** unit-rate lookup (item_id → standard rate); used for 'value' basis */
  unitRates?: Map<string, number>,
  /** percent kept aside for scrap (e.g. 5 = 5% to scrap, 95% across rest) */
  scrapPct: number = 0,
): AllocationWeight[] {
  if (outputs.length === 0) return [];

  const scrap = outputs.filter(o => o.output_kind === 'scrap');
  const nonScrap = outputs.filter(o => o.output_kind !== 'scrap');
  const distributable = Math.max(0, 100 - (scrap.length > 0 ? scrapPct : 0));

  // Gather raw weights per non-scrap output
  const rawWeights = nonScrap.map(o => {
    let w = 0;
    if (basis === 'qty') {
      w = o.planned_qty;
    } else if (basis === 'value') {
      const rate = unitRates?.get(o.item_id) ?? 0;
      w = o.planned_qty * rate;
    } else { // manual_pct
      w = o.cost_allocation_pct;
    }
    return { output_id: o.id, weight: w };
  });

  let result: AllocationWeight[] = [];

  if (basis === 'manual_pct') {
    // Honour caller's percentages exactly · do not normalise
    result = rawWeights.map(r => ({ ...r, pct: r.weight }));
  } else {
    const totalW = rawWeights.reduce((s, r) => s + r.weight, 0);
    if (totalW <= 0) {
      // Fallback to equal split across non-scrap
      const each = nonScrap.length > 0 ? distributable / nonScrap.length : 0;
      result = rawWeights.map(r => ({ ...r, pct: each }));
    } else {
      result = rawWeights.map(r => ({
        ...r,
        pct: (r.weight / totalW) * distributable,
      }));
    }
  }

  // Append scrap entries with fixed share
  const scrapEach = scrap.length > 0 ? scrapPct / scrap.length : 0;
  for (const s of scrap) {
    result.push({ output_id: s.id, weight: 0, pct: scrapEach });
  }

  return result;
}

// ════════════════════════════════════════════════════════════════════
// Apply allocation to a Production Order
// ════════════════════════════════════════════════════════════════════

export interface ApplyAllocationOptions {
  basis?: CostAllocationBasis;       // overrides per-output basis if provided
  unitRates?: Map<string, number>;
  scrapPct?: number;
}

/**
 * Allocate cost_structure totals across outputs[] and persist the order.
 * Updates each output's:
 *   - cost_allocation_pct
 *   - output_cost_master · _budget · _actual
 *
 * If options.basis is omitted, each output's existing cost_allocation_basis
 * is used; if outputs disagree, the first output's basis wins.
 */
export function applyOutputAllocation(
  order: ProductionOrder,
  options: ApplyAllocationOptions,
  user: { id: string; name: string },
): ProductionOrder {
  if (order.outputs.length === 0) return order;

  const basis: CostAllocationBasis =
    options.basis ?? order.outputs[0]?.cost_allocation_basis ?? 'qty';

  const weights = computeAllocationWeights(
    order.outputs,
    basis,
    options.unitRates,
    options.scrapPct ?? 0,
  );
  const wMap = new Map(weights.map(w => [w.output_id, w.pct]));

  const masterTotal = order.cost_structure.master.total;
  const budgetTotal = order.cost_structure.budget.total;
  const actualTotal = order.cost_structure.actual.total;

  const updatedOutputs: ProductionOrderOutput[] = order.outputs.map(o => {
    const pct = wMap.get(o.id) ?? 0;
    return {
      ...o,
      cost_allocation_basis: basis,
      cost_allocation_pct: pct,
      output_cost_master: (masterTotal * pct) / 100,
      output_cost_budget: (budgetTotal * pct) / 100,
      output_cost_actual: (actualTotal * pct) / 100,
      yield_pct:
        o.actual_qty != null && o.planned_qty > 0
          ? (o.actual_qty / o.planned_qty) * 100
          : o.yield_pct,
    };
  });

  const updated: ProductionOrder = {
    ...order,
    outputs: updatedOutputs,
    updated_at: new Date().toISOString(),
    updated_by: user.name,
  };

  // Persist
  try {
    // [JWT] PUT /api/production-orders/:entityCode
    const raw = localStorage.getItem(productionOrdersKey(order.entity_id));
    const all = raw ? (JSON.parse(raw) as ProductionOrder[]) : [];
    const idx = all.findIndex(o => o.id === order.id);
    if (idx >= 0) all[idx] = updated;
    else all.push(updated);
    localStorage.setItem(productionOrdersKey(order.entity_id), JSON.stringify(all));
  } catch {
    // best-effort
  }

  return updated;
}

// ════════════════════════════════════════════════════════════════════
// Per-output actual qty recording (helper for confirmation flow)
// ════════════════════════════════════════════════════════════════════

export interface OutputActualUpdate {
  output_id: string;
  actual_qty: number;
}

export function recordOutputActuals(
  order: ProductionOrder,
  updates: OutputActualUpdate[],
  user: { id: string; name: string },
): ProductionOrder {
  const map = new Map(updates.map(u => [u.output_id, u.actual_qty]));
  const updatedOutputs = order.outputs.map(o => {
    const a = map.get(o.id);
    if (a == null) return o;
    return {
      ...o,
      actual_qty: a,
      yield_pct: o.planned_qty > 0 ? (a / o.planned_qty) * 100 : null,
    };
  });
  const updated: ProductionOrder = {
    ...order,
    outputs: updatedOutputs,
    updated_at: new Date().toISOString(),
    updated_by: user.name,
  };
  try {
    // [JWT] PUT /api/production-orders/:entityCode
    const raw = localStorage.getItem(productionOrdersKey(order.entity_id));
    const all = raw ? (JSON.parse(raw) as ProductionOrder[]) : [];
    const idx = all.findIndex(o => o.id === order.id);
    if (idx >= 0) all[idx] = updated;
    else all.push(updated);
    localStorage.setItem(productionOrdersKey(order.entity_id), JSON.stringify(all));
  } catch {
    // best-effort
  }
  return updated;
}
