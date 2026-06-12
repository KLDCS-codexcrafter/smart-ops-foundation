/**
 * @file        report-builder-mounts-sales.test.tsx
 * @sprint      RPT-9d · Builder Rollout — Sales Cards (5 mounts)
 * @purpose     Per-card mount confirmation: each of the 5 target Sales cards has
 *              (1) module id in its module union / sidebar config, AND
 *              (2) <ReportBuilder cardId="…" /> wired in the page.
 *              WebStoreX is intentionally SKIPPED (zero DSC sources).
 *
 * Strategy: source-text assertions (same as RPT-9b/9c). Full page render is
 * impractical for shell-wrapped cards. Source text proves the mount triplet.
 * ReportBuilder.tsx itself is unit-tested in report-framework/__tests__.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const read = (p: string): string => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('RPT-9d · Report Builder mount · per-Sales-card confirmations', () => {
  // ── 1. SalesX ─────────────────────────────────────────────────────────
  it('salesx · module id in SalesXSidebar.types.ts union', () => {
    const src = read('src/features/salesx/SalesXSidebar.types.ts');
    expect(src).toContain("'sx-rpt-report-builder'");
  });
  it('salesx · sidebar entry in SalesXSidebar.tsx', () => {
    const src = read('src/features/salesx/SalesXSidebar.tsx');
    expect(src).toContain('sx-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('salesx · switch case + <ReportBuilder cardId="salesx"/> in SalesXPage.tsx', () => {
    const src = read('src/features/salesx/SalesXPage.tsx');
    expect(src).toContain("case 'sx-rpt-report-builder'");
    expect(src).toMatch(/cardId="salesx"/);
  });

  // ── 2. Distributor Hub ────────────────────────────────────────────────
  it('distributor-hub · module id in DistributorHubSidebar.tsx union', () => {
    expect(read('src/pages/erp/distributor-hub/DistributorHubSidebar.tsx'))
      .toContain("'dh-rpt-report-builder'");
  });
  it('distributor-hub · sidebar entry in DistributorHubSidebar.tsx', () => {
    const src = read('src/pages/erp/distributor-hub/DistributorHubSidebar.tsx');
    expect(src).toContain('dh-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('distributor-hub · switch case + <ReportBuilder cardId="distributor-hub"/> in DistributorHubPage.tsx', () => {
    const src = read('src/pages/erp/distributor-hub/DistributorHubPage.tsx');
    expect(src).toContain("case 'dh-rpt-report-builder'");
    expect(src).toMatch(/cardId="distributor-hub"/);
  });

  // ── 3. Customer Hub ───────────────────────────────────────────────────
  it('customer-hub · module id in CustomerHubSidebar.tsx union', () => {
    expect(read('src/pages/erp/customer-hub/CustomerHubSidebar.tsx'))
      .toContain("'ch-rpt-report-builder'");
  });
  it('customer-hub · sidebar entry in CustomerHubSidebar.tsx', () => {
    const src = read('src/pages/erp/customer-hub/CustomerHubSidebar.tsx');
    expect(src).toContain('ch-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('customer-hub · switch case + <ReportBuilder cardId="customer-hub"/> in CustomerHubPage.tsx', () => {
    const src = read('src/pages/erp/customer-hub/CustomerHubPage.tsx');
    expect(src).toContain("case 'ch-rpt-report-builder'");
    expect(src).toMatch(/cardId="customer-hub"/);
  });

  // ── 4. ProjX ──────────────────────────────────────────────────────────
  it('projx · module id in ProjXSidebar.types.ts union', () => {
    expect(read('src/pages/erp/projx/ProjXSidebar.types.ts'))
      .toContain("'projx-rpt-report-builder'");
  });
  it('projx · sidebar entry in ProjXSidebar.tsx', () => {
    const src = read('src/pages/erp/projx/ProjXSidebar.tsx');
    expect(src).toContain('projx-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('projx · switch case + <ReportBuilder cardId="projx"/> in ProjXPage.tsx', () => {
    const src = read('src/pages/erp/projx/ProjXPage.tsx');
    expect(src).toContain("case 'projx-rpt-report-builder'");
    expect(src).toMatch(/cardId="projx"/);
  });

  // ── 5. EcomX ──────────────────────────────────────────────────────────
  it('ecomx · module id in EcomXSidebar.types.ts union', () => {
    expect(read('src/pages/erp/ecomx/EcomXSidebar.types.ts'))
      .toContain("'ecomx-rpt-report-builder'");
  });
  it('ecomx · sidebar entry in ecomx-sidebar-config.ts', () => {
    const src = read('src/apps/erp/configs/ecomx-sidebar-config.ts');
    expect(src).toContain('ecomx-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('ecomx · switch case + <ReportBuilder cardId="ecomx"/> in EcomXPage.tsx', () => {
    const src = read('src/pages/erp/ecomx/EcomXPage.tsx');
    expect(src).toContain("case 'ecomx-rpt-report-builder'");
    expect(src).toMatch(/cardId="ecomx"/);
  });

  // ── WebStoreX honest skip ─────────────────────────────────────────────
  it('webstorex · NOT mounted (zero DSC sources · hub-wide skip per RPT-7)', () => {
    const types = read('src/apps/erp/configs/webstorex-sidebar-config.ts');
    expect(types).not.toContain('rpt-report-builder');
  });

  // ── Frozen contract ───────────────────────────────────────────────────
  it('ReportBuilder.tsx remains frozen (no RPT-9d edits)', () => {
    const src = read('src/components/operix-core/report-framework/ReportBuilder.tsx');
    expect(src).not.toContain('RPT-9d');
  });
  it('report-builder-engine.ts remains frozen (no RPT-9d edits)', () => {
    const src = read('src/lib/report-framework/report-builder-engine.ts');
    expect(src).not.toContain('RPT-9d');
  });
});
