/**
 * @file        src/lib/comply360-tax-tolerance-engine.ts
 * @purpose     Tax-liability tolerance engine · variance evaluation for cross-return reconciliation
 * @sprint      Sprint 71 · T-Phase-5.A.1.3 · Block 3 · DP-S71-2
 * @decisions   DP-S71-2 (tolerance engine · pure functions · no localStorage)
 * @iso         Reliability · Auditability · Maintainability
 * @disciplines FR-19 SIBLING · FR-43 unit tests · FR-91 honest disclosure · Lesson 23
 */

// ── Public Types ─────────────────────────────────────────────────────

export interface ToleranceThreshold {
  abs_inr: number;
  pct: number; // 0-100
}

export type ToleranceSeverity = 'ok' | 'warn' | 'breach';

export interface ToleranceResult {
  metric: string;
  value_a: number;
  value_b: number;
  variance_abs: number;
  variance_pct: number;
  breached: boolean;
  severity: ToleranceSeverity;
}

// ── Canonical thresholds (Phase-1 defaults · tune in Phase-2 from tenant config) ────

export const DEFAULT_THRESHOLDS: Record<string, ToleranceThreshold> = {
  gstr1_vs_gstr3b_liability: { abs_inr: 100, pct: 1 },
  gstr2b_vs_gstr3b_itc:      { abs_inr: 100, pct: 1 },
  gstr1_vs_books_turnover:   { abs_inr: 500, pct: 2 },
  default:                   { abs_inr: 100, pct: 1 },
};

// ── Pure helpers ────────────────────────────────────────────────────

export function computeVariance(
  a: number,
  b: number,
): { variance_abs: number; variance_pct: number } {
  const variance_abs = Math.abs(a - b);
  const base = Math.max(Math.abs(a), Math.abs(b));
  const variance_pct = base === 0 ? 0 : (variance_abs / base) * 100;
  return { variance_abs, variance_pct };
}

function resolveThreshold(metric: string, override?: ToleranceThreshold): ToleranceThreshold {
  return override ?? DEFAULT_THRESHOLDS[metric] ?? DEFAULT_THRESHOLDS.default;
}

export function evaluateTolerance(
  metric: string,
  a: number,
  b: number,
  threshold?: ToleranceThreshold,
): ToleranceResult {
  const th = resolveThreshold(metric, threshold);
  const { variance_abs, variance_pct } = computeVariance(a, b);
  const breachedAbs = variance_abs > th.abs_inr;
  const breachedPct = variance_pct > th.pct;
  const breached = breachedAbs && breachedPct;
  // warn band: exceeds either (but not both) OR within 10% of the threshold edge
  let severity: ToleranceSeverity = 'ok';
  if (breached) severity = 'breach';
  else if (breachedAbs || breachedPct) severity = 'warn';
  else if (
    variance_abs >= th.abs_inr * 0.9 ||
    variance_pct >= th.pct * 0.9
  ) severity = 'warn';
  return {
    metric,
    value_a: a,
    value_b: b,
    variance_abs,
    variance_pct,
    breached,
    severity,
  };
}

export function evaluateLiabilityReconciliation(
  gstr1Liability: number,
  gstr3bLiability: number,
  gstr2bITC: number,
  gstr3bITC: number = gstr2bITC,
): ToleranceResult[] {
  return [
    evaluateTolerance('gstr1_vs_gstr3b_liability', gstr1Liability, gstr3bLiability),
    evaluateTolerance('gstr2b_vs_gstr3b_itc', gstr2bITC, gstr3bITC),
  ];
}

export function aggregateSeverity(results: ToleranceResult[]): ToleranceSeverity {
  if (results.some(r => r.severity === 'breach')) return 'breach';
  if (results.some(r => r.severity === 'warn')) return 'warn';
  return 'ok';
}
