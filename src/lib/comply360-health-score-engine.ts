/**
 * @file        src/lib/comply360-health-score-engine.ts
 * @purpose     Compliance Health Score · OOB-1 · module-weighted scoring per DP-S69-5
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Cycle 2 Remediation · Block 2 · OOB-1
 * @decisions   D-S69-1 (100% native) · D-S69-3 (Health Score engine) · D-S69-4 (LIVE tile refresh)
 *              DP-S69-5 (Module weights · GST 20% · TDS 15% · MCA 15% · Payroll 15% ·
 *                        Audit Trail 10% · Licenses 10% · MSME 5% · ESG 5% · Other 5%)
 * @iso         Reliability · Maintainability
 * @disciplines SD-13 · FR-19 SIBLING · FR-43 unit tests · FR-91 honest disclosure
 *
 * @disclosure  Sprint 69 Cycle-1 first-bank shipped a penalty-only model
 *              (overdue/breach/upcoming/coverage) which silently replaced the
 *              DP-S69-5 ratified module-weighted model. Cycle-2 remediation
 *              T-fix (this file) introduces the canonical two-stage scorer:
 *                Stage 1 · per-module sub-score (0-100) via existing penalty mechanics
 *                          scoped to that module's obligations
 *                Stage 2 · overall = Σ (sub_score × weight) across all modules
 *              The Cycle-1 penalty-only function `computeComplianceHealth` is
 *              preserved as a compatibility shim (now delegates to weighted total)
 *              so existing widget code (HealthScoreWidget, Welcome) is not broken.
 */

export type HealthBand = 'excellent' | 'good' | 'warning' | 'critical';

export interface FilingObligation {
  id: string;
  /** e.g. 'GSTR-3B Apr 2026', 'TDS Q4 FY25-26' */
  label: string;
  /** Mega-menu module id (sidebar key) */
  module: string;
  due_date: string; // ISO yyyy-mm-dd
  status: 'pending' | 'filed' | 'overdue' | 'breach';
  /** Optional acknowledgement / ARN once filed */
  arn?: string;
  filed_at?: string;
}

export interface HealthBreakdown {
  total: number;
  overdue_penalty: number;
  upcoming_penalty: number;
  breach_penalty: number;
  coverage_penalty: number;
  band: HealthBand;
  counts: {
    total: number;
    filed: number;
    pending: number;
    overdue: number;
    breach: number;
    due_in_7_days: number;
  };
}

// ────────────────────────────────────────────────────────────────────
// DP-S69-5 · Module-weighted model (Cycle-2 Remediation)
// ────────────────────────────────────────────────────────────────────

export type ComplianceModule =
  | 'tax-gst'        // 20%
  | 'tds'            // 15%
  | 'mca-roc'        // 15%
  | 'payroll'        // 15%
  | 'audit-trail'    // 10%
  | 'licenses'       // 10%
  | 'msme'           // 5%
  | 'esg'            // 5%
  | 'other';         // 5%

/** DP-S69-5 ratified weights · sum to 1.0 (asserted in engine unit tests). */
export const COMPLIANCE_MODULE_WEIGHTS: Record<ComplianceModule, number> = {
  'tax-gst':     0.20,
  'tds':         0.15,
  'mca-roc':     0.15,
  'payroll':     0.15,
  'audit-trail': 0.10,
  'licenses':    0.10,
  'msme':        0.05,
  'esg':         0.05,
  'other':       0.05,
};

export interface ModuleSubScore {
  module: ComplianceModule;
  weight: number;
  raw_score: number;              // 0-100 from penalty mechanics
  weighted_contribution: number;  // raw_score × weight
  counts: {
    total: number;
    filed: number;
    pending: number;
    overdue: number;
    breach: number;
    due_in_7_days: number;
  };
}

export interface WeightedHealthBreakdown {
  total: number;            // 0-100 · weighted sum
  band: HealthBand;
  modules: ModuleSubScore[];
  asOf: string;
}

export function bandFromScore(score: number): HealthBand {
  if (score >= 85) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 40) return 'warning';
  return 'critical';
}

function daysBetween(fromISO: string, toISO: string): number {
  const ms = new Date(toISO).getTime() - new Date(fromISO).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Map sidebar module ids to ComplianceModule canonical ids.
 * Sidebar uses combined ids (e.g. 'tax-gst' for both GST and TDS,
 * 'roc' for MCA-ROC). This normaliser is the single source of truth.
 *
 * For TDS sub-classification within 'tax-gst', use normaliseObligation
 * which inspects the obligation label.
 */
export function normaliseModule(sidebarModule: string): ComplianceModule {
  switch (sidebarModule) {
    case 'tax-gst':       return 'tax-gst';
    case 'tds':           return 'tds';
    case 'payroll':       return 'payroll';
    case 'roc':
    case 'mca-roc':
    case 'companies':     return 'mca-roc';
    case 'audit':
    case 'audit-trail':
    case 'internal-audit':
    case 'external-audit': return 'audit-trail';
    case 'licenses':      return 'licenses';
    case 'msme':          return 'msme';
    case 'esg':           return 'esg';
    default:              return 'other';
  }
}

/** TDS keyword matcher for tax-gst sidebar items that are actually TDS. */
const TDS_LABEL_PATTERN = /^\s*(TDS|26Q|27Q|24Q|27EQ)\b/i;

/** Resolve the canonical module for a single obligation (label-aware for TDS). */
export function normaliseObligation(o: FilingObligation): ComplianceModule {
  const base = normaliseModule(o.module);
  if (base === 'tax-gst' && TDS_LABEL_PATTERN.test(o.label)) return 'tds';
  return base;
}

function emptyCounts() {
  return { total: 0, filed: 0, pending: 0, overdue: 0, breach: 0, due_in_7_days: 0 };
}

function countObligations(
  obligations: FilingObligation[],
  asOf: string,
): HealthBreakdown['counts'] {
  const c = emptyCounts();
  for (const o of obligations) {
    c.total += 1;
    if (o.status === 'filed') c.filed += 1;
    else if (o.status === 'overdue') c.overdue += 1;
    else if (o.status === 'breach') c.breach += 1;
    else c.pending += 1;
    if (o.status === 'pending') {
      const d = daysBetween(asOf, o.due_date);
      if (d >= 0 && d <= 7) c.due_in_7_days += 1;
    }
  }
  return c;
}

/**
 * Penalty mechanics (preserved from Cycle-1):
 *  - overdue: 6 pts per (cap 40)
 *  - breach:  12 pts per (cap 30)
 *  - upcoming<7d: 2 pts per (cap 15)
 *  - coverage: 1 pt per pending beyond first 5 (cap 15)
 * Result clamped to [0, 100].
 */
function scoreFromCounts(c: HealthBreakdown['counts']): {
  total: number;
  overdue_penalty: number;
  breach_penalty: number;
  upcoming_penalty: number;
  coverage_penalty: number;
} {
  const overdue_penalty = Math.min(40, c.overdue * 6);
  const breach_penalty = Math.min(30, c.breach * 12);
  const upcoming_penalty = Math.min(15, c.due_in_7_days * 2);
  const coverage_penalty = Math.min(15, Math.max(0, c.pending - 5));
  const total = Math.max(
    0,
    100 - overdue_penalty - breach_penalty - upcoming_penalty - coverage_penalty,
  );
  return { total, overdue_penalty, breach_penalty, upcoming_penalty, coverage_penalty };
}

/**
 * Compute per-module sub-score using existing penalty mechanics scoped to that module.
 * Empty modules score 100 (no obligations = no risk in that module).
 */
export function computeModuleSubScore(
  obligations: FilingObligation[],
  module: ComplianceModule,
  asOf: string = new Date().toISOString().slice(0, 10),
): ModuleSubScore {
  const scoped = obligations.filter((o) => normaliseObligation(o) === module);
  const counts = countObligations(scoped, asOf);
  const raw_score = scoped.length === 0 ? 100 : scoreFromCounts(counts).total;
  const weight = COMPLIANCE_MODULE_WEIGHTS[module];
  return {
    module,
    weight,
    raw_score,
    weighted_contribution: Math.round(raw_score * weight * 100) / 100,
    counts,
  };
}

/**
 * Canonical OOB-1 scoring function · DP-S69-5 ratified weights.
 * Returns a WeightedHealthBreakdown with per-module sub-scores + overall.
 */
export function computeWeightedComplianceHealth(
  obligations: FilingObligation[],
  asOf: string = new Date().toISOString().slice(0, 10),
): WeightedHealthBreakdown {
  const allModules = Object.keys(COMPLIANCE_MODULE_WEIGHTS) as ComplianceModule[];
  const modules = allModules.map((m) => computeModuleSubScore(obligations, m, asOf));
  const weightedTotal = modules.reduce((sum, m) => sum + m.raw_score * m.weight, 0);
  const total = Math.max(0, Math.min(100, Math.round(weightedTotal)));
  return {
    total,
    band: bandFromScore(total),
    modules,
    asOf,
  };
}

/**
 * Compatibility shim · returns the legacy HealthBreakdown shape backed by the
 * weighted calculation. Used by existing widget code without breaking signatures.
 *
 * `total` comes from the weighted calculation (DP-S69-5).
 * Penalty fields are aggregated across all modules (informational only).
 * `counts` are global counts (unchanged shape).
 */
export function computeComplianceHealth(
  obligations: FilingObligation[],
  asOf: string = new Date().toISOString().slice(0, 10),
): HealthBreakdown {
  const counts = countObligations(obligations, asOf);
  const { overdue_penalty, breach_penalty, upcoming_penalty, coverage_penalty } =
    scoreFromCounts(counts);
  const weighted = computeWeightedComplianceHealth(obligations, asOf);
  return {
    total: weighted.total,
    overdue_penalty,
    upcoming_penalty,
    breach_penalty,
    coverage_penalty,
    band: weighted.band,
    counts,
  };
}

export function nextUpcoming(
  obligations: FilingObligation[],
  limit = 5,
  asOf: string = new Date().toISOString().slice(0, 10),
): FilingObligation[] {
  return [...obligations]
    .filter((o) => o.status === 'pending' || o.status === 'overdue')
    .sort((a, b) => {
      const dd = daysBetween(asOf, a.due_date) - daysBetween(asOf, b.due_date);
      if (dd !== 0) return dd;
      // pending before overdue at same date (per spec)
      if (a.status === b.status) return 0;
      return a.status === 'pending' ? -1 : 1;
    })
    .slice(0, limit);
}
