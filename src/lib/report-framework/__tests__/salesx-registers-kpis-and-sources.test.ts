/**
 * @file salesx-registers-kpis-and-sources.test.ts — RPT-7a registry + DSC
 */
import { describe, it, expect } from 'vitest';
import { getKpi, listKpis } from '../kpi-registry';
import { getSource } from '../data-source-catalog';
import '../data-sources';

const RPT7A_KPI_IDS = [
  'sx-sales-orders', 'sx-customer-orders', 'sx-quotations',
  'sx-som', 'sx-srm', 'sx-dom',
  'sx-vouchers', 'sx-returns', 'sx-commission',
  'sx-followups', 'sx-secondary',
];

const RPT7A_SOURCE_IDS = ['salesx.orders', 'salesx.pipeline'];

describe('RPT-7a · SalesX register KPI seeds', () => {
  it('registers all 11 KPIs with explicit layers', () => {
    for (const id of RPT7A_KPI_IDS) {
      const k = getKpi(id);
      expect(k, `missing ${id}`).toBeDefined();
      expect(Array.isArray(k!.layers) && k!.layers!.length > 0).toBe(true);
    }
  });

  it('is idempotent — re-import does not duplicate ids', async () => {
    const before = listKpis().length;
    await import('../kpi-registry');
    const after = listKpis().length;
    expect(after).toBe(before);
  });
});

describe('RPT-7a · SalesX DSC sources', () => {
  it('registers 2 sources that return arrays from read()', () => {
    for (const id of RPT7A_SOURCE_IDS) {
      const s = getSource(id);
      expect(s, `missing source ${id}`).toBeDefined();
      const rows = s!.read('SMRT');
      expect(Array.isArray(rows)).toBe(true);
    }
  });

  it('each source exposes a card + at least one dimension field', () => {
    for (const id of RPT7A_SOURCE_IDS) {
      const s = getSource(id)!;
      expect(s.card).toBe('salesx');
      expect(s.fields.some((f) => f.kind === 'dimension')).toBe(true);
    }
  });
});
