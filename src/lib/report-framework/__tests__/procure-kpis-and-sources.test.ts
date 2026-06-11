/**
 * @file procure-kpis-and-sources.test.ts — RPT-5c registry + DSC
 */
import { describe, it, expect } from 'vitest';
import { getKpi, listKpis } from '../kpi-registry';
import { getSource } from '../data-source-catalog';
import '../data-sources';

const PROCURE_KPI_IDS = [
  'pr-vendor-agreements',
  'pr-budget-utilization',
  'pr-vendor-reliability',
  'pr-three-way-match',
  'pr-cost-variance-item',
  'pr-cost-variance-cat',
  'pr-tds-deduction',
  'pr-enquiry',
  'pr-peq-followup',
];

describe('RPT-5c · Procure360 KPI seeds', () => {
  it('registers all 9 pr-* KPIs with explicit layers', () => {
    for (const id of PROCURE_KPI_IDS) {
      const k = getKpi(id);
      expect(k, `missing ${id}`).toBeDefined();
      expect(Array.isArray(k!.layers) && k!.layers!.length > 0).toBe(true);
    }
  });
  it('is idempotent — re-importing does not duplicate ids', async () => {
    const before = listKpis().filter(k => k.id.startsWith('pr-')).length;
    await import('../kpi-registry');
    const after = listKpis().filter(k => k.id.startsWith('pr-')).length;
    expect(after).toBe(before);
    expect(after).toBeGreaterThanOrEqual(9);
  });
});

describe('RPT-5c · Procure DSC sources', () => {
  it('registers ≥2 procure sources that return arrays from read()', () => {
    const ids = ['procure.purchase-orders', 'procure.budget-utilization'];
    for (const id of ids) {
      const s = getSource(id);
      expect(s, `missing source ${id}`).toBeDefined();
      const rows = s!.read('SMRT');
      expect(Array.isArray(rows)).toBe(true);
    }
  });
});
