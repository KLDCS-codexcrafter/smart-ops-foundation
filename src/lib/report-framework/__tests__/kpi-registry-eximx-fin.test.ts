/**
 * @file kpi-registry-eximx-fin.test.ts
 * @sprint RPT-2b-ii · KPI registry seeds for EximX finance/realisation registers
 */
import { describe, it, expect } from 'vitest';
import { getKpi, listKpis } from '../kpi-registry';

const RPT2BII_IDS = [
  'ex-realisation',
  'ex-fema-270',
  'ex-packing-credit',
  'ex-hedge',
  'ex-git',
  'ex-rootar',
] as const;

describe('RPT-2b-ii · EximX finance KPI registry seeds', () => {
  it('registers all 6 EximX finance KPI ids', () => {
    for (const id of RPT2BII_IDS) {
      expect(getKpi(id)).toBeDefined();
    }
  });
  it('every seed exposes a defaultChart with xKey + series', () => {
    for (const id of RPT2BII_IDS) {
      const k = getKpi(id);
      expect(k?.defaultChart.xKey).toBeTruthy();
      expect(Array.isArray(k?.defaultChart.series)).toBe(true);
      expect((k?.defaultChart.series.length ?? 0)).toBeGreaterThan(0);
    }
  });
  it('listKpis contains the 6 EximX finance ids', () => {
    const ids = new Set(listKpis().map(k => k.id));
    for (const id of RPT2BII_IDS) expect(ids.has(id)).toBe(true);
  });
  it('re-import is idempotent (no duplicates)', async () => {
    const before = listKpis().length;
    await import('../kpi-registry');
    expect(listKpis().length).toBe(before);
  });
});
