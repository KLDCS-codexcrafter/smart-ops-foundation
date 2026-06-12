/**
 * @file        kpi-seeds-resolve.test.ts
 * @sprint      RPT-12a · Block 6 · 10 forward-seed KPI dataSource pointers resolve
 */
import { describe, it, expect } from 'vitest';
import { getKpi } from '@/lib/report-framework/kpi-registry';
import { getSource } from '@/lib/report-framework/data-source-catalog';
import '@/lib/report-framework/data-sources';

const FORWARD_KPIS = [
  'xc-cash-position',
  'xc-promoter',
  'px-cashflow',
  'px-cpi',
  'db-scheme-eff',
  'db-disputes',
  'cu-loyalty',
  'sd-customer-pnl',
  'sd-promise-variance',
  'dp-transporter',
] as const;

describe('RPT-12a · forward-seed KPIs resolve via getSource', () => {
  for (const id of FORWARD_KPIS) {
    it(`KPI "${id}" exists and its dataSource resolves`, () => {
      const k = getKpi(id);
      expect(k, `KPI ${id} missing`).toBeTruthy();
      const src = getSource(k!.dataSource);
      expect(src, `dataSource ${k!.dataSource} for KPI ${id} does not resolve`).toBeTruthy();
    });
  }

  it('all 10 forward-seed KPIs have a registered source', () => {
    const missing = FORWARD_KPIS.filter((id) => {
      const k = getKpi(id);
      return !k || !getSource(k.dataSource);
    });
    expect(missing).toEqual([]);
  });
});
