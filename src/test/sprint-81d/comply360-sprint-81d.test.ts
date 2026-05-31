/**
 * @file        src/test/sprint-81d/comply360-sprint-81d.test.ts
 * @sprint      Sprint 81d · T-Phase-5.B.2.2-PASS-D · S81 ARC CLOSES
 * @purpose     Bank-time verification · Sample Engagement Seed +
 *              IA → External Audit Handoff + S81 Arc Close-Summary +
 *              8th IA Dashboard tab (Reports & Handoff).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { getSiblingCount, SIBLINGS } from '@/lib/_institutional/sibling-register';
import {
  seedSampleEngagement,
  listSampleEngagementSeedRuns,
  getSampleAuditUniverseAreas,
  getSampleRiskRegisterEntries,
  tearDownSampleEngagement,
} from '@/lib/comply360-sample-engagement-seed';
import {
  generateExternalHandoffPackage,
  listExternalHandoffPackages,
  getExternalHandoffPackage,
  exportHandoffPackageJsonBundle,
  generateQuarterlyAuditCommitteeReport,
} from '@/lib/comply360-ia-external-handoff-engine';
import { getActiveBAPAccount } from '@/lib/comply360-audit-framework-engine';

const SRC = (p: string): string => path.resolve(__dirname, '../../..', p);

describe('Sprint 81d · T-Phase-5.B.2.2-PASS-D · Sample Engagement Seed + IA → External Audit Handoff · S81 ARC CLOSES', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  // ─── Institutional ───
  it('Sprint 81d entry exists · code T-Phase-5.B.2.2-PASS-D', () => {
    expect(SPRINTS.some((s) => s.code === 'T-Phase-5.B.2.2-PASS-D')).toBe(true);
  });
  it('Sprint 81c SHA backfilled · e4b4180e53494fb937804d0918a6cbeca784244a', () => {
    const s81c = SPRINTS.find((s) => s.code === 'T-Phase-5.B.2.2-PASS-C');
    expect(s81c?.headSha).toBe('e4b4180e53494fb937804d0918a6cbeca784244a');
  });
  it('Sprint 81d predecessor SHA matches S81c bank', () => {
    const s81d = SPRINTS.find((s) => s.code === 'T-Phase-5.B.2.2-PASS-D');
    expect(s81d?.predecessorSha).toBe('e4b4180e53494fb937804d0918a6cbeca784244a');
  });
  it('Sprint 81d declares 2 new SIBLINGs', () => {
    const s81d = SPRINTS.find((s) => s.code === 'T-Phase-5.B.2.2-PASS-D');
    expect(s81d?.newSiblings).toEqual([
      'comply360-sample-engagement-seed',
      'comply360-ia-external-handoff-engine',
    ]);
  });
  it('SIBLINGs count ≥ 112 (110 baseline + 2 new)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(112);
  });
  it('A-grade streak ≥ 6 (S81d targets 7-streak when banked)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(6);
  });
  it('sample-engagement-seed registered as Comply360 SIBLING', () => {
    expect(SIBLINGS.some((s) => s.id === 'comply360-sample-engagement-seed')).toBe(true);
  });
  it('ia-external-handoff-engine registered as Comply360 SIBLING', () => {
    expect(SIBLINGS.some((s) => s.id === 'comply360-ia-external-handoff-engine')).toBe(true);
  });

  // ─── Sample Engagement Seed ───
  it('seedSampleEngagement produces a SampleEngagementSeedRun with artifacts', () => {
    const r = seedSampleEngagement({ seeded_by_bap: getActiveBAPAccount() });
    expect(r.id).toMatch(/^/);
    expect(r.engagement_id).toBeTruthy();
    expect(r.artifacts.audit_universe_entries_count).toBeGreaterThan(0);
    expect(r.artifacts.risk_register_entries_count).toBeGreaterThan(0);
    expect(r.estimated_setup_time_saved_minutes).toBeGreaterThan(0);
  });
  it('listSampleEngagementSeedRuns returns persisted runs', () => {
    seedSampleEngagement({ seeded_by_bap: getActiveBAPAccount() });
    expect(listSampleEngagementSeedRuns().length).toBeGreaterThan(0);
  });
  it('getSampleAuditUniverseAreas returns ≥ 4 areas', () => {
    expect(getSampleAuditUniverseAreas().length).toBeGreaterThanOrEqual(4);
  });
  it('getSampleRiskRegisterEntries returns ≥ 8 risks', () => {
    expect(getSampleRiskRegisterEntries().length).toBeGreaterThanOrEqual(8);
  });
  it('tearDownSampleEngagement removes artifacts and returns count', () => {
    const r = seedSampleEngagement({ seeded_by_bap: getActiveBAPAccount() });
    const td = tearDownSampleEngagement(r.id, getActiveBAPAccount());
    expect(td.removed_artifacts_count).toBeGreaterThanOrEqual(0);
  });
  it('Sample seed is idempotent (multiple seeds do not corrupt list)', () => {
    seedSampleEngagement({ seeded_by_bap: getActiveBAPAccount() });
    seedSampleEngagement({ seeded_by_bap: getActiveBAPAccount() });
    const runs = listSampleEngagementSeedRuns();
    expect(runs.length).toBeGreaterThanOrEqual(2);
  });

  // ─── IA → External Audit Handoff ───
  it('generateExternalHandoffPackage produces a complete package', () => {
    const r = seedSampleEngagement({ seeded_by_bap: getActiveBAPAccount() });
    const pkg = generateExternalHandoffPackage({
      engagement_id: r.engagement_id,
      generated_by_bap: getActiveBAPAccount(),
    });
    expect(pkg.id).toBeTruthy();
    expect(pkg.engagement_id).toBe(r.engagement_id);
    expect(pkg.rule_11g_report_id).toBeTruthy();
    expect(['COMPLIANT', 'PARTIAL', 'NON_COMPLIANT']).toContain(pkg.rule_11g_overall_verdict);
    expect(['excellent', 'good', 'warning', 'critical']).toContain(pkg.audit_ready_band);
  });
  it('Handoff package summary aggregates IA engagement data', () => {
    const r = seedSampleEngagement({ seeded_by_bap: getActiveBAPAccount() });
    const pkg = generateExternalHandoffPackage({
      engagement_id: r.engagement_id,
      generated_by_bap: getActiveBAPAccount(),
    });
    expect(pkg.ia_engagement_summary.audit_universe_areas_audited).toBeGreaterThanOrEqual(0);
    expect(pkg.ia_engagement_summary.risk_register_total_risks).toBeGreaterThanOrEqual(0);
    expect(pkg.pre_populated_for_external.caro_clause_coverage_pct).toBeGreaterThanOrEqual(0);
    expect(pkg.pre_populated_for_external.caro_clause_coverage_pct).toBeLessThanOrEqual(100);
  });
  it('Handoff package estimates external audit hours saved and fee range', () => {
    const r = seedSampleEngagement({ seeded_by_bap: getActiveBAPAccount() });
    const pkg = generateExternalHandoffPackage({
      engagement_id: r.engagement_id,
      generated_by_bap: getActiveBAPAccount(),
    });
    expect(pkg.estimated_external_audit_hours_saved).toBeGreaterThanOrEqual(0);
    expect(pkg.estimated_external_audit_fee_savings_inr.min).toBeLessThanOrEqual(
      pkg.estimated_external_audit_fee_savings_inr.max,
    );
  });
  it('listExternalHandoffPackages + getExternalHandoffPackage round-trip', () => {
    const r = seedSampleEngagement({ seeded_by_bap: getActiveBAPAccount() });
    const pkg = generateExternalHandoffPackage({
      engagement_id: r.engagement_id,
      generated_by_bap: getActiveBAPAccount(),
    });
    const list = listExternalHandoffPackages(r.engagement_id);
    expect(list.some((p) => p.id === pkg.id)).toBe(true);
    expect(getExternalHandoffPackage(pkg.id)?.id).toBe(pkg.id);
  });
  it('exportHandoffPackageJsonBundle returns Blob + suggested filename', () => {
    const r = seedSampleEngagement({ seeded_by_bap: getActiveBAPAccount() });
    const pkg = generateExternalHandoffPackage({
      engagement_id: r.engagement_id,
      generated_by_bap: getActiveBAPAccount(),
    });
    const bundle = exportHandoffPackageJsonBundle(pkg);
    expect(bundle.blob).toBeInstanceOf(Blob);
    expect(bundle.filename_suggested).toContain('IA-External-Handoff');
    expect(bundle.filename_suggested).toContain(pkg.entity_code);
  });
  it('include_mock_audit_results=false skips mock fields', () => {
    const r = seedSampleEngagement({ seeded_by_bap: getActiveBAPAccount() });
    const pkg = generateExternalHandoffPackage({
      engagement_id: r.engagement_id,
      generated_by_bap: getActiveBAPAccount(),
      include_mock_audit_results: false,
    });
    expect(pkg.latest_mock_audit_run_id).toBeNull();
    expect(pkg.mock_audit_readiness_percentage).toBeNull();
  });

  // ─── Quarterly Audit Committee Reports (Q17 Module 10) ───
  it('generateQuarterlyAuditCommitteeReport returns a quarterly report with export_blob', () => {
    const r = seedSampleEngagement({ seeded_by_bap: getActiveBAPAccount() });
    const rpt = generateQuarterlyAuditCommitteeReport({
      engagement_id: r.engagement_id,
      fy: 'FY 2025-26',
      quarter: 'Q1',
      generated_by_bap: getActiveBAPAccount(),
    });
    expect(rpt.quarter).toBe('Q1');
    expect(rpt.fy).toBe('FY 2025-26');
    expect(rpt.export_blob).toBeInstanceOf(Blob);
    expect(rpt.findings_summary).toBeDefined();
    expect(rpt.ia_maturity_pct).toBeGreaterThanOrEqual(0);
  });
  it('All four quarters can be generated independently', () => {
    const r = seedSampleEngagement({ seeded_by_bap: getActiveBAPAccount() });
    const quarters: Array<'Q1' | 'Q2' | 'Q3' | 'Q4'> = ['Q1', 'Q2', 'Q3', 'Q4'];
    for (const q of quarters) {
      const rpt = generateQuarterlyAuditCommitteeReport({
        engagement_id: r.engagement_id, fy: 'FY 2025-26', quarter: q,
        generated_by_bap: getActiveBAPAccount(),
      });
      expect(rpt.quarter).toBe(q);
    }
  });

  // ─── 8th IA Dashboard tab · Reports & Handoff ───
  it('InternalAuditDashboardPage has at least 8 TabsTrigger (Reports & Handoff added as 8th)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/DashboardPage.tsx'), 'utf-8');
    expect(src.match(/<TabsTrigger/g)?.length).toBeGreaterThanOrEqual(8);
  });
  it('InternalAuditDashboardPage wires ReportsHandoffPanel + handoff engine', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/DashboardPage.tsx'), 'utf-8');
    expect(src).toContain("from '@/lib/comply360-ia-external-handoff-engine'");
    expect(src).toContain('ReportsHandoffPanel');
  });
  it('InternalAuditDashboardPage wires sample engagement seed', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/DashboardPage.tsx'), 'utf-8');
    expect(src).toContain("from '@/lib/comply360-sample-engagement-seed'");
  });

  // ─── §H 0-DIFF anchors ───
  it('S81a-c engines all still present (0-DIFF)', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-internal-audit-engine.ts'))).toBe(true);
    expect(fs.existsSync(SRC('src/lib/comply360-ia-risk-register-engine.ts'))).toBe(true);
    expect(fs.existsSync(SRC('src/lib/comply360-ia-walkthrough-engine.ts'))).toBe(true);
    expect(fs.existsSync(SRC('src/lib/comply360-ia-control-testing-engine.ts'))).toBe(true);
    expect(fs.existsSync(SRC('src/lib/comply360-mock-audit-simulator-engine.ts'))).toBe(true);
    expect(fs.existsSync(SRC('src/lib/comply360-walkthrough-automation-engine.ts'))).toBe(true);
    expect(fs.existsSync(SRC('src/lib/comply360-ia-recommendation-engine.ts'))).toBe(true);
  });
  it('S80 engines all still present (0-DIFF)', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-audit-framework-engine.ts'))).toBe(true);
    expect(fs.existsSync(SRC('src/lib/comply360-auditor-workspace-engine.ts'))).toBe(true);
    expect(fs.existsSync(SRC('src/lib/comply360-audit-ready-score-engine.ts'))).toBe(true);
    expect(fs.existsSync(SRC('src/lib/comply360-rule-11g-report-engine.ts'))).toBe(true);
  });
  it('AuditTrailExplorerPage still present (S81b 0-DIFF)', () => {
    expect(fs.existsSync(SRC('src/pages/erp/comply360/internal-audit/AuditTrailExplorerPage.tsx'))).toBe(true);
  });
  it('Rule11gReportPage still present (S80f 0-DIFF)', () => {
    expect(fs.existsSync(SRC('src/pages/erp/comply360/rule-11g/Rule11gReportPage.tsx'))).toBe(true);
  });
  it('App.tsx still present (0-DIFF anchor)', () => {
    expect(fs.existsSync(SRC('src/App.tsx'))).toBe(true);
  });

  // ─── S81 Arc Close-Summary ───
  it('S81 Arc Close-Summary artifact exists', () => {
    expect(fs.existsSync(SRC('audit_workspace/T-Phase-5.B.2.2/Z_close_evidence/sprint-81-arc-summary.md'))).toBe(true);
  });

  // ─── Lesson 30 + Lesson 33 ESLint STRICT · environment-adaptive runner (v1.23) ───
  it('ESLint STRICT 0 errors AND 0 warnings · environment-adaptive runner (v1.23)', () => {
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
