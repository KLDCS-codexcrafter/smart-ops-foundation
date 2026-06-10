/**
 * @file     kpi-registry-comply-dash2.test.ts
 * @sprint   RPT-2a-ii · 5 Comply360 cohort-2 KPI seeds idempotent + thresholds present
 */
import { describe, it, expect } from 'vitest';
import { getKpi } from '@/lib/report-framework/kpi-registry';

const IDS = ['cmp-quality', 'cmp-cyber', 'cmp-csr', 'cmp-labour', 'cmp-mca'];

describe('RPT-2a-ii · KPI registry · 5 Comply360 cohort-2 dashboard seeds', () => {
  it('registers all 5 ids', () => {
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
