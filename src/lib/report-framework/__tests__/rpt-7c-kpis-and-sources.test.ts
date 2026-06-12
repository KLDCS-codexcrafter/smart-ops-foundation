/**
 * @file rpt-7c-kpis-and-sources.test.ts — RPT-7c registry + DSC verification
 * Asserts: 13 layer-tagged KPI seeds idempotent · db-credit-util carries
 * lower-good thresholds · 3 new DSC sources (distributor.orders ·
 * customer.insights · ecomx.orders) expose read() returning arrays · ProjX
 * + SalesX sources NOT duplicated.
 */
import { describe, it, expect } from 'vitest';
import { getKpi, listKpis } from '../kpi-registry';
import { getSource, listSources } from '../data-source-catalog';
import '../data-sources';

const RPT7C_KPI_IDS = [
  'db-orders', 'db-credit-util', 'db-scheme-eff', 'db-disputes', 'db-demand',
  'cu-clv', 'cu-churn', 'cu-loyalty', 'cu-social',
  'ec-orders', 'ec-claims', 'ec-returns', 'ec-gmv',
];

const RPT7C_SOURCE_IDS = ['distributor.orders', 'customer.insights', 'ecomx.orders'];

describe('RPT-7c · KPI seeds', () => {
  it('registers all 13 KPIs with explicit layers', () => {
    for (const id of RPT7C_KPI_IDS) {
      const k = getKpi(id);
      expect(k, `missing ${id}`).toBeDefined();
      expect(Array.isArray(k!.layers) && k!.layers!.length > 0).toBe(true);
    }
  });

  it('db-credit-util carries lower-good thresholds', () => {
    const k = getKpi('db-credit-util')!;
    expect(k.thresholds).toBeDefined();
    expect(k.thresholds!.direction).toBe('lower-good');
  });

  it('is idempotent — re-import does not duplicate', async () => {
    const before = listKpis().length;
    await import('../kpi-registry');
    const after = listKpis().length;
    expect(after).toBe(before);
  });
});

describe('RPT-7c · DSC sources', () => {
  it('registers the 3 new sources with read() returning arrays', () => {
    for (const id of RPT7C_SOURCE_IDS) {
      const s = getSource(id);
      expect(s, `missing source ${id}`).toBeDefined();
      const rows = s!.read('SMRT');
      expect(Array.isArray(rows)).toBe(true);
    }
  });

  it('does NOT duplicate ProjX or SalesX sources', () => {
    const projx = listSources().filter((s) => s.card === 'projx').map((s) => s.id).sort();
    expect(projx).toEqual(['projx.financials', 'projx.projects']);
    const salesx = listSources().filter((s) => s.card === 'salesx').map((s) => s.id).sort();
    expect(salesx).toEqual(['salesx.orders', 'salesx.pipeline']);
  });
});
