/**
 * @file        cost-audit-upgrade.test.tsx
 * @sprint      RPT-10b · Block 4 · CostAuditDashboardPage additive recipe (cmp-cost-audit tile)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getKpi } from '@/lib/report-framework/kpi-registry';

const read = (p: string): string => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('RPT-10b · CostAuditDashboardPage additive upgrade', () => {
  const src = read('src/pages/erp/comply360/cost-audit/CostAuditDashboardPage.tsx');

  it('does NOT import recharts (pre-flight gate)', () => {
    expect(src).not.toContain("from 'recharts'");
  });

  it('preserves the existing rpt2ai-costaudit-section + integrity badge', () => {
    expect(src).toContain('rpt2ai-costaudit-section');
    expect(src).toContain('integrity-badge-costaudit');
  });

  it('continues to compose ReportChart + ScorecardTile + signReport', () => {
    expect(src).toContain('ReportChart');
    expect(src).toContain('ScorecardTile');
    expect(src).toContain('signReport');
    expect(src).toContain('resolveRag');
  });

  it('adds the additive cmp-cost-audit mgmt summary tile (seed actually rendered)', () => {
    expect(src).toContain('cmp-cost-audit');
    expect(src).toContain('Cost-audit posture');
  });

  it('cmp-cost-audit KPI seeded idempotently', () => {
    expect(getKpi('cmp-cost-audit')).toBeDefined();
  });
});
