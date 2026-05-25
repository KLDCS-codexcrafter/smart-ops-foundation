/**
 * @file        src/types/forecast.ts
 * @purpose     Type definitions + entity-scoped storage keys for demand-forecast-engine (37th SIBLING)
 * @sprint      T-Phase-3.PROD-4 · PASS 1 · ST1 (37th SIBLING type companion)
 * @disciplines FR-19 SIBLING (single-source: demand forecast types) · FR-26 entity-scoped keys
 * @reuses      Pattern from Sprint 60 SIBLINGs (process-batch.ts · recipe.ts · spc.ts · process-genealogy.ts · tank-flow.ts)
 * @[JWT]       Phase 2: types pass through API layer as DTOs
 */

// ============================================================================
// STORAGE KEYS · entity-scoped per FR-26
// ============================================================================

export const demandForecastsKey = (entityCode: string): string =>
  `operix:${entityCode}:demand_forecasts:v1`;

export const forecastAccuracyKey = (entityCode: string): string =>
  `operix:${entityCode}:forecast_accuracy:v1`;

export const machinePredictionsKey = (entityCode: string): string =>
  `operix:${entityCode}:machine_predictions:v1`;

// ============================================================================
// DEMAND FORECAST TYPES
// ============================================================================

export type ForecastHorizon = '1m' | '3m' | '6m' | '12m';

export type ForecastAlgorithm =
  | 'simple_moving_average'
  | 'exponential_smoothing'
  | 'holt_linear_trend'
  | 'holt_winters_seasonal'
  | 'linear_regression';

export type ForecastSource = 'sales' | 'distributor' | 'production_history';

export interface ForecastInputWeights {
  sales: number;        // 0-1 · default 0.6
  distributor: number;  // 0-1 · default 0.3
  production: number;   // 0-1 · default 0.1
  // sum must equal 1.0
}

export interface DemandForecastPoint {
  period_start: string;  // ISO date · start of monthly bucket
  period_end: string;
  forecast_qty: number;
  lower_bound_95: number;
  upper_bound_95: number;
  holiday_adjusted: boolean;
}

export interface DemandForecastRecord {
  id: string;
  entity_id: string;
  item_id: string;
  item_name: string;
  godown_id: string | null;
  horizon: ForecastHorizon;
  algorithm: ForecastAlgorithm;
  generated_at: string;     // ISO timestamp
  generated_by: string;     // user id or 'system'
  input_weights: ForecastInputWeights;
  history_window_days: number;  // typically 365
  data_points: DemandForecastPoint[];
  metadata: {
    history_sample_count: number;
    seasonality_detected: boolean;
    holiday_adjustments_applied: number;
    notes?: string;
  };
}

// ============================================================================
// FORECAST ACCURACY TRACKING · MAPE · MAE · bias
// ============================================================================

export interface ForecastAccuracyRecord {
  id: string;
  entity_id: string;
  forecast_id: string;     // references DemandForecastRecord.id
  item_id: string;
  period_start: string;
  period_end: string;
  forecasted_qty: number;
  actual_qty: number;
  mape_pct: number;
  mae: number;
  bias: number;
  computed_at: string;
}

// ============================================================================
// HOLIDAY CALENDAR
// ============================================================================

export interface HolidayEntry {
  date: string;            // ISO date YYYY-MM-DD
  name: string;
  scope: 'national' | 'regional';
  region_code?: string;
  demand_multiplier: number;
  category_overrides?: {
    [item_category: string]: number;
  };
}
