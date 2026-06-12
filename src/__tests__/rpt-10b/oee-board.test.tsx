/**
 * @file        oee-board.test.tsx
 * @sprint      RPT-10b · Block 1 · OEEBoardPage test
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getKpi } from '@/lib/report-framework/kpi-registry';
import '@/lib/report-framework/data-sources';

const read = (p: string): string => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('RPT-10b · OEEBoardPage', () => {
  const src = read('src/pages/erp/production/cockpits/OEEBoardPage.tsx');
  const types = read('src/pages/erp/production/ProductionSidebar.types.ts');
  const sidebar = read('src/apps/erp/configs/production-sidebar-config.ts');
  const page = read('src/pages/erp/production/ProductionPage.tsx');
  const legacy = read('src/pages/erp/production/reports/OEEDashboard.tsx');

  it('exports default component', () => {
    expect(src).toMatch(/export default function OEEBoardPage/);
  });

  it('consumes computeOEE from oee-engine (asserted import)', () => {
    expect(src).toContain("from '@/lib/oee-engine'");
    expect(src).toContain('computeOEE');
    expect(src).toContain('buildOEESourceData');
  });

  it('composes FROZEN primitives only · NO recharts import', () => {
    expect(src).toContain('ReportChart');
    expect(src).toContain('ScorecardTile');
    expect(src).not.toContain("from 'recharts'");
  });

  it('RAG via resolveRag against prod-line-oee thresholds', () => {
    expect(src).toContain('resolveRag');
    expect(src).toContain("'prod-line-oee'");
    expect(getKpi('prod-line-oee')).toBeDefined();
  });

  it('integrity badge + honest empty-state present', () => {
    expect(src).toContain('signReport');
    expect(src).toContain('oee-board-integrity');
    expect(src).toContain('oee-board-empty');
  });

  it('Production wires prod-oee-board · type + sidebar + switch case', () => {
    expect(types).toContain("'prod-oee-board'");
    expect(sidebar).toContain("'prod-oee-board'");
    expect(sidebar).toContain('OEE Board');
    expect(page).toContain("case 'prod-oee-board'");
    expect(page).toContain('OEEBoardPage');
  });

  it('legacy OEEDashboard stays 0-DIFF (still imports computeOEE the same way)', () => {
    expect(legacy).toContain("from '@/lib/oee-engine'");
    expect(legacy).toContain('OEEDashboardPanel');
  });
});
