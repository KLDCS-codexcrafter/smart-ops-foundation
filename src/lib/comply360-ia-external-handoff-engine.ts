/**
 * @file        src/lib/comply360-ia-external-handoff-engine.ts
 * @sibling     NEW @ Sprint 81d · Comply360 Floor 2 Internal Audit Arc 2.2 · Pass D · S81 ARC CLOSES
 * @realizes    IA → External Audit Handoff Package Generator.
 *              Bridge between Internal Audit completion (S81) and External Audit start (S82).
 *              Aggregates: IA findings register · walkthroughs · control tests · CARO clause coverage
 *              · Audit-Ready Score · Rule 11(g) report · Mock Audit results.
 *              Output: single JSON-bundle downloadable as ZIP-equivalent (Phase 5 JSON · Phase 8 ZIP).
 * @reads-from  comply360-rule-11g-report-engine (S80f · generateRule11gReport · THE bridge)
 *              comply360-internal-audit-engine (S81a · listEngagementPlans · listAuditUniverse · listIAIssues)
 *              comply360-ia-risk-register-engine (S81a · listRiskRegister · generateHeatmap)
 *              comply360-ia-walkthrough-engine (S81a · listWalkthroughs)
 *              comply360-ia-control-testing-engine (S81a · listControlTestRuns · computeControlEffectivenessSummary)
 *              comply360-mock-audit-simulator-engine (S81c · listMockAuditRuns)
 *              comply360-audit-framework-engine (S80a · listFindings)
 *              comply360-audit-ready-score-engine (S80e · computeAuditReadyScore)
 *              comply360-audit-trail-aggregator-engine (S78a · registerAuditEntityType)
 *              audit-trail-engine (Phase 4 · logAudit)
 * @sprint      Sprint 81d · T-Phase-5.B.2.2-PASS-D · S81 ARC CLOSES
 * [JWT] Phase 8: POST /api/comply360/ia-external-handoff/generate
 *               GET /api/comply360/ia-external-handoff/:id/export-zip
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import { generateRule11gReport } from './comply360-rule-11g-report-engine';
import {
  listEngagementPlans,
  listIAIssues,
  listAuditPrograms,
  listAuditUniverse,
} from './comply360-internal-audit-engine';
import {
  listRiskRegister,
} from './comply360-ia-risk-register-engine';
import { listWalkthroughs } from './comply360-ia-walkthrough-engine';
import {
  listControlTestRuns,
  computeControlEffectivenessSummary,
} from './comply360-ia-control-testing-engine';
import { listMockAuditRuns } from './comply360-mock-audit-simulator-engine';
import { listFindings, type BAPAccountId } from './comply360-audit-framework-engine';
import {
  computeAuditReadyScore,
  getScoreBand,
} from './comply360-audit-ready-score-engine';
import { getEngagement } from './comply360-auditor-workspace-engine';

export const READS_FROM = {
  engines: [
    'comply360-rule-11g-report-engine',
    'comply360-internal-audit-engine',
    'comply360-ia-risk-register-engine',
    'comply360-ia-walkthrough-engine',
    'comply360-ia-control-testing-engine',
    'comply360-mock-audit-simulator-engine',
    'comply360-audit-framework-engine',
    'comply360-audit-ready-score-engine',
    'comply360-audit-trail-aggregator-engine',
    'audit-trail-engine',
  ],
  storage_keys: ['erp_ia_external_handoff_packages', 'erp_ia_quarterly_ac_reports'],
} as const;

const PKG_KEY = 'erp_ia_external_handoff_packages';
const QAC_KEY = 'erp_ia_quarterly_ac_reports';

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

export interface IAExternalHandoffPackage {
  id: string;
  engagement_id: string;
  fy: string;
  entity_code: string;
  entity_name: string;
  generated_at: string;
  generated_by_bap: BAPAccountId;

  ia_engagement_summary: {
    engagement_plan_id: string;
    audit_universe_areas_audited: number;
    risk_register_total_risks: number;
    risk_register_critical_count: number;
    risk_register_high_count: number;
    audit_programs_executed: number;
    walkthroughs_documented: number;
    control_tests_executed: number;
    control_effectiveness_percentage: number;
    open_ia_issues: number;
  };

  rule_11g_report_id: string;
  rule_11g_overall_verdict: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';

  latest_mock_audit_run_id: string | null;
  mock_audit_readiness_percentage: number | null;
  mock_audit_readiness_band: string | null;

  audit_ready_score: number;
  audit_ready_band: 'excellent' | 'good' | 'warning' | 'critical';

  pre_populated_for_external: {
    findings_register_count: number;
    walkthrough_docs_count: number;
    control_test_worksheets_count: number;
    caro_clause_coverage_pct: number;
  };

  estimated_external_audit_hours_saved: number;
  estimated_external_audit_fee_savings_inr: { min: number; max: number };
}

function deriveOverallVerdict(
  parts: Array<'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT'>,
): 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' {
  if (parts.some((p) => p === 'NON_COMPLIANT')) return 'NON_COMPLIANT';
  if (parts.some((p) => p === 'PARTIAL')) return 'PARTIAL';
  return 'COMPLIANT';
}

export function generateExternalHandoffPackage(opts: {
  engagement_id: string;
  generated_by_bap: BAPAccountId;
  include_mock_audit_results?: boolean;
}): IAExternalHandoffPackage {
  const includeMock = opts.include_mock_audit_results !== false;
  const engagement = getEngagement(opts.engagement_id);
  const entity_code = engagement?.entity_code ?? activeEntityCode();
  const entity_name = engagement?.name ?? 'Unknown Entity';
  const fy = engagement?.fy ?? 'FY 2025-26';

  const plans = listEngagementPlans(opts.engagement_id);
  const universe = listAuditUniverse();
  const risks = listRiskRegister(opts.engagement_id);
  const programs = listAuditPrograms();
  const walkthroughs = listWalkthroughs(opts.engagement_id);
  const controlRuns = listControlTestRuns(opts.engagement_id);
  const controlSummary = computeControlEffectivenessSummary(opts.engagement_id);
  const issues = listIAIssues(opts.engagement_id);
  const openIssues = issues.filter((i) => i.status === 'open').length;
  const findings = listFindings(opts.engagement_id);
  const criticalRisks = risks.filter((r) => r.inherent_rating === 'Critical').length;
  const highRisks = risks.filter((r) => r.inherent_rating === 'High').length;

  // S80f Rule 11(g) bridge
  const rule11g = generateRule11gReport({
    entity_code,
    entity_name,
    fy,
    generated_by_bap: opts.generated_by_bap,
    engagement_id: opts.engagement_id,
  });
  const overallVerdict = deriveOverallVerdict([
    rule11g.question_a_cannot_disable.verdict,
    rule11g.question_b_coverage.verdict,
    rule11g.question_c_retention.verdict,
    rule11g.question_d_continuity.verdict,
  ]);

  // S81c latest mock audit
  let latestRunId: string | null = null;
  let mockPct: number | null = null;
  let mockBand: string | null = null;
  if (includeMock) {
    const runs = listMockAuditRuns(opts.engagement_id);
    if (runs.length > 0) {
      const latest = runs[runs.length - 1];
      latestRunId = latest.id;
      mockPct = latest.readiness_percentage;
      mockBand = latest.readiness_band;
    }
  }

  // S80e Audit-Ready Score
  const ars = computeAuditReadyScore(entity_code, fy);
  const arBand = getScoreBand(ars.overall_score);

  // Pre-population
  const caroPct = Math.min(
    100,
    Math.round((rule11g.question_b_coverage.coverage_percentage ?? 0)),
  );

  // Hours saved heuristic
  const hoursSaved = (walkthroughs.length * 2)
    + (controlRuns.length * 1.5)
    + (ars.overall_score >= 80 ? 40 : 0);
  const feeSavings = {
    min: Math.round(hoursSaved * 2000),
    max: Math.round(hoursSaved * 5000),
  };

  const pkg: IAExternalHandoffPackage = {
    id: uid('iahandoff'),
    engagement_id: opts.engagement_id,
    fy,
    entity_code,
    entity_name,
    generated_at: new Date().toISOString(),
    generated_by_bap: opts.generated_by_bap,
    ia_engagement_summary: {
      engagement_plan_id: plans[0]?.id ?? '',
      audit_universe_areas_audited: universe.length,
      risk_register_total_risks: risks.length,
      risk_register_critical_count: criticalRisks,
      risk_register_high_count: highRisks,
      audit_programs_executed: programs.length,
      walkthroughs_documented: walkthroughs.length,
      control_tests_executed: controlSummary.total_tests_executed,
      control_effectiveness_percentage: controlSummary.effectiveness_percentage,
      open_ia_issues: openIssues,
    },
    rule_11g_report_id: rule11g.id,
    rule_11g_overall_verdict: overallVerdict,
    latest_mock_audit_run_id: latestRunId,
    mock_audit_readiness_percentage: mockPct,
    mock_audit_readiness_band: mockBand,
    audit_ready_score: ars.overall_score,
    audit_ready_band: arBand,
    pre_populated_for_external: {
      findings_register_count: findings.length,
      walkthrough_docs_count: walkthroughs.length,
      control_test_worksheets_count: controlRuns.length,
      caro_clause_coverage_pct: caroPct,
    },
    estimated_external_audit_hours_saved: hoursSaved,
    estimated_external_audit_fee_savings_inr: feeSavings,
  };

  const all = readJson<IAExternalHandoffPackage[]>(PKG_KEY, []);
  all.push(pkg);
  writeJson(PKG_KEY, all);

  logAudit({
    entityCode: entity_code,
    action: 'create',
    entityType: AUD('ia_external_handoff_package'),
    recordId: pkg.id,
    recordLabel: `IA→External handoff · ${entity_name} · ${fy}`,
    beforeState: null,
    afterState: pkg as unknown as Record<string, unknown>,
    sourceModule: 'comply360-ia-external-handoff-engine',
  });

  return pkg;
}

export function listExternalHandoffPackages(engagement_id: string): IAExternalHandoffPackage[] {
  return readJson<IAExternalHandoffPackage[]>(PKG_KEY, [])
    .filter((p) => p.engagement_id === engagement_id);
}

export function getExternalHandoffPackage(id: string): IAExternalHandoffPackage | null {
  return readJson<IAExternalHandoffPackage[]>(PKG_KEY, []).find((p) => p.id === id) ?? null;
}

export function exportHandoffPackageJsonBundle(pkg: IAExternalHandoffPackage): {
  blob: Blob;
  filename_suggested: string;
} {
  const fySlug = pkg.fy.replace(/\s+/g, '-');
  const filename_suggested = `IA-External-Handoff-${fySlug}-${pkg.entity_code}.json`;
  const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
  return { blob, filename_suggested };
}

export interface QuarterlyACReport {
  id: string;
  engagement_id: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  fy: string;
  generated_at: string;
  findings_summary: { open: number; resolved: number; critical: number };
  control_effectiveness_pct: number;
  ia_maturity_pct: number;
  recommendations_count: number;
}

export function generateQuarterlyAuditCommitteeReport(opts: {
  engagement_id: string;
  fy: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  generated_by_bap: BAPAccountId;
}): QuarterlyACReport & { export_blob: Blob } {
  const findings = listFindings(opts.engagement_id);
  const controlSummary = computeControlEffectivenessSummary(opts.engagement_id);
  const issues = listIAIssues(opts.engagement_id);
  const findings_summary = {
    open: findings.filter((f) => f.status === 'open').length,
    resolved: findings.filter((f) => f.status === 'resolved').length,
    critical: findings.filter((f) => f.severity === 'critical').length,
  };
  const ia_maturity_pct = Math.min(
    100,
    Math.round(
      (controlSummary.effectiveness_percentage * 0.5)
      + (issues.length > 0 ? 30 : 0)
      + 20,
    ),
  );
  const report: QuarterlyACReport = {
    id: uid('qac'),
    engagement_id: opts.engagement_id,
    quarter: opts.quarter,
    fy: opts.fy,
    generated_at: new Date().toISOString(),
    findings_summary,
    control_effectiveness_pct: controlSummary.effectiveness_percentage,
    ia_maturity_pct,
    recommendations_count: issues.length,
  };
  const all = readJson<QuarterlyACReport[]>(QAC_KEY, []);
  all.push(report);
  writeJson(QAC_KEY, all);

  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('quarterly_ac_report_export'),
    recordId: report.id,
    recordLabel: `Quarterly AC Report · ${opts.fy} · ${opts.quarter}`,
    beforeState: null,
    afterState: report as unknown as Record<string, unknown>,
    sourceModule: 'comply360-ia-external-handoff-engine',
  });

  const export_blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  return { ...report, export_blob };
}

// ─── Entity-type registration ───
registerAuditEntityType({ id: 'ia_external_handoff_package', module: 'audit-trail', label: 'IA · External Audit Handoff Package' });
registerAuditEntityType({ id: 'quarterly_ac_report_export', module: 'audit-trail', label: 'IA · Quarterly AC Report Export' });
