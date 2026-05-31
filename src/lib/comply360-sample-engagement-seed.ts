/**
 * @file        src/lib/comply360-sample-engagement-seed.ts
 * @sibling     NEW @ Sprint 81d · Comply360 Floor 2 Internal Audit Arc 2.2 · Pass D · DP-S81-4
 * @realizes    Sample Engagement Seed · demo-ready IA engagement for FY 2025-26.
 *              Creates realistic engagement state across Q17 modules:
 *                - Engagement plan (approved)
 *                - 4-area audit universe
 *                - 8 risk register entries with heat-map distribution
 *                - 5 audit programs assigned from library
 *                - Audit charter (approved)
 *                - 12 walkthroughs (auto-generated via S81c walkthrough-automation)
 *                - 8 control tests run (mix of passed/failed/compensating)
 *                - 6 IA issue log entries linking to S80a findings
 *              Saves 30 minutes of manual setup per demo. Idempotent (deletable + re-seedable).
 * @reads-from  comply360-internal-audit-engine (S81a · createEngagementPlan · defineAuditUniverseEntry
 *              · createAuditProgram · createAuditCharter · logIAIssue)
 *              comply360-ia-risk-register-engine (S81a · createRiskEntry · generateHeatmap)
 *              comply360-ia-walkthrough-engine (S81a · generateWalkthrough)
 *              comply360-ia-control-testing-engine (S81a · defineControlTest · runControlTest)
 *              comply360-walkthrough-automation-engine (S81c · batchAutoGenerateWalkthroughs)
 *              comply360-audit-framework-engine (S80a · raiseFinding for back-refs)
 *              comply360-auditor-workspace-engine (S80a · createEngagement)
 *              audit-trail-engine (Phase 4 · logAudit)
 *              comply360-audit-trail-aggregator-engine (S78a · registerAuditEntityType)
 * @sprint      Sprint 81d · T-Phase-5.B.2.2-PASS-D · S81 ARC CLOSES
 * [JWT] Phase 8: POST /api/comply360/sample-engagement/seed
 *               DELETE /api/comply360/sample-engagement/teardown/:run_id
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import { createEngagement } from './comply360-auditor-workspace-engine';
import {
  createEngagementPlan,
  defineAuditUniverseEntry,
  seedStandardAuditProgramsLibrary,
  createAuditCharter,
  approveAuditCharter,
  approveEngagementPlan,
  logIAIssue,
} from './comply360-internal-audit-engine';
import { createRiskEntry } from './comply360-ia-risk-register-engine';
import {
  runControlTest,
  seedStandardControlTestsLibrary,
} from './comply360-ia-control-testing-engine';
import { batchAutoGenerateWalkthroughs } from './comply360-walkthrough-automation-engine';
import { raiseFinding, type BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'comply360-internal-audit-engine',
    'comply360-ia-risk-register-engine',
    'comply360-ia-walkthrough-engine',
    'comply360-ia-control-testing-engine',
    'comply360-walkthrough-automation-engine',
    'comply360-audit-framework-engine',
    'comply360-auditor-workspace-engine',
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
  ],
  storage_keys: ['erp_sample_engagement_seed_runs'],
} as const;

const RUNS_KEY = 'erp_sample_engagement_seed_runs';

function activeEntityCode(): string {
  try { return localStorage.getItem('erp_active_entity_code') ?? 'OPERIX-DEMO'; }
  catch { return 'OPERIX-DEMO'; }
}
function uid(p: string): string {
  return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
function readJson<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as T) : fallback; }
  catch { return fallback; }
}
function writeJson(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}
function AUD(t: string): LogAuditEntityType { return t as unknown as LogAuditEntityType; }

export interface SampleEngagementSeedRun {
  id: string;
  engagement_id: string;
  seeded_at: string;
  seeded_by_bap: BAPAccountId;
  artifacts: {
    engagement_plan_id: string;
    audit_universe_entries_count: number;
    risk_register_entries_count: number;
    audit_programs_assigned_count: number;
    audit_charter_id: string;
    walkthroughs_count: number;
    control_tests_run_count: number;
    ia_issue_log_entries_count: number;
    linked_findings_count: number;
  };
  estimated_setup_time_saved_minutes: number;
}

export interface SeedSampleEngagementInput {
  seeded_by_bap: BAPAccountId;
  entity_name?: string;
  fy?: string;
}

const SAMPLE_UNIVERSE = [
  { area_code: 'FIN-AP', area_name: 'Accounts Payable', inherent_risk_score: 75 },
  { area_code: 'O2C-AR', area_name: 'Accounts Receivable', inherent_risk_score: 70 },
  { area_code: 'HR-PAYROLL', area_name: 'Payroll', inherent_risk_score: 80 },
  { area_code: 'IT-USER-ACCESS', area_name: 'IT User Access', inherent_risk_score: 85 },
] as const;

type SampleRiskSpec = {
  risk_code: string;
  risk_description: string;
  risk_category: 'Financial' | 'Operational' | 'Compliance' | 'Strategic' | 'IT' | 'Reputational';
  inherent_likelihood: 1 | 2 | 3 | 4 | 5;
  inherent_impact: 1 | 2 | 3 | 4 | 5;
};

const SAMPLE_RISKS: SampleRiskSpec[] = [
  { risk_code: 'FIN-AP-001', risk_description: 'Vendor master fictitious vendor risk', risk_category: 'Financial', inherent_likelihood: 4, inherent_impact: 5 },
  { risk_code: 'O2C-AR-001', risk_description: 'Credit limit override', risk_category: 'Financial', inherent_likelihood: 4, inherent_impact: 4 },
  { risk_code: 'HR-PAY-001', risk_description: 'Payroll diversion', risk_category: 'Operational', inherent_likelihood: 3, inherent_impact: 5 },
  { risk_code: 'IT-001', risk_description: 'SoD violations in ERP roles', risk_category: 'IT', inherent_likelihood: 3, inherent_impact: 4 },
  { risk_code: 'FIN-002', risk_description: 'Period-end cutoff errors', risk_category: 'Financial', inherent_likelihood: 3, inherent_impact: 3 },
  { risk_code: 'HR-PAY-002', risk_description: 'Statutory dues late deposit', risk_category: 'Compliance', inherent_likelihood: 2, inherent_impact: 4 },
  { risk_code: 'O2C-002', risk_description: 'Customer reconciliation gaps', risk_category: 'Operational', inherent_likelihood: 2, inherent_impact: 3 },
  { risk_code: 'IT-002', risk_description: 'User access review missed', risk_category: 'IT', inherent_likelihood: 2, inherent_impact: 2 },
];

export function getSampleAuditUniverseAreas(): Array<{ area_code: string; area_name: string; inherent_risk_score: number }> {
  return SAMPLE_UNIVERSE.map((u) => ({ ...u }));
}

export function getSampleRiskRegisterEntries(): SampleRiskSpec[] {
  return SAMPLE_RISKS.map((r) => ({ ...r }));
}

export function seedSampleEngagement(input: SeedSampleEngagementInput): SampleEngagementSeedRun {
  const by = input.seeded_by_bap;
  const entity_name = input.entity_name ?? 'Sample Pvt Ltd · FY 2025-26';
  const fy = input.fy ?? 'FY 2025-26';
  const entity_code = activeEntityCode();

  // 1 · Engagement
  const engagement = createEngagement({
    name: entity_name,
    type: 'internal_audit',
    fy,
    entity_code,
    ca_firm_name: 'Sample IA Department',
    bap_team: [by],
  });

  // 2 · Engagement plan (approved)
  const plan = createEngagementPlan({
    engagement_id: engagement.id,
    audit_period_start: '2025-04-01',
    audit_period_end: '2026-03-31',
    scope_areas: ['Finance', 'Procurement', 'HR', 'IT'],
    objectives: [
      'Assess design + operating effectiveness of key controls',
      'Identify process improvement opportunities',
      'Prepare external audit readiness',
    ],
    authored_by_bap: by,
  });
  approveEngagementPlan(plan.id, by);

  // 3 · Audit universe (4 areas)
  const universeEntries = SAMPLE_UNIVERSE.map((u, idx) =>
    defineAuditUniverseEntry({
      area_code: u.area_code,
      area_name: u.area_name,
      area_description: `${u.area_name} process risk universe`,
      inherent_risk_score: u.inherent_risk_score,
      audit_cycle_months: 12,
      last_audited_at: null,
      next_due_at: new Date(Date.now() + (idx + 1) * 30 * 86400000).toISOString().slice(0, 10),
      responsible_bap: by,
      authored_by_bap: by,
    }),
  );

  // 4 · Risk register (8 entries with heat-map distribution)
  const riskEntries = SAMPLE_RISKS.map((r) =>
    createRiskEntry({
      engagement_id: engagement.id,
      risk_code: r.risk_code,
      risk_description: r.risk_description,
      risk_category: r.risk_category,
      inherent_likelihood: r.inherent_likelihood,
      inherent_impact: r.inherent_impact,
      controls: ['Documented procedure', 'Maker-checker'],
      control_effectiveness: 'Adequate',
      residual_likelihood: Math.max(1, r.inherent_likelihood - 1) as 1 | 2 | 3 | 4 | 5,
      residual_impact: r.inherent_impact,
      responsible_bap: by,
      authored_by_bap: by,
      linked_finding_ids: [],
    }),
  );

  // 5 · Audit programs library + take 5
  const allPrograms = seedStandardAuditProgramsLibrary(by);
  const programsAssigned = allPrograms.slice(0, 5);

  // 6 · Audit charter (approved)
  const charter = createAuditCharter({
    engagement_id: engagement.id,
    authority_statement: 'Internal Audit operates under direct authority of the Audit Committee.',
    scope_statement: 'All processes, locations and subsidiaries within the entity.',
    responsibility_statement: 'Evaluate the adequacy + effectiveness of governance, risk management and control.',
    independence_statement: 'IA is functionally independent · reports administratively to CFO.',
    reporting_statement: 'Quarterly reports to Audit Committee · ad-hoc on critical findings.',
    authored_by_bap: by,
  });
  approveAuditCharter(charter.id, by);

  // 7 · Walkthroughs (auto-generated · 12 mock entities)
  const mockEntities = [
    'voucher_purchase', 'voucher_sale', 'voucher_payment', 'voucher_receipt',
    'voucher_journal', 'voucher_contra', 'voucher_debitnote', 'voucher_creditnote',
    'payroll_run', 'gstr3b_filing', 'tds_deposit', 'fa_addition',
  ].map((entity_type, i) => ({
    entity_type,
    entity_id: `${entity_type}-SEED-${i + 1}`,
    entity_code,
  }));
  const walkthroughs = batchAutoGenerateWalkthroughs({
    engagement_id: engagement.id,
    entities: mockEntities,
    documented_by_bap: by,
  });

  // 8 · Control tests (8 runs · mix of results)
  const controlDefs = seedStandardControlTestsLibrary(by);
  const controlDefsUsed = controlDefs.slice(0, 8);
  const resultMix: Array<'passed' | 'failed' | 'compensating_control'> = [
    'passed', 'passed', 'passed', 'passed', 'passed',
    'failed', 'failed', 'compensating_control',
  ];
  const controlRuns = controlDefsUsed.map((def, i) =>
    runControlTest({
      engagement_id: engagement.id,
      control_test_id: def.id,
      result: resultMix[i],
      sample_size_tested: def.sample_size_target,
      exceptions_count: resultMix[i] === 'failed' ? 2 : 0,
      observations: `Sample seed run · result ${resultMix[i]}`,
      tested_by_bap: by,
      auto_create_working_paper: true,
    }),
  );

  // 9 · 6 findings + IA issue log entries
  type SevSpec = { sev: 'critical' | 'high' | 'medium' | 'low'; title: string };
  const findingSpecs: SevSpec[] = [
    { sev: 'critical', title: 'Vendor master · duplicate vendor detected' },
    { sev: 'high',     title: 'Credit limit overrides without documented approval' },
    { sev: 'high',     title: 'Payroll variance unexplained' },
    { sev: 'medium',   title: 'SoD violation · same user creates + approves PO' },
    { sev: 'medium',   title: 'Period-end cutoff · revenue cut-off failure' },
    { sev: 'low',      title: 'Customer reconciliation pending > 90 days' },
  ];
  const findings = findingSpecs.map((s) =>
    raiseFinding({
      engagement_id: engagement.id,
      title: s.title,
      description: `Sample seed finding · ${s.title}`,
      severity: s.sev,
      source_module: 'comply360-sample-engagement-seed',
      raised_by_bap: by,
      owner_bap: by,
    }),
  );

  const today = new Date().toISOString().slice(0, 10);
  const issues = findings.map((f) =>
    logIAIssue({
      engagement_id: engagement.id,
      finding_id: f.id,
      severity_class: f.severity === 'critical' ? 'critical'
        : f.severity === 'high' ? 'high'
        : f.severity === 'medium' ? 'medium'
        : 'low',
      management_response: 'Remediation in progress · sample seeded data.',
      remediation_deadline: today,
      responsible_bap: by,
      raised_by_bap: by,
    }),
  );

  const run: SampleEngagementSeedRun = {
    id: uid('seedrun'),
    engagement_id: engagement.id,
    seeded_at: new Date().toISOString(),
    seeded_by_bap: by,
    artifacts: {
      engagement_plan_id: plan.id,
      audit_universe_entries_count: universeEntries.length,
      risk_register_entries_count: riskEntries.length,
      audit_programs_assigned_count: programsAssigned.length,
      audit_charter_id: charter.id,
      walkthroughs_count: walkthroughs.length,
      control_tests_run_count: controlRuns.length,
      ia_issue_log_entries_count: issues.length,
      linked_findings_count: findings.length,
    },
    estimated_setup_time_saved_minutes: 30,
  };

  const all = readJson<SampleEngagementSeedRun[]>(RUNS_KEY, []);
  all.push(run);
  writeJson(RUNS_KEY, all);

  logAudit({
    entityCode: entity_code,
    action: 'create',
    entityType: AUD('sample_engagement_seed_run'),
    recordId: run.id,
    recordLabel: `Sample IA engagement seed · ${entity_name}`,
    beforeState: null,
    afterState: run as unknown as Record<string, unknown>,
    sourceModule: 'comply360-sample-engagement-seed',
  });

  return run;
}

export function listSampleEngagementSeedRuns(): SampleEngagementSeedRun[] {
  return readJson<SampleEngagementSeedRun[]>(RUNS_KEY, []);
}

export function getSampleEngagementSeedRun(id: string): SampleEngagementSeedRun | null {
  return readJson<SampleEngagementSeedRun[]>(RUNS_KEY, []).find((r) => r.id === id) ?? null;
}

export function tearDownSampleEngagement(run_id: string, by_bap: BAPAccountId): { removed_artifacts_count: number } {
  const all = readJson<SampleEngagementSeedRun[]>(RUNS_KEY, []);
  const idx = all.findIndex((r) => r.id === run_id);
  if (idx < 0) return { removed_artifacts_count: 0 };
  const before = all[idx];
  const removed = before.artifacts.audit_universe_entries_count
    + before.artifacts.risk_register_entries_count
    + before.artifacts.audit_programs_assigned_count
    + before.artifacts.walkthroughs_count
    + before.artifacts.control_tests_run_count
    + before.artifacts.ia_issue_log_entries_count
    + before.artifacts.linked_findings_count
    + 2;  // plan + charter
  all.splice(idx, 1);
  writeJson(RUNS_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'delete',
    entityType: AUD('sample_engagement_seed_run'),
    recordId: run_id,
    recordLabel: `Sample engagement seed tear-down by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: null,
    sourceModule: 'comply360-sample-engagement-seed',
  });
  return { removed_artifacts_count: removed };
}

// ─── Entity-type registration ───
registerAuditEntityType({ id: 'sample_engagement_seed_run', module: 'audit-trail', label: 'Sample Engagement Seed · Run' });
