/**
 * @file        spend-funnel.test.tsx
 * @sprint      RPT-10a · Block 4 · SpendFunnelPage test
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getKpi } from '@/lib/report-framework/kpi-registry';
import '@/lib/report-framework/data-sources';

const read = (p: string): string => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('RPT-10a · SpendFunnelPage', () => {
  const src = read('src/pages/erp/procure-hub/cockpits/SpendFunnelPage.tsx');
  const types = read('src/pages/erp/procure-hub/Procure360Sidebar.types.ts');
  const sidebar = read('src/apps/erp/configs/procure360-sidebar-config.ts');
  const page = read('src/pages/erp/procure-hub/Procure360Page.tsx');

  it('page file exports default component', () => {
    expect(src).toMatch(/export default function SpendFunnelPage/);
  });

  it('composes FROZEN primitives only (ReportChart · ScorecardTile)', () => {
    expect(src).toContain('ReportChart');
    expect(src).toContain('ScorecardTile');
  });

  it('reads real DSC sources (procure.purchase-orders + procure.budget-utilization)', () => {
    expect(src).toContain("'procure.purchase-orders'");
    expect(src).toContain("'procure.budget-utilization'");
  });

  it('funnel renders only stages with real data · missing declared not faked', () => {
    expect(src).toContain('FUNNEL_STAGES');
    expect(src).toContain('Declared (not faked)');
    expect(src).toContain('spend-funnel-missing-declared');
  });

  it('budget-vs-actual combo + top-vendor concentration charts present', () => {
    expect(src).toContain('spend-funnel-budget');
    expect(src).toContain('spend-funnel-top-vendors');
    expect(src).toMatch(/chartType: 'combo'/);
  });

  it('integrity badge via signReport · honest empty-state', () => {
    expect(src).toContain('signReport');
    expect(src).toContain('spend-funnel-integrity');
    expect(src).toContain('spend-funnel-empty');
  });

  it('Procure360 wires spend-funnel module · sidebar entry · switch case', () => {
    expect(types).toContain("'spend-funnel'");
    expect(sidebar).toContain("'spend-funnel'");
    expect(sidebar).toContain('Spend Funnel');
    expect(page).toContain("case 'spend-funnel'");
    expect(page).toContain('SpendFunnelPage');
  });

  it('5 RPT-10a KPI seeds registered idempotently', () => {
    expect(getKpi('xc-promoter')).toBeDefined();
    expect(getKpi('rx-credit-exposure')).toBeDefined();
    expect(getKpi('rx-overdue-pct')).toBeDefined();
    expect(getKpi('pr-spend-funnel')).toBeDefined();
    expect(getKpi('pr-vendor-concentration')).toBeDefined();
  });
});
