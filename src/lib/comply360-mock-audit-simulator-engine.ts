/**
 * @file        src/lib/comply360-mock-audit-simulator-engine.ts
 * @sibling     NEW @ Sprint 81c · Comply360 Floor 2 Internal Audit Arc 2.2 · Pass C · DP-S81-3 · DP-S81-10 · OOB-6 EXTENSION
 * @realizes    Mock Audit Simulator · THE OPERATIONALIZATION HEADLINE.
 *              Big-4 grade engagement readiness checker. Orchestrates Mock Audit Run:
 *                1. Enumerates ALL 18 analytics procedures (S80b audit-analytics-engine)
 *                2. Enumerates ALL 27 payroll-audit modules (S80b payroll-audit-engine)
 *                3. Computes Audit-Ready Score (S80e audit-ready-score-engine)
 *                4. Generates expected External Auditor questions (heuristic mapped from finding severity + CARO clauses)
 *                5. Generates "Likely External Auditor Findings" report
 *                6. Estimates engagement readiness % (0-100)
 *                7. Generates Mock Engagement Letter response
 *              CFO sees in 60 seconds what would take 2 weeks of external auditor labor.
 *              EXTENDS OOB-6 (Persistent Auditor Workspace from S80a) per DP-S81-3.
 *              SEPARATE SIBLING (DP-S81-10) for forward extensibility: S82 External Audit
 *              consumes Mock Audit output for engagement-letter pre-population.
 * @reads-from  comply360-audit-analytics-engine (S80b · 18 procedures)
 *              comply360-payroll-audit-engine (S80b · 27 modules)
 *              comply360-audit-ready-score-engine (S80e · composite score)
 *              comply360-audit-framework-engine (S80a · findings register)
 *              comply360-ia-control-testing-engine (S81a · effectiveness summary)
 *              comply360-auditor-workspace-engine (S80a · engagement context)
 *              comply360-caro-extended-engine (S77a · CARO clause coverage)
 *              audit-trail-engine (Phase 4 + S80d hardened · logAudit)
 *              comply360-audit-trail-aggregator-engine (S78a · registerAuditEntityType)
 * @sprint      Sprint 81c · T-Phase-5.B.2.2-PASS-C
 * [JWT] Phase 8: POST /api/comply360/mock-audit/run
 *               GET /api/comply360/mock-audit/run/:id
 *               GET /api/comply360/mock-audit/expected-questions/:run_id
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import {
  ANALYTICS_PROCEDURES,
  listAnalyticsRuns,
  type AnalyticsProcedureCode,
} from './comply360-audit-analytics-engine';
import {
  PAYROLL_AUDIT_MODULES,
  listPayrollAuditRuns,
} from './comply360-payroll-audit-engine';
import {
  computeAuditReadyScore,
  type AuditReadyScore,
} from './comply360-audit-ready-score-engine';
import {
  listFindings,
  type AuditFinding,
  type BAPAccountId,
} from './comply360-audit-framework-engine';
import { computeControlEffectivenessSummary } from './comply360-ia-control-testing-engine';
import { getEngagement, type AuditEngagement } from './comply360-auditor-workspace-engine';

export const READS_FROM = {
  engines: [
    'comply360-audit-analytics-engine',
    'comply360-payroll-audit-engine',
    'comply360-audit-ready-score-engine',
    'comply360-audit-framework-engine',
    'comply360-ia-control-testing-engine',
    'comply360-auditor-workspace-engine',
    'comply360-caro-extended-engine',
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
  ],
  storage_keys: [
    'erp_mock_audit_runs',
    'erp_mock_audit_expected_questions',
  ],
} as const;

export type MockAuditReadiness = 'audit_ready' | 'mostly_ready' | 'partial' | 'not_ready';

export interface ExpectedExternalAuditorQuestion {
  id: string;
  category:
    | 'CARO'
    | 'Tax'
    | 'Statutory'
    | 'Internal Controls'
    | 'Going Concern'
    | 'Related Party'
    | 'Inventory'
    | 'Receivables'
    | 'Other';
  question_text: string;
  trigger_source:
    | 'high_severity_finding'
    | 'caro_clause_pending'
    | 'control_test_failed'
    | 'low_audit_ready_score'
    | 'analytics_procedure_exception'
    | 'heuristic';
  trigger_evidence_refs: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggested_response_steps: string[];
}

export interface LikelyExternalAuditorFinding {
  id: string;
  finding_category:
    | 'qualified_opinion_risk'
    | 'modified_para'
    | 'matter_of_emphasis'
    | 'audit_observation'
    | 'recommendation';
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source_findings: string[];
  estimated_impact: string;
  mitigation_required_before_external_audit: string;
}

export interface MockAuditRun {
  id: string;
  engagement_id: string;
  initiated_by_bap: BAPAccountId;
  initiated_at: string;
  completed_at: string | null;

  analytics_procedures_run: number;
  analytics_procedures_with_exceptions: number;
  payroll_modules_run: number;
  payroll_modules_with_exceptions: number;

  audit_ready_score: AuditReadyScore;

  open_findings_count: number;
  critical_findings_count: number;
  high_findings_count: number;

  control_tests_executed: number;
  control_tests_passed: number;
  control_effectiveness_percentage: number;

  readiness_percentage: number;
  readiness_band: MockAuditReadiness;

  expected_questions: ExpectedExternalAuditorQuestion[];
  likely_findings: LikelyExternalAuditorFinding[];

  mock_engagement_letter_response: {
    scope_acceptance: 'accepted' | 'conditional' | 'declined';
    conditions_to_address: string[];
    estimated_audit_hours: number;
    estimated_fee_range_inr: { min: number; max: number };
    proposed_completion_weeks: number;
  };
}

const RUNS_KEY = 'erp_mock_audit_runs';

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

export function computeReadinessPercentage(inputs: {
  audit_ready_score: number;
  control_effectiveness: number;
  open_critical_findings: number;
  open_high_findings: number;
  analytics_exception_rate: number;
}): number {
  const findingsScore = Math.max(
    0,
    100 - 25 * inputs.open_critical_findings - 10 * inputs.open_high_findings,
  );
  const exceptionsScore = Math.max(0, 100 - inputs.analytics_exception_rate);
  const raw =
    0.30 * inputs.audit_ready_score +
    0.25 * inputs.control_effectiveness +
    0.20 * findingsScore +
    0.25 * exceptionsScore;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

export function mapReadinessBand(percentage: number): MockAuditReadiness {
  if (percentage >= 85) return 'audit_ready';
  if (percentage >= 70) return 'mostly_ready';
  if (percentage >= 50) return 'partial';
  return 'not_ready';
}

export function generateExpectedQuestions(opts: {
  engagement_id: string;
  open_findings: AuditFinding[];
  analytics_exception_count: number;
}): ExpectedExternalAuditorQuestion[] {
  const out: ExpectedExternalAuditorQuestion[] = [];
  const crit = opts.open_findings.filter((f) => f.severity === 'critical');
  const high = opts.open_findings.filter((f) => f.severity === 'high');

  if (crit.length > 0) {
    out.push({
      id: uid('q'),
      category: 'Internal Controls',
      question_text: `Please explain the rationale for ${crit.length} critical finding(s) and the mitigation plan.`,
      trigger_source: 'high_severity_finding',
      trigger_evidence_refs: crit.map((f) => f.id),
      priority: 'critical',
      suggested_response_steps: [
        'Prepare written management response for each critical finding',
        'Document compensating controls if any',
        'Provide remediation timeline with owners',
      ],
    });
  }
  if (high.length > 0) {
    out.push({
      id: uid('q'),
      category: 'CARO',
      question_text: `Confirm CARO clause coverage for ${high.length} open high-severity issue(s).`,
      trigger_source: 'caro_clause_pending',
      trigger_evidence_refs: high.map((f) => f.id),
      priority: 'high',
      suggested_response_steps: ['Cross-reference each finding to CARO clauses', 'Attach working papers'],
    });
  }
  if (opts.analytics_exception_count > 0) {
    out.push({
      id: uid('q'),
      category: 'Tax',
      question_text: `Explain variances detected in ${opts.analytics_exception_count} analytics procedure(s).`,
      trigger_source: 'analytics_procedure_exception',
      trigger_evidence_refs: [],
      priority: 'medium',
      suggested_response_steps: ['Pull procedure-run details', 'Provide reconciliations'],
    });
  }
  // Catch-all generic CARO question (always present)
  out.push({
    id: uid('q'),
    category: 'CARO',
    question_text: 'Walk us through your audit-readiness checklist and CARO 2020 clause coverage for the FY.',
    trigger_source: 'heuristic',
    trigger_evidence_refs: [],
    priority: 'medium',
    suggested_response_steps: ['Share CARO Pre-Flight report', 'Share Audit-Ready Score snapshot'],
  });
  out.push({
    id: uid('q'),
    category: 'Statutory',
    question_text: 'Confirm timeliness of statutory dues (PF/ESI/TDS/GST) under Section 43B.',
    trigger_source: 'heuristic',
    trigger_evidence_refs: [],
    priority: 'high',
    suggested_response_steps: ['Share Statutory Payments register', 'Share Challan Vault evidence'],
  });
  return out;
}

function generateLikelyFindings(opts: {
  open_findings: AuditFinding[];
  exception_rate: number;
  audit_ready_score: number;
}): LikelyExternalAuditorFinding[] {
  const out: LikelyExternalAuditorFinding[] = [];
  const crit = opts.open_findings.filter((f) => f.severity === 'critical');
  if (crit.length > 0) {
    out.push({
      id: uid('lf'),
      finding_category: 'qualified_opinion_risk',
      description: `${crit.length} unresolved critical IA finding(s) may translate to qualified opinion para.`,
      severity: 'critical',
      source_findings: crit.map((f) => f.id),
      estimated_impact: 'Potential qualification on internal controls report',
      mitigation_required_before_external_audit: 'Resolve or document compensating controls',
    });
  }
  if (opts.exception_rate > 25) {
    out.push({
      id: uid('lf'),
      finding_category: 'matter_of_emphasis',
      description: `Analytics exception rate ${opts.exception_rate.toFixed(0)}% suggests systemic control weakness.`,
      severity: 'high',
      source_findings: [],
      estimated_impact: 'Emphasis-of-matter paragraph likely',
      mitigation_required_before_external_audit: 'Investigate top exception clusters and remediate',
    });
  }
  if (opts.audit_ready_score < 60) {
    out.push({
      id: uid('lf'),
      finding_category: 'audit_observation',
      description: `Audit-Ready Score ${opts.audit_ready_score} below acceptable threshold.`,
      severity: 'medium',
      source_findings: [],
      estimated_impact: 'Increased audit hours and management letter observations',
      mitigation_required_before_external_audit: 'Address top recommendations from Audit-Ready Score',
    });
  }
  if (out.length === 0) {
    out.push({
      id: uid('lf'),
      finding_category: 'recommendation',
      description: 'No material auditor findings predicted. Continue periodic monitoring.',
      severity: 'low',
      source_findings: [],
      estimated_impact: 'Clean opinion likely',
      mitigation_required_before_external_audit: 'Maintain current discipline',
    });
  }
  return out;
}

function buildMockEngagementLetter(
  readiness: number,
  critical: number,
  high: number,
): MockAuditRun['mock_engagement_letter_response'] {
  const scope_acceptance: 'accepted' | 'conditional' | 'declined' =
    readiness >= 85 ? 'accepted' : readiness >= 50 ? 'conditional' : 'declined';
  const conditions: string[] = [];
  if (critical > 0) conditions.push(`Resolve ${critical} critical finding(s) before fieldwork`);
  if (high > 0) conditions.push(`Provide management response for ${high} high finding(s)`);
  if (readiness < 70) conditions.push('Provide updated Audit-Ready Score before kickoff');
  const baseHours = 120;
  const extraHours = Math.max(0, Math.round((100 - readiness) * 1.5));
  const estimated_audit_hours = baseHours + extraHours;
  const feePerHour = 4500;
  const feeMin = estimated_audit_hours * feePerHour;
  const feeMax = Math.round(feeMin * 1.4);
  return {
    scope_acceptance,
    conditions_to_address: conditions,
    estimated_audit_hours,
    estimated_fee_range_inr: { min: feeMin, max: feeMax },
    proposed_completion_weeks: readiness >= 85 ? 3 : readiness >= 70 ? 5 : 8,
  };
}

export interface RunMockAuditInput {
  engagement_id: string;
  initiated_by_bap: BAPAccountId;
  run_analytics_procedures?: boolean;
  run_payroll_modules?: boolean;
  analytics_procedure_codes_filter?: AnalyticsProcedureCode[];
}

export function runMockAudit(input: RunMockAuditInput): MockAuditRun {
  const engagement: AuditEngagement | null = getEngagement(input.engagement_id);
  const fy = engagement?.fy ?? new Date().getFullYear().toString();
  const entityCode = engagement?.entity_code ?? activeEntityCode();

  const ready = computeAuditReadyScore(entityCode, fy);

  const analyticsCatalog = input.analytics_procedure_codes_filter
    ? ANALYTICS_PROCEDURES.filter((p) => input.analytics_procedure_codes_filter!.includes(p.code))
    : ANALYTICS_PROCEDURES;
  const analyticsRuns = listAnalyticsRuns(input.engagement_id);
  const analyticsExceptions = analyticsRuns.filter((r) => r.flagged_count > 0).length;
  const analyticsTotal = analyticsCatalog.length;

  const payrollRuns = listPayrollAuditRuns(input.engagement_id);
  const payrollExceptions = payrollRuns.filter((r) => r.layer_findings_total > 0).length;
  const payrollTotal = PAYROLL_AUDIT_MODULES.length;

  const ctrl = computeControlEffectivenessSummary(input.engagement_id);
  const openFindings = listFindings(input.engagement_id, { status: 'open' });
  const critical = openFindings.filter((f) => f.severity === 'critical').length;
  const high = openFindings.filter((f) => f.severity === 'high').length;

  const exceptionRate = analyticsTotal > 0 ? (analyticsExceptions / analyticsTotal) * 100 : 0;

  const readiness = computeReadinessPercentage({
    audit_ready_score: ready.overall_score,
    control_effectiveness: ctrl.effectiveness_percentage,
    open_critical_findings: critical,
    open_high_findings: high,
    analytics_exception_rate: exceptionRate,
  });
  const band = mapReadinessBand(readiness);

  const run: MockAuditRun = {
    id: uid('mockrun'),
    engagement_id: input.engagement_id,
    initiated_by_bap: input.initiated_by_bap,
    initiated_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    analytics_procedures_run: analyticsTotal,
    analytics_procedures_with_exceptions: analyticsExceptions,
    payroll_modules_run: payrollTotal,
    payroll_modules_with_exceptions: payrollExceptions,
    audit_ready_score: ready,
    open_findings_count: openFindings.length,
    critical_findings_count: critical,
    high_findings_count: high,
    control_tests_executed: ctrl.total_tests_executed,
    control_tests_passed: ctrl.passed_count,
    control_effectiveness_percentage: ctrl.effectiveness_percentage,
    readiness_percentage: readiness,
    readiness_band: band,
    expected_questions: generateExpectedQuestions({
      engagement_id: input.engagement_id,
      open_findings: openFindings,
      analytics_exception_count: analyticsExceptions,
    }),
    likely_findings: generateLikelyFindings({
      open_findings: openFindings,
      exception_rate: exceptionRate,
      audit_ready_score: ready.overall_score,
    }),
    mock_engagement_letter_response: buildMockEngagementLetter(readiness, critical, high),
  };

  const all = readJson<MockAuditRun[]>(RUNS_KEY, []);
  all.push(run);
  writeJson(RUNS_KEY, all);

  logAudit({
    entityCode,
    action: 'create',
    entityType: AUD('mock_audit_run'),
    recordId: run.id,
    recordLabel: `Mock Audit Run · ${input.engagement_id} · ${band} · ${readiness}%`,
    beforeState: null,
    afterState: { id: run.id, readiness, band } as Record<string, unknown>,
    sourceModule: 'comply360-mock-audit-simulator-engine',
  });

  return run;
}

export function listMockAuditRuns(
  engagement_id: string,
  opts?: { readiness_band?: MockAuditReadiness },
): MockAuditRun[] {
  return readJson<MockAuditRun[]>(RUNS_KEY, [])
    .filter((r) => r.engagement_id === engagement_id)
    .filter((r) => !opts?.readiness_band || r.readiness_band === opts.readiness_band);
}

export function getMockAuditRun(id: string): MockAuditRun | null {
  return readJson<MockAuditRun[]>(RUNS_KEY, []).find((r) => r.id === id) ?? null;
}

export function exportMockAuditRunJson(run: MockAuditRun): Blob {
  return new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' });
}

// ── Entity-type registration ──────────────────────────────────────────
registerAuditEntityType({ id: 'mock_audit_run', module: 'audit-trail', label: 'Mock Audit · Run' });
registerAuditEntityType({
  id: 'mock_audit_expected_question',
  module: 'audit-trail',
  label: 'Mock Audit · Expected Question',
});
