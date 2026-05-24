/**
 * @file     production-variance-engine.ts
 * @sprint   T-Phase-1.3-3a-pre-3 · Block B · D-557
 * @purpose  7-way variance decomposition compute · Q18=a financial priority.
 * @[JWT]    GET/PUT /api/production/variances?entityCode=...
 */
import type { ProductionOrder } from '@/types/production-order';
import type { ProductionConfirmation } from '@/types/production-confirmation';
import type { MaterialIssueNote } from '@/types/material-issue-note';
import type { JobWorkOutOrder } from '@/types/job-work-out-order';
import type { JobWorkReceipt } from '@/types/job-work-receipt';
import type { ProductionVariance, VarianceComponent } from '@/types/production-variance';
import { productionVariancesKey } from '@/types/production-variance';
import { round2 } from '@/lib/decimal-helpers';
import type { ProcessBatch } from '@/types/process-batch';
import type { Recipe } from '@/types/recipe';

// ─── 1. RATE VARIANCE ──────────────────────────────────────────────
export function computeRateVariance(
  po: ProductionOrder,
  mins: MaterialIssueNote[],
  thresholdPct: number,
): VarianceComponent {
  let amount = 0;
  const factors: string[] = [];
  for (const min of mins) {
    for (const minLine of min.lines) {
      const poLine = po.lines.find(l => l.id === minLine.production_order_line_id);
      if (!poLine) continue;
      const masterRate = poLine.original_unit_rate || 0;
      const actualRate = minLine.unit_rate;
      const delta = (actualRate - masterRate) * minLine.issued_qty;
      amount += delta;
      if (Math.abs(delta) > 100) {
        factors.push(`${minLine.item_code}: ₹${actualRate}/u vs ₹${masterRate}/u · ${delta > 0 ? '+' : ''}₹${round2(delta)}`);
      }
    }
  }
  const baseline = po.cost_structure.master.direct_material || 1;
  const pct = (amount / baseline) * 100;
  return {
    type: 'rate',
    amount: round2(amount),
    pct: round2(pct),
    is_unfavourable: amount > 0,
    threshold_breached: Math.abs(pct) > thresholdPct,
    contributing_factors: factors.slice(0, 5),
    drilldown_data: { mins_count: mins.length, lines_examined: mins.reduce((s, m) => s + m.lines.length, 0) },
  };
}

// ─── 2. EFFICIENCY VARIANCE · ACTIVATED in 3-PlantOps-pre-3a (D-597) ──
import { listJobCards } from '@/lib/job-card-engine';

export function computeEfficiencyVariance(
  po: ProductionOrder,
  pcs: ProductionConfirmation[],
  thresholdPct: number,
): VarianceComponent {
  const jobCards = listJobCards(po.entity_id).filter(jc =>
    jc.production_order_id === po.id && jc.status === 'completed'
  );

  if (jobCards.length === 0) {
    return {
      type: 'efficiency',
      amount: 0, pct: 0,
      is_unfavourable: false,
      threshold_breached: false,
      contributing_factors: ['No completed Job Cards yet · efficiency variance N/A'],
      drilldown_data: { pcs_count: pcs.length, jc_count: 0, status: 'no_data' },
    };
  }

  const actualHours = jobCards.reduce((sum, jc) => {
    if (!jc.actual_start || !jc.actual_end) return sum;
    return sum + (new Date(jc.actual_end).getTime() - new Date(jc.actual_start).getTime()) / (1000 * 60 * 60);
  }, 0);

  const totalPlannedQty = po.outputs.reduce((s, o) => s + (o.planned_qty ?? 0), 0);
  // Phase 1 proxy: 10 units/hour benchmark · Phase 2 derives from machine.rated_capacity_per_hour
  const stdHours = totalPlannedQty / 10;

  const avgHourlyRate = jobCards.reduce((sum, jc) => {
    const hours = jc.actual_start && jc.actual_end
      ? (new Date(jc.actual_end).getTime() - new Date(jc.actual_start).getTime()) / (1000 * 60 * 60)
      : 0;
    return sum + (hours > 0 ? jc.labour_cost / hours : 0);
  }, 0) / Math.max(1, jobCards.length);

  const hoursDelta = actualHours - stdHours;
  const amount = round2(hoursDelta * avgHourlyRate);
  const baseline = po.cost_structure.master.direct_labour || po.cost_structure.master.total || 1;
  const pct = round2((amount / baseline) * 100);

  const factors: string[] = [];
  if (hoursDelta > 0) factors.push(`${round2(hoursDelta)} hours over std · cost ₹${amount}`);
  else if (hoursDelta < 0) factors.push(`${round2(Math.abs(hoursDelta))} hours under std · saving ₹${Math.abs(amount)}`);
  else factors.push('Hours matched std · no efficiency variance');
  factors.push(`${jobCards.length} Job Card(s) consumed · avg rate ₹${round2(avgHourlyRate)}/hr`);

  return {
    type: 'efficiency',
    amount,
    pct,
    is_unfavourable: amount > 0,
    threshold_breached: Math.abs(pct) > thresholdPct,
    contributing_factors: factors,
    drilldown_data: {
      pcs_count: pcs.length,
      jc_count: jobCards.length,
      actual_hours: round2(actualHours),
      std_hours: round2(stdHours),
      hours_delta: round2(hoursDelta),
      avg_hourly_rate: round2(avgHourlyRate),
      status: 'computed',
    },
  };
}

// ─── 3. YIELD VARIANCE ────────────────────────────────────────────
export function computeYieldVariance(
  po: ProductionOrder,
  pcs: ProductionConfirmation[],
  thresholdPct: number,
): VarianceComponent {
  let amount = 0;
  const factors: string[] = [];
  const stdUnitCost = po.cost_structure.master.per_unit;
  for (const pc of pcs) {
    for (const pcLine of pc.lines) {
      const delta = (pcLine.actual_qty - pcLine.planned_qty) * stdUnitCost;
      amount -= delta;
      if (Math.abs(pcLine.qty_variance) > 0) {
        factors.push(`${pcLine.output_item_code}: ${pcLine.actual_qty} vs ${pcLine.planned_qty} (${pcLine.yield_pct.toFixed(1)}%)`);
      }
    }
  }
  const baseline = po.cost_structure.master.total || 1;
  const pct = (amount / baseline) * 100;
  return {
    type: 'yield',
    amount: round2(amount),
    pct: round2(pct),
    is_unfavourable: amount > 0,
    threshold_breached: Math.abs(pct) > thresholdPct,
    contributing_factors: factors.slice(0, 5),
    drilldown_data: { pcs_count: pcs.length },
  };
}

// ─── 4. SUBSTITUTION VARIANCE ─────────────────────────────────────
export function computeSubstitutionVariance(
  po: ProductionOrder,
  thresholdPct: number,
): VarianceComponent {
  const subLines = po.lines.filter(l => l.is_substituted);
  const amount = subLines.reduce((s, l) => s + (l.cost_variance_amount || 0), 0);
  const factors = subLines.slice(0, 5).map(l =>
    `${(l.original_bom_item_id ?? '').slice(-6)} → ${l.item_code}: ${(l.cost_variance_pct || 0).toFixed(1)}% (${l.substitute_reason ?? '—'})`
  );
  const baseline = po.cost_structure.master.direct_material || 1;
  const pct = (amount / baseline) * 100;
  return {
    type: 'substitution',
    amount: round2(amount),
    pct: round2(pct),
    is_unfavourable: amount > 0,
    threshold_breached: Math.abs(pct) > thresholdPct,
    contributing_factors: factors,
    drilldown_data: { substituted_line_count: subLines.length, total_lines: po.lines.length },
  };
}

// ─── 5. MIX VARIANCE ──────────────────────────────────────────────
export function computeMixVariance(
  po: ProductionOrder,
  pcs: ProductionConfirmation[],
  thresholdPct: number,
): VarianceComponent {
  if (po.outputs.length <= 1) {
    return {
      type: 'mix',
      amount: 0, pct: 0,
      is_unfavourable: false, threshold_breached: false,
      contributing_factors: ['Single-output PO · mix variance N/A'],
      drilldown_data: { outputs_count: po.outputs.length },
    };
  }
  let amount = 0;
  const factors: string[] = [];
  const totalPlanned = po.outputs.reduce((s, o) => s + o.planned_qty, 0) || 1;
  const totalActual = pcs.reduce((s, pc) => s + pc.total_actual_qty, 0);
  for (const out of po.outputs) {
    const plannedPct = (out.planned_qty / totalPlanned) * 100;
    const outActual = pcs.reduce((s, pc) => {
      const line = pc.lines.find(l => l.output_item_id === out.item_id);
      return s + (line?.actual_qty || 0);
    }, 0);
    const actualMixPct = totalActual > 0 ? (outActual / totalActual) * 100 : 0;
    const ratioShift = (actualMixPct - plannedPct) / 100;
    const costImpact = ratioShift * (out.output_cost_master || 0);
    amount += Math.abs(costImpact);
    if (Math.abs(ratioShift) > 0.05) {
      factors.push(`${out.item_code}: ${plannedPct.toFixed(1)}% → ${actualMixPct.toFixed(1)}%`);
    }
  }
  const baseline = po.cost_structure.master.total || 1;
  const pct = (amount / baseline) * 100;
  return {
    type: 'mix',
    amount: round2(amount), pct: round2(pct),
    is_unfavourable: amount > 0,
    threshold_breached: Math.abs(pct) > thresholdPct,
    contributing_factors: factors.slice(0, 5),
    drilldown_data: { outputs_count: po.outputs.length },
  };
}

// ─── 6. TIMING VARIANCE ───────────────────────────────────────────
export function computeTimingVariance(
  po: ProductionOrder,
  pcs: ProductionConfirmation[],
  thresholdPct: number,
): VarianceComponent {
  if (pcs.length === 0) {
    return {
      type: 'timing', amount: 0, pct: 0,
      is_unfavourable: false, threshold_breached: false,
      contributing_factors: ['No production confirmations · timing N/A'],
      drilldown_data: {},
    };
  }
  const lastPC = pcs.reduce((latest, pc) =>
    new Date(pc.confirmation_date) > new Date(latest.confirmation_date) ? pc : latest, pcs[0]);
  const plannedEnd = new Date(po.target_end_date);
  const actualEnd = new Date(lastPC.confirmation_date);
  const daysDelta = Math.floor((actualEnd.getTime() - plannedEnd.getTime()) / 86400000);
  const dailyHoldingCost = po.cost_structure.master.total * 0.001;
  const amount = daysDelta * dailyHoldingCost;
  const baseline = po.cost_structure.master.total || 1;
  const pct = (amount / baseline) * 100;
  return {
    type: 'timing',
    amount: round2(amount), pct: round2(pct),
    is_unfavourable: daysDelta > 0,
    threshold_breached: Math.abs(pct) > thresholdPct,
    contributing_factors: daysDelta !== 0
      ? [`${Math.abs(daysDelta)} days ${daysDelta > 0 ? 'late' : 'early'} · ₹${round2(dailyHoldingCost)}/day holding`]
      : ['On-time completion'],
    drilldown_data: { days_delta: daysDelta, planned_end: po.target_end_date, actual_end: lastPC.confirmation_date },
  };
}

// ─── 7. SCOPE VARIANCE ────────────────────────────────────────────
export function computeScopeVariance(
  po: ProductionOrder,
  thresholdPct: number,
): VarianceComponent {
  let amount = 0;
  const factors: string[] = [];
  if (po.status === 'cancelled') {
    amount = po.cost_structure.master.total * 0.5;
    factors.push('PO cancelled · 50% sunk cost recognized');
  }
  const baseline = po.cost_structure.master.total || 1;
  const pct = (amount / baseline) * 100;
  return {
    type: 'scope',
    amount: round2(amount), pct: round2(pct),
    is_unfavourable: amount > 0,
    threshold_breached: Math.abs(pct) > thresholdPct,
    contributing_factors: factors,
    drilldown_data: { is_cancelled: po.status === 'cancelled' },
  };
}

// ─── Aggregator ───────────────────────────────────────────────────
export interface ComputeProductionVarianceInput {
  po: ProductionOrder;
  mins: MaterialIssueNote[];
  pcs: ProductionConfirmation[];
  jwos: JobWorkOutOrder[];
  jwrs: JobWorkReceipt[];
  thresholdPct: number;
}

export function computeProductionVariance(input: ComputeProductionVarianceInput): ProductionVariance {
  const { po, mins, pcs, jwos, jwrs, thresholdPct } = input;
  const now = new Date().toISOString();

  const rate = computeRateVariance(po, mins, thresholdPct);
  const efficiency = computeEfficiencyVariance(po, pcs, thresholdPct);
  const yld = computeYieldVariance(po, pcs, thresholdPct);
  const substitution = computeSubstitutionVariance(po, thresholdPct);
  const mix = computeMixVariance(po, pcs, thresholdPct);
  const timing = computeTimingVariance(po, pcs, thresholdPct);
  const scope = computeScopeVariance(po, thresholdPct);

  const components = [rate, efficiency, yld, substitution, mix, timing, scope];
  const total_variance_amount = components.reduce((s, c) => s + c.amount, 0);
  const baseline = po.cost_structure.master.total || 1;
  const total_variance_pct = round2((total_variance_amount / baseline) * 100);

  return {
    id: `pv-${po.id}-${Date.now()}`,
    entity_id: po.entity_id,
    po_id: po.id,
    po_doc_no: po.doc_no,
    computed_at: now,
    rate_variance: rate,
    efficiency_variance: efficiency,
    yield_variance: yld,
    substitution_variance: substitution,
    mix_variance: mix,
    timing_variance: timing,
    scope_variance: scope,
    total_variance_amount: round2(total_variance_amount),
    total_variance_pct,
    total_unfavourable_count: components.filter(c => c.is_unfavourable).length,
    threshold_breach_count: components.filter(c => c.threshold_breached).length,
    contributing_min_ids: mins.map(m => m.id),
    contributing_pc_ids: pcs.map(p => p.id),
    contributing_jwo_jwr_pairs: jwos.map(jwo => {
      const jwr = jwrs.find(r => r.job_work_out_order_id === jwo.id);
      return [jwo.id, jwr?.id ?? ''] as [string, string];
    }),
    contributing_substituted_line_ids: po.lines.filter(l => l.is_substituted).map(l => l.id),
    is_frozen: false,
    frozen_at: null,
    frozen_by_user_id: null,
  };
}

export function listProductionVariances(entityCode: string): ProductionVariance[] {
  try {
    const raw = localStorage.getItem(productionVariancesKey(entityCode));
    return raw ? (JSON.parse(raw) as ProductionVariance[]) : [];
  } catch { return []; }
}

export function persistProductionVariance(entityCode: string, variance: ProductionVariance): void {
  const all = listProductionVariances(entityCode);
  const idx = all.findIndex(v => v.po_id === variance.po_id);
  if (idx >= 0) all[idx] = variance; else all.push(variance);
  // [JWT] PUT /api/production/variances
  localStorage.setItem(productionVariancesKey(entityCode), JSON.stringify(all));
}

export function freezeProductionVariance(
  entityCode: string,
  poId: string,
  user: { id: string; name: string },
): ProductionVariance | null {
  const all = listProductionVariances(entityCode);
  const idx = all.findIndex(v => v.po_id === poId);
  if (idx < 0) return null;
  all[idx] = {
    ...all[idx],
    is_frozen: true,
    frozen_at: new Date().toISOString(),
    frozen_by_user_id: user.id,
  };
  localStorage.setItem(productionVariancesKey(entityCode), JSON.stringify(all));
  return all[idx];
}

// ============================================================================
// Sprint T-Phase-3.PROD-3.5.PASS2 · ST9 · Process variance extension (additive)
// Q-LOCK-11 Option A · EXTEND existing engine · do NOT create new SIBLING.
// All 7 existing variance functions + composite stay 0-diff.
// ============================================================================

export interface ProcessVarianceInput {
  batch: ProcessBatch;
  recipe: Recipe;
  expected_co_product_costs?: Record<string, number>;
  expected_by_product_revenue?: Record<string, number>;
}

export interface ProcessVariance {
  batch_id: string;
  batch_no: string;
  recipe_id: string;
  recipe_version: string;
  computed_at: string;
  yield_variance_pct: number;
  yield_variance_kg: number;
  yield_is_unfavourable: boolean;
  co_product_variances: Array<{
    item_id: string;
    expected_allocated_cost: number;
    actual_allocated_cost: number;
    variance: number;
    is_unfavourable: boolean;
  }>;
  by_product_variances: Array<{
    item_id: string;
    expected_revenue: number;
    actual_revenue: number;
    variance: number;
    is_unfavourable: boolean;
  }>;
  total_process_variance: number;
  total_unfavourable_count: number;
}

/**
 * Compute process-specific variance for a completed batch.
 * Complements existing discrete production-variance-engine functions.
 */
export function computeProcessVariance(
  input: ProcessVarianceInput,
): ProcessVariance {
  const { batch, recipe } = input;
  const actualYield = batch.actual_yield ?? 0;
  const yield_variance_kg = actualYield - batch.planned_yield;
  const yield_variance_pct = batch.planned_yield > 0
    ? (yield_variance_kg / batch.planned_yield) * 100
    : 0;
  const yield_is_unfavourable = yield_variance_kg < 0;

  const co_product_variances = batch.co_products.map(cp => {
    const expected = input.expected_co_product_costs?.[cp.item_id] ?? 0;
    const variance = cp.allocated_cost - expected;
    return {
      item_id: cp.item_id,
      expected_allocated_cost: expected,
      actual_allocated_cost: cp.allocated_cost,
      variance,
      is_unfavourable: variance > 0,
    };
  });

  const by_product_variances = batch.by_products.map(bp => {
    const expected = input.expected_by_product_revenue?.[bp.item_id] ?? 0;
    const variance = bp.total_revenue_credit - expected;
    return {
      item_id: bp.item_id,
      expected_revenue: expected,
      actual_revenue: bp.total_revenue_credit,
      variance,
      is_unfavourable: variance < 0,
    };
  });

  const totalCoVariance = co_product_variances.reduce((s, v) => s + v.variance, 0);
  const totalByVariance = by_product_variances.reduce((s, v) => s + v.variance, 0);
  const total_process_variance = (yield_variance_kg * -1) + totalCoVariance - totalByVariance;

  const total_unfavourable_count =
    (yield_is_unfavourable ? 1 : 0) +
    co_product_variances.filter(v => v.is_unfavourable).length +
    by_product_variances.filter(v => v.is_unfavourable).length;

  void recipe;

  return {
    batch_id: batch.id,
    batch_no: batch.batch_no,
    recipe_id: batch.recipe_id,
    recipe_version: batch.recipe_version,
    computed_at: new Date().toISOString(),
    yield_variance_pct,
    yield_variance_kg,
    yield_is_unfavourable,
    co_product_variances,
    by_product_variances,
    total_process_variance,
    total_unfavourable_count,
  };
}

/** Storage key for process variances · FR-26 entity-scoped. */
export const processVariancesKey = (entityCode: string): string =>
  `process_variances_${entityCode}`;

const lsReadVar = <T>(key: string, def: T): T => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : def; } catch { return def; }
};
const lsWriteVar = <T>(key: string, value: T): void => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
};

export function persistProcessVariance(
  entityCode: string,
  variance: ProcessVariance,
): void {
  const all = lsReadVar<ProcessVariance[]>(processVariancesKey(entityCode), []);
  const idx = all.findIndex(v => v.batch_id === variance.batch_id);
  if (idx >= 0) all[idx] = variance;
  else all.unshift(variance);
  lsWriteVar(processVariancesKey(entityCode), all);
}

export function listProcessVariances(entityCode: string): ProcessVariance[] {
  return lsReadVar<ProcessVariance[]>(processVariancesKey(entityCode), []);
}
