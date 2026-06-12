/**
 * @file        arc-close-sweep.test.ts
 * @purpose     RPT-12c · Reporting Arc closing assertions: zero recharts in src/pages,
 *              integrity coverage on chart surfaces, KPI dataSource pointers resolve.
 * @sprint      RPT-12c · arc-close 3 of 3
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import { listKpis } from '@/lib/report-framework';
import { getSource } from '@/lib/report-framework/data-source-catalog';
import { registerAllDataSources } from '@/lib/report-framework/data-sources';
registerAllDataSources();

/** Non-ERP legacy surface kept out of scope for RPT-12 reporting arc — Phase 1.A vendor
 *  portal stand-alone view; will be migrated in a follow-up vendor-portal arc. */
const RECHARTS_LEGACY_ALLOWLIST = new Set<string>([
  'src/pages/vendor-portal/VendorPerformanceView.tsx',
]);

/** Chart-surface integrity coverage exceptions — pages that import ReportChart
 *  for a non-data preview (none today). */
const INTEGRITY_ALLOWLIST = new Set<string>([]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      walk(full, out);
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

const ROOT = process.cwd();
const PAGES = walk(resolve(ROOT, 'src/pages'));

describe('RPT-12c · Reporting Arc · Close Sweep', () => {
  it('Zero recharts imports in src/pages (modulo allowlist)', () => {
    const offenders: string[] = [];
    for (const f of PAGES) {
      const rel = f.substring(ROOT.length + 1).replace(/\\/g, '/');
      if (RECHARTS_LEGACY_ALLOWLIST.has(rel)) continue;
      const src = readFileSync(f, 'utf8');
      if (/from ['"]recharts['"]/.test(src)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it('Every page using ReportChart/TableChartToggle also references signReport', () => {
    const offenders: string[] = [];
    for (const f of PAGES) {
      const rel = f.substring(ROOT.length + 1).replace(/\\/g, '/');
      if (INTEGRITY_ALLOWLIST.has(rel)) continue;
      const src = readFileSync(f, 'utf8');
      const usesChart = /\bReportChart\b/.test(src) || /\bTableChartToggle\b/.test(src);
      if (usesChart && !/\bsignReport\b/.test(src)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it('Every KPI dataSource pointer resolves via getSource (or is a documented register)', () => {
    const stale: { id: string; ds: string }[] = [];
    for (const k of listKpis()) {
      const ds = k.dataSource;
      // register-shaped pointers (`reg:*`) are accepted as register references
      if (ds.startsWith('reg:')) continue;
      if (!getSource(ds)) stale.push({ id: k.id, ds });
    }
    expect(stale).toEqual([]);
  });

  it('RPT-12c migration · all 19 ERP target pages are recharts-free', () => {
    const targets = [
      'src/pages/erp/servicedesk/refurbished/RefurbishedUnitLifecycle.tsx',
      'src/pages/erp/servicedesk/marketplace/EngineerMarketplace.tsx',
      'src/pages/erp/servicedesk/reports/SLAPerformance.tsx',
      'src/pages/erp/servicedesk/reports/PromisedVsActualVariance.tsx',
      'src/pages/erp/servicedesk/reports/CustomerPnLReport.tsx',
      'src/pages/erp/servicedesk/engineers/EngineerBurnoutDashboard.tsx',
      'src/pages/erp/servicedesk/reports/AMCRenewalForecast.tsx',
      'src/pages/erp/projx/reports/CashFlowProjectionReport.tsx',
      'src/pages/erp/distributor-hub/reports/SchemeEffectivenessReport.tsx',
      'src/pages/erp/distributor-hub/reports/EngagementReport.tsx',
      'src/pages/erp/distributor-hub/reports/DisputeStatsReport.tsx',
      'src/pages/erp/payout/VendorAnalytics.tsx',
      'src/pages/erp/payout/CashFlowDashboard.tsx',
      'src/pages/erp/vendor-portal/panels/VendorScoringPanel.tsx',
      'src/pages/erp/customer-hub/reports/LoyaltyPerformanceReport.tsx',
      'src/pages/erp/procure-hub/reports/RateVarianceGraphPanel.tsx',
      'src/pages/erp/maintainpro/reports/ESGEnergyDashboard.tsx',
      'src/pages/erp/sitex/reports/SiteTwinDashboard.tsx',
      'src/pages/erp/requestx/reports/CategoryWiseSpendEstimate.tsx',
    ];
    for (const t of targets) {
      const src = readFileSync(resolve(ROOT, t), 'utf8');
      expect(src).not.toMatch(/from ['"]recharts['"]/);
      expect(src).toContain('ReportChart');
      expect(src).toContain('signReport');
    }
  });
});
