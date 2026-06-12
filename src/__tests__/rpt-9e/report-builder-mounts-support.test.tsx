/**
 * @file        report-builder-mounts-support.test.tsx
 * @sprint      RPT-9e · Builder Rollout — Support Cards (6 mounts · closes RPT-9)
 * @purpose     Per-card mount confirmation for the 6 Support cards
 *              (frontdesk · servicedesk · taskflow · docvault · pay-hub · dispatch)
 *              and the RPT-9 closing coverage assertion (≥30 cards carry the
 *              `-rpt-report-builder` mount across pages + configs + features).
 *
 * Strategy: source-text assertions (same as RPT-9b/9c/9d). ReportBuilder.tsx
 * itself is unit-tested in report-framework/__tests__.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const read = (p: string): string => readFileSync(resolve(process.cwd(), p), 'utf8');

function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[] = [];
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue;
      walk(full, acc);
    } else if (/\.(ts|tsx)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('RPT-9e · Report Builder mount · per-Support-card confirmations', () => {
  // ── 1. FrontDesk ──────────────────────────────────────────────────────
  it('frontdesk · module id in FrontDeskSidebar.types.ts union', () => {
    expect(read('src/pages/erp/frontdesk/FrontDeskSidebar.types.ts'))
      .toContain("'fd-rpt-report-builder'");
  });
  it('frontdesk · sidebar entry in frontdesk-sidebar-config.ts', () => {
    const src = read('src/apps/erp/configs/frontdesk-sidebar-config.ts');
    expect(src).toContain('fd-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('frontdesk · switch case + <ReportBuilder cardId="frontdesk"/> in FrontDeskPage.tsx', () => {
    const src = read('src/pages/erp/frontdesk/FrontDeskPage.tsx');
    expect(src).toContain("case 'fd-rpt-report-builder'");
    expect(src).toMatch(/cardId="frontdesk"/);
  });

  // ── 2. ServiceDesk ────────────────────────────────────────────────────
  it('servicedesk · module id in ServiceDeskSidebar.types.ts union', () => {
    expect(read('src/pages/erp/servicedesk/ServiceDeskSidebar.types.ts'))
      .toContain("'sd-rpt-report-builder'");
  });
  it('servicedesk · sidebar entry in servicedesk-sidebar-config.ts', () => {
    const src = read('src/apps/erp/configs/servicedesk-sidebar-config.ts');
    expect(src).toContain('sd-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('servicedesk · switch case + <ReportBuilder cardId="servicedesk"/> in ServiceDeskPage.tsx', () => {
    const src = read('src/pages/erp/servicedesk/ServiceDeskPage.tsx');
    expect(src).toContain("case 'sd-rpt-report-builder'");
    expect(src).toMatch(/cardId="servicedesk"/);
  });

  // ── 3. TaskFlow ───────────────────────────────────────────────────────
  it('taskflow · module id in TaskFlowSidebar.types.ts union', () => {
    expect(read('src/pages/erp/taskflow/TaskFlowSidebar.types.ts'))
      .toContain("'tf-rpt-report-builder'");
  });
  it('taskflow · sidebar entry in taskflow-sidebar-config.ts', () => {
    const src = read('src/apps/erp/configs/taskflow-sidebar-config.ts');
    expect(src).toContain('tf-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('taskflow · switch case + <ReportBuilder cardId="taskflow"/> in TaskFlowPage.tsx', () => {
    const src = read('src/pages/erp/taskflow/TaskFlowPage.tsx');
    expect(src).toContain("case 'tf-rpt-report-builder'");
    expect(src).toMatch(/cardId="taskflow"/);
  });

  // ── 4. DocVault ───────────────────────────────────────────────────────
  it('docvault · module id in DocVaultSidebar.types.ts union', () => {
    expect(read('src/pages/erp/docvault/DocVaultSidebar.types.ts'))
      .toContain("'dv-rpt-report-builder'");
  });
  it('docvault · sidebar entry in docvault-sidebar-config.ts', () => {
    const src = read('src/apps/erp/configs/docvault-sidebar-config.ts');
    expect(src).toContain('dv-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('docvault · switch case + <ReportBuilder cardId="docvault"/> in DocVaultPage.tsx', () => {
    const src = read('src/pages/erp/docvault/DocVaultPage.tsx');
    expect(src).toContain("case 'dv-rpt-report-builder'");
    expect(src).toMatch(/cardId="docvault"/);
  });

  // ── 5. Pay-Hub (cardId='peoplepay') ───────────────────────────────────
  it('pay-hub · module id in PayHubSidebar.tsx union', () => {
    expect(read('src/features/pay-hub/PayHubSidebar.tsx'))
      .toContain("'ph-rpt-report-builder'");
  });
  it('pay-hub · sidebar entry in PayHubSidebar.tsx', () => {
    const src = read('src/features/pay-hub/PayHubSidebar.tsx');
    expect(src).toContain('ph-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('pay-hub · switch case + <ReportBuilder cardId="peoplepay"/> in PayHubPage.tsx', () => {
    const src = read('src/features/pay-hub/PayHubPage.tsx');
    expect(src).toContain("case 'ph-rpt-report-builder'");
    expect(src).toMatch(/cardId="peoplepay"/);
  });

  // ── 6. Dispatch (cardId='dispatch-hub') ───────────────────────────────
  it('dispatch · module id in DispatchHubSidebar.tsx union', () => {
    expect(read('src/pages/erp/dispatch/DispatchHubSidebar.tsx'))
      .toContain("'disp-rpt-report-builder'");
  });
  it('dispatch · sidebar entry in DispatchHubSidebar.tsx', () => {
    const src = read('src/pages/erp/dispatch/DispatchHubSidebar.tsx');
    expect(src).toContain('disp-rpt-report-builder');
    expect(src).toContain('Report Builder');
  });
  it('dispatch · switch case + <ReportBuilder cardId="dispatch-hub"/> in DispatchHubPage.tsx', () => {
    const src = read('src/pages/erp/dispatch/DispatchHubPage.tsx');
    expect(src).toContain("case 'disp-rpt-report-builder'");
    expect(src).toMatch(/cardId="dispatch-hub"/);
  });

  // ── 7. RPT-9 CLOSING COVERAGE ─────────────────────────────────────────
  it('RPT-9 close · grep-count `-rpt-report-builder` occurrences across pages + configs + features ≥ 30', () => {
    const roots = [
      resolve(process.cwd(), 'src/pages/erp'),
      resolve(process.cwd(), 'src/apps/erp/configs'),
      resolve(process.cwd(), 'src/features'),
    ];
    let occurrences = 0;
    const RE = /-rpt-report-builder/g;
    for (const root of roots) {
      for (const file of walk(root)) {
        if (file.includes(`${resolve(process.cwd(), 'src/__tests__')}`)) continue;
        const src = read(file.replace(resolve(process.cwd()) + '/', ''));
        const matches = src.match(RE);
        if (matches) occurrences += matches.length;
      }
    }
    expect(occurrences).toBeGreaterThanOrEqual(30);
  });

  it('RPT-9 close · ≥30 distinct page/feature files render <ReportBuilder', () => {
    const roots = [
      resolve(process.cwd(), 'src/pages'),
      resolve(process.cwd(), 'src/features'),
    ];
    const mounted = new Set<string>();
    for (const root of roots) {
      for (const file of walk(root)) {
        const rel = file.replace(resolve(process.cwd()) + '/', '');
        const src = read(rel);
        if (/<ReportBuilder\b|<PayOutReportBuilder\b/.test(src)) mounted.add(rel);
      }
    }
    // include App.tsx route mounts (payout)
    const app = read('src/App.tsx');
    if (/<PayOutReportBuilder\b/.test(app)) mounted.add('src/App.tsx');
    expect(mounted.size).toBeGreaterThanOrEqual(30);
  });
});
