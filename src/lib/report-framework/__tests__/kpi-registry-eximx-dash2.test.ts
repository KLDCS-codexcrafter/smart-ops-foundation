/**
 * @file        kpi-registry-eximx-dash2.test.ts
 * @sprint      RPT-2b-iv · KPI registry seeds for EximX dashboards close (cohort 2)
 */
import { describe, it, expect } from 'vitest';
import { getKpi, listKpis } from '../kpi-registry';

const RPT2BIV_IDS = [
  'ex-ews',
  'ex-buyer-reliability',
  'ex-vendor-score',
  'ex-coo-legal',
  'ex-rms',
] as const;

describe('RPT-2b-iv · EximX dashboard cohort-2 KPI seeds', () => {
  it('registers all 5 EximX dashboard KPI ids', () => {
    for (const id of RPT2BIV_IDS) expect(getKpi(id)).toBeDefined();
  });
  it('every seed exposes a defaultChart with xKey + series', () => {
    for (const id of RPT2BIV_IDS) {
      const k = getKpi(id);
      expect(k?.defaultChart.xKey).toBeTruthy();
      expect(Array.isArray(k?.defaultChart.series)).toBe(true);
      expect((k?.defaultChart.series.length ?? 0)).toBeGreaterThan(0);
    }
  });
  it('every seed carries higher-good thresholds (RAG-aware)', () => {
    for (const id of RPT2BIV_IDS) {
      const k = getKpi(id);
      expect(k?.thresholds).toBeDefined();
      expect(k?.thresholds?.direction).toBe('higher-good');
    }
  });
  it('listKpis contains the 5 EximX dashboard ids', () => {
    const ids = new Set(listKpis().map((k) => k.id));
    for (const id of RPT2BIV_IDS) expect(ids.has(id)).toBe(true);
  });
  it('re-import is idempotent (no duplicates)', async () => {
    const before = listKpis().length;
    await import('../kpi-registry');
    expect(listKpis().length).toBe(before);
  });
});
