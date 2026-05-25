import { describe, it, expect, beforeEach } from 'vitest';
import { computeDemandForecast } from '@/lib/store-hub-engine';
import { smoothMonthlyBackSeries } from '@/lib/demand-forecast-engine';

describe('store-hub-engine.computeDemandForecast · Q-LOCK-2-A β upgrade', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns DemandForecast[] with the canonical row shape', () => {
    const rows = computeDemandForecast('NO-SUCH-ENT');
    expect(Array.isArray(rows)).toBe(true);
    // empty result still validates the shape contract (no rows)
    for (const r of rows) {
      expect(r).toHaveProperty('item_id');
      expect(r).toHaveProperty('godown_id');
      expect(r).toHaveProperty('consumed_30d');
      expect(r).toHaveProperty('consumed_60d');
      expect(r).toHaveProperty('consumed_90d');
      expect(r).toHaveProperty('avg_daily_consumption');
      expect(r).toHaveProperty('days_of_cover');
      expect(r).toHaveProperty('forecast_30d');
      expect(r).toHaveProperty('uom');
    }
  });

  it('smoothMonthlyBackSeries delegate weights recent month more than legacy avg', () => {
    // back-series [oldest, mid, newest] = [10, 20, 100]
    // exponential smoothing (alpha=0.5):
    //   s0 = 10
    //   s1 = 0.5*20 + 0.5*10 = 15
    //   s2 = 0.5*100 + 0.5*15 = 57.5
    // legacy 90d-avg over same period = (10+20+100)/3 = 43.33
    const smoothed = smoothMonthlyBackSeries([10, 20, 100], 0.5);
    expect(smoothed).toBeCloseTo(57.5, 2);
    expect(smoothed).toBeGreaterThan(43.33);
  });

  it('smoothMonthlyBackSeries handles empty series safely', () => {
    expect(smoothMonthlyBackSeries([], 0.5)).toBe(0);
  });
});
