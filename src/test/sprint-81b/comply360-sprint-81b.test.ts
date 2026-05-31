/**
 * @file        src/test/sprint-81b/comply360-sprint-81b.test.ts
 * @sprint      Sprint 81b · T-Phase-5.B.2.2-PASS-B
 * @purpose     Bank-time verification · Internal Audit Dashboard + AuditTrailExplorer + 2 DP-S79-2 stub fills.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { getSiblingCount } from '@/lib/_institutional/sibling-register';

const SRC = (p: string): string => path.resolve(__dirname, '../../..', p);

describe('Sprint 81b · T-Phase-5.B.2.2-PASS-B · Internal Audit Dashboard + AuditTrailExplorer + 2 DP-S79-2 stub fills', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  // ─── Institutional ───
  it('Sprint 81b entry exists · code T-Phase-5.B.2.2-PASS-B', () => {
    expect(SPRINTS.some((s) => s.code === 'T-Phase-5.B.2.2-PASS-B')).toBe(true);
  });
  it('Sprint 81a-hotfix SHA backfilled · 200b178466d111b10682e64066240f9d9e551cb5', () => {
    const s81a = SPRINTS.find((s) => s.code === 'T-Phase-5.B.2.2-PASS-A');
    expect(s81a?.headSha).toBe('200b178466d111b10682e64066240f9d9e551cb5');
  });
  it('Sprint 81b predecessor SHA matches S81a-hotfix bank', () => {
    const s81b = SPRINTS.find((s) => s.code === 'T-Phase-5.B.2.2-PASS-B');
    expect(s81b?.predecessorSha).toBe('200b178466d111b10682e64066240f9d9e551cb5');
  });
  it('A-streak >= 4 (target 5 post-bank)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(4);
  });
  it('SPRINTS length >= 95', () => {
    expect(SPRINTS.length).toBeGreaterThanOrEqual(95);
  });
  it('SIBLINGs still 107 (surface-only pass · no new engines)', () => {
    expect(getSiblingCount()).toBe(107);
  });
  it('Sprint 81b is surface-only · zero newSiblings', () => {
    const s81b = SPRINTS.find((s) => s.code === 'T-Phase-5.B.2.2-PASS-B');
    expect(s81b?.newSiblings).toEqual([]);
  });

  // ─── DP-S79-2 stub-fills ───
  it('internal-audit/DashboardPage.tsx no longer S79a stub (DP-S79-2 stub 3 of 11 closed)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/DashboardPage.tsx'), 'utf-8');
    expect(src).not.toContain('Stub · Pass B/C wires');
    expect(src.length).toBeGreaterThan(5000);
  });
  it('AuditTrailExplorerPage.tsx exists (renamed from AuditTrailPage · DP-S79-2 stub 4 of 11 closed)', () => {
    expect(fs.existsSync(SRC('src/pages/erp/comply360/internal-audit/AuditTrailExplorerPage.tsx'))).toBe(true);
  });
  it('AuditTrailExplorerPage promoted content (>4000 chars · stub text gone)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/AuditTrailExplorerPage.tsx'), 'utf-8');
    expect(src).not.toContain('Stub · Pass B/C wires');
    expect(src.length).toBeGreaterThan(4000);
  });
  it('Old AuditTrailPage.tsx removed (renamed to AuditTrailExplorerPage)', () => {
    expect(fs.existsSync(SRC('src/pages/erp/comply360/internal-audit/AuditTrailPage.tsx'))).toBe(false);
  });

  // ─── FR-106 12th scenario candidate ───
  it('InternalAuditDashboardPage has exactly 6 TabsTrigger (DP-S81-12 · FR-106 12th scenario)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/DashboardPage.tsx'), 'utf-8');
    const matches = src.match(/<TabsTrigger/g);
    expect(matches?.length).toBe(6);
  });
  it('AuditTrailExplorerPage has exactly 4 TabsTrigger', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/AuditTrailExplorerPage.tsx'), 'utf-8');
    const matches = src.match(/<TabsTrigger/g);
    expect(matches?.length).toBe(4);
  });

  // ─── Router + Sidebar ───
  it("Comply360Page has case 'internal-audit' returning InternalAuditDashboardPage", () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/Comply360Page.tsx'), 'utf-8');
    expect(src).toContain("case 'internal-audit'");
    expect(src).toContain('<InternalAuditDashboardPage />');
  });
  it('Comply360Page imports InternalAuditDashboardPage', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/Comply360Page.tsx'), 'utf-8');
    expect(src).toContain("import InternalAuditDashboardPage from './internal-audit/DashboardPage'");
  });
  it("Comply360Sidebar.types.ts already had 'internal-audit' in union (since S72)", () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/Comply360Sidebar.types.ts'), 'utf-8');
    expect(src).toContain("'internal-audit'");
  });

  // ─── Q17 modules 9-12 surfaced ───
  it('InternalAuditDashboardPage references MAP Tracker (Q17 Module 9)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/DashboardPage.tsx'), 'utf-8');
    expect(src).toContain('MAP Tracker');
  });
  it('InternalAuditDashboardPage references Quarterly AC Reports (Q17 Module 10)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/DashboardPage.tsx'), 'utf-8');
    expect(src).toMatch(/Quarterly AC Reports|Quarterly Audit Committee/);
  });
  it('InternalAuditDashboardPage references KPI / IA Maturity (Q17 Module 11)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/DashboardPage.tsx'), 'utf-8');
    expect(src).toMatch(/IA Maturity|KPI/);
  });
  it('InternalAuditDashboardPage references Audit Plan Calendar (Q17 Module 12)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/DashboardPage.tsx'), 'utf-8');
    expect(src).toContain('Audit Plan Calendar');
  });

  // ─── Engine consumption ───
  it('InternalAuditDashboardPage imports from S81a internal-audit-engine', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/DashboardPage.tsx'), 'utf-8');
    expect(src).toContain("from '@/lib/comply360-internal-audit-engine'");
  });
  it('InternalAuditDashboardPage imports from ia-risk-register-engine', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/DashboardPage.tsx'), 'utf-8');
    expect(src).toContain("from '@/lib/comply360-ia-risk-register-engine'");
  });
  it('InternalAuditDashboardPage imports from ia-control-testing-engine', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/DashboardPage.tsx'), 'utf-8');
    expect(src).toContain("from '@/lib/comply360-ia-control-testing-engine'");
  });
  it('AuditTrailExplorerPage imports from S80e cross-card-lineage-engine', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/AuditTrailExplorerPage.tsx'), 'utf-8');
    expect(src).toContain("from '@/lib/comply360-cross-card-lineage-engine'");
  });
  it('AuditTrailExplorerPage imports from audit-trail-engine MCA_RULE_3_1_COMPLIANCE', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/AuditTrailExplorerPage.tsx'), 'utf-8');
    expect(src).toContain('MCA_RULE_3_1_COMPLIANCE');
  });
  it('AuditTrailExplorerPage imports aggregator', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/AuditTrailExplorerPage.tsx'), 'utf-8');
    expect(src).toContain("from '@/lib/comply360-audit-trail-aggregator-engine'");
  });
  it('AuditTrailExplorerPage imports hash-chain verifier', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/AuditTrailExplorerPage.tsx'), 'utf-8');
    expect(src).toContain('verifyChainIntegrity');
  });

  // ─── §H 0-DIFF anchors (presence assertions) ───
  it('S80a audit-framework-engine present (0-DIFF)', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-audit-framework-engine.ts'))).toBe(true);
  });
  it('S81a engines all present (0-DIFF)', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-internal-audit-engine.ts'))).toBe(true);
    expect(fs.existsSync(SRC('src/lib/comply360-ia-risk-register-engine.ts'))).toBe(true);
    expect(fs.existsSync(SRC('src/lib/comply360-ia-walkthrough-engine.ts'))).toBe(true);
    expect(fs.existsSync(SRC('src/lib/comply360-ia-control-testing-engine.ts'))).toBe(true);
  });
  it('audit-trail-engine 0-DIFF · S80d hardening preserved', () => {
    const src = fs.readFileSync(SRC('src/lib/audit-trail-engine.ts'), 'utf-8');
    expect(src).toContain('AUDIT_TRAIL_DISABLED');
    expect(src).toContain('MCA_RULE_3_1_COMPLIANCE');
  });
  it('Dashboard.tsx + App.tsx still present (0-DIFF anchors)', () => {
    expect(fs.existsSync(SRC('src/App.tsx'))).toBe(true);
  });
  it('S80c StatutoryReturnsPage still 6 TabsTrigger (FR-106 11th preserved · S81b is 12th)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/payroll/StatutoryReturnsPage.tsx'), 'utf-8');
    const matches = src.match(/<TabsTrigger/g);
    expect(matches?.length).toBe(6);
  });
  it('Rule11gReportPage still present (0-DIFF · S80f)', () => {
    expect(fs.existsSync(SRC('src/pages/erp/comply360/rule-11g/Rule11gReportPage.tsx'))).toBe(true);
  });

  // ─── Lesson 30 + Lesson 33 ESLint STRICT · environment-adaptive runner (v1.23) ───
  it('ESLint STRICT 0 errors AND 0 warnings · explicit exit code (Lesson 30 + Lesson 33 · 30-sprint carry · v1.23 environment-adaptive runner)', () => {
    let exitCode = 0;
    let lintOutput = '';
    const runner = (() => {
      try { execSync('command -v pnpm', { stdio: 'pipe' }); return 'pnpm lint'; }
      catch { return 'npx eslint .'; }
    })();
    try {
      lintOutput = execSync(`${runner} 2>&1`, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (e) {
      exitCode = (e as { status?: number }).status ?? 1;
      lintOutput = (e as { stdout?: string; stderr?: string }).stdout
        ?? (e as { stdout?: string; stderr?: string }).stderr ?? '';
    }
    expect(exitCode).toBe(0);
    const errorMatches = (lintOutput.match(/\b\d+\s+errors?\b/g) ?? []).filter((m) => !m.startsWith('0'));
    const warningMatches = (lintOutput.match(/\b\d+\s+warnings?\b/g) ?? []).filter((m) => !m.startsWith('0'));
    expect(errorMatches).toEqual([]);
    expect(warningMatches).toEqual([]);
  }, 120_000);
});
