/**
 * @file        src/test/sprint-81c/comply360-sprint-81c.test.ts
 * @sprint      Sprint 81c · T-Phase-5.B.2.2-PASS-C
 * @purpose     Bank-time verification · Mock Audit Simulator (OOB-6 extension) +
 *              Walkthrough Automation + IA Recommendation STUB + 7th IA Dashboard tab.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { getSiblingCount, SIBLINGS } from '@/lib/_institutional/sibling-register';
import {
  computeReadinessPercentage,
  mapReadinessBand,
  generateExpectedQuestions,
  runMockAudit,
  listMockAuditRuns,
  getMockAuditRun,
  exportMockAuditRunJson,
} from '@/lib/comply360-mock-audit-simulator-engine';
import {
  inferProcessName,
  autoGenerateWalkthrough,
  batchAutoGenerateWalkthroughs,
  listAutoWalkthroughs,
} from '@/lib/comply360-walkthrough-automation-engine';
import {
  generateRecommendations,
  listRecommendations,
  getRecommendationPatterns,
} from '@/lib/comply360-ia-recommendation-engine';
import { createEngagement } from '@/lib/comply360-auditor-workspace-engine';
import { getActiveBAPAccount } from '@/lib/comply360-audit-framework-engine';

const SRC = (p: string): string => path.resolve(__dirname, '../../..', p);

describe('Sprint 81c · T-Phase-5.B.2.2-PASS-C · Mock Audit Simulator + Walkthrough Automation + IA Recommendation', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  // ─── Institutional ───
  it('Sprint 81c entry exists · code T-Phase-5.B.2.2-PASS-C', () => {
    expect(SPRINTS.some((s) => s.code === 'T-Phase-5.B.2.2-PASS-C')).toBe(true);
  });
  it('Sprint 81b SHA backfilled · 39f7dfdd0bb7c1760ff09db49c3fba55532fbb04', () => {
    const s81b = SPRINTS.find((s) => s.code === 'T-Phase-5.B.2.2-PASS-B');
    expect(s81b?.headSha).toBe('39f7dfdd0bb7c1760ff09db49c3fba55532fbb04');
  });
  it('Sprint 81c predecessor SHA matches S81b bank', () => {
    const s81c = SPRINTS.find((s) => s.code === 'T-Phase-5.B.2.2-PASS-C');
    expect(s81c?.predecessorSha).toBe('39f7dfdd0bb7c1760ff09db49c3fba55532fbb04');
  });
  it('Sprint 81c declares 3 new SIBLINGs', () => {
    const s81c = SPRINTS.find((s) => s.code === 'T-Phase-5.B.2.2-PASS-C');
    expect(s81c?.newSiblings).toEqual([
      'comply360-mock-audit-simulator-engine',
      'comply360-walkthrough-automation-engine',
      'comply360-ia-recommendation-engine',
    ]);
  });
  it('A-streak >= 5 (target 6 post-bank)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(5);
  });
  it('SIBLINGs count = 110 (107 baseline + 3 new)', () => {
    expect(getSiblingCount()).toBe(110);
  });
  it('Three new SIBLINGs registered with CONFIRMED provenance', () => {
    const ids = [
      'comply360-mock-audit-simulator-engine',
      'comply360-walkthrough-automation-engine',
      'comply360-ia-recommendation-engine',
    ];
    for (const id of ids) {
      const entry = SIBLINGS.find((s) => s.id === id);
      expect(entry).toBeDefined();
      expect(entry?.provenance).toBe('CONFIRMED');
    }
  });

  // ─── Engine file presence ───
  it('Mock Audit Simulator engine file exists', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-mock-audit-simulator-engine.ts'))).toBe(true);
  });
  it('Walkthrough Automation engine file exists', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-walkthrough-automation-engine.ts'))).toBe(true);
  });
  it('IA Recommendation engine file exists', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-ia-recommendation-engine.ts'))).toBe(true);
  });

  // ─── Mock Audit Simulator · pure logic ───
  it('computeReadinessPercentage · clamps to 0-100', () => {
    const high = computeReadinessPercentage({
      audit_ready_score: 100, control_effectiveness: 100,
      open_critical_findings: 0, open_high_findings: 0, analytics_exception_rate: 0,
    });
    expect(high).toBeLessThanOrEqual(100);
    expect(high).toBeGreaterThanOrEqual(0);
    const low = computeReadinessPercentage({
      audit_ready_score: 0, control_effectiveness: 0,
      open_critical_findings: 10, open_high_findings: 10, analytics_exception_rate: 100,
    });
    expect(low).toBeGreaterThanOrEqual(0);
    expect(low).toBeLessThanOrEqual(100);
  });
  it('computeReadinessPercentage · perfect inputs yield 100', () => {
    expect(computeReadinessPercentage({
      audit_ready_score: 100, control_effectiveness: 100,
      open_critical_findings: 0, open_high_findings: 0, analytics_exception_rate: 0,
    })).toBe(100);
  });
  it('mapReadinessBand · band thresholds', () => {
    expect(mapReadinessBand(90)).toBe('audit_ready');
    expect(mapReadinessBand(75)).toBe('mostly_ready');
    expect(mapReadinessBand(55)).toBe('partial');
    expect(mapReadinessBand(20)).toBe('not_ready');
  });
  it('generateExpectedQuestions · returns >=2 generic catch-all questions when no findings', () => {
    const qs = generateExpectedQuestions({
      engagement_id: 'eng_x', open_findings: [], analytics_exception_count: 0,
    });
    expect(qs.length).toBeGreaterThanOrEqual(2);
    expect(qs.some((q) => q.category === 'CARO')).toBe(true);
  });
  it('runMockAudit · produces a run with readiness_percentage and band', () => {
    const eng = createEngagement({
      client_entity_code: 'OPERIX-DEMO',
      fy: '2025-26',
      engagement_type: 'statutory_audit',
      lead_bap: getActiveBAPAccount(),
    });
    const run = runMockAudit({
      engagement_id: eng.id, initiated_by_bap: getActiveBAPAccount(),
    });
    expect(run.id).toMatch(/^mockrun_/);
    expect(run.readiness_percentage).toBeGreaterThanOrEqual(0);
    expect(run.readiness_percentage).toBeLessThanOrEqual(100);
    expect(['audit_ready', 'mostly_ready', 'partial', 'not_ready']).toContain(run.readiness_band);
    expect(run.expected_questions.length).toBeGreaterThan(0);
    expect(run.likely_findings.length).toBeGreaterThan(0);
    expect(run.mock_engagement_letter_response.estimated_audit_hours).toBeGreaterThan(0);
  });
  it('listMockAuditRuns + getMockAuditRun roundtrip', () => {
    const eng = createEngagement({
      client_entity_code: 'OPERIX-DEMO', fy: '2025-26',
      engagement_type: 'statutory_audit', lead_bap: getActiveBAPAccount(),
    });
    const run = runMockAudit({ engagement_id: eng.id, initiated_by_bap: getActiveBAPAccount() });
    expect(listMockAuditRuns(eng.id)).toHaveLength(1);
    expect(getMockAuditRun(run.id)?.id).toBe(run.id);
  });
  it('exportMockAuditRunJson · returns a Blob', () => {
    const eng = createEngagement({
      client_entity_code: 'OPERIX-DEMO', fy: '2025-26',
      engagement_type: 'statutory_audit', lead_bap: getActiveBAPAccount(),
    });
    const run = runMockAudit({ engagement_id: eng.id, initiated_by_bap: getActiveBAPAccount() });
    const blob = exportMockAuditRunJson(run);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/json');
  });

  // ─── Walkthrough Automation ───
  it('inferProcessName · recognises Order-to-Cash from sales_invoice', () => {
    const r = inferProcessName('sales_invoice');
    expect(r.process_name).toBe('Order-to-Cash');
    expect(r.confidence).toBeGreaterThanOrEqual(80);
  });
  it('inferProcessName · recognises Procure-to-Pay from invoice', () => {
    expect(inferProcessName('invoice').process_name).toBe('Procure-to-Pay');
  });
  it('inferProcessName · recognises Hire-to-Retire from payroll', () => {
    expect(inferProcessName('payroll_run').process_name).toBe('Hire-to-Retire');
  });
  it('inferProcessName · recognises Bank-Reconciliation', () => {
    expect(inferProcessName('bank_recon').process_name).toBe('Bank-Reconciliation');
  });
  it('inferProcessName · falls back to Custom for unknown', () => {
    expect(inferProcessName('xyz_unknown').process_name).toBe('Custom');
  });
  it('autoGenerateWalkthrough · creates record and persists', () => {
    const eng = createEngagement({
      client_entity_code: 'OPERIX-DEMO', fy: '2025-26',
      engagement_type: 'statutory_audit', lead_bap: getActiveBAPAccount(),
    });
    const res = autoGenerateWalkthrough({
      engagement_id: eng.id,
      process_name: 'Procure-to-Pay',
      entity_type: 'invoice',
      entity_id: 'inv_001',
      entity_code: 'OPERIX-DEMO',
      documented_by_bap: getActiveBAPAccount(),
    });
    expect(res.id).toMatch(/^autowalk_/);
    expect(res.auto_inferred_process).toBe(true);
    expect(listAutoWalkthroughs(eng.id)).toHaveLength(1);
  });
  it('batchAutoGenerateWalkthroughs · processes multiple entities', () => {
    const eng = createEngagement({
      client_entity_code: 'OPERIX-DEMO', fy: '2025-26',
      engagement_type: 'statutory_audit', lead_bap: getActiveBAPAccount(),
    });
    const results = batchAutoGenerateWalkthroughs({
      engagement_id: eng.id,
      entities: [
        { entity_type: 'sales_invoice', entity_id: 's1', entity_code: 'OPERIX-DEMO' },
        { entity_type: 'invoice', entity_id: 'p1', entity_code: 'OPERIX-DEMO' },
        { entity_type: 'payroll_run', entity_id: 'pr1', entity_code: 'OPERIX-DEMO' },
      ],
      documented_by_bap: getActiveBAPAccount(),
    });
    expect(results).toHaveLength(3);
  });

  // ─── IA Recommendation ───
  it('generateRecommendations · returns array (catch-all maturity rule fires)', () => {
    const eng = createEngagement({
      client_entity_code: 'OPERIX-DEMO', fy: '2025-26',
      engagement_type: 'statutory_audit', lead_bap: getActiveBAPAccount(),
    });
    const recs = generateRecommendations({ engagement_id: eng.id });
    expect(Array.isArray(recs)).toBe(true);
  });
  it('generateRecommendations · respects max_recommendations cap', () => {
    const eng = createEngagement({
      client_entity_code: 'OPERIX-DEMO', fy: '2025-26',
      engagement_type: 'statutory_audit', lead_bap: getActiveBAPAccount(),
    });
    const recs = generateRecommendations({ engagement_id: eng.id, max_recommendations: 2 });
    expect(recs.length).toBeLessThanOrEqual(2);
  });
  it('listRecommendations · returns previously generated entries', () => {
    const eng = createEngagement({
      client_entity_code: 'OPERIX-DEMO', fy: '2025-26',
      engagement_type: 'statutory_audit', lead_bap: getActiveBAPAccount(),
    });
    generateRecommendations({ engagement_id: eng.id });
    const list = listRecommendations(eng.id);
    expect(Array.isArray(list)).toBe(true);
  });
  it('getRecommendationPatterns · returns 6 documented patterns', () => {
    const patterns = getRecommendationPatterns();
    expect(patterns.length).toBe(6);
    expect(patterns[0]).toHaveProperty('category');
    expect(patterns[0]).toHaveProperty('trigger_description');
    expect(patterns[0]).toHaveProperty('example_recommendation');
  });

  // ─── 7th IA Dashboard tab ───
  it('InternalAuditDashboardPage has exactly 7 TabsTrigger (Mock Audit added as 7th)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/DashboardPage.tsx'), 'utf-8');
    expect(src.match(/<TabsTrigger/g)?.length).toBe(7);
  });
  it('InternalAuditDashboardPage wires MockAuditRunPanel + simulator engine', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/DashboardPage.tsx'), 'utf-8');
    expect(src).toContain("from '@/lib/comply360-mock-audit-simulator-engine'");
    expect(src).toContain('MockAuditRunPanel');
  });
  it('InternalAuditDashboardPage wires IA Recommendation engine', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/DashboardPage.tsx'), 'utf-8');
    expect(src).toContain("from '@/lib/comply360-ia-recommendation-engine'");
  });

  // ─── §H 0-DIFF anchors ───
  it('S81a engines all still present (0-DIFF)', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-internal-audit-engine.ts'))).toBe(true);
    expect(fs.existsSync(SRC('src/lib/comply360-ia-risk-register-engine.ts'))).toBe(true);
    expect(fs.existsSync(SRC('src/lib/comply360-ia-walkthrough-engine.ts'))).toBe(true);
    expect(fs.existsSync(SRC('src/lib/comply360-ia-control-testing-engine.ts'))).toBe(true);
  });
  it('S80a-e engines all still present (0-DIFF)', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-audit-framework-engine.ts'))).toBe(true);
    expect(fs.existsSync(SRC('src/lib/comply360-auditor-workspace-engine.ts'))).toBe(true);
    expect(fs.existsSync(SRC('src/lib/comply360-audit-ready-score-engine.ts'))).toBe(true);
    expect(fs.existsSync(SRC('src/lib/comply360-audit-analytics-engine.ts'))).toBe(true);
    expect(fs.existsSync(SRC('src/lib/comply360-payroll-audit-engine.ts'))).toBe(true);
  });
  it('audit-trail-engine 0-DIFF · S80d hardening preserved', () => {
    const src = fs.readFileSync(SRC('src/lib/audit-trail-engine.ts'), 'utf-8');
    expect(src).toContain('AUDIT_TRAIL_DISABLED');
    expect(src).toContain('MCA_RULE_3_1_COMPLIANCE');
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
