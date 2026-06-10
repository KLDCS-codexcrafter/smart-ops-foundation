/**
 * @file kpi-registry-rx-po-bp.test.ts
 * @sprint RPT-2c · KPI registry seeds for ReceivX + PayOut + Bill-passing
 */
import { describe, it, expect } from 'vitest';
import { getKpi, listKpis } from '../kpi-registry';

const RPT2C_IDS = [
  'rx-aging-person',
  'rx-credit-risk',
  'rx-collection-eff',
  'rx-ptp-rate',
  'rx-comm-volume',
  'po-requisition-trend',
  'bp-rate-contract',
] as const;

describe('RPT-2c · KPI registry seeds', () => {
  it('registers all 7 KPI ids', () => {
    for (const id of RPT2C_IDS) {
      expect(getKpi(id)).toBeDefined();
    }
  });
  it('every seed exposes a defaultChart config with xKey and series', () => {
    for (const id of RPT2C_IDS) {
      const k = getKpi(id);
      expect(k?.defaultChart.xKey).toBeTruthy();
      expect(Array.isArray(k?.defaultChart.series)).toBe(true);
      expect((k?.defaultChart.series.length ?? 0)).toBeGreaterThan(0);
    }
  });
  it('listKpis contains the 7 RPT-2c ids', () => {
    const ids = new Set(listKpis().map(k => k.id));
    for (const id of RPT2C_IDS) expect(ids.has(id)).toBe(true);
  });
  it('re-import is idempotent (no duplicates)', async () => {
    const before = listKpis().length;
    await import('../kpi-registry');
    expect(listKpis().length).toBe(before);
  });
});
