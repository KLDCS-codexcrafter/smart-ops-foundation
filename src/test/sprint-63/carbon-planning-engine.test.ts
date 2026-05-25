/**
 * Sprint 63 PROD-5 · carbon-planning-engine smoke tests · 39th SIBLING.
 */
import { describe, it, expect } from 'vitest';
import {
  computeCarbonFootprintForOrder,
  rankAlternativesByCarbonIntensity,
  forecastCarbonForSchedule,
  optimizeShiftForLowCarbonGridSlot,
  getGridIntensityForHour,
  seedGridEmissionFactor,
  listCarbonFootprints,
  getCarbonTrendByMonth,
} from '@/lib/carbon-planning-engine';
import { INDIA_GRID_BASELINE_KG_PER_KWH } from '@/types/carbon-planning';

const E = 'TEST63';

describe('carbon-planning-engine · 8 functions smoke', () => {
  it('computeCarbonFootprintForOrder returns positive total and deterministic by id', () => {
    const a = computeCarbonFootprintForOrder(E, 'PO-X1');
    const b = computeCarbonFootprintForOrder(E, 'PO-X1');
    expect(a.total_kg_co2).toBeGreaterThan(0);
    expect(a.source_type).toBe('production_order');
    expect(a.total_kg_co2).toBe(b.total_kg_co2);
  });

  it('rankAlternativesByCarbonIntensity orders ascending and assigns rank 1..N', () => {
    const r = rankAlternativesByCarbonIntensity(E, ['A', 'B', 'C', 'D']);
    expect(r).toHaveLength(4);
    expect(r[0].rank).toBe(1);
    for (let i = 1; i < r.length; i++) {
      expect(r[i].intensityKg).toBeGreaterThanOrEqual(r[i - 1].intensityKg);
    }
  });

  it('forecastCarbonForSchedule sums perDay to totalKg (within rounding)', () => {
    const f = forecastCarbonForSchedule(E, '2026-06-01', '2026-06-05');
    expect(f.perDay).toHaveLength(5);
    const sum = f.perDay.reduce((s, d) => s + d.kg, 0);
    expect(Math.abs(sum - f.totalKg)).toBeLessThan(1);
  });

  it('optimizeShiftForLowCarbonGridSlot picks slot with lowest intensity', () => {
    const slots = ['02:00-06:00', '18:00-22:00'];
    const out = optimizeShiftForLowCarbonGridSlot(E, 'PO-OPT', slots);
    expect(slots).toContain(out.recommendedSlot);
    expect(out.savingsVsWorst).toBeGreaterThanOrEqual(0);
  });

  it('getGridIntensityForHour stays in 0.65..0.95 range', () => {
    for (let h = 0; h < 24; h++) {
      const v = getGridIntensityForHour(E, h, 'weekday');
      expect(v).toBeGreaterThanOrEqual(0.65);
      expect(v).toBeLessThanOrEqual(0.95);
    }
  });

  it('seedGridEmissionFactor returns CEA-2024 baseline', () => {
    const g = seedGridEmissionFactor(E, 'IN-Mumbai');
    expect(g.baseline_kg_per_kwh).toBe(INDIA_GRID_BASELINE_KG_PER_KWH);
    expect(g.source).toBe('CEA-2024');
  });

  it('listCarbonFootprints is entity-scoped and returns an array', () => {
    const list = listCarbonFootprints(E);
    expect(Array.isArray(list)).toBe(true);
  });

  it('getCarbonTrendByMonth returns N months', () => {
    const t = getCarbonTrendByMonth(E, 6);
    expect(t).toHaveLength(6);
    expect(t[0]).toHaveProperty('month');
    expect(t[0]).toHaveProperty('totalKg');
  });
});
