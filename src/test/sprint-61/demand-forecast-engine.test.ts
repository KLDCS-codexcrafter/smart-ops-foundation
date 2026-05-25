import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateForecast,
  persistForecast,
  listForecasts,
  getForecast,
  computeForecastAccuracy,
} from '@/lib/demand-forecast-engine';
import { demandForecastsKey } from '@/types/forecast';

describe('demand-forecast-engine · 37th SIBLING', () => {
  beforeEach(() => {
    localStorage.removeItem(demandForecastsKey('TEST-ENT'));
  });

  it('generateForecast with exponential_smoothing produces 3 points for 3m horizon', () => {
    const record = generateForecast({
      entity_id: 'TEST-ENT',
      item_id: 'ITM-001',
      item_name: 'Test Item',
      horizon: '3m',
      algorithm: 'exponential_smoothing',
      sales_history_monthly: [100, 110, 120, 115, 130, 140, 150, 145, 160, 170, 165, 180],
      distributor_history_monthly: [50, 55, 60, 58, 65, 70, 75, 72, 80, 85, 82, 90],
      production_history_monthly: [80, 85, 90, 88, 95, 100, 105, 103, 110, 115, 113, 120],
      user: { id: 'u1', name: 'User' },
    });
    expect(record.data_points.length).toBe(3);
    expect(record.algorithm).toBe('exponential_smoothing');
    expect(record.metadata.history_sample_count).toBe(12);
  });

  it('generateForecast for 12m horizon produces 12 data points', () => {
    const record = generateForecast({
      entity_id: 'TEST-ENT',
      item_id: 'ITM-002',
      item_name: 'Item 2',
      horizon: '12m',
      algorithm: 'linear_regression',
      sales_history_monthly: Array(24).fill(100),
      distributor_history_monthly: Array(24).fill(50),
      production_history_monthly: Array(24).fill(30),
      user: { id: 'u1', name: 'User' },
    });
    expect(record.data_points.length).toBe(12);
  });

  it('invalid weights throw error', () => {
    expect(() =>
      generateForecast({
        entity_id: 'TEST-ENT',
        item_id: 'X',
        item_name: 'X',
        horizon: '1m',
        algorithm: 'simple_moving_average',
        input_weights: { sales: 0.5, distributor: 0.5, production: 0.5 },
        sales_history_monthly: [1, 2, 3],
        distributor_history_monthly: [1, 2, 3],
        production_history_monthly: [1, 2, 3],
        user: { id: 'u1', name: 'User' },
      }),
    ).toThrow(/sum to 1.0/);
  });

  it('persistForecast + listForecasts round-trips', () => {
    const record = generateForecast({
      entity_id: 'TEST-ENT',
      item_id: 'ITM-003',
      item_name: 'Item 3',
      horizon: '6m',
      algorithm: 'holt_linear_trend',
      sales_history_monthly: [100, 110, 120],
      distributor_history_monthly: [50, 55, 60],
      production_history_monthly: [30, 33, 36],
      user: { id: 'u1', name: 'User' },
    });
    persistForecast(record);
    const all = listForecasts('TEST-ENT');
    expect(all.length).toBe(1);
    expect(all[0].item_id).toBe('ITM-003');
  });

  it('getForecast retrieves by id', () => {
    const record = generateForecast({
      entity_id: 'TEST-ENT', item_id: 'ITM-004', item_name: 'I4',
      horizon: '1m', algorithm: 'simple_moving_average',
      sales_history_monthly: [50], distributor_history_monthly: [25], production_history_monthly: [15],
      user: { id: 'u1', name: 'User' },
    });
    persistForecast(record);
    const found = getForecast('TEST-ENT', record.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(record.id);
  });

  it('Diwali multiplier applies to FMCG-sweets 12m forecast', () => {
    const record = generateForecast({
      entity_id: 'TEST-ENT',
      item_id: 'ITM-005',
      item_name: 'Diwali Sweet',
      item_category: 'FMCG-sweets',
      horizon: '12m',
      algorithm: 'simple_moving_average',
      sales_history_monthly: Array(12).fill(100),
      distributor_history_monthly: Array(12).fill(50),
      production_history_monthly: Array(12).fill(30),
      user: { id: 'u1', name: 'User' },
    });
    const adjustedPoints = record.data_points.filter(p => p.holiday_adjusted);
    expect(adjustedPoints.length).toBeGreaterThanOrEqual(1);
  });

  it('seasonality detection fires when variance/mean > 0.2', () => {
    const seasonal = [10, 100, 10, 100, 10, 100, 10, 100, 10, 100, 10, 100];
    const record = generateForecast({
      entity_id: 'TEST-ENT', item_id: 'ITM-006', item_name: 'I6',
      horizon: '1m', algorithm: 'simple_moving_average',
      sales_history_monthly: seasonal,
      distributor_history_monthly: Array(12).fill(0),
      production_history_monthly: Array(12).fill(0),
      user: { id: 'u1', name: 'User' },
    });
    expect(record.metadata.seasonality_detected).toBe(true);
  });

  it('computeForecastAccuracy computes MAPE for matching periods', () => {
    const record = generateForecast({
      entity_id: 'TEST-ENT', item_id: 'ITM-007', item_name: 'I7',
      horizon: '3m', algorithm: 'simple_moving_average',
      sales_history_monthly: [100, 100, 100],
      distributor_history_monthly: [50, 50, 50],
      production_history_monthly: [30, 30, 30],
      user: { id: 'u1', name: 'User' },
    });
    persistForecast(record);
    const actuals = record.data_points.map((p, i) => ({
      period_start: p.period_start,
      actual_qty: p.forecast_qty + (i === 0 ? 10 : 0),
    }));
    const accuracyRecords = computeForecastAccuracy('TEST-ENT', record.id, actuals);
    expect(accuracyRecords.length).toBe(3);
    expect(accuracyRecords[0].bias).toBe(-10);
  });
});
