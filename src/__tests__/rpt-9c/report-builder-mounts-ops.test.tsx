/**
 * @file        report-builder-mounts-ops.test.tsx
 * @sprint      RPT-9c · Builder Rollout — Ops Cards (11 mounts)
 * @purpose     Per-card mount confirmation: each of the 11 Ops target cards has
 *              (1) module id in its module union / sidebar config, AND
 *              (2) <ReportBuilder cardId="…" /> wired in the page (or route for logistic).
 *
 *              GateFlow is explicitly skipped (zero DSC sources per RPT-6c).
 *              Strategy: source-text assertions, mirroring RPT-9b style.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const read = (p: string): string => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('RPT-9c · Report Builder mount · per-card confirmations (Ops)', () => {
  // ── 1. Inventory (cardId="inventory-hub") ──────────────────────────────
  it('inventory · module id in MainStoreHubSidebar.types.ts union', () => {
    expect(read('src/pages/erp/inventory/MainStoreHubSidebar.types.ts'))
      .toContain("'inv-rpt-report-builder'");
  });
  it('inventory · sidebar item in MainStoreHubSidebar.tsx', () => {
    const src = read('src/pages/erp/inventory/MainStoreHubSidebar.tsx');
    expect(src).toContain('inv-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('inventory · switch case + <ReportBuilder cardId="inventory-hub"/> in MainStoreHubPage.tsx', () => {
    const src = read('src/pages/erp/inventory/MainStoreHubPage.tsx');
    expect(src).toContain("case 'inv-rpt-report-builder'");
    expect(src).toMatch(/cardId="inventory-hub"/);
  });

  // ── 2. Procure-hub (cardId="procure360") ───────────────────────────────
  it('procure-hub · module id in Procure360Sidebar.types.ts union', () => {
    expect(read('src/pages/erp/procure-hub/Procure360Sidebar.types.ts'))
      .toContain("'p360-rpt-report-builder'");
  });
  it('procure-hub · sidebar entry in procure360-sidebar-config.ts', () => {
    const src = read('src/apps/erp/configs/procure360-sidebar-config.ts');
    expect(src).toContain('p360-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('procure-hub · switch case + <ReportBuilder cardId="procure360"/> in Procure360Page.tsx', () => {
    const src = read('src/pages/erp/procure-hub/Procure360Page.tsx');
    expect(src).toContain("case 'p360-rpt-report-builder'");
    expect(src).toMatch(/cardId="procure360"/);
  });

  // ── 3. QualiCheck (cardId="qualicheck") ────────────────────────────────
  it('qualicheck · module id in QualiCheckSidebar.types.ts union', () => {
    expect(read('src/pages/erp/qualicheck/QualiCheckSidebar.types.ts'))
      .toContain("'qc-rpt-report-builder'");
  });
  it('qualicheck · sidebar entry in qualicheck-sidebar-config.ts', () => {
    const src = read('src/apps/erp/configs/qualicheck-sidebar-config.ts');
    expect(src).toContain('qc-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('qualicheck · switch case + <ReportBuilder cardId="qualicheck"/> in QualiCheckPage.tsx', () => {
    const src = read('src/pages/erp/qualicheck/QualiCheckPage.tsx');
    expect(src).toContain("case 'qc-rpt-report-builder'");
    expect(src).toMatch(/cardId="qualicheck"/);
  });

  // ── 4. Production (cardId="production") ────────────────────────────────
  it('production · module id in ProductionSidebar.types.ts union', () => {
    expect(read('src/pages/erp/production/ProductionSidebar.types.ts'))
      .toContain("'prod-rpt-report-builder'");
  });
  it('production · sidebar entry in production-sidebar-config.ts', () => {
    const src = read('src/apps/erp/configs/production-sidebar-config.ts');
    expect(src).toContain('prod-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('production · switch case + <ReportBuilder cardId="production"/> in ProductionPage.tsx', () => {
    const src = read('src/pages/erp/production/ProductionPage.tsx');
    expect(src).toContain("case 'prod-rpt-report-builder'");
    expect(src).toMatch(/cardId="production"/);
  });

  // ── 5. RequestX (cardId="requestx") ────────────────────────────────────
  it('requestx · module id in RequestXSidebar.types.ts union', () => {
    expect(read('src/pages/erp/requestx/RequestXSidebar.types.ts'))
      .toContain("'rqx-rpt-report-builder'");
  });
  it('requestx · sidebar entry in requestx-sidebar-config.ts', () => {
    const src = read('src/apps/erp/configs/requestx-sidebar-config.ts');
    expect(src).toContain('rqx-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('requestx · switch case + <ReportBuilder cardId="requestx"/> in RequestXPage.tsx', () => {
    const src = read('src/pages/erp/requestx/RequestXPage.tsx');
    expect(src).toContain("case 'rqx-rpt-report-builder'");
    expect(src).toMatch(/cardId="requestx"/);
  });

  // ── 6. Store-hub (cardId="store-hub") ──────────────────────────────────
  it('store-hub · module id in DepartmentStoreSidebar.tsx union', () => {
    expect(read('src/pages/erp/store-hub/DepartmentStoreSidebar.tsx'))
      .toContain("'sh-rpt-report-builder'");
  });
  it('store-hub · sidebar entry in store-hub-sidebar-config.ts', () => {
    const src = read('src/apps/erp/configs/store-hub-sidebar-config.ts');
    expect(src).toContain('sh-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('store-hub · switch case + <ReportBuilder cardId="store-hub"/> in DepartmentStorePage.tsx', () => {
    const src = read('src/pages/erp/store-hub/DepartmentStorePage.tsx');
    expect(src).toContain("case 'sh-rpt-report-builder'");
    expect(src).toMatch(/cardId="store-hub"/);
  });

  // ── 7. EngineeringX (cardId="engineeringx") ────────────────────────────
  it('engineeringx · module id in EngineeringXSidebar.types.ts union', () => {
    expect(read('src/pages/erp/engineeringx/EngineeringXSidebar.types.ts'))
      .toContain("'ex-rpt-report-builder'");
  });
  it('engineeringx · sidebar entry in engineeringx-sidebar-config.ts', () => {
    const src = read('src/apps/erp/configs/engineeringx-sidebar-config.ts');
    expect(src).toContain('ex-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('engineeringx · switch case + <ReportBuilder cardId="engineeringx"/> in EngineeringXPage.tsx', () => {
    const src = read('src/pages/erp/engineeringx/EngineeringXPage.tsx');
    expect(src).toContain("case 'ex-rpt-report-builder'");
    expect(src).toMatch(/cardId="engineeringx"/);
  });

  // ── 8. SiteX (cardId="sitex") ──────────────────────────────────────────
  it('sitex · module id in SiteXSidebar.types.ts union', () => {
    expect(read('src/pages/erp/sitex/SiteXSidebar.types.ts'))
      .toContain("'sx-rpt-report-builder'");
  });
  it('sitex · sidebar entry in sitex-sidebar-config.ts', () => {
    const src = read('src/apps/erp/configs/sitex-sidebar-config.ts');
    expect(src).toContain('sx-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('sitex · switch case + <ReportBuilder cardId="sitex"/> in SiteXPage.tsx', () => {
    const src = read('src/pages/erp/sitex/SiteXPage.tsx');
    expect(src).toContain("case 'sx-rpt-report-builder'");
    expect(src).toMatch(/cardId="sitex"/);
  });

  // ── 9. MaintainPro (cardId="maintainpro") ──────────────────────────────
  it('maintainpro · module id in MaintainProSidebar.types.ts union', () => {
    expect(read('src/pages/erp/maintainpro/MaintainProSidebar.types.ts'))
      .toContain("'mp-rpt-report-builder'");
  });
  it('maintainpro · sidebar entry in maintainpro-sidebar-config.ts', () => {
    const src = read('src/apps/erp/configs/maintainpro-sidebar-config.ts');
    expect(src).toContain('mp-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('maintainpro · switch case + <ReportBuilder cardId="maintainpro"/> in MaintainProPage.tsx', () => {
    const src = read('src/pages/erp/maintainpro/MaintainProPage.tsx');
    expect(src).toContain("case 'mp-rpt-report-builder'");
    expect(src).toMatch(/cardId="maintainpro"/);
  });

  // ── 10. Vendor-portal (cardId="vendor-portal") ─────────────────────────
  it('vendor-portal · module id in VendorPortalSidebar.types.ts union', () => {
    expect(read('src/pages/erp/vendor-portal/VendorPortalSidebar.types.ts'))
      .toContain("'vp-rpt-report-builder'");
  });
  it('vendor-portal · sidebar entry in vendor-portal-sidebar-config.ts', () => {
    const src = read('src/apps/erp/configs/vendor-portal-sidebar-config.ts');
    expect(src).toContain('vp-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('vendor-portal · switch case + <ReportBuilder cardId="vendor-portal"/> in VendorPortalPage.tsx', () => {
    const src = read('src/pages/erp/vendor-portal/VendorPortalPage.tsx');
    expect(src).toContain("case 'vp-rpt-report-builder'");
    expect(src).toMatch(/cardId="vendor-portal"/);
  });

  // ── 11. Logistic (route-mode · cardId="logistics") ─────────────────────
  it('logistic · sidebar entry in LogisticLayout.tsx (route /erp/logistic/report-builder)', () => {
    const src = read('src/features/logistic/LogisticLayout.tsx');
    expect(src).toContain('/erp/logistic/report-builder');
    expect(src).toContain('Report Builder');
  });
  it('logistic · <ReportBuilder cardId="logistics"/> wrapper + route registered', () => {
    const wrapper = read('src/pages/erp/logistic/LogisticReportBuilder.tsx');
    expect(wrapper).toContain('ReportBuilder');
    expect(wrapper).toMatch(/cardId="logistics"/);
    const app = read('src/App.tsx');
    expect(app).toContain('LogisticReportBuilder');
    expect(app).toContain('/erp/logistic/report-builder');
  });

  // ── GateFlow skip ──────────────────────────────────────────────────────
  it('gateflow · SKIPPED (zero DSC sources per RPT-6c) · 0-DIFF', () => {
    const sidebar = read('src/apps/erp/configs/gateflow-sidebar-config.ts');
    const types = read('src/pages/erp/gateflow/GateFlowSidebar.types.ts');
    expect(sidebar).not.toContain('rpt-report-builder');
    expect(types).not.toContain('rpt-report-builder');
  });

  // ── Frozen-contract guard ──────────────────────────────────────────────
  it('ReportBuilder.tsx + engine + definitions are present (frozen contract consumed, not edited)', () => {
    expect(read('src/components/operix-core/report-framework/ReportBuilder.tsx')).toContain('ReportBuilder');
    expect(read('src/lib/report-framework/report-builder-engine.ts')).toContain('runQuery');
    expect(read('src/lib/report-framework/report-definitions.ts')).toContain('REPORT_DEFINITIONS_KEY');
  });

  // ── Sprint history ─────────────────────────────────────────────────────
  it('sprint-history · RPT-9b backfilled to 7ae3576; RPT-9c self-seeded with predecessor 7ae3576', () => {
    const src = read('src/lib/_institutional/sprint-history.ts');
    expect(src).toContain("'T-RPT9b-Builder-Rollout-FinHub'");
    expect(src).toMatch(/T-RPT9b-Builder-Rollout-FinHub[\s\S]{0,400}headSha: '7ae3576'/);
    expect(src).toContain("'T-RPT9c-Builder-Rollout-Ops'");
    expect(src).toMatch(/T-RPT9c-Builder-Rollout-Ops[\s\S]{0,400}predecessorSha: '7ae3576'/);
  });
});
