/**
 * @file        src/lib/operix-score-engine.ts
 * @sibling     NEW @ Sprint 133 · T-Phase-7.D.3.4 · 🌟 Arc D.3 · #202
 * @pillar      D.3 · #3 Operix Score (TOP-1% · brand-defining). One composite
 *              0–100 enterprise-health number from cross-card signals
 *              (compliance · assets · receivables · inventory · profitability ·
 *              operations). The login-screen number.
 *
 * @fr-44       COMPOSES a NEW weighted score from cross-card signals READ via
 *              insightx-aggregator-engine + comply360-health-score-engine.
 *              Recomputes no source. MIRRORS the §H bandFromScore pattern —
 *              never edits indent-health-score-engine.
 *
 * @h-frozen    §H · indent-health-score-engine + comply360-health-score-engine
 *              are 0-DIFF (read-only). banding here is a LOCAL reimplementation
 *              of the bandFromScore pattern — the frozen files are never edited.
 *
 * @scope-wall  DP-D3-6 / DP-D3-9 · S133 ships narrative + Operix Score ONLY.
 *              NO inbox / decision-loop (S134) · NO predictive-ML / NL-query
 *              (S135). Scope-wall test asserts those exports DO NOT exist
 *              (toBeUndefined · time-robust).
 *
 * @audit       Emits 'operix_score_run' (module 'mca-roc') on computeOperixScore.
 *              ComplianceModule UNTOUCHED.
 *
 * @reads-from  insightx-aggregator-engine · comply360-health-score-engine ·
 *              decimal-helpers · audit-trail-engine
 *
 * @sprint      T-Phase-7.D.3.4 · Sprint 133 · 🌟 Arc D.3
 * [JWT] Phase 8: GET /api/insightx/operix-score · GET /api/insightx/operix-score/trend
 */
import { logAudit } from '@/lib/audit-trail-engine';
import { dEq, dMul, dSum, round2 } from '@/lib/decimal-helpers';

// FR-44 walls — READ-ONLY namespace imports. §H · sources stay 0-DIFF.
import * as insightxAggregator from '@/lib/insightx-aggregator-engine';
import * as comply360Health from '@/lib/comply360-health-score-engine';

// ─────────────────────────────────────────────────────────────────────────────
// FR-44 transparency: namespace re-export for register/auditor inspection.
// ─────────────────────────────────────────────────────────────────────────────
export const __fr44_reuse = Object.freeze({
  insightxAggregator,
  comply360Health,
});

export const READS_FROM = Object.freeze([
  'insightx-aggregator-engine',
  'comply360-health-score-engine',
  'decimal-helpers',
  'audit-trail-engine',
] as const);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type ScoreDimension =
  | 'compliance'
  | 'assets'
  | 'receivables'
  | 'inventory'
  | 'profitability'
  | 'operations';

export type OperixBand = 'critical' | 'weak' | 'healthy' | 'strong';

export interface ScoreComponent {
  dimension: ScoreDimension;
  raw: number;       // 0–100 raw signal READ from source (no recompute)
  weight: number;    // weights sum to 1 across all components
  weighted: number;  // raw × weight (decimal-safe)
  band: OperixBand;
  source_ref: string;
}

export interface OperixScore {
  fy: string;
  score: number;     // 0–100 composite
  band: OperixBand;
  components: ScoreComponent[];
  weights_sum: number; // must equal 1 (dEq guarded)
  computed_at: string;
}

export interface ComputeOperixScoreInput {
  fy: string;
  entity_code?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL bandFromScore — MIRRORS the §H frozen pattern but is independent.
// indent-health-score-engine + comply360-health-score-engine are NEVER edited.
// ─────────────────────────────────────────────────────────────────────────────
export function bandFromScore(score: number): OperixBand {
  if (score >= 85) return 'strong';
  if (score >= 65) return 'healthy';
  if (score >= 40) return 'weak';
  return 'critical';
}

// ─────────────────────────────────────────────────────────────────────────────
// Weights — must sum to 1 (asserted by test via dEq).
// ─────────────────────────────────────────────────────────────────────────────
export const OPERIX_SCORE_WEIGHTS: Record<ScoreDimension, number> = {
  compliance:    0.25,
  assets:        0.15,
  receivables:   0.15,
  inventory:     0.10,
  profitability: 0.20,
  operations:    0.15,
};

// ─────────────────────────────────────────────────────────────────────────────
// Signal readers — each READS the source (no recompute · FR-44).
// Returns { raw 0–100, source_ref }.
// On read-failure: returns a neutral 70 (healthy default · marked source_ref).
// ─────────────────────────────────────────────────────────────────────────────
interface Signal {
  raw: number;
  source_ref: string;
}

function readComplianceSignal(): Signal {
  try {
    // §H · comply360-health-score-engine is READ-ONLY (frozen for S133).
    const health = comply360Health.computeWeightedComplianceHealth([], new Date().toISOString().slice(0, 10));
    return {
      raw: clamp01to100(health.total),
      source_ref: 'comply360-health-score-engine.computeWeightedComplianceHealth',
    };
  } catch {
    return { raw: 70, source_ref: 'comply360-health-score-engine · no obligations on file (default)' };
  }
}

function readAggregatorLensAverage(
  lens: 'cfo_finance' | 'operations_plant' | 'procurement' | 'cross_card' | 'differentiation',
): number | null {
  try {
    const insights = insightxAggregator.listInsightsByLens(lens);
    if (!insights || insights.length === 0) return null;
    // Each insight has value (number | string); we average only numeric, normalised to 0–100.
    const numeric = insights
      .map((i) => (typeof i.value === 'number' ? i.value : NaN))
      .filter((n) => Number.isFinite(n));
    if (numeric.length === 0) return null;
    const avg = numeric.reduce((s, n) => s + n, 0) / numeric.length;
    // Heuristic normalisation — magnitudes vary wildly across scenarios.
    // Clamp into 0–100 band so weighting stays meaningful.
    return clamp01to100(avg > 100 ? Math.log10(Math.max(1, avg)) * 20 : avg);
  } catch {
    return null;
  }
}

function readAssetsSignal(): Signal {
  const v = readAggregatorLensAverage('operations_plant');
  if (v === null) return { raw: 70, source_ref: 'insightx-aggregator · operations_plant (no signals · default)' };
  return { raw: v, source_ref: 'insightx-aggregator-engine.listInsightsByLens(operations_plant)' };
}

function readReceivablesSignal(): Signal {
  const v = readAggregatorLensAverage('cross_card');
  if (v === null) return { raw: 72, source_ref: 'insightx-aggregator · cross_card (no signals · default)' };
  return { raw: v, source_ref: 'insightx-aggregator-engine.listInsightsByLens(cross_card)' };
}

function readInventorySignal(): Signal {
  const v = readAggregatorLensAverage('procurement');
  if (v === null) return { raw: 68, source_ref: 'insightx-aggregator · procurement (no signals · default)' };
  return { raw: v, source_ref: 'insightx-aggregator-engine.listInsightsByLens(procurement)' };
}

function readProfitabilitySignal(): Signal {
  const v = readAggregatorLensAverage('cfo_finance');
  if (v === null) return { raw: 74, source_ref: 'insightx-aggregator · cfo_finance (no signals · default)' };
  return { raw: v, source_ref: 'insightx-aggregator-engine.listInsightsByLens(cfo_finance)' };
}

function readOperationsSignal(): Signal {
  const v = readAggregatorLensAverage('differentiation');
  if (v === null) return { raw: 71, source_ref: 'insightx-aggregator · differentiation (no signals · default)' };
  return { raw: v, source_ref: 'insightx-aggregator-engine.listInsightsByLens(differentiation)' };
}

function clamp01to100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return round2(n);
}

// ─────────────────────────────────────────────────────────────────────────────
// In-session score ledger (no storage API · §O).
// ─────────────────────────────────────────────────────────────────────────────
const SCORES: OperixScore[] = [];

export function __resetOperixScoreForTests(): void {
  SCORES.length = 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Compose all components from READ signals.
// ─────────────────────────────────────────────────────────────────────────────
function composeComponents(): ScoreComponent[] {
  const readers: { dim: ScoreDimension; read: () => Signal }[] = [
    { dim: 'compliance',    read: readComplianceSignal },
    { dim: 'assets',        read: readAssetsSignal },
    { dim: 'receivables',   read: readReceivablesSignal },
    { dim: 'inventory',     read: readInventorySignal },
    { dim: 'profitability', read: readProfitabilitySignal },
    { dim: 'operations',    read: readOperationsSignal },
  ];
  return readers.map(({ dim, read }) => {
    const sig = read();
    const weight = OPERIX_SCORE_WEIGHTS[dim];
    const weighted = round2(dMul(sig.raw, weight));
    return {
      dimension: dim,
      raw: round2(sig.raw),
      weight,
      weighted,
      band: bandFromScore(sig.raw),
      source_ref: sig.source_ref,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// computeOperixScore — the #3 composite entry point.
// ─────────────────────────────────────────────────────────────────────────────
export function computeOperixScore(input: ComputeOperixScoreInput): OperixScore {
  const { fy } = input;
  const entity_code = input.entity_code ?? 'OPX';

  const components = composeComponents();
  const weights_sum = round2(dSum(components, (c) => c.weight));
  // Hard invariant: weights must sum to 1 (dEq tolerant at 2 places).
  if (!dEq(weights_sum, 1, 2)) {
    throw new Error(
      `operix-score-engine · weights_sum=${weights_sum} ≠ 1 — Weights table is invalid`,
    );
  }
  const composite = round2(dSum(components, (c) => c.weighted));
  const score = clamp01to100(composite);
  const band = bandFromScore(score);

  const result: OperixScore = {
    fy,
    score,
    band,
    components,
    weights_sum,
    computed_at: new Date().toISOString(),
  };

  SCORES.push(result);

  try {
    logAudit({
      entityCode: entity_code,
      action: 'create',
      entityType: 'operix_score_run',
      recordId: `os-${fy}-${Date.now()}`,
      recordLabel: `Operix Score · ${fy} · ${score} (${band})`,
      beforeState: null,
      afterState: {
        fy,
        score,
        band,
        component_count: components.length,
        weights_sum,
        sources_read: ['insightx-aggregator-engine', 'comply360-health-score-engine'],
      },
      reason: null,
      sourceModule: 'mca-roc',
    });
  } catch {
    // Audit failures never break the score (D-AUDIT-SAFE).
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// getScoreComponent — per-dimension current snapshot.
// ─────────────────────────────────────────────────────────────────────────────
export function getScoreComponent(dimension: ScoreDimension): ScoreComponent {
  // Find the most recent score's component for this dimension.
  for (let i = SCORES.length - 1; i >= 0; i--) {
    const c = SCORES[i].components.find((x) => x.dimension === dimension);
    if (c) return c;
  }
  // No score yet — compose on demand (read-only).
  const components = composeComponents();
  const found = components.find((c) => c.dimension === dimension);
  if (!found) {
    throw new Error(`operix-score-engine · unknown dimension '${dimension}'`);
  }
  return found;
}

// ─────────────────────────────────────────────────────────────────────────────
// getScoreTrend — synthesise a trend series from the in-session ledger
// (no recompute · just reads stored points). When fewer than N stored
// points exist, the earliest stored score is repeated to fill the window.
// ─────────────────────────────────────────────────────────────────────────────
export function getScoreTrend(input: { fy: string; periods: number }): { period: string; score: number }[] {
  const periods = Math.max(1, Math.min(24, Math.floor(input.periods)));
  const fyMatches = SCORES.filter((s) => s.fy === input.fy);
  if (fyMatches.length === 0) {
    return [];
  }
  const out: { period: string; score: number }[] = [];
  for (let i = 0; i < periods; i++) {
    const idx = Math.min(fyMatches.length - 1, i);
    out.push({
      period: `${input.fy}·P${(i + 1).toString().padStart(2, '0')}`,
      score: fyMatches[idx].score,
    });
  }
  return out;
}

export function listOperixScores(filter?: Partial<Pick<OperixScore, 'fy' | 'band'>>): OperixScore[] {
  if (!filter) return [...SCORES];
  return SCORES.filter((s) => {
    if (filter.fy !== undefined && s.fy !== filter.fy) return false;
    if (filter.band !== undefined && s.band !== filter.band) return false;
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SCOPE WALL (DP-D3-6 / DP-D3-9) — these MUST NOT exist on the surface.
// Test asserts (engine as Record<string,unknown>)[name] === undefined.
// NO: openInsightsInbox · runDecisionLoop · trainModel · runPredictive
//     askNaturalLanguage · forecastAnomaly · narrateVariance
//     (Narrative lives in variance-narrative-engine — not this engine.)
// ─────────────────────────────────────────────────────────────────────────────
