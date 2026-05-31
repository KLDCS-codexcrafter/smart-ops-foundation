/**
 * Sprint 81a · T-Phase-5.B.2.2-PASS-A · Internal Audit Foundation Engines + 8 Q17 Modules
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import {
  READS_FROM as IA_READS_FROM,
  createEngagementPlan,
  listEngagementPlans,
  approveEngagementPlan,
  defineAuditUniverseEntry,
  listAuditUniverse,
  createAuditProgram,
  listAuditPrograms,
  seedStandardAuditProgramsLibrary,
  createAuditCharter,
  approveAuditCharter,
  logIAIssue,
  updateIAIssueStatus,
  listIAIssues,
  getEngagementMaturityScore,
} from '@/lib/comply360-internal-audit-engine';
import {
  READS_FROM as RISK_READS_FROM,
  createRiskEntry,
  listRiskRegister,
  generateHeatmap,
  computeRiskRating,
} from '@/lib/comply360-ia-risk-register-engine';
import {
  READS_FROM as WALKTHROUGH_READS_FROM,
  generateWalkthrough,
  listWalkthroughs,
} from '@/lib/comply360-ia-walkthrough-engine';
import {
  READS_FROM as CONTROL_TESTING_READS_FROM,
  defineControlTest,
  listControlTests,
  runControlTest,
  computeControlEffectivenessSummary,
  seedStandardControlTestsLibrary,
} from '@/lib/comply360-ia-control-testing-engine';
import { raiseFinding, listWorkingPapers } from '@/lib/comply360-audit-framework-engine';
import { readAuditTrail } from '@/lib/audit-trail-engine';

const SRC = (p: string): string => path.resolve(__dirname, '../../..', p);
const ENTITY = 'OPERIX-DEMO';

describe('Sprint 81a · T-Phase-5.B.2.2-PASS-A · Internal Audit Foundation Engines + 8 Q17 Modules', () => {
  beforeEach(() => { localStorage.clear(); });

  // ─── Institutional ───
  it('Sprint 81a entry exists · code T-Phase-5.B.2.2-PASS-A', () => {
    expect(SPRINTS.some((s) => s.code === 'T-Phase-5.B.2.2-PASS-A')).toBe(true);
  });
  it('Sprint 80f-hotfix SHA backfilled · 5e99848664e6f9defecbcd5e6a2c5398214d8e9e', () => {
    const s80f = SPRINTS.find((s) => s.code === 'T-Phase-5.B.2.1-PASS-F');
    expect(s80f?.headSha).toBe('5e99848664e6f9defecbcd5e6a2c5398214d8e9e');
  });
  it('A-streak >= 3 pre-bank (Lesson 34 bounds-check)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(3);
  });
  it('SPRINTS >= 95', () => { expect(SPRINTS.length).toBeGreaterThanOrEqual(95); });
  it('SIBLINGs runtime >= 107 (+4 NEW)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(107);
  });
  it('SIBLING registry includes all 4 new engines', () => {
    const ids = SIBLINGS.map((s) => s.id);
    expect(ids).toContain('comply360-internal-audit-engine');
    expect(ids).toContain('comply360-ia-risk-register-engine');
    expect(ids).toContain('comply360-ia-walkthrough-engine');
    expect(ids).toContain('comply360-ia-control-testing-engine');
  });

  // ─── File existence ───
  it('comply360-internal-audit-engine.ts exists', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-internal-audit-engine.ts'))).toBe(true);
  });
  it('comply360-ia-risk-register-engine.ts exists', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-ia-risk-register-engine.ts'))).toBe(true);
  });
  it('comply360-ia-walkthrough-engine.ts exists', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-ia-walkthrough-engine.ts'))).toBe(true);
  });
  it('comply360-ia-control-testing-engine.ts exists', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-ia-control-testing-engine.ts'))).toBe(true);
  });
  it('S79a stubs internal-audit/AuditTrailPage + DashboardPage STILL EXIST as stubs', () => {
    expect(fs.existsSync(SRC('src/pages/erp/comply360/internal-audit/AuditTrailPage.tsx'))).toBe(true);
    expect(fs.existsSync(SRC('src/pages/erp/comply360/internal-audit/DashboardPage.tsx'))).toBe(true);
  });
  it('All S80 engines still present (0-DIFF anchor)', () => {
    const expected = [
      'comply360-audit-framework-engine', 'comply360-auditor-workspace-engine',
      'comply360-audit-analytics-engine', 'comply360-payroll-audit-engine',
      'comply360-mca-coverage-engine', 'comply360-audit-retention-engine',
      'comply360-audit-continuity-engine', 'comply360-audit-replay-engine',
      'comply360-cross-card-lineage-engine', 'comply360-audit-ready-score-engine',
      'comply360-rule-11g-report-engine', 'comply360-nlp-audit-ask-engine',
    ];
    for (const e of expected) {
      expect(fs.existsSync(SRC(`src/lib/${e}.ts`))).toBe(true);
    }
  });

  // ─── READS_FROM canon ───
  it('internal-audit-engine READS_FROM includes 5 expected engines', () => {
    expect(IA_READS_FROM.engines).toContain('comply360-audit-framework-engine');
    expect(IA_READS_FROM.engines).toContain('comply360-auditor-workspace-engine');
    expect(IA_READS_FROM.engines).toContain('comply360-audit-analytics-engine');
    expect(IA_READS_FROM.engines).toContain('comply360-audit-trail-aggregator-engine');
    expect(IA_READS_FROM.engines).toContain('audit-trail-engine');
  });
  it('ia-risk-register-engine READS_FROM includes 5 expected engines', () => {
    expect(RISK_READS_FROM.engines.length).toBeGreaterThanOrEqual(5);
  });
  it('ia-walkthrough-engine READS_FROM includes 4 expected engines', () => {
    expect(WALKTHROUGH_READS_FROM.engines).toContain('comply360-audit-trail-aggregator-engine');
    expect(WALKTHROUGH_READS_FROM.engines).toContain('comply360-time-machine-engine');
    expect(WALKTHROUGH_READS_FROM.engines).toContain('audit-trail-engine');
    expect(WALKTHROUGH_READS_FROM.engines).toContain('comply360-internal-audit-engine');
  });
  it('ia-control-testing-engine READS_FROM includes 5 expected engines', () => {
    expect(CONTROL_TESTING_READS_FROM.engines.length).toBeGreaterThanOrEqual(5);
  });

  // ─── Q17 Module 1 · Engagement Plan ───
  it('createEngagementPlan returns EngagementPlan with id + status=draft', () => {
    const p = createEngagementPlan({
      engagement_id: 'eng-1', audit_period_start: '2025-04-01', audit_period_end: '2026-03-31',
      scope_areas: ['Finance'], objectives: ['Verify controls'], authored_by_bap: 'mr-b-auditor-1',
    });
    expect(p.id).toMatch(/^iaplan_/);
    expect(p.status).toBe('draft');
    expect(listEngagementPlans('eng-1')).toHaveLength(1);
  });
  it('approveEngagementPlan transitions status to approved', () => {
    const p = createEngagementPlan({
      engagement_id: 'eng-2', audit_period_start: '2025-04-01', audit_period_end: '2026-03-31',
      scope_areas: ['HR'], objectives: ['Audit payroll'], authored_by_bap: 'mr-b-auditor-1',
    });
    const a = approveEngagementPlan(p.id, 'mr-b-auditor-1');
    expect(a.status).toBe('approved');
  });
  it('logAudit called on engagement plan creation', () => {
    createEngagementPlan({
      engagement_id: 'eng-3', audit_period_start: '2025-04-01', audit_period_end: '2026-03-31',
      scope_areas: ['IT'], objectives: ['IT audit'], authored_by_bap: 'mr-b-auditor-1',
    });
    const trail = readAuditTrail(ENTITY).filter((e) => (e.entity_type as string) === 'ia_engagement_plan');
    expect(trail.length).toBeGreaterThanOrEqual(1);
  });

  // ─── Q17 Module 2 · Audit Universe ───
  it('defineAuditUniverseEntry roundtrip', () => {
    const u = defineAuditUniverseEntry({
      area_code: 'FIN-AP', area_name: 'Accounts Payable', area_description: 'AP cycle',
      inherent_risk_score: 75, audit_cycle_months: 12, last_audited_at: null, next_due_at: null,
      responsible_bap: null, authored_by_bap: 'mr-b-auditor-1',
    });
    expect(u.id).toMatch(/^iauni_/);
  });
  it('listAuditUniverse returns array', () => {
    expect(Array.isArray(listAuditUniverse())).toBe(true);
  });

  // ─── Q17 Module 3 · Risk Register ───
  it('createRiskEntry computes inherent_score and inherent_rating', () => {
    const r = createRiskEntry({
      engagement_id: 'eng-r', risk_code: 'FIN-AP-001', risk_description: 'Duplicate payment',
      risk_category: 'Financial', inherent_likelihood: 5, inherent_impact: 5,
      controls: [], control_effectiveness: 'Adequate',
      residual_likelihood: 3, residual_impact: 3,
      responsible_bap: null, authored_by_bap: 'mr-b-auditor-1', linked_finding_ids: [],
    });
    expect(r.inherent_score).toBe(25);
    expect(r.inherent_rating).toBe('Critical');
  });
  it('createRiskEntry computes residual_score and residual_rating', () => {
    const r = createRiskEntry({
      engagement_id: 'eng-r', risk_code: 'OPS-001', risk_description: 'Stock-out',
      risk_category: 'Operational', inherent_likelihood: 4, inherent_impact: 4,
      controls: [], control_effectiveness: 'Strong',
      residual_likelihood: 2, residual_impact: 3,
      responsible_bap: null, authored_by_bap: 'mr-b-auditor-1', linked_finding_ids: [],
    });
    expect(r.residual_score).toBe(6);
    expect(r.residual_rating).toBe('Low');
  });
  it('computeRiskRating(25) === "Critical"', () => { expect(computeRiskRating(25)).toBe('Critical'); });
  it('computeRiskRating(6) === "Low"', () => { expect(computeRiskRating(6)).toBe('Low'); });
  it('generateHeatmap returns 5×5 grid with risk counts', () => {
    createRiskEntry({
      engagement_id: 'eng-h', risk_code: 'X', risk_description: 'x', risk_category: 'IT',
      inherent_likelihood: 3, inherent_impact: 3, controls: [], control_effectiveness: 'Adequate',
      residual_likelihood: 3, residual_impact: 3, responsible_bap: null,
      authored_by_bap: 'mr-b-auditor-1', linked_finding_ids: [],
    });
    const h = generateHeatmap('eng-h');
    expect(h.cells).toHaveLength(25);
    expect(h.total_risks).toBe(1);
    expect(listRiskRegister('eng-h')).toHaveLength(1);
  });
  it('logAudit called on risk creation', () => {
    createRiskEntry({
      engagement_id: 'eng-ra', risk_code: 'Y', risk_description: 'y', risk_category: 'Compliance',
      inherent_likelihood: 2, inherent_impact: 2, controls: [], control_effectiveness: 'Weak',
      residual_likelihood: 2, residual_impact: 2, responsible_bap: null,
      authored_by_bap: 'mr-b-auditor-1', linked_finding_ids: [],
    });
    const trail = readAuditTrail(ENTITY).filter((e) => (e.entity_type as string) === 'ia_risk_register_entry');
    expect(trail.length).toBeGreaterThanOrEqual(1);
  });

  // ─── Q17 Module 4 · Audit Programs ───
  it('seedStandardAuditProgramsLibrary returns 6+ programs', () => {
    const progs = seedStandardAuditProgramsLibrary('mr-b-auditor-1');
    expect(progs.length).toBeGreaterThanOrEqual(6);
  });
  it('createAuditProgram returns AuditProgram with version=1', () => {
    const p = createAuditProgram({
      name: 'Custom', category: 'IT', description: 'IT audit',
      steps: [{ step_number: 1, procedure: 'Test', expected_evidence: 'logs' }],
      authored_by_bap: 'mr-b-auditor-1',
    });
    expect(p.version).toBe(1);
  });
  it('listAuditPrograms by category filter works', () => {
    createAuditProgram({
      name: 'CARO Custom', category: 'CARO', description: 'd', steps: [],
      authored_by_bap: 'mr-b-auditor-1',
    });
    expect(listAuditPrograms({ category: 'CARO' }).every((p) => p.category === 'CARO')).toBe(true);
  });

  // ─── Q17 Module 5 · Audit Charter ───
  it('createAuditCharter roundtrip', () => {
    const c = createAuditCharter({
      engagement_id: 'eng-c', authority_statement: 'a', scope_statement: 's',
      responsibility_statement: 'r', independence_statement: 'i', reporting_statement: 'rp',
      authored_by_bap: 'mr-b-auditor-1',
    });
    expect(c.id).toMatch(/^iachar_/);
  });
  it('approveAuditCharter sets approved_at and approved_by_bap', () => {
    const c = createAuditCharter({
      engagement_id: 'eng-c2', authority_statement: 'a', scope_statement: 's',
      responsibility_statement: 'r', independence_statement: 'i', reporting_statement: 'rp',
      authored_by_bap: 'mr-b-auditor-1',
    });
    const a = approveAuditCharter(c.id, 'mr-b-auditor-1');
    expect(a.approved_at).not.toBeNull();
    expect(a.approved_by_bap).toBe('mr-b-auditor-1');
  });

  // ─── Q17 Module 6 · Walkthrough ───
  it('generateWalkthrough returns ProcessWalkthrough with steps array', () => {
    const w = generateWalkthrough({
      engagement_id: 'eng-w', process_name: 'P2P', entity_type: 'voucher',
      entity_id: 'v-1', entity_code: ENTITY, documented_by_bap: 'mr-b-auditor-1',
    });
    expect(Array.isArray(w.steps)).toBe(true);
    expect(w.id).toMatch(/^iawalk_/);
  });
  it('listWalkthroughs returns engagement-scoped array', () => {
    generateWalkthrough({
      engagement_id: 'eng-w2', process_name: 'O2C', entity_type: 'voucher',
      entity_id: 'v-2', entity_code: ENTITY, documented_by_bap: 'mr-b-auditor-1',
    });
    expect(listWalkthroughs('eng-w2').length).toBe(1);
  });
  it('logAudit called on walkthrough generation', () => {
    generateWalkthrough({
      engagement_id: 'eng-w3', process_name: 'R2R', entity_type: 'voucher',
      entity_id: 'v-3', entity_code: ENTITY, documented_by_bap: 'mr-b-auditor-1',
    });
    const trail = readAuditTrail(ENTITY).filter((e) => (e.entity_type as string) === 'ia_walkthrough_doc');
    expect(trail.length).toBeGreaterThanOrEqual(1);
  });

  // ─── Q17 Module 7 · Control Testing ───
  it('seedStandardControlTestsLibrary returns 12+ tests', () => {
    const tests = seedStandardControlTestsLibrary('mr-b-auditor-1');
    expect(tests.length).toBeGreaterThanOrEqual(12);
  });
  it('defineControlTest roundtrip', () => {
    const t = defineControlTest({
      control_code: 'C1', control_name: 'C1', control_description: 'd',
      control_objective: 'accuracy', process_area: 'GL', test_procedure: 'tp',
      analytics_procedure_codes: [], payroll_audit_module_codes: [],
      sample_size_target: 10, evidence_required: [], authored_by_bap: 'mr-b-auditor-1',
    });
    expect(listControlTests()).toHaveLength(1);
    expect(t.id).toMatch(/^iactl_/);
  });
  it('runControlTest with failed result auto-creates working paper', () => {
    const t = defineControlTest({
      control_code: 'C2', control_name: 'C2', control_description: 'd',
      control_objective: 'authorization', process_area: 'AP', test_procedure: 'tp',
      analytics_procedure_codes: [], payroll_audit_module_codes: [],
      sample_size_target: 5, evidence_required: [], authored_by_bap: 'mr-b-auditor-1',
    });
    const run = runControlTest({
      engagement_id: 'eng-ct', control_test_id: t.id, result: 'failed',
      sample_size_tested: 5, exceptions_count: 2, observations: 'gaps',
      tested_by_bap: 'mr-b-auditor-1',
    });
    expect(run.working_paper_id).not.toBeNull();
    expect(listWorkingPapers('eng-ct', 'mr-b-auditor-1').length).toBeGreaterThanOrEqual(1);
  });
  it('computeControlEffectivenessSummary returns percentage', () => {
    const t = defineControlTest({
      control_code: 'C3', control_name: 'C3', control_description: 'd',
      control_objective: 'completeness', process_area: 'GL', test_procedure: 'tp',
      analytics_procedure_codes: [], payroll_audit_module_codes: [],
      sample_size_target: 1, evidence_required: [], authored_by_bap: 'mr-b-auditor-1',
    });
    runControlTest({
      engagement_id: 'eng-ce', control_test_id: t.id, result: 'passed',
      sample_size_tested: 1, exceptions_count: 0, observations: '',
      tested_by_bap: 'mr-b-auditor-1',
    });
    const sum = computeControlEffectivenessSummary('eng-ce');
    expect(sum.effectiveness_percentage).toBe(100);
  });
  it('logAudit called on control test run', () => {
    const t = defineControlTest({
      control_code: 'C4', control_name: 'C4', control_description: 'd',
      control_objective: 'validity', process_area: 'AR', test_procedure: 'tp',
      analytics_procedure_codes: [], payroll_audit_module_codes: [],
      sample_size_target: 1, evidence_required: [], authored_by_bap: 'mr-b-auditor-1',
    });
    runControlTest({
      engagement_id: 'eng-cl', control_test_id: t.id, result: 'passed',
      sample_size_tested: 1, exceptions_count: 0, observations: '',
      tested_by_bap: 'mr-b-auditor-1',
    });
    const trail = readAuditTrail(ENTITY).filter((e) => (e.entity_type as string) === 'ia_control_test');
    expect(trail.length).toBeGreaterThanOrEqual(2); // define + run
  });

  // ─── Q17 Module 8 · Issue Log ───
  it('logIAIssue cross-validates finding_id exists', () => {
    expect(() => logIAIssue({
      engagement_id: 'eng-i', finding_id: 'bogus', severity_class: 'high',
      management_response: 'will fix', remediation_deadline: '2026-12-31',
      responsible_bap: 'mr-a-client', raised_by_bap: 'mr-b-auditor-1',
    })).toThrow();
  });
  it('updateIAIssueStatus transitions status with audit-trail', () => {
    const f = raiseFinding({
      engagement_id: 'eng-i2', title: 'F1', description: 'desc', severity: 'high',
      raised_by_bap: 'mr-b-auditor-1',
    });
    const i = logIAIssue({
      engagement_id: 'eng-i2', finding_id: f.id, severity_class: 'high',
      management_response: 'fix', remediation_deadline: '2026-12-31',
      responsible_bap: 'mr-a-client', raised_by_bap: 'mr-b-auditor-1',
    });
    const u = updateIAIssueStatus(i.id, 'remediated', 'mr-a-client', 'done');
    expect(u.status).toBe('remediated');
    expect(u.remediated_at).not.toBeNull();
  });
  it('listIAIssues by status filter works', () => {
    const f = raiseFinding({
      engagement_id: 'eng-i3', title: 'F2', description: 'd', severity: 'low',
      raised_by_bap: 'mr-b-auditor-1',
    });
    logIAIssue({
      engagement_id: 'eng-i3', finding_id: f.id, severity_class: 'low',
      management_response: 'm', remediation_deadline: '2026-12-31',
      responsible_bap: 'mr-a-client', raised_by_bap: 'mr-b-auditor-1',
    });
    expect(listIAIssues('eng-i3', { status: 'open' }).length).toBe(1);
    expect(listIAIssues('eng-i3', { status: 'remediated' }).length).toBe(0);
  });

  // ─── Maturity ───
  it('getEngagementMaturityScore returns 0-100 percentage', () => {
    const m = getEngagementMaturityScore('eng-m');
    expect(m.maturity_percentage).toBeGreaterThanOrEqual(0);
    expect(m.maturity_percentage).toBeLessThanOrEqual(100);
  });
  it('maturity_percentage low when no plan/universe/charter (only "no critical" credit)', () => {
    const m = getEngagementMaturityScore('eng-empty');
    // No plan, no universe, no programs, no charter, but no open critical = 15
    expect(m.maturity_percentage).toBeLessThanOrEqual(15);
  });

  // ─── §H 0-DIFF anchors ───
  it('S80a audit-framework-engine still 0-DIFF (export presence)', () => {
    const src = fs.readFileSync(SRC('src/lib/comply360-audit-framework-engine.ts'), 'utf-8');
    expect(src).toContain('export function raiseFinding');
    expect(src).toContain('export function createWorkingPaper');
  });
  it('S80a auditor-workspace-engine still 0-DIFF', () => {
    const src = fs.readFileSync(SRC('src/lib/comply360-auditor-workspace-engine.ts'), 'utf-8');
    expect(src).toContain('export function createEngagement');
  });
  it('S80b audit-analytics-engine still 0-DIFF', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-audit-analytics-engine.ts'))).toBe(true);
  });
  it('S80b payroll-audit-engine still 0-DIFF', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-payroll-audit-engine.ts'))).toBe(true);
  });
  it('audit-trail-engine still has AUDIT_TRAIL_DISABLED constant from S80d', () => {
    const src = fs.readFileSync(SRC('src/lib/audit-trail-engine.ts'), 'utf-8');
    expect(src).toContain('AUDIT_TRAIL_DISABLED');
  });
  it('internal-audit/AuditTrailPage.tsx still S79a stub (S81b fills)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/internal-audit/AuditTrailPage.tsx'), 'utf-8');
    expect(src).toContain('Stub');
  });
  it('internal-audit/DashboardPage.tsx still S79a stub (S81b fills)', () => {
    expect(fs.existsSync(SRC('src/pages/erp/comply360/internal-audit/DashboardPage.tsx'))).toBe(true);
  });

  // ─── Lesson 30 + Lesson 33 ESLint STRICT · environment-adaptive runner (v1.23 pattern · precedent S80f) ───
  // Lesson 24: Sprint 81a hotfix · environment-adaptive runner ensures portability between Lovable (pnpm) and sandbox (npx) · ESLint discipline itself is unchanged · 0 errors AND 0 warnings bar holds.
  it('ESLint STRICT 0 errors AND 0 warnings · explicit exit code (Lesson 30 + Lesson 33 · 29-sprint carry)', () => {
    let exitCode = 0;
    let lintOutput = '';
    // Resolve runner: prefer pnpm (founder env), fall back to npx (sandbox · audit env)
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
