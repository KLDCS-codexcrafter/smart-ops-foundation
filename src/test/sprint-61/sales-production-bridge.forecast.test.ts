import { describe, it, expect, beforeEach } from 'vitest';
import {
  feedForecastIntoProductionPlanDraft,
  getForecastDrivenDemand,
} from '@/lib/sales-production-bridge';
import {
  generateForecast,
  persistForecast,
} from '@/lib/demand-forecast-engine';
import { demandForecastsKey } from '@/types/forecast';

describe('sales-production-bridge · forecast extensions', () => {
  beforeEach(() => {
    localStorage.removeItem(demandForecastsKey('TEST-FCST'));
  });

  it('feedForecastIntoProductionPlanDraft returns plan_id + line_count', () => {
    const f = generateForecast({
      entity_id: 'TEST-FCST', item_id: 'ITM-1', item_name: 'Item 1',
      horizon: '6m', algorithm: 'simple_moving_average',
      sales_history_monthly: [100, 100, 100],
      distributor_history_monthly: [50, 50, 50],
      production_history_monthly: [30, 30, 30],
      user: { id: 'u', name: 'U' },
    });
    persistForecast(f);
    const result = feedForecastIntoProductionPlanDraft({
      forecast_id: f.id,
      entity_code: 'TEST-FCST',
      planning_horizon_months: 3,
      user: { id: 'u', name: 'U' },
    });
    expect(result.plan_id).toMatch(/^pp-fcst-/);
    expect(result.line_count).toBe(3);
    expect(result.warnings).toEqual([]);
  });

  it('feedForecastIntoProductionPlanDraft throws when forecast missing', () => {
    expect(() =>
      feedForecastIntoProductionPlanDraft({
        forecast_id: 'nope',
        entity_code: 'TEST-FCST',
        planning_horizon_months: 1,
        user: { id: 'u', name: 'U' },
      }),
    ).toThrow(/not found/);
  });

  it('getForecastDrivenDemand returns 0 when no forecast exists', () => {
    expect(getForecastDrivenDemand('TEST-FCST', 'unknown', 3)).toBe(0);
  });

  it('getForecastDrivenDemand sums forecast_qty across horizon', () => {
    const f = generateForecast({
      entity_id: 'TEST-FCST', item_id: 'ITM-2', item_name: 'Item 2',
      horizon: '6m', algorithm: 'simple_moving_average',
      sales_history_monthly: Array(6).fill(100),
      distributor_history_monthly: Array(6).fill(50),
      production_history_monthly: Array(6).fill(30),
      user: { id: 'u', name: 'U' },
    });
    persistForecast(f);
    const total = getForecastDrivenDemand('TEST-FCST', 'ITM-2', 3);
    expect(total).toBeGreaterThan(0);
    // Sum of first 3 forecast points
    const expected = f.data_points.slice(0, 3).reduce((s, p) => s + p.forecast_qty, 0);
    expect(total).toBe(expected);
  });
});
