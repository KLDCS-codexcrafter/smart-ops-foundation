/**
 * @file production-kpis-and-sources.test.ts — RPT-6a registry + DSC
 */
import { describe, it, expect } from 'vitest';
import { getKpi, listKpis } from '../kpi-registry';
import { getSource } from '../data-source-catalog';
import '../data-sources';

const PROD_KPI_IDS = [
  'prod-demand-forecast', 'prod-mixed-bu', 'prod-trace', 'prod-itc04',
  'prod-jw-stock', 'prod-batch', 'prod-plan', 'prod-jw-components',
  'prod-line-oee', 'prod-confirmation', 'prod-jw-in', 'prod-jobcard',
  'prod-daily-work', 'prod-genealogy',
];

describe('RPT-6a · Production KPI seeds', () => {
  it('registers all 14 prod-* KPIs with explicit layers', () => {
    for (const id of PROD_KPI_IDS) {
      const k = getKpi(id);
      expect(k, `missing ${id}`).toBeDefined();
      expect(Array.isArray(k!.layers) && k!.layers!.length > 0).toBe(true);
    }
  });
  it('prod-line-oee carries thresholds (higher-good)', () => {
    const oee = getKpi('prod-line-oee')!;
    expect(oee.thresholds).toBeDefined();
    expect(oee.thresholds!.direction).toBe('higher-good');
  });
  it('is idempotent — re-importing does not duplicate ids', async () => {
    const before = listKpis().filter((k) => k.id.startsWith('prod-')).length;
    await import('../kpi-registry');
    const after = listKpis().filter((k) => k.id.startsWith('prod-')).length;
    expect(after).toBe(before);
    expect(after).toBeGreaterThanOrEqual(14);
  });
});

describe('RPT-6a · Production DSC sources', () => {
  it('registers ≥2 production sources that return arrays from read()', () => {
    for (const id of ['production.orders', 'production.jobwork']) {
      const s = getSource(id);
      expect(s, `missing source ${id}`).toBeDefined();
      const rows = s!.read('SMRT');
      expect(Array.isArray(rows)).toBe(true);
    }
  });
  it('production sources expose card + dimension fields', () => {
    const orders = getSource('production.orders')!;
    const jw = getSource('production.jobwork')!;
    expect(orders.card).toBe('production');
    expect(jw.card).toBe('production');
    expect(orders.fields.some((f) => f.kind === 'dimension')).toBe(true);
    expect(jw.fields.some((f) => f.kind === 'dimension')).toBe(true);
  });
});
