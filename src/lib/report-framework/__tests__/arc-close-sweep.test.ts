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

/** Non-ERP legacy surfaces kept out of scope for the RPT-12 reporting arc —
 *  Phase-1.A stand-alone views (Welcome · Bridge workbenches · Customer · Tower ·
 *  Vendor-portal). These predate the framework and will be migrated in their
 *  respective follow-up arcs. The arc-close invariant guards against any NEW
 *  recharts imports inside src/pages/erp (the arc's domain) — that grep is 0. */
const RECHARTS_LEGACY_ALLOWLIST = new Set<string>([
  'src/pages/Welcome.tsx',
  'src/pages/bridge/ExceptionWorkbench.tsx',
  'src/pages/bridge/ReconciliationWorkbench.tsx',
  'src/pages/customer/CustomerDashboard.tsx',
  'src/pages/tower/Billing.tsx',
  // W1C-2 Block 3 · VendorPerformanceView migrated · allowlist no longer
  // shields any vendor-portal page.
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

  /** Pre-arc KPI dataSource pointers that resolve via downstream engines /
   *  register paths rather than the central DSC catalog. Documented at
   *  arc-close so the invariant guards against NEW stale pointers. */
  const PRE_ARC_KNOWN_STALE = new Set<string>([
    'fincore.outstanding.aging.receivables','fincore.outstanding.aging.payables',
    'fincore.ledger.history','fincore.cheque.status','fincore.balance-sheet.composition',
    'fincore.trial-balance.drcr','fincore.stock.value-by-group','fincore.pnl.margin',
    'fincore.production.monthly','fincore.bank.reco-percent','fincore.audit-dashboard.checkpoint-mix',
    'fincore.audit-trail.by-action','fincore.challan.by-type','fincore.clause44.expense-breakup',
    'fincore.eway.by-status','fincore.form24q.by-quarter','fincore.form26q.by-section',
    'fincore.form27q.by-section','fincore.gst.gstr1.section-counts','fincore.gst.gstr2.itc-posture',
    'fincore.gst.gstr3b.outward-summary','fincore.gst.gstr9.annual-summary',
    'fincore.gst.rcm-compliance.severity','fincore.gst.reco.match-posture','fincore.itc.by-status',
    'fincore.rcm.by-section','fincore.tds-advance.by-section','fincore.tds-analytics.by-section',
    'receivx.aging.by-person','receivx.credit-risk.distribution','receivx.collection.efficiency',
    'receivx.ptp.kept-vs-broken','receivx.communication.volume','payout.requisition.trend',
    'bill-passing.rate-contract.value-by-vendor','eximx.export-po.value','eximx.import-po.value',
    'eximx.shipping-bill.fob-by-status','eximx.dispatch.trend','eximx.lc.status-mix',
    'eximx.ci.value-by-month','eximx.boe.duty-by-status','eximx.realisation.by-period',
    'eximx.fema.270-day-aging','eximx.packing-credit.outstanding-by-status',
    'eximx.hedge.notional-by-currency','eximx.git.value-by-leg','eximx.roo.preference-by-fta',
    'eximx.buyer-reliability.distribution','eximx.vendor-score.distribution','eximx.rms.status',
    'eximx.ews.coverage','eximx.aeo.benefit-utilisation','eximx.coo-legal.status',
    'eximx.form-3ceb.summary','eximx.cross-entity-realisation.summary',
    'eximx.ebrc-edpms.reconciliation','eximx.landed-cost.reconciliation',
    'eximx.month-end-reval.coverage','comply360.fire-safety.compliance-summary',
    'comply360.cost-audit.cra-filings','comply360.environmental.compliance-summary',
    'comply360.industrial-safety.compliance-summary','comply360.labour-tier2.compliance-summary',
    'comply360.legal-ipr.compliance-summary','comply360.mca-tier2.summary',
    'comply360.meetings.compliance-summary','comply360.quality-standards.compliance-summary',
    'comply360.survival-kit.readiness','comply360.waste-management.compliance-summary',
    'comply360.csr.csr2-spend','comply360.cyber-security.compliance-summary',
    'comply360.dpdp.compliance-summary','salesx.opportunities',
  ]);

  it('Every KPI dataSource pointer resolves via getSource (or documented stale set)', () => {
    const newStale: { id: string; ds: string }[] = [];
    for (const k of listKpis()) {
      const ds = k.dataSource;
      if (ds.startsWith('reg:')) continue;
      if (PRE_ARC_KNOWN_STALE.has(ds)) continue;
      if (!getSource(ds)) newStale.push({ id: k.id, ds });
    }
    expect(newStale).toEqual([]);
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
