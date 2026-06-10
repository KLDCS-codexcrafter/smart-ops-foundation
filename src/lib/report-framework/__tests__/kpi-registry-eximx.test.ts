/**
 * @file kpi-registry-eximx.test.ts
 * @sprint RPT-2b-i · KPI registry seeds for EximX trade-doc registers
 */
import { describe, it, expect } from 'vitest';
import { getKpi, listKpis } from '../kpi-registry';

const RPT2BI_IDS = [
  'ex-export-po',
  'ex-import-po',
  'ex-shipping-bill',
  'ex-dispatch',
  'ex-lc-status',
  'ex-ci-value',
  'ex-boe-duty',
] as const;

describe('RPT-2b-i · EximX KPI registry seeds', () => {
  it('registers all 7 EximX KPI ids', () => {
    for (const id of RPT2BI_IDS) {
      expect(getKpi(id)).toBeDefined();
    }
  });
  it('every seed exposes a defaultChart with xKey + series', () => {
    for (const id of RPT2BI_IDS) {
      const k = getKpi(id);
      expect(k?.defaultChart.xKey).toBeTruthy();
      expect(Array.isArray(k?.defaultChart.series)).toBe(true);
      expect((k?.defaultChart.series.length ?? 0)).toBeGreaterThan(0);
    }
  });
  it('listKpis contains the 7 EximX ids', () => {
    const ids = new Set(listKpis().map(k => k.id));
    for (const id of RPT2BI_IDS) expect(ids.has(id)).toBe(true);
  });
  it('re-import is idempotent (no duplicates)', async () => {
    const before = listKpis().length;
    await import('../kpi-registry');
    expect(listKpis().length).toBe(before);
  });
});
