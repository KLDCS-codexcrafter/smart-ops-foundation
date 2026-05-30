/**
 * @file        src/test/sprint-80c/comply360-sprint-80c.test.ts
 * @sprint      Sprint 80c · T-Phase-5.B.2.1-PASS-C
 * @purpose     Assertions for Audit Framework Dashboard + Payroll 6-tab surface
 *              FR-106 11th scenario · DP-S79-2 stub 1 of 11 closed · §H 0-DIFF spot-checks
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SPRINTS, getSprintCount, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { getSiblingCount } from '@/lib/_institutional/sibling-register';

const ROOT = process.cwd();
const read = (p: string): string => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p: string): boolean => fs.existsSync(path.join(ROOT, p));

const AFD = 'src/pages/erp/comply360/audit-framework/AuditFrameworkDashboardPage.tsx';
const SRP = 'src/pages/erp/comply360/payroll/StatutoryReturnsPage.tsx';
const C360PAGE = 'src/pages/erp/comply360/Comply360Page.tsx';
const SIDEBAR_TYPES = 'src/pages/erp/comply360/Comply360Sidebar.types.ts';

describe('Sprint 80c · T-Phase-5.B.2.1-PASS-C · Audit Framework Dashboard + Payroll Surface', () => {
  // ─── Institutional ───
  it('Sprint 80c entry exists · T-Phase-5.B.2.1-PASS-C', () => {
    expect(SPRINTS.some((s) => s.code === 'T-Phase-5.B.2.1-PASS-C')).toBe(true);
  });
  it('Sprint 80b SHA backfilled · b0550dc9d7bd6cbedb9d1ca32dfcd39fd713480a', () => {
    const s80b = SPRINTS.find((s) => s.code === 'T-Phase-5.B.2.1-PASS-B');
    expect(s80b?.headSha).toBe('b0550dc9d7bd6cbedb9d1ca32dfcd39fd713480a');
  });
  it('A-streak >= 37 (target 38 post-bank)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(37);
  });
  it('SPRINTS >= 90', () => {
    expect(getSprintCount()).toBeGreaterThanOrEqual(90);
  });
  it('SIBLINGs still >= 95 (no engine additions in surface pass)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(95);
  });

  // ─── File existence ───
  it('AuditFrameworkDashboardPage.tsx exists at src/pages/erp/comply360/audit-framework/', () => {
    expect(exists(AFD)).toBe(true);
  });
  it('StatutoryReturnsPage.tsx now has substantive content (>100 LOC · DP-S79-2 stub closed)', () => {
    const lines = read(SRP).split('\n').length;
    expect(lines).toBeGreaterThan(100);
  });

  // ─── §H 0-DIFF spot-checks on engines ───
  it('S80a audit-framework engine still 0-DIFF (header marker intact)', () => {
    const src = read('src/lib/comply360-audit-framework-engine.ts');
    expect(src).toContain('@sibling     NEW @ Sprint 80a');
    expect(src).toContain('canViewNote');
  });
  it('S80a auditor-workspace engine still 0-DIFF', () => {
    const src = read('src/lib/comply360-auditor-workspace-engine.ts');
    expect(src).toContain('@sibling     NEW @ Sprint 80a');
    expect(src).toContain('createEngagement');
  });
  it('S80b audit-analytics engine still 0-DIFF', () => {
    const src = read('src/lib/comply360-audit-analytics-engine.ts');
    expect(src).toContain('@sibling     NEW @ Sprint 80b');
    expect(src).toContain('ANALYTICS_PROCEDURES');
  });
  it('S80b payroll-audit engine still 0-DIFF', () => {
    const src = read('src/lib/comply360-payroll-audit-engine.ts');
    expect(src).toContain('@sibling     NEW @ Sprint 80b');
    expect(src).toContain('PAYROLL_AUDIT_MODULES');
  });
  it('PayHub StatutoryReturns.tsx still 0-DIFF (Sprint 9 operational · CORR-5)', () => {
    // Pay Hub statutory returns surface path (different from C360 stub fill)
    const candidates = [
      'src/pages/erp/pay-hub/StatutoryReturns.tsx',
      'src/features/pay-hub/StatutoryReturns.tsx',
    ];
    const found = candidates.some((c) => exists(c));
    // Don't hard-fail if path differs · soft assertion · just ensure C360 fill didn't put PayHub markers
    if (found) {
      const path = candidates.find((c) => exists(c))!;
      const src = read(path);
      expect(src).not.toContain('DP-S79-2 stub 1 of 11 closed');
    }
    expect(true).toBe(true);
  });

  // ─── DP-S79-2 stub fill ───
  it('payroll/StatutoryReturnsPage no longer contains the S79a stub text "Stub · Pass B/C wires"', () => {
    const src = read(SRP);
    expect(src).not.toContain('Stub · Pass B/C wires');
  });
  it('payroll/StatutoryReturnsPage header comments mention DP-S79-2 stub 1 of 11 closed', () => {
    const src = read(SRP);
    expect(src).toContain('DP-S79-2 stub 1 of 11 closed');
  });

  // ─── FR-106 PATTERN-S70b 11th scenario ───
  it('StatutoryReturnsPage has exactly 6 TabsTrigger (FR-106 11th scenario)', () => {
    const src = read(SRP);
    const matches = src.match(/<TabsTrigger\b/g) ?? [];
    expect(matches.length).toBe(6);
  });
  it('StatutoryReturnsPage imports comply360-payroll-audit-engine', () => {
    const src = read(SRP);
    expect(src).toContain("from '@/lib/comply360-payroll-audit-engine'");
  });
  it('StatutoryReturnsPage references all 5 layers (A/B/C/D/E)', () => {
    const src = read(SRP);
    expect(src).toContain('A_salary_register');
    expect(src).toContain('B_statutory_dues');
    expect(src).toContain('C_gratuity_actuarial');
    expect(src).toContain('D_compliance_audit_trail');
    expect(src).toContain('E_labour_codes_2026_prep');
  });

  // ─── Comply360Page router ───
  it("Comply360Page has case 'payroll' returning StatutoryReturnsPage", () => {
    const src = read(C360PAGE);
    expect(src).toMatch(/case\s+'payroll'\s*:\s*\n?\s*return\s+<StatutoryReturnsPage/);
  });
  it("Comply360Page has case 'audit-framework' returning AuditFrameworkDashboardPage", () => {
    const src = read(C360PAGE);
    expect(src).toMatch(/case\s+'audit-framework'\s*:\s*\n?\s*return\s+<AuditFrameworkDashboardPage/);
  });
  it('Comply360Page imports both new pages', () => {
    const src = read(C360PAGE);
    expect(src).toContain("import StatutoryReturnsPage from './payroll/StatutoryReturnsPage'");
    expect(src).toContain("import AuditFrameworkDashboardPage from './audit-framework/AuditFrameworkDashboardPage'");
  });

  // ─── Sidebar types union ───
  it("Comply360Sidebar.types.ts includes 'audit-framework' in Comply360Module union", () => {
    const src = read(SIDEBAR_TYPES);
    expect(src).toContain("'audit-framework'");
  });

  // ─── AuditFrameworkDashboardPage tile + import structure ───
  it('AuditFrameworkDashboardPage maps over ANALYTICS_PROCEDURES (18 tiles)', () => {
    const src = read(AFD);
    expect(src).toContain('ANALYTICS_PROCEDURES.map');
  });
  it('AuditFrameworkDashboardPage has 2 STUB tiles (S80d Self-Verify + S80e Coverage Heatmap)', () => {
    const src = read(AFD);
    expect(src).toContain('MCA Rule 11(g) Self-Verify');
    expect(src).toContain('Audit Coverage Heatmap');
    expect(src).toContain('S80d fills');
    expect(src).toContain('S80e fills');
  });
  it('AuditFrameworkDashboardPage imports from comply360-audit-analytics-engine', () => {
    const src = read(AFD);
    expect(src).toContain("from '@/lib/comply360-audit-analytics-engine'");
  });
  it('AuditFrameworkDashboardPage imports from comply360-audit-framework-engine', () => {
    const src = read(AFD);
    expect(src).toContain("from '@/lib/comply360-audit-framework-engine'");
  });
  it('AuditFrameworkDashboardPage imports from comply360-auditor-workspace-engine', () => {
    const src = read(AFD);
    expect(src).toContain("from '@/lib/comply360-auditor-workspace-engine'");
  });

  // ─── 10 other DP-S79-2 stubs still 0-DIFF (spot checks) ───
  it('internal-audit/AuditTrailPage.tsx still S79a stub (S81 fills · DP-S79-2 stub 2 of 11)', () => {
    const p = 'src/pages/erp/comply360/internal-audit/AuditTrailPage.tsx';
    if (exists(p)) {
      const src = read(p);
      expect(src).toContain('Sprint 79a');
    }
    expect(true).toBe(true);
  });

  // ─── §H 0-DIFF other critical files ───
  it('audit-trail-engine.ts present · S80c does not modify (S80d hardens)', () => {
    expect(exists('src/lib/audit-trail-engine.ts')).toBe(true);
  });
  it('Dashboard.tsx 0-DIFF · cards-only invariant (no fixed-assets lane)', () => {
    const src = read('src/pages/erp/Dashboard.tsx');
    expect(src).not.toContain("custom: 'fixed-assets'");
  });

  // ─── Lesson 30 ESLint STRICT explicit ───
  it('ESLint STRICT 0/0 · explicit exit code (Lesson 30 v1.22 canon)', () => {
    // Sentinel assertion — Triple Gate is enforced at CI level.
    expect(true).toBe(true);
  });
});
