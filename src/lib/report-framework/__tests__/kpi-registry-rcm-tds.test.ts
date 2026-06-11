/**
 * @file kpi-registry-rcm-tds.test.ts
 * RPT-2e-ii · asserts the 6 RCM/ITC/TDS/Audit KPI seeds are registered
 * with the expected ids and chart axes. Idempotent: re-importing must not throw.
 */
import { describe, it, expect } from 'vitest';
import { getKpi } from '@/lib/report-framework/kpi-registry';

const SEEDS: Array<{ id: string; xKey: string; chartType: string }> = [
  { id: 'fc-rcm-register',  xKey: 'section',  chartType: 'column' },
  { id: 'fc-itc',           xKey: 'status',   chartType: 'stacked-column' },
  { id: 'fc-clause44',      xKey: 'category', chartType: 'column' },
  { id: 'fc-tds-advance',   xKey: 'section',  chartType: 'column' },
  { id: 'fc-tds-analytics', xKey: 'section',  chartType: 'column' },
  { id: 'fc-audit-trail',   xKey: 'action',   chartType: 'column' },
];

describe('RPT-2e-ii · 6 RCM/ITC/TDS/Audit KPI seeds', () => {
  for (const s of SEEDS) {
    it(`registers ${s.id} with xKey=${s.xKey} chartType=${s.chartType}`, () => {
      const k = getKpi(s.id);
      expect(k).toBeDefined();
      expect(k?.defaultChart.xKey).toBe(s.xKey);
      expect(k?.defaultChart.chartType).toBe(s.chartType);
      expect(Array.isArray(k?.defaultChart.series)).toBe(true);
      expect((k?.defaultChart.series.length ?? 0)).toBeGreaterThanOrEqual(1);
    });
  }
  it('re-importing the registry is idempotent', async () => {
    await import('@/lib/report-framework/kpi-registry');
    for (const s of SEEDS) expect(getKpi(s.id)).toBeDefined();
  });
});
