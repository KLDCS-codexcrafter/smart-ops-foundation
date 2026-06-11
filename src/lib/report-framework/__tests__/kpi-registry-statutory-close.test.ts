/**
 * @file kpi-registry-statutory-close.test.ts — RPT-2e-iii
 */
import { describe, it, expect } from 'vitest';
import { getKpi } from '../kpi-registry';

describe('RPT-2e-iii · 6 Statutory-Close KPI seeds', () => {
  const ids = ['fc-eway', 'fc-challan', 'fc-form24q', 'fc-form26q', 'fc-form27q', 'fc-audit-dash'];
  it.each(ids)('registers %s', (id) => {
    const k = getKpi(id);
    expect(k).toBeDefined();
    expect(k!.defaultChart).toBeDefined();
    expect(k!.thresholds).toBeDefined();
  });
});
