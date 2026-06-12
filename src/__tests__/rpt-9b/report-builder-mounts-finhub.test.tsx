/**
 * @file        report-builder-mounts-finhub.test.tsx
 * @sprint      RPT-9b · Builder Rollout — Fin Hub + Command Center (6 mounts)
 * @purpose     Per-card mount confirmation: each of the 6 target cards has
 *              (1) module id in its module union / sidebar config, AND
 *              (2) <ReportBuilder cardId="…" /> wired in the page / route.
 *
 * Strategy: source-text assertions. Full page rendering is impractical for
 * shell-wrapped cards (providers, hooks, route guards). Source text proves
 * the mount triplet exists for every card. ReportBuilder.tsx itself is
 * tested in src/components/operix-core/report-framework/__tests__.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const read = (p: string): string => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('RPT-9b · Report Builder mount · per-card confirmations', () => {
  // ── 1. EximX ──────────────────────────────────────────────────────────
  it('eximx · module id in EximX.types.ts union', () => {
    expect(read('src/pages/erp/eximx/EximX.types.ts'))
      .toContain("'eximx-rpt-report-builder'");
  });
  it('eximx · sidebar entry in eximx-sidebar-config.ts', () => {
    const src = read('src/apps/erp/configs/eximx-sidebar-config.ts');
    expect(src).toContain('eximx-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('eximx · <ReportBuilder cardId="eximx"/> rendered in EximXPage.tsx', () => {
    const src = read('src/pages/erp/eximx/EximXPage.tsx');
    expect(src).toContain('ReportBuilder');
    expect(src).toMatch(/cardId="eximx"/);
  });

  // ── 2. ReceivX ────────────────────────────────────────────────────────
  it('receivx · module id in ReceivXSidebar.types.ts union', () => {
    expect(read('src/features/receivx/ReceivXSidebar.types.ts'))
      .toContain("'rx-rpt-report-builder'");
  });
  it('receivx · sidebar entry in ReceivXSidebar.tsx', () => {
    const src = read('src/features/receivx/ReceivXSidebar.tsx');
    expect(src).toContain('rx-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('receivx · switch case + <ReportBuilder cardId="receivx"/> in ReceivXPage.tsx', () => {
    const src = read('src/features/receivx/ReceivXPage.tsx');
    expect(src).toContain("case 'rx-rpt-report-builder'");
    expect(src).toMatch(/cardId="receivx"/);
  });

  // ── 3. PayOut (route-based mount) ─────────────────────────────────────
  it('payout · sidebar entry in PayOutSidebar.tsx (route /erp/payout/report-builder)', () => {
    const src = read('src/features/payout/PayOutSidebar.tsx');
    expect(src).toContain('po-rpt-report-builder');
    expect(src).toContain('/erp/payout/report-builder');
  });
  it('payout · <ReportBuilder cardId="payout"/> route registered in App.tsx', () => {
    const src = read('src/App.tsx');
    expect(src).toContain('PayOutReportBuilder');
    expect(src).toMatch(/cardId="payout"/);
  });

  // ── 4. Bill Passing ───────────────────────────────────────────────────
  it('bill-passing · module id in BillPassingSidebar.types.ts union', () => {
    expect(read('src/pages/erp/bill-passing/BillPassingSidebar.types.ts'))
      .toContain("'bp-rpt-report-builder'");
  });
  it('bill-passing · sidebar entry in BillPassingSidebar.tsx', () => {
    const src = read('src/pages/erp/bill-passing/BillPassingSidebar.tsx');
    expect(src).toContain('bp-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('bill-passing · switch case + <ReportBuilder cardId="bill-passing"/> in BillPassingPage.tsx', () => {
    const src = read('src/pages/erp/bill-passing/BillPassingPage.tsx');
    expect(src).toContain("case 'bp-rpt-report-builder'");
    expect(src).toMatch(/cardId="bill-passing"/);
  });

  // ── 5. Comply360 ──────────────────────────────────────────────────────
  it('comply360 · module id in Comply360Sidebar.types.ts union', () => {
    expect(read('src/pages/erp/comply360/Comply360Sidebar.types.ts'))
      .toContain("'c360-rpt-report-builder'");
  });
  it('comply360 · sidebar entry in comply360-sidebar-config.ts', () => {
    const src = read('src/apps/erp/configs/comply360-sidebar-config.ts');
    expect(src).toContain('c360-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('comply360 · switch case + <ReportBuilder cardId="comply360"/> in Comply360Page.tsx', () => {
    const src = read('src/pages/erp/comply360/Comply360Page.tsx');
    expect(src).toContain("case 'c360-rpt-report-builder'");
    expect(src).toMatch(/cardId="comply360"/);
  });

  // ── 6. Command Center ─────────────────────────────────────────────────
  it('command-center · module id in CommandCenterPage.tsx union', () => {
    const src = read('src/features/command-center/pages/CommandCenterPage.tsx');
    expect(src).toContain("'cc-rpt-report-builder'");
  });
  it('command-center · sidebar entry in command-center-sidebar-config.ts', () => {
    const src = read('src/apps/erp/configs/command-center-sidebar-config.ts');
    expect(src).toContain('cc-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('command-center · switch case + <ReportBuilder cardId="command-center"/> in CommandCenterPage.tsx', () => {
    const src = read('src/features/command-center/pages/CommandCenterPage.tsx');
    expect(src).toContain("case 'cc-rpt-report-builder'");
    expect(src).toMatch(/cardId="command-center"/);
  });

  // ── Frozen-contract guard ─────────────────────────────────────────────
  it('ReportBuilder.tsx + engine + definitions are present (frozen contract consumed, not edited)', () => {
    expect(read('src/components/operix-core/report-framework/ReportBuilder.tsx')).toContain('ReportBuilder');
    expect(read('src/lib/report-framework/report-builder-engine.ts')).toContain('runQuery');
    expect(read('src/lib/report-framework/report-definitions.ts')).toContain('REPORT_DEFINITIONS_KEY');
  });

  // ── Sprint history ────────────────────────────────────────────────────
  it('sprint-history · RPT-9a backfilled to b99cd9a; RPT-9b self-seeded with predecessor b99cd9a', () => {
    const src = read('src/lib/_institutional/sprint-history.ts');
    expect(src).toContain("'T-RPT9a-User-Report-Builder'");
    expect(src).toContain("headSha: 'b99cd9a'");
    expect(src).toContain("'T-RPT9b-Builder-Rollout-FinHub'");
    expect(src).toContain("predecessorSha: 'b99cd9a'");
  });
});
