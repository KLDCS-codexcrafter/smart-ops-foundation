/**
 * @file        src/lib/demand-forecast-engine.ts
 * @sprint      T-Phase-3.PROD-4 · PASS 1 · ST3 · 37th SIBLING ⭐
 * @purpose     AI-driven demand forecasting · 3-source ensemble (sales · distributor · production history)
 *              · exponential smoothing + Holt linear trend + linear regression
 *              · Indian holiday calendar adjustment · multi-horizon (1m/3m/6m/12m).
 * @disciplines FR-19 SIBLING (single-source: demand forecasting) · FR-26 entity-scoped keys
 * @reuses      types/forecast.ts · indian-holiday-calendar.ts
 * @[JWT]       Phase 2: POST /api/forecast/generate · GET /api/forecast/list
 */

import type {
  DemandForecastRecord,
  DemandForecastPoint,
  ForecastAccuracyRecord,
  ForecastHorizon,
  ForecastAlgorithm,
  ForecastInputWeights,
} from '@/types/forecast';
import {
  demandForecastsKey,
  forecastAccuracyKey,
} from '@/types/forecast';
import { getDemandMultiplier, getHolidaysInRange } from './indian-holiday-calendar';

// ============================================================================
// PRIVATE HELPERS · localStorage I/O (FR-26 entity-scoped)
// ============================================================================

const lsRead = <T>(key: string, def: T): T => {
  try {
    // [JWT] GET /api/forecast/{key}
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : def;
  } catch {
    return def;
  }
};

const lsWrite = <T>(key: string, value: T): void => {
  try {
    // [JWT] POST /api/forecast/{key}
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // silent · localStorage quota or SSR safety
  }
};

// ============================================================================
// FORECAST INPUT WEIGHTS · default + validation
// ============================================================================

const DEFAULT_WEIGHTS: ForecastInputWeights = {
  sales: 0.6,
  distributor: 0.3,
  production: 0.1,
};

function validateWeights(w: ForecastInputWeights): boolean {
  const sum = w.sales + w.distributor + w.production;
  return Math.abs(sum - 1.0) < 0.001;
}

// ============================================================================
// ALGORITHMS
// ============================================================================

function simpleMovingAverage(values: number[], window: number): number {
  if (values.length === 0) return 0;
  const slice = values.slice(-window);
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}

function exponentialSmoothing(values: number[], alpha: number = 0.3): number[] {
  if (values.length === 0) return [];
  const smoothed: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    smoothed.push(alpha * values[i] + (1 - alpha) * smoothed[i - 1]);
  }
  return smoothed;
}

function holtLinearTrend(
  values: number[],
  alpha: number = 0.3,
  beta: number = 0.1,
): { level: number[]; trend: number[] } {
  if (values.length === 0) return { level: [], trend: [] };
  const level: number[] = [values[0]];
  const trend: number[] = [values.length > 1 ? values[1] - values[0] : 0];
  for (let i = 1; i < values.length; i++) {
    const newLevel = alpha * values[i] + (1 - alpha) * (level[i - 1] + trend[i - 1]);
    const newTrend = beta * (newLevel - level[i - 1]) + (1 - beta) * trend[i - 1];
    level.push(newLevel);
    trend.push(newTrend);
  }
  return { level, trend };
}

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] };
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((s, v) => s + v, 0);
  const sumXY = values.reduce((s, v, i) => s + i * v, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// ============================================================================
// HOLIDAY ADJUSTMENT
// ============================================================================

function applyHolidayAdjustment(
  points: DemandForecastPoint[],
  itemCategory?: string,
): { points: DemandForecastPoint[]; adjustmentsApplied: number } {
  let adjustments = 0;
  const adjusted = points.map(p => {
    const holidays = getHolidaysInRange(p.period_start, p.period_end);
    if (holidays.length === 0) return p;
    let multiplier = 1.0;
    for (const h of holidays) {
      multiplier *= getDemandMultiplier(h.date, itemCategory);
    }
    if (multiplier !== 1.0) adjustments++;
    return {
      ...p,
      forecast_qty: Math.round(p.forecast_qty * multiplier),
      lower_bound_95: Math.round(p.lower_bound_95 * multiplier),
      upper_bound_95: Math.round(p.upper_bound_95 * multiplier),
      holiday_adjusted: multiplier !== 1.0,
    };
  });
  return { points: adjusted, adjustmentsApplied: adjustments };
}

// ============================================================================
// PUBLIC API · generation
// ============================================================================

export interface GenerateForecastInput {
  entity_id: string;
  item_id: string;
  item_name: string;
  godown_id?: string;
  item_category?: string;
  horizon: ForecastHorizon;
  algorithm: ForecastAlgorithm;
  input_weights?: ForecastInputWeights;
  history_window_days?: number;
  sales_history_monthly: number[];
  distributor_history_monthly: number[];
  production_history_monthly: number[];
  user: { id: string; name: string };
}

function horizonToMonths(h: ForecastHorizon): number {
  switch (h) {
    case '1m': return 1;
    case '3m': return 3;
    case '6m': return 6;
    case '12m': return 12;
  }
}

/**
 * Generates a demand forecast for an item across the given horizon.
 */
export function generateForecast(input: GenerateForecastInput): DemandForecastRecord {
  const weights = input.input_weights ?? DEFAULT_WEIGHTS;
  if (!validateWeights(weights)) {
    throw new Error(
      `ForecastInputWeights must sum to 1.0 (got ${weights.sales + weights.distributor + weights.production})`,
    );
  }

  const maxLen = Math.max(
    input.sales_history_monthly.length,
    input.distributor_history_monthly.length,
    input.production_history_monthly.length,
  );
  const ensemble: number[] = [];
  for (let i = 0; i < maxLen; i++) {
    const s = input.sales_history_monthly[i] ?? 0;
    const d = input.distributor_history_monthly[i] ?? 0;
    const p = input.production_history_monthly[i] ?? 0;
    ensemble.push(weights.sales * s + weights.distributor * d + weights.production * p);
  }

  const horizonMonths = horizonToMonths(input.horizon);

  let baseForecastValues: number[] = [];
  if (input.algorithm === 'simple_moving_average') {
    const avg = simpleMovingAverage(ensemble, Math.min(6, ensemble.length));
    baseForecastValues = Array(horizonMonths).fill(avg);
  } else if (input.algorithm === 'exponential_smoothing') {
    const smoothed = exponentialSmoothing(ensemble, 0.3);
    const lastSmoothed = smoothed[smoothed.length - 1] ?? 0;
    baseForecastValues = Array(horizonMonths).fill(lastSmoothed);
  } else if (input.algorithm === 'holt_linear_trend') {
    const { level, trend } = holtLinearTrend(ensemble);
    const lastLevel = level[level.length - 1] ?? 0;
    const lastTrend = trend[trend.length - 1] ?? 0;
    for (let h = 1; h <= horizonMonths; h++) {
      baseForecastValues.push(Math.max(0, lastLevel + lastTrend * h));
    }
  } else if (input.algorithm === 'linear_regression') {
    const { slope, intercept } = linearRegression(ensemble);
    for (let h = 0; h < horizonMonths; h++) {
      baseForecastValues.push(Math.max(0, intercept + slope * (ensemble.length + h)));
    }
  } else {
    // holt_winters_seasonal · fallback to Holt linear (full seasonal deferred to Sprint 65+)
    const { level, trend } = holtLinearTrend(ensemble);
    const lastLevel = level[level.length - 1] ?? 0;
    const lastTrend = trend[trend.length - 1] ?? 0;
    for (let h = 1; h <= horizonMonths; h++) {
      baseForecastValues.push(Math.max(0, lastLevel + lastTrend * h));
    }
  }

  const startDate = new Date();
  const points: DemandForecastPoint[] = baseForecastValues.map((v, idx) => {
    const periodStart = new Date(startDate);
    periodStart.setMonth(periodStart.getMonth() + idx);
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    periodEnd.setDate(periodEnd.getDate() - 1);
    return {
      period_start: periodStart.toISOString().slice(0, 10),
      period_end: periodEnd.toISOString().slice(0, 10),
      forecast_qty: Math.round(v),
      lower_bound_95: Math.round(v * 0.75),
      upper_bound_95: Math.round(v * 1.25),
      holiday_adjusted: false,
    };
  });

  const adjusted = applyHolidayAdjustment(points, input.item_category);

  let seasonalityDetected = false;
  if (ensemble.length >= 12) {
    const last12 = ensemble.slice(-12);
    const mean = last12.reduce((s, v) => s + v, 0) / 12;
    const variance = last12.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / 12;
    seasonalityDetected = mean > 0 && Math.sqrt(variance) / mean > 0.2;
  }

  return {
    id: `df-${input.entity_id}-${input.item_id}-${Date.now()}`,
    entity_id: input.entity_id,
    item_id: input.item_id,
    item_name: input.item_name,
    godown_id: input.godown_id ?? null,
    horizon: input.horizon,
    algorithm: input.algorithm,
    generated_at: new Date().toISOString(),
    generated_by: input.user.id,
    input_weights: weights,
    history_window_days: input.history_window_days ?? 365,
    data_points: adjusted.points,
    metadata: {
      history_sample_count: ensemble.length,
      seasonality_detected: seasonalityDetected,
      holiday_adjustments_applied: adjusted.adjustmentsApplied,
    },
  };
}

// ============================================================================
// PUBLIC API · persistence
// ============================================================================

export function persistForecast(record: DemandForecastRecord): void {
  const existing = lsRead<DemandForecastRecord[]>(demandForecastsKey(record.entity_id), []);
  existing.push(record);
  lsWrite(demandForecastsKey(record.entity_id), existing);
}

export function listForecasts(entityCode: string): DemandForecastRecord[] {
  return lsRead<DemandForecastRecord[]>(demandForecastsKey(entityCode), []);
}

export function getForecast(entityCode: string, forecastId: string): DemandForecastRecord | null {
  return listForecasts(entityCode).find(f => f.id === forecastId) ?? null;
}

export function getHistoricalForecasts(
  entityCode: string,
  itemId: string,
  horizonMonths: number,
): DemandForecastRecord[] {
  return listForecasts(entityCode)
    .filter(f => f.item_id === itemId)
    .filter(f => horizonToMonths(f.horizon) === horizonMonths)
    .sort((a, b) => b.generated_at.localeCompare(a.generated_at));
}

// ============================================================================
// PUBLIC API · accuracy tracking
// ============================================================================

export function computeForecastAccuracy(
  entityCode: string,
  forecastId: string,
  actuals: { period_start: string; actual_qty: number }[],
): ForecastAccuracyRecord[] {
  const forecast = getForecast(entityCode, forecastId);
  if (!forecast) return [];
  const records: ForecastAccuracyRecord[] = [];
  for (const point of forecast.data_points) {
    const actual = actuals.find(a => a.period_start === point.period_start);
    if (!actual) continue;
    const error = point.forecast_qty - actual.actual_qty;
    const mape = actual.actual_qty === 0 ? 0 : Math.abs(error / actual.actual_qty) * 100;
    records.push({
      id: `fa-${forecastId}-${point.period_start}`,
      entity_id: entityCode,
      forecast_id: forecastId,
      item_id: forecast.item_id,
      period_start: point.period_start,
      period_end: point.period_end,
      forecasted_qty: point.forecast_qty,
      actual_qty: actual.actual_qty,
      mape_pct: Math.round(mape * 100) / 100,
      mae: Math.abs(error),
      bias: error,
      computed_at: new Date().toISOString(),
    });
  }
  return records;
}

export function persistForecastAccuracy(record: ForecastAccuracyRecord): void {
  const existing = lsRead<ForecastAccuracyRecord[]>(forecastAccuracyKey(record.entity_id), []);
  existing.push(record);
  lsWrite(forecastAccuracyKey(record.entity_id), existing);
}

export function listForecastAccuracy(
  entityCode: string,
  itemId?: string,
): ForecastAccuracyRecord[] {
  const all = lsRead<ForecastAccuracyRecord[]>(forecastAccuracyKey(entityCode), []);
  return itemId ? all.filter(r => r.item_id === itemId) : all;
}

// ============================================================================
// PUBLIC API · store-hub-engine compatibility (Q-LOCK-2-A Option β)
// ============================================================================

export interface LegacyDemandForecastRow {
  item_id: string;
  item_name: string;
  godown_id: string;
  consumed_30d: number;
  consumed_60d: number;
  consumed_90d: number;
  avg_daily_consumption: number;
  days_of_cover: number | null;
  forecast_30d: number;
  uom: string;
}

/**
 * Exponential-smoothing forecast for a 3-month monthly back-series (oldest → newest).
 * Adapter used by store-hub-engine.computeDemandForecast (Q-LOCK-2-A β).
 * Returns the smoothed forward-month demand estimate.
 */
export function smoothMonthlyBackSeries(monthlySeries: number[], alpha: number = 0.5): number {
  if (monthlySeries.length === 0) return 0;
  let smoothed = monthlySeries[0];
  for (let i = 1; i < monthlySeries.length; i++) {
    smoothed = alpha * monthlySeries[i] + (1 - alpha) * smoothed;
  }
  return smoothed;
}
