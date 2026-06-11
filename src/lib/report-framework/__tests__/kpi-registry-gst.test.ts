/**
 * @file        kpi-registry-gst.test.ts
 * @sprint      RPT-2e-i · KPI registry seeds for FinCore GST statutory registers
 */
import { describe, it, expect } from 'vitest';
import { getKpi, listKpis } from '../kpi-registry';

const RPT2EI_IDS = [
  'fc-gstr1',
  'fc-gstr3b',
  'fc-gstr9',
  'fc-gstr2',
  'fc-reco',
  'fc-rcm-compliance',
] as const;

describe('RPT-2e-i · GST statutory register KPI seeds', () => {
  it('registers all 6 GST register KPI ids', () => {
    for (const id of RPT2EI_IDS) expect(getKpi(id)).toBeDefined();
  });
  it('every seed exposes a defaultChart with xKey + series', () => {
    for (const id of RPT2EI_IDS) {
      const k = getKpi(id);
      expect(k?.defaultChart.xKey).toBeTruthy();
      expect(Array.isArray(k?.defaultChart.series)).toBe(true);
      expect((k?.defaultChart.series.length ?? 0)).toBeGreaterThan(0);
    }
  });
  it('every seed carries higher-good thresholds (RAG-aware)', () => {
    for (const id of RPT2EI_IDS) {
      const k = getKpi(id);
      expect(k?.thresholds).toBeDefined();
      expect(k?.thresholds?.direction).toBe('higher-good');
    }
  });
  it('listKpis contains all 6 GST register ids', () => {
    const ids = new Set(listKpis().map(k => k.id));
    for (const id of RPT2EI_IDS) expect(ids.has(id)).toBe(true);
  });
  it('re-import is idempotent (no duplicates)', async () => {
    const before = listKpis().length;
    await import('../kpi-registry');
    expect(listKpis().length).toBe(before);
  });
});
