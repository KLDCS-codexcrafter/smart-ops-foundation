/**
 * @file        src/lib/landed-cost-variance-engine.ts
 * @purpose     D-NEW-EW · Granular per-line landed cost variance · SIBLING pure helper
 * @sprint      T-Phase-2.B-1-EximX-LightDNEWs
 * @decisions   Q-LOCK-3(a) SIBLING · 4 canonical engines stay 0-DIFF · READ-ONLY consumer
 * @disciplines FR-30 · FR-50 · returns NEW objects via spread · zero mutation
 */
import type { MultiLegGoodsInTransit } from '@/types/multi-leg-git';
import { summarizeMLGITReconciliation } from '@/lib/reconciliation-engine';

export type VarianceSeverity = 'within_tolerance' | 'mild' | 'material' | 'critical';

export interface LandedCostLineVariance {
  line_id: string;
  line_no: number;
  item_name: string;
  booked_inr: number;
  custom_revalued_inr: number;
  actual_landed_inr: number;
  delta_booked_vs_actual_inr: number;
  delta_booked_vs_actual_pct: number;
  delta_revalued_vs_actual_inr: number;
  severity: VarianceSeverity;
}

export interface LandedCostVarianceReport {
  mlgit_id: string;
  mlgit_no: string;
  total_booked_inr: number;
  total_custom_revalued_inr: number;
  total_actual_landed_inr: number;
  aggregate_delta_inr: number;
  aggregate_delta_pct: number;
  aggregate_severity: VarianceSeverity;
  lines: LandedCostLineVariance[];
}

const TOLERANCE_PCT = 0.5;
const MILD_PCT = 2.0;
const MATERIAL_PCT = 5.0;

function classify(pct: number): VarianceSeverity {
  const abs = Math.abs(pct);
  if (abs <= TOLERANCE_PCT) return 'within_tolerance';
  if (abs <= MILD_PCT) return 'mild';
  if (abs <= MATERIAL_PCT) return 'material';
  return 'critical';
}

/** PURE HELPER · returns NEW report via spread · no mutation of inputs */
export function computeLandedCostVariance(mlgit: MultiLegGoodsInTransit): LandedCostVarianceReport {
  const summary = summarizeMLGITReconciliation(mlgit);
  const booked = summary.booked;
  const revalued = summary.custom_revalued > 0 ? summary.custom_revalued : booked;
  const actual = summary.actual_landed > 0 ? summary.actual_landed : revalued;

  const totalAllocBase = mlgit.allocated_costs.reduce((s, a) => s + (a.total_allocated_inr ?? 0), 0);

  const lines: LandedCostLineVariance[] = mlgit.allocated_costs.map((a) => {
    const ratio = totalAllocBase > 0 ? (a.total_allocated_inr ?? 0) / totalAllocBase : 0;
    const lineBooked = booked * ratio;
    const lineRevalued = revalued * ratio;
    const lineActual = actual * ratio;
    const deltaBA = lineActual - lineBooked;
    const pctBA = lineBooked === 0 ? 0 : (deltaBA / lineBooked) * 100;
    return {
      line_id: a.line_id,
      line_no: a.line_no,
      item_name: a.item_name,
      booked_inr: Math.round(lineBooked),
      custom_revalued_inr: Math.round(lineRevalued),
      actual_landed_inr: Math.round(lineActual),
      delta_booked_vs_actual_inr: Math.round(deltaBA),
      delta_booked_vs_actual_pct: Number(pctBA.toFixed(2)),
      delta_revalued_vs_actual_inr: Math.round(lineActual - lineRevalued),
      severity: classify(pctBA),
    };
  });

  const aggDelta = actual - booked;
  const aggPct = booked === 0 ? 0 : (aggDelta / booked) * 100;

  return {
    mlgit_id: mlgit.id,
    mlgit_no: mlgit.mlgit_no,
    total_booked_inr: booked,
    total_custom_revalued_inr: revalued,
    total_actual_landed_inr: actual,
    aggregate_delta_inr: aggDelta,
    aggregate_delta_pct: Number(aggPct.toFixed(2)),
    aggregate_severity: classify(aggPct),
    lines,
  };
}

export function computeVarianceForAll(
  mlgits: readonly MultiLegGoodsInTransit[],
): LandedCostVarianceReport[] {
  return mlgits.map((m) => computeLandedCostVariance(m));
}
