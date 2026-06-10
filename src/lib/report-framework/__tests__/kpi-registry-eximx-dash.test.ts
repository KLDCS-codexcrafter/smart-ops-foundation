/**
 * @file        kpi-registry-eximx-dash.test.ts
 * @sprint      RPT-2b-iii · KPI registry seeds for EximX dashboard cohort 1
 */
import { describe, it, expect } from 'vitest';
import { getKpi, listKpis } from '../kpi-registry';

const RPT2BIII_IDS = [
  'ex-cross-realisation',
  'ex-form3ceb',
  'ex-landed-cost',
  'ex-aeo',
  'ex-ebrc',
  'ex-monthend-reval',
] as const;

describe('RPT-2b-iii · EximX dashboard cohort-1 KPI seeds', () => {
  it('registers all 6 EximX dashboard KPI ids', () => {
    for (const id of RPT2BIII_IDS) expect(getKpi(id)).toBeDefined();
  });
  it('every seed exposes a defaultChart with xKey + series', () => {
    for (const id of RPT2BIII_IDS) {
      const k = getKpi(id);
      expect(k?.defaultChart.xKey).toBeTruthy();
      expect(Array.isArray(k?.defaultChart.series)).toBe(true);
      expect((k?.defaultChart.series.length ?? 0)).toBeGreaterThan(0);
    }
  });
  it('every seed carries thresholds (RAG-aware)', () => {
    for (const id of RPT2BIII_IDS) {
      const k = getKpi(id);
      expect(k?.thresholds).toBeDefined();
      expect(k?.thresholds?.direction).toBe('higher-good');
    }
  });
  it('listKpis contains the 6 EximX dashboard ids', () => {
    const ids = new Set(listKpis().map((k) => k.id));
    for (const id of RPT2BIII_IDS) expect(ids.has(id)).toBe(true);
  });
  it('re-import is idempotent (no duplicates)', async () => {
    const before = listKpis().length;
    await import('../kpi-registry');
    expect(listKpis().length).toBe(before);
  });
});
