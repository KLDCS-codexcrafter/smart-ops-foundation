/**
 * @file rpt-8a-kpis-and-sources.test.ts — RPT-8a registry + DSC verification
 * Asserts: 15 layer-tagged KPI seeds idempotent (incl. 3 excluded-page seeds for
 * RPT-12) · sd-sla thresholds OMITTED (no real met-%) · 4 new DSC sources
 * (servicedesk.tickets · servicedesk.amc · dispatch.shipments · dispatch.inward)
 * expose read() returning arrays · Distributor/Customer/EcomX sources NOT
 * duplicated.
 */
import { describe, it, expect } from 'vitest';
import { getKpi, listKpis } from '../kpi-registry';
import { getSource, listSources } from '../data-source-catalog';
import '../data-sources';

const RPT8A_KPI_IDS = [
  'sd-customer-pnl', 'sd-promise-variance', 'sd-amc-forecast', 'sd-service-availed',
  'sd-sla', 'sd-comm-log', 'sd-future-tasks',
  'dp-stock-hold', 'dp-inward', 'dp-lr', 'dp-packing', 'dp-demo-serial',
  'dp-transporter', 'dp-receipts', 'dp-analytics',
];

const RPT8A_SOURCE_IDS = [
  'servicedesk.tickets', 'servicedesk.amc', 'dispatch.shipments', 'dispatch.inward',
];

describe('RPT-8a · KPI seeds', () => {
  it('registers all 15 KPIs with explicit layers', () => {
    for (const id of RPT8A_KPI_IDS) {
      const k = getKpi(id);
      expect(k, `missing ${id}`).toBeDefined();
      expect(Array.isArray(k!.layers) && k!.layers!.length > 0).toBe(true);
    }
  });

  it('sd-sla intentionally OMITS thresholds (no real met-% available)', () => {
    const k = getKpi('sd-sla')!;
    expect(k.thresholds).toBeUndefined();
  });

  it('is idempotent — re-import does not duplicate', async () => {
    const before = listKpis().length;
    await import('../kpi-registry');
    const after = listKpis().length;
    expect(after).toBe(before);
  });
});

describe('RPT-8a · DSC sources', () => {
  it('registers the 4 new sources with read() returning arrays', () => {
    for (const id of RPT8A_SOURCE_IDS) {
      const s = getSource(id);
      expect(s, `missing source ${id}`).toBeDefined();
      const rows = s!.read('SMRT');
      expect(Array.isArray(rows)).toBe(true);
    }
  });

  it('does NOT duplicate Distributor / Customer / EcomX sources', () => {
    const dist = listSources().filter((s) => s.card === 'distributor-hub').map((s) => s.id).sort();
    expect(dist).toEqual(['distributor.orders']);
    const cust = listSources().filter((s) => s.card === 'customer-hub').map((s) => s.id).sort();
    expect(cust).toEqual(['customer.insights']);
    const ec = listSources().filter((s) => s.card === 'ecomx').map((s) => s.id).sort();
    expect(ec).toEqual(['ecomx.orders']);
  });
});
