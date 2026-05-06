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

// ─── 2. EFFICIENCY VARIANCE (Phase 2 stub) ────────────────────────
export function computeEfficiencyVariance(
  _po: ProductionOrder,
  pcs: ProductionConfirmation[],
  _thresholdPct: number,
): VarianceComponent {
  return {
    type: 'efficiency',
    amount: 0,
    pct: 0,
    is_unfavourable: false,
    threshold_breached: false,
    contributing_factors: ['Labour-hour capture pending · Phase 2 active'],
    drilldown_data: { pcs_count: pcs.length, status: 'phase_2_pending' },
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
