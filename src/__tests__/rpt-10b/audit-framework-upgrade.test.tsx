/**
 * @file        audit-framework-upgrade.test.tsx
 * @sprint      RPT-10b · Block 4 · AuditFrameworkDashboardPage additive recipe
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getKpi } from '@/lib/report-framework/kpi-registry';

const read = (p: string): string => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('RPT-10b · AuditFrameworkDashboardPage additive upgrade', () => {
  const src = read('src/pages/erp/comply360/audit-framework/AuditFrameworkDashboardPage.tsx');

  it('does NOT import recharts (pre-flight gate)', () => {
    expect(src).not.toContain("from 'recharts'");
  });

  it('preserves the existing OOB-1 Audit-Ready Score banner', () => {
    expect(src).toContain('Audit-Ready Score (OOB-1)');
  });

  it('adds the additive RPT-10b section (rpt10b-audit-fw-section)', () => {
    expect(src).toContain('rpt10b-audit-fw-section');
  });

  it('adds ReportChart + ScorecardTile + signReport integrity badge', () => {
    expect(src).toContain('ReportChart');
    expect(src).toContain('ScorecardTile');
    expect(src).toContain('signReport');
    expect(src).toContain('integrity-badge-auditfw');
  });

  it('uses resolveRag with cmp-audit-fw thresholds', () => {
    expect(src).toContain('resolveRag');
    expect(src).toContain("'cmp-audit-fw'");
  });

  it('cmp-audit-fw KPI seeded idempotently', () => {
    expect(getKpi('cmp-audit-fw')).toBeDefined();
  });
});
