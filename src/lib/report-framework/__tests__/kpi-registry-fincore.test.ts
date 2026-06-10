/**
 * @file kpi-registry-fincore.test.ts
 * @purpose RPT-1b · the 8 FinCore KPIs are seeded and idempotent.
 */
import { describe, it, expect } from 'vitest';
import { getKpi, registerKpi } from '../kpi-registry';
import { defaultChartConfig } from '../chart-config';


const IDS = [
  'fc-ledger-balance',
  'fc-cheque-status',
  'fc-bs-composition',
  'fc-tb-drcr',
  'fc-stock-value',
  'fc-pnl-margin',
  'fc-monthly-prod',
  'fc-bank-reco',
];

describe('RPT-1b · kpi-registry · 8 FinCore seeds', () => {
  it('all 8 ids are registered', () => {
    for (const id of IDS) {
      expect(getKpi(id), `kpi ${id} missing`).toBeDefined();
    }
  });

  it('each seed has a non-empty defaultChart with at least one series', () => {
    for (const id of IDS) {
      const k = getKpi(id);
      expect(k?.defaultChart.series.length).toBeGreaterThanOrEqual(1);
      expect(k?.defaultChart.xKey).toBeTruthy();
    }
  });

  it('re-register is a no-op (idempotent)', () => {
    const before = getKpi('fc-ledger-balance');
    registerKpi({
      id: 'fc-ledger-balance',
      label: 'overwritten?',
      dataSource: 'overwritten',
      defaultChart: defaultChartConfig({ xKey: 'x', series: [{ key: 'y', label: 'y' }] }),
    });
    const after = getKpi('fc-ledger-balance');
    expect(after?.label).toBe(before?.label);
    expect(after?.dataSource).toBe(before?.dataSource);
  });
});
