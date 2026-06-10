/**
 * @file     kpi-registry-comply-dash.test.ts
 * @sprint   RPT-2a-i · 6 Comply360 KPI seeds idempotent + thresholds present
 */
import { describe, it, expect } from 'vitest';
import { getKpi } from '@/lib/report-framework/kpi-registry';

const IDS = [
  'cmp-fire-compliance',
  'cmp-costaudit-filings',
  'cmp-env-compliance',
  'cmp-indsafety',
  'cmp-waste',
  'cmp-dpdp',
];

describe('RPT-2a-i · KPI registry · 6 Comply360 dashboard seeds', () => {
  it('registers all 6 ids', () => {
    for (const id of IDS) {
      expect(getKpi(id), id).toBeDefined();
    }
  });

  it('each KPI carries thresholds for RAG', () => {
    for (const id of IDS) {
      const k = getKpi(id);
      expect(k?.thresholds, `${id} thresholds`).toBeDefined();
      expect(typeof k?.thresholds?.amber).toBe('number');
      expect(typeof k?.thresholds?.red).toBe('number');
      expect(['higher-good', 'lower-good']).toContain(k?.thresholds?.direction);
    }
  });

  it('each KPI exposes a defaultChart', () => {
    for (const id of IDS) {
      expect(getKpi(id)?.defaultChart.chartType).toBeDefined();
    }
  });
});
