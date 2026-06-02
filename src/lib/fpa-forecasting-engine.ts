/**
 * @file        src/lib/fpa-forecasting-engine.ts
 * @sibling     NEW @ Sprint 121 · Arc D.1 · FP&A Forecasting
 * @pillar      D.1 · FP&A Forecasting. Revenue / cash / demand forecasts via EXPLAINABLE
 *              HEURISTICS (moving-average · linear trend · seasonality index) over
 *              historical actuals, with a declared ML-interface seam (heuristic now;
 *              predictive ML on the roadmap · DP-D1-5 / DP-P7-6).
 * @fr-44       REUSES — does NOT reimplement — all of:
 *                · demand-forecast-engine (S60) · listForecasts — demand history (read)
 *                · fpa-budgeting-engine (S120) · listBudgets — plan baseline for
 *                  forecast-vs-budget variance
 *                · group-consolidation-engine (S109) · buildConsolidatedPnL — historical
 *                  actuals trend for revenue / cash forecast
 *              All source engines stay 0-DIFF.
 * @no-ml       Heuristic only · NO live ML training · NO new runtime deps (§O).
 *              ForecastModelHook is the declared SEAM — a future predictive model
 *              implements it WITHOUT engine surgery.
 * @reads-from  demand-forecast-engine · fpa-budgeting-engine · group-consolidation-engine
 *              · decimal-helpers · audit-trail-engine
 * @scope-wall  DP-D1-9 · forecasting ONLY. NO scenario planning (S122-123), NO costing
 *              / driver / activity-based costing (S124-125). The scope-wall test asserts
 *              NONE of those exports exist on this engine.
 * @audit       Emits 'forecast_event' (module 'mca-roc') on generateFPAForecast and
 *              getForecastVsBudget.
 * @sprint      T-Phase-7.D.1.2 · Sprint 121 · Block 2
 * [JWT] Phase 8: POST /api/fpa-forecasting/forecasts · GET /api/fpa-forecasting/vs-budget
 */
import {
  buildConsolidatedPnL,
  type ConsolidatedPnL,
} from '@/lib/group-consolidation-engine';
import {
  listForecasts,
  type DemandForecastRecord,
} from '@/lib/demand-forecast-engine';
import {
  listBudgets,
  type FPABudget,
} from '@/lib/fpa-budgeting-engine';
import { dAdd, dSub, dMul, dSum, round2 } from '@/lib/decimal-helpers';
import { logAudit } from '@/lib/audit-trail-engine';

// ─── READS_FROM declaration (transparency · FR-91) ───────────────────────────

export const READS_FROM = Object.freeze({
  engines: [
    'demand-forecast-engine',         // listForecasts · demand history
    'fpa-budgeting-engine',           // listBudgets · plan baseline
    'group-consolidation-engine',     // buildConsolidatedPnL · revenue/cash history
    'decimal-helpers',                // dAdd / dSub / dMul / dSum / round2
    'audit-trail-engine',             // logAudit for forecast_event
  ],
  storage_keys: [
    'erp_fpa_forecasts',              // NEW · owned by this engine
  ],
  // §O · NO new runtime dependencies; ML library imports forbidden.
  // The ForecastModelHook is the declared interface seam — predictive models plug
  // in WITHOUT changes to this engine.
  ml_policy: 'heuristic-only · no live ML training · ForecastModelHook is the seam',
} as const);

// ─── Public types ────────────────────────────────────────────────────────────

export type ForecastTarget = 'revenue' | 'cash' | 'demand';
export const FORECAST_TARGETS: readonly ForecastTarget[] = [
  'revenue',
  'cash',
  'demand',
] as const;

export type ForecastMethod = 'moving_average' | 'linear_trend' | 'seasonal';
export const FORECAST_METHODS: readonly ForecastMethod[] = [
  'moving_average',
  'linear_trend',
  'seasonal',
] as const;

export interface ForecastPoint {
  /** Period label — FY ("FY26-27"), month ("2026-04"), or sequence ("P+1"). */
  period: string;
  value: number;
}

export interface FPAForecast {
  forecast_id: string;
  fy: string;
  target: ForecastTarget;
  method: ForecastMethod;
  scope_id: string;
  history: ForecastPoint[];
  projection: ForecastPoint[];
  /** Forecast total vs S120 budget plan baseline (decimal-safe). Optional. */
  vs_budget_variance?: number;
  /** Explainable note: which method + assumptions (NOT a black-box prediction). */
  confidence_note: string;
  created_at: string;
}

/**
 * ML SEAM (DP-D1-5).
 *
 * A future predictive model implements this interface (e.g. ARIMA / Prophet / LSTM)
 * and is passed to `generateFPAForecast({ model })`. The engine then uses the model
 * instead of its built-in heuristics. NO ML library is imported by this engine and
 * no live training happens. This is the seam, not the predictor.
 */
export interface ForecastModelHook {
  name: string;
  predict(history: ForecastPoint[], horizon: number): ForecastPoint[];
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const FORECASTS_KEY = 'erp_fpa_forecasts';

function loadAll(): FPAForecast[] {
  try {
    // [JWT] GET /api/fpa-forecasting/forecasts
    const raw = localStorage.getItem(FORECASTS_KEY);
    return raw ? (JSON.parse(raw) as FPAForecast[]) : [];
  } catch {
    return [];
  }
}

function saveAll(arr: FPAForecast[]): void {
  try {
    // [JWT] PUT /api/fpa-forecasting/forecasts
    localStorage.setItem(FORECASTS_KEY, JSON.stringify(arr));
  } catch {
    /* non-fatal */
  }
}

// ─── Heuristic methods (explainable · decimal-safe) ──────────────────────────

/**
 * Moving-average forecast: each future point is the rolling mean of the last
 * `window` values (history + already-projected). Default window = 3.
 */
export function forecastMovingAverage(
  history: readonly ForecastPoint[],
  horizon: number,
  window = 3,
): ForecastPoint[] {
  if (horizon <= 0) return [];
  const values: number[] = history.map((p) => p.value);
  const out: ForecastPoint[] = [];
  for (let i = 0; i < horizon; i++) {
    const slice = values.slice(Math.max(0, values.length - window));
    const mean = slice.length === 0 ? 0 : round2(dSum(slice) / slice.length);
    out.push({ period: `P+${i + 1}`, value: mean });
    values.push(mean);
  }
  return out;
}

/**
 * Least-squares linear trend forecast. Fits y = slope·x + intercept over the
 * historical indices (0..N-1) and projects N..N+horizon-1.
 */
export function forecastLinearTrend(
  history: readonly ForecastPoint[],
  horizon: number,
): ForecastPoint[] {
  if (horizon <= 0) return [];
  const n = history.length;
  if (n === 0) {
    return Array.from({ length: horizon }, (_, i) => ({ period: `P+${i + 1}`, value: 0 }));
  }
  if (n === 1) {
    const v = round2(history[0].value);
    return Array.from({ length: horizon }, (_, i) => ({ period: `P+${i + 1}`, value: v }));
  }
  // Means
  const xs = history.map((_, i) => i);
  const ys = history.map((p) => p.value);
  const meanX = dSum(xs) / n;
  const meanY = round2(dSum(ys) / n);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = dSub(xs[i], meanX);
    const dy = dSub(ys[i], meanY);
    num = dAdd(num, dMul(dx, dy));
    den = dAdd(den, dMul(dx, dx));
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = dSub(meanY, dMul(slope, meanX));
  const out: ForecastPoint[] = [];
  for (let i = 0; i < horizon; i++) {
    const x = n + i;
    const y = round2(dAdd(intercept, dMul(slope, x)));
    out.push({ period: `P+${i + 1}`, value: y });
  }
  return out;
}

/**
 * Seasonal-index forecast. For period length L (default 4 quarters) builds a
 * seasonal-index per bucket k = mean(history at indices ≡ k) / overall mean,
 * then projects horizon points as overallMean · seasonal_index[(N+i) mod L].
 */
export function forecastSeasonal(
  history: readonly ForecastPoint[],
  horizon: number,
  periodLength = 4,
): ForecastPoint[] {
  if (horizon <= 0) return [];
  const n = history.length;
  if (n === 0) {
    return Array.from({ length: horizon }, (_, i) => ({ period: `P+${i + 1}`, value: 0 }));
  }
  const ys = history.map((p) => p.value);
  const overall = round2(dSum(ys) / n);
  const indices: number[] = [];
  for (let k = 0; k < periodLength; k++) {
    const bucket = ys.filter((_, i) => i % periodLength === k);
    const bucketMean = bucket.length === 0 ? overall : round2(dSum(bucket) / bucket.length);
    indices.push(overall === 0 ? 1 : bucketMean / overall);
  }
  const out: ForecastPoint[] = [];
  for (let i = 0; i < horizon; i++) {
    const k = (n + i) % periodLength;
    const v = round2(dMul(overall, indices[k]));
    out.push({ period: `P+${i + 1}`, value: v });
  }
  return out;
}

function applyHeuristic(
  method: ForecastMethod,
  history: readonly ForecastPoint[],
  horizon: number,
): ForecastPoint[] {
  if (method === 'moving_average') return forecastMovingAverage(history, horizon);
  if (method === 'linear_trend') return forecastLinearTrend(history, horizon);
  return forecastSeasonal(history, horizon);
}

// ─── History sourcing (FR-44 · CALLS the source engines) ─────────────────────

function fyTail(fy: string): number {
  // "FY26-27" → 26; falls back to 0 when unrecognised.
  const m = /FY(\d{2})/.exec(fy);
  return m ? parseInt(m[1], 10) : 0;
}

function makeFY(yearTail: number): string {
  const a = String(yearTail).padStart(2, '0');
  const b = String((yearTail + 1) % 100).padStart(2, '0');
  return `FY${a}-${b}`;
}

function previousFYs(fy: string, count: number): string[] {
  const tail = fyTail(fy);
  const out: string[] = [];
  for (let i = count; i >= 1; i--) {
    out.push(makeFY(tail - i));
  }
  return out;
}

/**
 * Build the revenue/cash history series by CALLING buildConsolidatedPnL once per
 * historical FY. `historyFYs` overrides the default (3 prior FYs).
 *
 * FR-44 reuse: this function is the only path that touches consolidated P&L.
 */
function buildPnLHistory(
  target: 'revenue' | 'cash',
  fy: string,
  historyFYs?: readonly string[],
): ForecastPoint[] {
  const fys: readonly string[] =
    historyFYs && historyFYs.length > 0 ? historyFYs : previousFYs(fy, 3);
  const out: ForecastPoint[] = [];
  for (const f of fys) {
    const pnl: ConsolidatedPnL = buildConsolidatedPnL({ fy: f });
    const value =
      target === 'revenue'
        ? round2(pnl.revenue)
        : round2(dSub(pnl.profit_before_tax, 0)); // cash proxy = PBT (decimal-safe pass-through)
    out.push({ period: f, value });
  }
  return out;
}

/**
 * Build the demand history series by CALLING demand-forecast-engine.listForecasts
 * for the given scope_id (interpreted as the entity code). Each forecast's
 * data_points are flattened into a chronological series.
 */
function buildDemandHistory(scope_id: string): ForecastPoint[] {
  const records: DemandForecastRecord[] = listForecasts(scope_id);
  const points: ForecastPoint[] = [];
  for (const r of records) {
    for (const dp of r.data_points) {
      points.push({ period: dp.period_start, value: round2(dp.forecast_qty) });
    }
  }
  // Stable chronological order by period label.
  points.sort((a, b) => a.period.localeCompare(b.period));
  return points;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface GenerateFPAForecastInput {
  target: ForecastTarget;
  method: ForecastMethod;
  scope_id: string;
  fy: string;
  horizon: number;
  /** Optional override of the historical FY series (revenue/cash only). */
  historyFYs?: readonly string[];
  /** Optional ML model that implements the ForecastModelHook seam (DP-D1-5). */
  model?: ForecastModelHook;
  entity_code?: string;
}

function makeForecastId(input: GenerateFPAForecastInput): string {
  return `FCAST::${input.fy}::${input.target}::${input.method}::${input.scope_id}`;
}

function buildConfidenceNote(
  method: ForecastMethod,
  modelName: string | null,
  historyCount: number,
): string {
  if (modelName) {
    return (
      `Custom ML model '${modelName}' via ForecastModelHook (DP-D1-5 seam · ` +
      `${historyCount} historical points). Explainable: model is pluggable, ` +
      `engine itself remains heuristic-only.`
    );
  }
  if (method === 'moving_average') {
    return (
      `Explainable heuristic: 3-period moving average over ${historyCount} historical ` +
      `points. Assumes near-term mean reversion, no trend. Not ML.`
    );
  }
  if (method === 'linear_trend') {
    return (
      `Explainable heuristic: least-squares linear trend over ${historyCount} historical ` +
      `points (slope · intercept disclosed in projection). Assumes linear continuation. Not ML.`
    );
  }
  return (
    `Explainable heuristic: seasonal index (period length 4) over ${historyCount} historical ` +
    `points. Assumes recurring cycle pattern. Not ML.`
  );
}

/**
 * Generate a forecast for revenue / cash / demand.
 *
 * - History is CALLED from the source engines (FR-44): buildConsolidatedPnL for
 *   revenue/cash, listForecasts for demand.
 * - When `model` is provided it is used (ML SEAM); otherwise the named heuristic
 *   is applied. NO ML library is imported by this engine.
 * - All money math via decimal-helpers.
 * - Emits a `forecast_event` audit entry.
 */
export function generateFPAForecast(input: GenerateFPAForecastInput): FPAForecast {
  if (!input.fy) throw new Error('fpa-forecasting-engine: fy is required');
  if (!FORECAST_TARGETS.includes(input.target)) {
    throw new Error(`fpa-forecasting-engine: invalid target '${input.target}'`);
  }
  if (!FORECAST_METHODS.includes(input.method)) {
    throw new Error(`fpa-forecasting-engine: invalid method '${input.method}'`);
  }
  if (!input.scope_id) {
    throw new Error('fpa-forecasting-engine: scope_id is required');
  }
  const horizon = Math.max(0, Math.floor(input.horizon ?? 0));

  // History (FR-44 · CALLS the source engines)
  const history: ForecastPoint[] =
    input.target === 'demand'
      ? buildDemandHistory(input.scope_id)
      : buildPnLHistory(input.target, input.fy, input.historyFYs);

  // Projection: ML seam if a model is passed, else the named heuristic.
  const projection: ForecastPoint[] = input.model
    ? input.model.predict(history, horizon).map((p) => ({
        period: p.period,
        value: round2(p.value),
      }))
    : applyHeuristic(input.method, history, horizon);

  const forecast_id = makeForecastId(input);
  const now = new Date().toISOString();

  const next: FPAForecast = {
    forecast_id,
    fy: input.fy,
    target: input.target,
    method: input.method,
    scope_id: input.scope_id,
    history,
    projection,
    confidence_note: buildConfidenceNote(
      input.method,
      input.model?.name ?? null,
      history.length,
    ),
    created_at: now,
  };

  const all = loadAll();
  const filtered = all.filter((f) => f.forecast_id !== forecast_id);
  filtered.push(next);
  saveAll(filtered);

  try {
    logAudit({
      entityCode: input.entity_code ?? 'GLOBAL',
      action: 'create',
      entityType: 'forecast_event',
      recordId: forecast_id,
      recordLabel:
        `Forecast · ${input.fy} · ${input.target} · ${input.method} · ${input.scope_id} ` +
        `· horizon=${horizon}`,
      beforeState: null,
      afterState: next as unknown as Record<string, unknown>,
      sourceModule: 'fpa-forecasting-engine',
    });
  } catch {
    /* audit best-effort */
  }

  return next;
}

export interface ForecastVsBudgetInput {
  fy: string;
  scope_id: string;
  target: ForecastTarget;
}

export interface ForecastVsBudgetResult {
  forecast_total: number;
  budget_total: number;
  variance: number;
}

/**
 * Compare the most-recent forecast projection total against the S120 plan baseline
 * (sum of total_budgeted across matching FPABudgets for the FY and scope).
 *
 * FR-44 reuse: calls fpa-budgeting-engine.listBudgets (READ · 0-DIFF).
 */
export function getForecastVsBudget(input: ForecastVsBudgetInput): ForecastVsBudgetResult {
  const all = loadAll();
  const matches = all.filter(
    (f) => f.fy === input.fy && f.target === input.target && f.scope_id === input.scope_id,
  );
  // Most-recent forecast by created_at.
  matches.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const latest = matches[0];
  const forecast_total = latest
    ? round2(dSum(latest.projection, (p) => p.value))
    : 0;

  const budgets: FPABudget[] = listBudgets({ fy: input.fy, scope_id: input.scope_id });
  const budget_total = round2(dSum(budgets, (b) => b.total_budgeted));
  const variance = round2(dSub(forecast_total, budget_total));

  // Persist the variance on the latest forecast so the page renders straight.
  if (latest) {
    latest.vs_budget_variance = variance;
    const rest = all.filter((f) => f.forecast_id !== latest.forecast_id);
    rest.push(latest);
    saveAll(rest);
  }

  try {
    logAudit({
      entityCode: 'GLOBAL',
      action: 'view',
      entityType: 'forecast_event',
      recordId: latest?.forecast_id ?? `FCAST::${input.fy}::${input.target}::${input.scope_id}`,
      recordLabel:
        `Forecast-vs-Budget · ${input.fy} · ${input.target} · ${input.scope_id} ` +
        `· forecast=${forecast_total} · budget=${budget_total} · variance=${variance}`,
      beforeState: null,
      afterState: { forecast_total, budget_total, variance },
      sourceModule: 'fpa-forecasting-engine',
    });
  } catch {
    /* audit best-effort */
  }

  return { forecast_total, budget_total, variance };
}

export function listFPAForecasts(filter?: Partial<FPAForecast>): FPAForecast[] {
  const all = loadAll();
  if (!filter) return all;
  return all.filter((f) => {
    const entries = Object.entries(filter) as [keyof FPAForecast, unknown][];
    return entries.every(([k, v]) => v === undefined || f[k] === v);
  });
}

/** Test-only reset of the forecasts store. */
export function __resetFPAForecastingForTests(): void {
  try {
    localStorage.removeItem(FORECASTS_KEY);
  } catch {
    /* non-fatal */
  }
}
