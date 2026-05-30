/**
 * @file        src/lib/comply360-rule-11g-report-engine.ts
 * @sibling     NEW @ Sprint 80f · Comply360 Floor 2 Audit-Suite FINALE · Pass F · THE HEADLINE
 * @realizes    ICAI-compliant Rule 11(g) 4-question Auto-Report Generator.
 *              Aggregates ALL S80 architectural moats (Cannot-Disable + Coverage +
 *              Retention + Continuity + Cryptographic Proof + CARO clauses +
 *              Audit-Ready Score + Findings) into one downloadable JSON + PDF.
 *              CATEGORY-DEFINING DELIVERABLE · the CFO/auditor payoff pass.
 * @reads-from  audit-trail-engine (Phase 4 + S80d hardened · MCA_RULE_3_1_COMPLIANCE)
 *              audit-trail-hash-chain (Phase 4 · cryptographic proof)
 *              comply360-mca-coverage-engine (S80d · Question (b))
 *              comply360-audit-retention-engine (S80d · Question (c))
 *              comply360-audit-continuity-engine (S80d · Question (d))
 *              comply360-caro-extended-engine (S77a · CARO clause coverage)
 *              comply360-audit-ready-score-engine (S80e · OOB-1)
 *              comply360-audit-framework-engine (S80a · findings register)
 * @sprint      Sprint 80f · T-Phase-5.B.2.1-PASS-F
 * [JWT] Phase 8: POST /api/comply360/rule-11g/generate
 */
import { logAudit, MCA_RULE_3_1_COMPLIANCE } from './audit-trail-engine';
import { readChainForEntity } from './audit-trail-hash-chain';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import { generateCoverageReport } from './comply360-mca-coverage-engine';
import { getRetentionStatus } from './comply360-audit-retention-engine';
import { generateContinuityReport } from './comply360-audit-continuity-engine';
import { buildCAROExtendedReport } from './comply360-caro-extended-engine';
import { computeAuditReadyScore } from './comply360-audit-ready-score-engine';
import { listFindings, type BAPAccountId, type AuditFinding } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'audit-trail-engine',
    'audit-trail-hash-chain',
    'comply360-mca-coverage-engine',
    'comply360-audit-retention-engine',
    'comply360-audit-continuity-engine',
    'comply360-caro-extended-engine',
    'comply360-audit-ready-score-engine',
    'comply360-audit-framework-engine',
  ],
  storage_keys: ['erp_rule_11g_reports'],
} as const;

const STORAGE_KEY = 'erp_rule_11g_reports';

function AUD(t: string): LogAuditEntityType {
  return t as unknown as LogAuditEntityType;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export type Rule11gVerdict = 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';

export interface Rule11gReport {
  id: string;
  entity_code: string;
  entity_name: string;
  fy: string;
  generated_at: string;
  generated_by_bap: BAPAccountId;
  hardened_at_sprint: 'T-Phase-5.B.2.1-PASS-D';
  engagement_id: string | null;

  question_a_cannot_disable: {
    verdict: Rule11gVerdict;
    evidence: string;
    audit_trail_disabled: boolean;
    cannot_be_disabled: boolean;
    rule_3_1_compliance_metadata: typeof MCA_RULE_3_1_COMPLIANCE;
  };

  question_b_coverage: {
    verdict: Rule11gVerdict;
    coverage_report_id: string;
    total_engines_scanned: number;
    engines_covered_full: number;
    coverage_percentage: number;
    mca_compliance_verdict: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL';
  };

  question_c_retention: {
    verdict: Rule11gVerdict;
    retention_compliant: boolean;
    total_entries: number;
    oldest_entry_date: string | null;
    newest_entry_date: string | null;
    exports_performed: number;
    warnings_pending: number;
  };

  question_d_continuity: {
    verdict: Rule11gVerdict;
    continuity_report_id: string;
    operated_throughout_year_verdict: 'CONFIRMED' | 'GAPS_DETECTED' | 'INSUFFICIENT_DATA';
    audit_trail_entries_count: number;
    quarter_distribution: { Q1: number; Q2: number; Q3: number; Q4: number };
    gaps_detected_count: number;
    chain_integrity: 'VERIFIED' | 'BROKEN' | 'UNAVAILABLE';
    chain_head_hash: string | null;
  };

  audit_ready_score: {
    overall_score: number;
    band: 'excellent' | 'good' | 'warning' | 'critical';
    top_recommendations: Array<{ action: string; priority: string; estimated_lift: number }>;
  };

  caro_clause_coverage: {
    total_applicable_clauses: number;
    clauses_with_tagged_evidence: number;
    coverage_percentage: number;
  };

  findings_summary: {
    open: number;
    in_progress: number;
    resolved: number;
    waived: number;
    by_severity: { low: number; medium: number; high: number; critical: number };
  };

  overall_verdict: Rule11gVerdict;
  auditor_signature_block: {
    ca_firm_name: string;
    auditor_name: string | null;
    icai_membership_no: string | null;
    place: string;
    date: string;
    signed: boolean;
  };
}

function deriveVerdict(...verdicts: Rule11gVerdict[]): Rule11gVerdict {
  if (verdicts.some((v) => v === 'NON_COMPLIANT')) return 'NON_COMPLIANT';
  if (verdicts.some((v) => v === 'PARTIAL')) return 'PARTIAL';
  return 'COMPLIANT';
}

function parseFy(fy: string): { start: string; end: string } {
  const m = fy.match(/(\d{4})/);
  const startYear = m ? Number(m[1]) : new Date().getFullYear();
  return { start: `${startYear}-04-01`, end: `${startYear + 1}-03-31` };
}

function summarizeFindings(findings: AuditFinding[]): Rule11gReport['findings_summary'] {
  const summary: Rule11gReport['findings_summary'] = {
    open: 0, in_progress: 0, resolved: 0, waived: 0,
    by_severity: { low: 0, medium: 0, high: 0, critical: 0 },
  };
  for (const f of findings) {
    summary[f.status] = (summary[f.status] ?? 0) + 1;
    summary.by_severity[f.severity] = (summary.by_severity[f.severity] ?? 0) + 1;
  }
  return summary;
}

/** Generate the full Rule 11(g) report for an entity + FY */
export function generateRule11gReport(opts: {
  entity_code: string;
  entity_name: string;
  fy: string;
  generated_by_bap: BAPAccountId;
  engagement_id?: string;
  ca_firm_name?: string;
  auditor_name?: string;
  icai_membership_no?: string;
  place?: string;
}): Rule11gReport {
  const coverage = generateCoverageReport();
  const retention = getRetentionStatus(opts.entity_code);
  const continuity = generateContinuityReport(opts.entity_code, opts.fy);
  const score = computeAuditReadyScore(opts.entity_code, opts.fy);
  const { start, end } = parseFy(opts.fy);
  const caro = buildCAROExtendedReport(opts.entity_code, start, end);
  const chain = readChainForEntity(opts.entity_code);
  const findings = opts.engagement_id ? listFindings(opts.engagement_id) : [];

  const qa_verdict: Rule11gVerdict = MCA_RULE_3_1_COMPLIANCE.cannot_be_disabled ? 'COMPLIANT' : 'NON_COMPLIANT';
  const qb_verdict: Rule11gVerdict =
    coverage.mca_compliance_verdict === 'COMPLIANT' ? 'COMPLIANT'
      : coverage.mca_compliance_verdict === 'PARTIAL' ? 'PARTIAL' : 'NON_COMPLIANT';
  const qc_verdict: Rule11gVerdict = retention.retention_compliant ? 'COMPLIANT' : 'PARTIAL';
  const qd_verdict: Rule11gVerdict =
    continuity.operated_throughout_year_verdict === 'CONFIRMED' ? 'COMPLIANT'
      : continuity.operated_throughout_year_verdict === 'GAPS_DETECTED' ? 'PARTIAL' : 'PARTIAL';

  const totalCaroClauses = caro.extended_clauses.length + 1; // +1 for para 3(i)
  const taggedCaroClauses = caro.extended_clauses.filter((c) => c.observation_count > 0).length
    + (caro.paragraph_3i_pass ? 1 : 0);

  const report: Rule11gReport = {
    id: uid('r11g'),
    entity_code: opts.entity_code,
    entity_name: opts.entity_name,
    fy: opts.fy,
    generated_at: new Date().toISOString(),
    generated_by_bap: opts.generated_by_bap,
    hardened_at_sprint: 'T-Phase-5.B.2.1-PASS-D',
    engagement_id: opts.engagement_id ?? null,

    question_a_cannot_disable: {
      verdict: qa_verdict,
      evidence: 'MCA_RULE_3_1_COMPLIANCE constant exported · const-asserted · TypeScript-level guard',
      audit_trail_disabled: false,
      cannot_be_disabled: MCA_RULE_3_1_COMPLIANCE.cannot_be_disabled,
      rule_3_1_compliance_metadata: MCA_RULE_3_1_COMPLIANCE,
    },

    question_b_coverage: {
      verdict: qb_verdict,
      coverage_report_id: coverage.report_id,
      total_engines_scanned: coverage.total_engines_scanned,
      engines_covered_full: coverage.engines_covered_full,
      coverage_percentage: coverage.coverage_percentage,
      mca_compliance_verdict: coverage.mca_compliance_verdict,
    },

    question_c_retention: {
      verdict: qc_verdict,
      retention_compliant: retention.retention_compliant,
      total_entries: retention.total_entries,
      oldest_entry_date: retention.oldest_entry_date,
      newest_entry_date: retention.newest_entry_date,
      exports_performed: retention.exports_performed,
      warnings_pending: retention.warnings_pending,
    },

    question_d_continuity: {
      verdict: qd_verdict,
      continuity_report_id: continuity.id,
      operated_throughout_year_verdict: continuity.operated_throughout_year_verdict,
      audit_trail_entries_count: continuity.audit_trail_entries_count,
      quarter_distribution: continuity.quarter_distribution,
      gaps_detected_count: continuity.gaps_detected.length,
      chain_integrity: continuity.chain_integrity,
      chain_head_hash: chain.length > 0 ? chain[chain.length - 1].chain_hash : null,
    },

    audit_ready_score: {
      overall_score: score.overall_score,
      band: score.band,
      top_recommendations: score.recommendations.slice(0, 3).map((r) => ({
        action: r.action, priority: r.priority, estimated_lift: r.estimated_score_lift,
      })),
    },

    caro_clause_coverage: {
      total_applicable_clauses: totalCaroClauses,
      clauses_with_tagged_evidence: taggedCaroClauses,
      coverage_percentage: totalCaroClauses === 0 ? 0 : (taggedCaroClauses / totalCaroClauses) * 100,
    },

    findings_summary: summarizeFindings(findings),

    overall_verdict: deriveVerdict(qa_verdict, qb_verdict, qc_verdict, qd_verdict),
    auditor_signature_block: {
      ca_firm_name: opts.ca_firm_name ?? '',
      auditor_name: opts.auditor_name ?? null,
      icai_membership_no: opts.icai_membership_no ?? null,
      place: opts.place ?? '',
      date: new Date().toISOString().slice(0, 10),
      signed: false,
    },
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr: Rule11gReport[] = raw ? JSON.parse(raw) : [];
    arr.push(report);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr.slice(-100)));
  } catch (e) {
    console.warn('[rule-11g] persistence failed', e);
  }

  try {
    logAudit({
      entityCode: opts.entity_code,
      action: 'create',
      entityType: AUD('rule_11g_report'),
      recordId: report.id,
      recordLabel: `Rule 11(g) Report · ${opts.fy} · ${report.overall_verdict}`,
      beforeState: null,
      afterState: { verdict: report.overall_verdict, fy: opts.fy },
      sourceModule: 'comply360-rule-11g-report-engine',
    });
  } catch (e) {
    console.warn('[rule-11g] audit log failed', e);
  }

  return report;
}

export function listRule11gReports(entity_code: string, opts?: { fy?: string }): Rule11gReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr: Rule11gReport[] = raw ? JSON.parse(raw) : [];
    return arr.filter((r) => r.entity_code === entity_code && (!opts?.fy || r.fy === opts.fy));
  } catch {
    return [];
  }
}

export function getRule11gReport(id: string): Rule11gReport | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr: Rule11gReport[] = raw ? JSON.parse(raw) : [];
    return arr.find((r) => r.id === id) ?? null;
  } catch {
    return null;
  }
}

export function exportRule11gReportJson(report: Rule11gReport): Blob {
  return new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
}

export function exportRule11gReportPdfStub(report: Rule11gReport): Blob {
  const md = [
    `# MCA Rule 11(g) Auditor Report`,
    ``,
    `Entity: ${report.entity_name} (${report.entity_code})`,
    `FY: ${report.fy}`,
    `Generated: ${report.generated_at}`,
    `Overall Verdict: **${report.overall_verdict}**`,
    ``,
    `## Question (a) · Cannot Disable`,
    `Verdict: ${report.question_a_cannot_disable.verdict}`,
    `Evidence: ${report.question_a_cannot_disable.evidence}`,
    `Hardened at sprint: ${report.hardened_at_sprint}`,
    ``,
    `## Question (b) · Universal Coverage`,
    `Verdict: ${report.question_b_coverage.verdict}`,
    `Coverage: ${report.question_b_coverage.coverage_percentage.toFixed(1)}% across ${report.question_b_coverage.total_engines_scanned} engines`,
    ``,
    `## Question (c) · 8-Year Retention (Section 128(5))`,
    `Verdict: ${report.question_c_retention.verdict}`,
    `Total entries: ${report.question_c_retention.total_entries} · Exports: ${report.question_c_retention.exports_performed} · Warnings: ${report.question_c_retention.warnings_pending}`,
    ``,
    `## Question (d) · Operated Throughout Year`,
    `Verdict: ${report.question_d_continuity.verdict} (${report.question_d_continuity.operated_throughout_year_verdict})`,
    `Quarter distribution: Q1 ${report.question_d_continuity.quarter_distribution.Q1} · Q2 ${report.question_d_continuity.quarter_distribution.Q2} · Q3 ${report.question_d_continuity.quarter_distribution.Q3} · Q4 ${report.question_d_continuity.quarter_distribution.Q4}`,
    `Chain integrity: ${report.question_d_continuity.chain_integrity} · Head hash: ${report.question_d_continuity.chain_head_hash ?? 'N/A'}`,
    ``,
    `## Audit-Ready Score`,
    `${report.audit_ready_score.overall_score} / 100 · ${report.audit_ready_score.band.toUpperCase()}`,
    ``,
    `## CARO Clause Coverage`,
    `${report.caro_clause_coverage.clauses_with_tagged_evidence} of ${report.caro_clause_coverage.total_applicable_clauses} clauses tagged (${report.caro_clause_coverage.coverage_percentage.toFixed(1)}%)`,
    ``,
    `## Findings`,
    `Open: ${report.findings_summary.open} · In Progress: ${report.findings_summary.in_progress} · Resolved: ${report.findings_summary.resolved} · Waived: ${report.findings_summary.waived}`,
    ``,
    `## Auditor Signature`,
    `Firm: ${report.auditor_signature_block.ca_firm_name}`,
    `Auditor: ${report.auditor_signature_block.auditor_name ?? '—'} · ICAI: ${report.auditor_signature_block.icai_membership_no ?? '—'}`,
    `Place: ${report.auditor_signature_block.place} · Date: ${report.auditor_signature_block.date}`,
    ``,
    `<!-- Phase 8 backend renders this Markdown stub as a true signed PDF -->`,
  ].join('\n');
  return new Blob([md], { type: 'text/markdown' });
}

// ─── OOB-5 · CARO Pre-Flight Report (helper within rule-11g engine) ─────
export function generateCAROPreFlightReport(opts: {
  entity_code: string;
  fy: string;
  as_of_date: string;
  generated_by_bap: BAPAccountId;
}): {
  caro_report: ReturnType<typeof buildCAROExtendedReport>;
  as_of_date: string;
  estimated_days_until_audit: number;
  recommendations: Array<{ clause: string; action: string }>;
} {
  const { start, end } = parseFy(opts.fy);
  const caroReport = buildCAROExtendedReport(opts.entity_code, start, end);
  const fyEndTime = new Date(end).getTime();
  const asOfTime = new Date(opts.as_of_date).getTime();
  const estimatedDaysUntilAudit = Math.max(0, Math.floor((fyEndTime - asOfTime) / (1000 * 60 * 60 * 24)));
  const recommendations: Array<{ clause: string; action: string }> = [];
  for (const c of caroReport.extended_clauses) {
    if (c.qualified) {
      recommendations.push({ clause: c.clause, action: 'Investigate qualification before audit fieldwork' });
    } else if (c.observation_count === 0) {
      recommendations.push({ clause: c.clause, action: 'Pre-document evidence; no observations recorded yet' });
    }
  }
  try {
    logAudit({
      entityCode: opts.entity_code,
      action: 'create',
      entityType: AUD('caro_preflight_report'),
      recordId: uid('carop'),
      recordLabel: `CARO Pre-Flight · ${opts.fy} · ${opts.as_of_date}`,
      beforeState: null,
      afterState: { as_of_date: opts.as_of_date, qualifications: caroReport.total_qualifications },
      sourceModule: 'comply360-rule-11g-report-engine',
    });
  } catch { /* non-fatal */ }
  return {
    caro_report: caroReport,
    as_of_date: opts.as_of_date,
    estimated_days_until_audit: estimatedDaysUntilAudit,
    recommendations,
  };
}

// ─── OOB-9 · Audit Calendar Pre-Pop STUB · S81 promotes to full UI ─────
export function getAuditCalendarPrePop(fy: string): Array<{
  date: string;
  event: string;
  category: 'preliminary' | 'fieldwork' | 'reporting' | 'filing';
  icai_reference?: string;
}> {
  const m = fy.match(/(\d{4})/);
  const startYear = m ? Number(m[1]) : new Date().getFullYear();
  const endYear = startYear + 1;
  return [
    { date: `${startYear}-04-15`, event: 'Audit engagement letter finalization', category: 'preliminary', icai_reference: 'SA 210' },
    { date: `${startYear}-05-31`, event: 'Risk assessment & planning meeting', category: 'preliminary', icai_reference: 'SA 315' },
    { date: `${startYear}-06-30`, event: 'Q1 closing trial balance review', category: 'preliminary' },
    { date: `${startYear}-09-30`, event: 'Half-year interim audit walkthrough', category: 'fieldwork', icai_reference: 'SA 240' },
    { date: `${startYear}-10-31`, event: 'Internal controls testing (SA 315/330)', category: 'fieldwork', icai_reference: 'SA 330' },
    { date: `${startYear}-12-31`, event: 'Q3 close review · MCA Rule 11(g) interim verify', category: 'fieldwork' },
    { date: `${endYear}-01-31`, event: 'CARO Pre-Flight Report generation (OOB-5)', category: 'fieldwork' },
    { date: `${endYear}-02-28`, event: 'External balance confirmation circularization', category: 'fieldwork', icai_reference: 'SA 505' },
    { date: `${endYear}-03-31`, event: 'FY closing trial balance freeze', category: 'fieldwork' },
    { date: `${endYear}-04-15`, event: 'Year-end stock count attendance', category: 'fieldwork', icai_reference: 'SA 501' },
    { date: `${endYear}-05-31`, event: 'Audit fieldwork completion · working papers final', category: 'fieldwork' },
    { date: `${endYear}-06-30`, event: 'Rule 11(g) Report generation (THE HEADLINE)', category: 'reporting', icai_reference: 'MCA Rule 11(g)' },
    { date: `${endYear}-07-31`, event: 'Draft auditor\'s report circulation', category: 'reporting', icai_reference: 'SA 700' },
    { date: `${endYear}-08-30`, event: 'Final audit report signing', category: 'reporting' },
    { date: `${endYear}-10-30`, event: 'AOC-4 filing with ROC', category: 'filing' },
    { date: `${endYear}-11-29`, event: 'MGT-7 annual return filing', category: 'filing' },
  ];
}

// ─── Entity-type registration ───
registerAuditEntityType({ id: 'rule_11g_report', module: 'audit-trail', label: 'MCA Rule 11(g) Auto-Generated Auditor Report' });
registerAuditEntityType({ id: 'caro_preflight_report', module: 'audit-trail', label: 'CARO Pre-Flight Report (OOB-5)' });
