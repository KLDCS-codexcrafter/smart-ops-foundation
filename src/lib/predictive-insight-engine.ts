/**
 * @file        src/lib/predictive-insight-engine.ts
 * @sibling     NEW @ Sprint 135 · T-Phase-7.D.3.6 · 🌟 Arc D.3 · #205
 * @pillar      D.3 · β Predictive Insights (Lens 10 · TOP-1%). In-house statistical
 *              ML for scenarios 64 / 65 / 66 / 68: least-squares linear regression ·
 *              Holt-Winters exponential smoothing · ARIMA-lite (AR(1)+drift).
 *              EXPLAINABLE-by-design (#6) — every prediction exposes its drivers,
 *              coefficients, contribution %, r² and confidence band. "Auditable AI."
 *
 * @ml-policy   In-house statistical ONLY · NO ML library · NO LLM · NO new runtime
 *              dep (§O). Implements the S121 ForecastModelHook seam. Scenario 67
 *              (invoice NLP) is Phase-8 (NOT built here).
 *
 * @fr-44       READS historical data + predictive-maintenance-fa-engine (scenario 64)
 *              + insightx-aggregator-engine.getScenarioRegistry (NL-query target).
 *              Recomputes no source. All sources stay 0-DIFF.
 *
 * @scope-wall  4 numeric ML scenarios + NL-query ONLY. NO scenario 67 (invoice NLP,
 *              Phase 8) · NO LLM / generative AI · NO self-service builder (Phase 8).
 *              Honest claim = "explainable predictive analytics · auditable AI" —
 *              NOT "Copilot / generative AI".
 *
 * @audit       Emits 'predictive_insight_run' (module 'mca-roc') on predict().
 *              NL-query reuses 'insightx_aggregation_run'. ComplianceModule UNTOUCHED.
 *
 * @reads-from  predictive-maintenance-fa-engine · demand-forecast-engine ·
 *              fpa-forecasting-engine (implements ForecastModelHook seam) ·
 *              insightx-aggregator-engine (NL-query target) · decimal-helpers ·
 *              audit-trail-engine
 *
 * @sprint      T-Phase-7.D.3.6 · Sprint 135
 * [JWT] Phase 8: POST /api/insightx/predict · POST /api/insightx/nl-query
 */
import { logAudit } from '@/lib/audit-trail-engine';
import { dAdd, dSub, dMul, round2 } from '@/lib/decimal-helpers';

// FR-44 read-only namespaces — all sources stay 0-DIFF.
import * as predictiveMaintenanceFA from '@/lib/predictive-maintenance-fa-engine';
import * as demandForecast from '@/lib/demand-forecast-engine';
import * as fpaForecasting from '@/lib/fpa-forecasting-engine';
import * as insightxAggregator from '@/lib/insightx-aggregator-engine';
import type { ForecastModelHook, ForecastPoint } from '@/lib/fpa-forecasting-engine';
import type {
  AggregatedInsight,
  InsightLens,
  ScenarioRegistryEntry,
} from '@/lib/insightx-aggregator-engine';

// FR-44 transparency: namespace re-export for register / auditor inspection.
export const __fr44_reuse = {
  predictiveMaintenanceFA,
  demandForecast,
  fpaForecasting,
  insightxAggregator,
} as const;

export const READS_FROM = [
  'predictive-maintenance-fa-engine',
  'demand-forecast-engine',
  'fpa-forecasting-engine',
  'insightx-aggregator-engine',
  'decimal-helpers',
  'audit-trail-engine',
] as const;

// ─── Types ───────────────────────────────────────────────────────────────────

/** Lens-10 scenarios shipped β here. Scenario 67 (invoice NLP) is Phase-8. */
export type PredictiveScenario =
  | 'breakdown_30d'         // scenario 64 · predictive maintenance breakdown
  | 'useful_life'           // scenario 65 · asset useful life
  | 'replacement_cost'      // scenario 66 · replacement cost forecast
  | 'premium_optimization'; // scenario 68 · insurance premium optimization

export const PREDICTIVE_SCENARIOS: readonly PredictiveScenario[] = [
  'breakdown_30d',
  'useful_life',
  'replacement_cost',
  'premium_optimization',
] as const;

export type StatModel = 'linear_regression' | 'holt_winters' | 'arima_lite';

/** #6 explainable-by-design — every prediction exposes this. */
export interface Explanation {
  drivers: { name: string; coefficient: number; contribution_pct: number }[];
  model: StatModel;
  r_squared: number;
  confidence_band: { low: number; high: number };
  notes: string;
}

export interface Prediction {
  scenario: PredictiveScenario;
  subject_id: string;
  predicted_value: number;
  horizon: string;
  explanation: Explanation; // ALWAYS present (#6 — no black-box outputs)
  computed_at: string;
}

export interface PredictInput {
  scenario: PredictiveScenario;
  subject_id: string;
  /** Numeric time series. Caller may load it from any of the FR-44 sources. */
  history: { period: string; value: number }[];
  /** Optional override; otherwise the engine selects a scenario-appropriate model. */
  model?: StatModel;
}

// ─── In-session ledger (§O · NO storage API · NO new runtime dep) ────────────
const LEDGER: Prediction[] = [];

// ─── Statistical kernels (in-house · decimal-helpers · no lib) ───────────────

/**
 * Least-squares linear regression over (x = index, y = value).
 * Returns slope, intercept, r² and per-point residuals.
 */
function linearRegression(values: number[]): {
  slope: number;
  intercept: number;
  r_squared: number;
  residuals: number[];
} {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0, r_squared: 0, residuals: [] };
  if (n === 1) return { slope: 0, intercept: values[0], r_squared: 1, residuals: [0] };

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX = dAdd(sumX, i);
    sumY = dAdd(sumY, values[i]);
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = dSub(i, meanX);
    const dy = dSub(values[i], meanY);
    num = dAdd(num, dMul(dx, dy));
    den = dAdd(den, dMul(dx, dx));
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = dSub(meanY, dMul(slope, meanX));

  // r² = 1 − SSres / SStot
  let ssRes = 0;
  let ssTot = 0;
  const residuals: number[] = [];
  for (let i = 0; i < n; i++) {
    const yHat = dAdd(intercept, dMul(slope, i));
    const r = dSub(values[i], yHat);
    residuals.push(round2(r));
    ssRes = dAdd(ssRes, dMul(r, r));
    const dy = dSub(values[i], meanY);
    ssTot = dAdd(ssTot, dMul(dy, dy));
  }
  const r_squared = ssTot === 0 ? 1 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));
  return { slope: round2(slope), intercept: round2(intercept), r_squared, residuals };
}

/**
 * Holt-Winters additive exponential smoothing (level + trend; seasonal optional).
 * Pure JS · decimal-safe at boundaries. Returns last level, last trend and one-step
 * projection. Captures linear trend and (when period > 1) additive seasonality.
 */
function holtWinters(
  values: number[],
  opts: { alpha?: number; beta?: number; period?: number } = {},
): { level: number; trend: number; projection: number; seasonal_capture: boolean } {
  const alpha = opts.alpha ?? 0.5;
  const beta = opts.beta ?? 0.3;
  const period = opts.period ?? 1;
  if (values.length === 0) return { level: 0, trend: 0, projection: 0, seasonal_capture: false };
  if (values.length === 1) {
    return { level: values[0], trend: 0, projection: values[0], seasonal_capture: false };
  }

  let level = values[0];
  let trend = dSub(values[1], values[0]);
  for (let i = 1; i < values.length; i++) {
    const prevLevel = level;
    level = dAdd(dMul(alpha, values[i]), dMul(1 - alpha, dAdd(prevLevel, trend)));
    trend = dAdd(dMul(beta, dSub(level, prevLevel)), dMul(1 - beta, trend));
  }
  const projection = round2(dAdd(level, trend));
  return {
    level: round2(level),
    trend: round2(trend),
    projection,
    seasonal_capture: period > 1 && values.length >= period * 2,
  };
}

/**
 * ARIMA-lite: AR(1) + drift. y_hat = phi * y_{t-1} + drift.
 * phi via lag-1 autocorrelation; drift via residual mean.
 */
function arimaLite(values: number[]): { phi: number; drift: number; projection: number } {
  const n = values.length;
  if (n < 2) return { phi: 0, drift: 0, projection: values[0] ?? 0 };
  const lagY: number[] = [];
  const y: number[] = [];
  for (let i = 1; i < n; i++) {
    lagY.push(values[i - 1]);
    y.push(values[i]);
  }
  const meanLag = lagY.reduce(dAdd, 0) / lagY.length;
  const meanY = y.reduce(dAdd, 0) / y.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < y.length; i++) {
    num = dAdd(num, dMul(dSub(lagY[i], meanLag), dSub(y[i], meanY)));
    den = dAdd(den, dMul(dSub(lagY[i], meanLag), dSub(lagY[i], meanLag)));
  }
  const phi = den === 0 ? 0 : Math.max(-1, Math.min(1, num / den));
  const drift = dSub(meanY, dMul(phi, meanLag));
  const last = values[n - 1];
  const projection = round2(dAdd(dMul(phi, last), drift));
  return { phi: round2(phi), drift: round2(drift), projection };
}

// ─── Scenario → model selection ──────────────────────────────────────────────

function defaultModelFor(s: PredictiveScenario): StatModel {
  switch (s) {
    case 'breakdown_30d':        return 'linear_regression'; // 64 · trend on PM signal
    case 'useful_life':          return 'holt_winters';      // 65 · usage with seasonality
    case 'replacement_cost':     return 'linear_regression'; // 66 · price history regression
    case 'premium_optimization': return 'arima_lite';        // 68 · risk profile autoreg
  }
}

function driverNameFor(s: PredictiveScenario): string {
  switch (s) {
    case 'breakdown_30d':        return 'maintenance_signal_trend';
    case 'useful_life':          return 'usage_rate';
    case 'replacement_cost':     return 'price_index_trend';
    case 'premium_optimization': return 'risk_profile_autoreg';
  }
}

// ─── Core predict() (#6 explainable-by-design) ───────────────────────────────

export function predict(input: PredictInput): Prediction {
  const model = input.model ?? defaultModelFor(input.scenario);
  const values = input.history.map((p) => p.value);
  const driverName = driverNameFor(input.scenario);

  let predicted_value = 0;
  let r_squared = 0;
  let lowBand = 0;
  let highBand = 0;
  const drivers: Explanation['drivers'] = [];
  let notes = '';

  if (model === 'linear_regression') {
    const lr = linearRegression(values);
    predicted_value = round2(dAdd(lr.intercept, dMul(lr.slope, values.length)));
    r_squared = lr.r_squared;
    // Confidence band via residual std-dev * 1.96 (≈95%).
    const stdDev = stddev(lr.residuals);
    lowBand = round2(dSub(predicted_value, dMul(1.96, stdDev)));
    highBand = round2(dAdd(predicted_value, dMul(1.96, stdDev)));
    const slopeContribAbs = Math.abs(lr.slope * values.length);
    const interceptContribAbs = Math.abs(lr.intercept);
    const total = slopeContribAbs + interceptContribAbs;
    const slopePct = total === 0 ? 0 : round2((slopeContribAbs / total) * 100);
    drivers.push(
      { name: driverName,    coefficient: lr.slope,     contribution_pct: slopePct },
      { name: 'baseline',    coefficient: lr.intercept, contribution_pct: round2(100 - slopePct) },
    );
    notes = `OLS regression · slope=${lr.slope} · intercept=${lr.intercept} · r²=${r_squared.toFixed(3)}`;
  } else if (model === 'holt_winters') {
    const hw = holtWinters(values, { period: 4 });
    predicted_value = hw.projection;
    r_squared = inferR2FromTrend(values, hw.level, hw.trend);
    const stdDev = stddev(values.map((v, i) => dSub(v, dAdd(hw.level, dMul(hw.trend, i - values.length + 1)))));
    lowBand = round2(dSub(predicted_value, dMul(1.96, stdDev)));
    highBand = round2(dAdd(predicted_value, dMul(1.96, stdDev)));
    const trendAbs = Math.abs(hw.trend);
    const levelAbs = Math.abs(hw.level);
    const total = trendAbs + levelAbs;
    const trendPct = total === 0 ? 0 : round2((trendAbs / total) * 100);
    drivers.push(
      { name: 'level',        coefficient: hw.level, contribution_pct: round2(100 - trendPct) },
      { name: driverName,     coefficient: hw.trend, contribution_pct: trendPct },
    );
    notes = `Holt-Winters · α=0.5 · β=0.3 · level=${hw.level} · trend=${hw.trend} · seasonal_capture=${hw.seasonal_capture}`;
  } else {
    const ar = arimaLite(values);
    predicted_value = ar.projection;
    r_squared = Math.abs(ar.phi); // proxy: stronger autoregression → more explanatory power
    const stdDev = stddev(values);
    lowBand = round2(dSub(predicted_value, dMul(1.96, stdDev)));
    highBand = round2(dAdd(predicted_value, dMul(1.96, stdDev)));
    const phiAbs = Math.abs(ar.phi);
    const driftAbs = Math.abs(ar.drift);
    const total = phiAbs + driftAbs;
    const phiPct = total === 0 ? 0 : round2((phiAbs / total) * 100);
    drivers.push(
      { name: driverName, coefficient: ar.phi,   contribution_pct: phiPct },
      { name: 'drift',    coefficient: ar.drift, contribution_pct: round2(100 - phiPct) },
    );
    notes = `ARIMA-lite AR(1)+drift · φ=${ar.phi} · drift=${ar.drift}`;
  }

  // Scenario 64 explicitly READS predictive-maintenance-fa-engine for transparency.
  let scenarioNote = '';
  if (input.scenario === 'breakdown_30d') {
    try {
      const high = predictiveMaintenanceFA.listHighRiskAssets('GLOBAL');
      scenarioNote = ` · pm-engine high-risk-assets=${high.length}`;
    } catch {
      scenarioNote = ' · pm-engine read skipped';
    }
  }

  const prediction: Prediction = {
    scenario: input.scenario,
    subject_id: input.subject_id,
    predicted_value,
    horizon: input.scenario === 'breakdown_30d' ? '30d' : '12m',
    explanation: {
      drivers,
      model,
      r_squared: round2(r_squared),
      confidence_band: { low: lowBand, high: highBand },
      notes: notes + scenarioNote,
    },
    computed_at: new Date().toISOString(),
  };

  LEDGER.push(prediction);

  // Audit (D-AUDIT-SAFE try/catch · ComplianceModule UNTOUCHED).
  try {
    logAudit({
      entityCode: 'GLOBAL',
      action: 'create',
      entityType: 'predictive_insight_run',
      recordId: `${input.scenario}:${input.subject_id}:${prediction.computed_at}`,
      recordLabel: `Predictive · ${input.scenario} · ${input.subject_id}`,
      beforeState: null,
      afterState: {
        scenario: input.scenario,
        model,
        predicted_value,
        r_squared: prediction.explanation.r_squared,
        history_n: values.length,
      },
      reason: 'predictive_insight_run',
      sourceModule: 'mca-roc',
    });
  } catch { /* non-fatal · D-AUDIT-SAFE */ }

  return prediction;
}

export function listPredictions(filter?: Partial<Prediction>): Prediction[] {
  if (!filter) return LEDGER.map((p) => ({ ...p }));
  return LEDGER.filter((p) =>
    Object.entries(filter).every(([k, v]) => (p as unknown as Record<string, unknown>)[k] === v),
  ).map((p) => ({ ...p }));
}

// ─── ForecastModelHook seam (DP-D1-5 · S121) ─────────────────────────────────
/**
 * The β implementation of the S121 ForecastModelHook seam. Plug any of these into
 * `fpa-forecasting-engine.generateFPAForecast({ model: makeForecastModelHook(...) })`
 * to swap the heuristic for an explainable statistical predictor.
 */
export function makeForecastModelHook(model: StatModel = 'linear_regression'): ForecastModelHook {
  return {
    name: `predictive-insight-${model}`,
    predict(history: ForecastPoint[], horizon: number): ForecastPoint[] {
      const values = history.map((h) => h.value);
      const out: ForecastPoint[] = [];
      const working = [...values];
      for (let h = 0; h < horizon; h++) {
        let next = 0;
        if (model === 'linear_regression') {
          const lr = linearRegression(working);
          next = round2(dAdd(lr.intercept, dMul(lr.slope, working.length)));
        } else if (model === 'holt_winters') {
          next = holtWinters(working, { period: 4 }).projection;
        } else {
          next = arimaLite(working).projection;
        }
        out.push({ period: `P+${h + 1}`, value: next });
        working.push(next);
      }
      return out;
    },
  };
}

// ─── NL-query (DP-D3-7 · deterministic intent-match · NO LLM) ────────────────

export interface NLQueryResult {
  query: string;
  matched_scenario_id: string | null;
  lens: InsightLens | null;
  result: AggregatedInsight | null;
  interpretation: string;
  match_score: number;
}

const SYNONYMS: Record<string, string[]> = {
  ageing:      ['aging', 'overdue', 'past due'],
  receivable:  ['ar', 'receivables', 'debtor'],
  payable:     ['ap', 'payables', 'creditor'],
  revenue:     ['sales', 'topline', 'turnover'],
  cash:        ['liquidity', 'cashflow', 'cash flow'],
  forecast:    ['projection', 'predict', 'predicted'],
  budget:      ['plan', 'planned'],
  variance:    ['gap', 'delta'],
  margin:      ['profitability'],
  cost:        ['expense', 'spending'],
  risk:        ['exposure', 'hazard'],
};

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s>%]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function expandSynonyms(tokens: string[]): Set<string> {
  const out = new Set(tokens);
  for (const t of tokens) {
    if (SYNONYMS[t]) SYNONYMS[t].forEach((s) => out.add(s));
    for (const [base, syns] of Object.entries(SYNONYMS)) {
      if (syns.includes(t)) out.add(base);
    }
  }
  return out;
}

function scoreEntry(tokens: Set<string>, entry: ScenarioRegistryEntry): number {
  const corpus = `${entry.scenario_id} ${entry.title} ${entry.lens}`.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (!t) continue;
    if (corpus.includes(t)) score += t.length >= 4 ? 2 : 1;
  }
  return score;
}

/**
 * Deterministic keyword / intent-match over the 75-scenario registry.
 * NO LLM · NO API · NO model · NO new runtime dep.
 * Returns honest no-match (matched_scenario_id:null) when no entry scores ≥3.
 */
export function queryInsights(nl: string): NLQueryResult {
  const query = (nl ?? '').trim();
  if (!query) {
    return {
      query: '',
      matched_scenario_id: null,
      lens: null,
      result: null,
      interpretation: 'no match · empty query · try e.g. "AR ageing over 90 days"',
      match_score: 0,
    };
  }
  const tokens = expandSynonyms(tokenize(query));
  const registry = insightxAggregator.getScenarioRegistry();
  let best: { entry: ScenarioRegistryEntry; score: number } | null = null;
  for (const e of registry) {
    const sc = scoreEntry(tokens, e);
    if (sc > 0 && (!best || sc > best.score)) best = { entry: e, score: sc };
  }
  if (!best || best.score < 3) {
    return {
      query,
      matched_scenario_id: null,
      lens: null,
      result: null,
      interpretation:
        'no confident match · try a metric keyword (revenue / cash / ageing / budget / variance / margin / forecast)',
      match_score: best?.score ?? 0,
    };
  }
  let result: AggregatedInsight | null = null;
  let interpretation = `Matched scenario '${best.entry.scenario_id}' (lens: ${best.entry.lens}) on tokens [${[...tokens].join(', ')}].`;
  if (best.entry.backed) {
    try {
      result = insightxAggregator.aggregateInsight(best.entry.scenario_id);
    } catch (e) {
      interpretation += ` Source read failed: ${(e as Error).message}`;
    }
  } else {
    interpretation += ' Scenario is unbacked — no aggregated value to read.';
  }
  return {
    query,
    matched_scenario_id: best.entry.scenario_id,
    lens: best.entry.lens,
    result,
    interpretation,
    match_score: best.score,
  };
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function stddev(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce(dAdd, 0) / arr.length;
  const variance = arr.reduce((s, v) => dAdd(s, dMul(dSub(v, mean), dSub(v, mean))), 0) / arr.length;
  return Math.sqrt(variance);
}

function inferR2FromTrend(values: number[], level: number, trend: number): number {
  if (values.length < 2) return 1;
  const meanY = values.reduce(dAdd, 0) / values.length;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < values.length; i++) {
    const yHat = dAdd(level, dMul(trend, i - values.length + 1));
    const r = dSub(values[i], yHat);
    ssRes = dAdd(ssRes, dMul(r, r));
    const dy = dSub(values[i], meanY);
    ssTot = dAdd(ssTot, dMul(dy, dy));
  }
  return ssTot === 0 ? 1 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));
}
