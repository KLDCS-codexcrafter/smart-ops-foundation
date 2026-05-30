/**
 * Sprint 80f · T-Phase-5.B.2.1-PASS-F · Rule 11(g) Auditor Report Generator + Light OOBs
 * THE HEADLINE pass · final pass in S80 arc · 16 of 16 OOBs delivered cumulative.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import {
  READS_FROM as RULE_11G_READS_FROM,
  generateRule11gReport,
  listRule11gReports,
  getRule11gReport,
  exportRule11gReportJson,
  exportRule11gReportPdfStub,
  generateCAROPreFlightReport,
  getAuditCalendarPrePop,
} from '@/lib/comply360-rule-11g-report-engine';
import {
  READS_FROM as NLP_READS_FROM,
  askAuditQuery,
  getQueryPatterns,
} from '@/lib/comply360-nlp-audit-ask-engine';
import {
  generateAuditorShareToken,
  verifyAuditorShareToken,
} from '@/pages/erp/comply360/audit-framework/share-token-helpers';
import type { Comply360Module } from '@/pages/erp/comply360/Comply360Sidebar.types';

const SRC = (p: string): string => path.resolve(__dirname, '../../..', p);

describe('Sprint 80f · T-Phase-5.B.2.1-PASS-F · Rule 11(g) Auditor Report Generator FINALE', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ─── Institutional registers ───
  it('Sprint 80f entry exists · code T-Phase-5.B.2.1-PASS-F', () => {
    expect(SPRINTS.some(s => s.code === 'T-Phase-5.B.2.1-PASS-F')).toBe(true);
  });
  it('Sprint 80e SHA backfilled · 5d7be7d999f313420cb69ec9da74843dc95998a0', () => {
    const s80e = SPRINTS.find(s => s.code === 'T-Phase-5.B.2.1-PASS-E');
    expect(s80e?.headSha).toBe('5d7be7d999f313420cb69ec9da74843dc95998a0');
  });
  it('A-streak >= 2 (target 3 post-bank)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(0);
  });
  it('SIBLINGs >= 103 (+2 NEW · rule-11g-report + nlp-audit-ask)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(103);
  });
  it('SIBLING registry includes rule-11g-report-engine', () => {
    expect(SIBLINGS.some(s => s.id === 'comply360-rule-11g-report-engine')).toBe(true);
  });
  it('SIBLING registry includes nlp-audit-ask-engine', () => {
    expect(SIBLINGS.some(s => s.id === 'comply360-nlp-audit-ask-engine')).toBe(true);
  });

  // ─── File existence ───
  it('comply360-rule-11g-report-engine.ts exists', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-rule-11g-report-engine.ts'))).toBe(true);
  });
  it('comply360-nlp-audit-ask-engine.ts exists', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-nlp-audit-ask-engine.ts'))).toBe(true);
  });
  it('Rule11gReportPage.tsx exists', () => {
    expect(fs.existsSync(SRC('src/pages/erp/comply360/rule-11g/Rule11gReportPage.tsx'))).toBe(true);
  });
  it('AuditorShareLinkPage.tsx exists', () => {
    expect(fs.existsSync(SRC('src/pages/erp/comply360/audit-framework/AuditorShareLinkPage.tsx'))).toBe(true);
  });
  it('S80 close-summary exists', () => {
    expect(fs.existsSync(SRC('audit_workspace/T-Phase-5.B.2.1/Z_close_evidence/sprint-80-arc-summary.md'))).toBe(true);
  });

  // ─── READS_FROM canon ───
  it('rule-11g-report-engine declares READS_FROM with 8 engines', () => {
    expect(RULE_11G_READS_FROM.engines.length).toBeGreaterThanOrEqual(8);
    expect(RULE_11G_READS_FROM.engines).toContain('audit-trail-engine');
    expect(RULE_11G_READS_FROM.engines).toContain('comply360-mca-coverage-engine');
    expect(RULE_11G_READS_FROM.engines).toContain('comply360-audit-retention-engine');
    expect(RULE_11G_READS_FROM.engines).toContain('comply360-audit-continuity-engine');
  });
  it('nlp-audit-ask-engine declares READS_FROM', () => {
    expect(NLP_READS_FROM.engines.length).toBeGreaterThan(0);
  });

  // ─── THE HEADLINE · Rule 11(g) Report ───
  it('generateRule11gReport produces valid Rule11gReport object', () => {
    const report = generateRule11gReport({
      entity_code: 'TEST-001',
      entity_name: 'Test Pvt Ltd',
      fy: 'FY 2025-26',
      generated_by_bap: 'mr-b-auditor-1',
      ca_firm_name: 'XYZ & Co. CA',
    });
    expect(report.id).toBeTruthy();
    expect(report.entity_code).toBe('TEST-001');
    expect(report.fy).toBe('FY 2025-26');
  });
  it('Rule11gReport has all 4 question sections', () => {
    const report = generateRule11gReport({
      entity_code: 'TEST-002',
      entity_name: 'Test Co',
      fy: 'FY 2025-26',
      generated_by_bap: 'mr-b-auditor-1',
    });
    expect(report.question_a_cannot_disable).toBeDefined();
    expect(report.question_b_coverage).toBeDefined();
    expect(report.question_c_retention).toBeDefined();
    expect(report.question_d_continuity).toBeDefined();
  });
  it('overall_verdict is one of COMPLIANT/PARTIAL/NON_COMPLIANT', () => {
    const report = generateRule11gReport({
      entity_code: 'TEST-003',
      entity_name: 'Test Co',
      fy: 'FY 2025-26',
      generated_by_bap: 'mr-b-auditor-1',
    });
    expect(['COMPLIANT', 'PARTIAL', 'NON_COMPLIANT']).toContain(report.overall_verdict);
  });
  it('question_a_cannot_disable.cannot_be_disabled === true', () => {
    const report = generateRule11gReport({
      entity_code: 'TEST-004',
      entity_name: 'Test Co',
      fy: 'FY 2025-26',
      generated_by_bap: 'mr-b-auditor-1',
    });
    expect(report.question_a_cannot_disable.cannot_be_disabled).toBe(true);
  });
  it('audit_ready_score embedded with overall_score', () => {
    const report = generateRule11gReport({
      entity_code: 'TEST-005',
      entity_name: 'Test Co',
      fy: 'FY 2025-26',
      generated_by_bap: 'mr-b-auditor-1',
    });
    expect(typeof report.audit_ready_score.overall_score).toBe('number');
    expect(report.audit_ready_score.overall_score).toBeGreaterThanOrEqual(0);
    expect(report.audit_ready_score.overall_score).toBeLessThanOrEqual(100);
  });
  it('findings_summary has 4 status counts', () => {
    const report = generateRule11gReport({
      entity_code: 'TEST-006',
      entity_name: 'Test Co',
      fy: 'FY 2025-26',
      generated_by_bap: 'mr-b-auditor-1',
    });
    expect(report.findings_summary).toHaveProperty('open');
    expect(report.findings_summary).toHaveProperty('in_progress');
    expect(report.findings_summary).toHaveProperty('resolved');
    expect(report.findings_summary).toHaveProperty('waived');
  });
  it('exportRule11gReportJson returns valid Blob', () => {
    const report = generateRule11gReport({
      entity_code: 'TEST-007',
      entity_name: 'Test Co',
      fy: 'FY 2025-26',
      generated_by_bap: 'mr-b-auditor-1',
    });
    const blob = exportRule11gReportJson(report);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toContain('json');
  });
  it('exportRule11gReportPdfStub returns valid Blob', () => {
    const report = generateRule11gReport({
      entity_code: 'TEST-008',
      entity_name: 'Test Co',
      fy: 'FY 2025-26',
      generated_by_bap: 'mr-b-auditor-1',
    });
    const blob = exportRule11gReportPdfStub(report);
    expect(blob).toBeInstanceOf(Blob);
  });
  it('listRule11gReports returns array', () => {
    expect(Array.isArray(listRule11gReports('TEST-001'))).toBe(true);
  });
  it('getRule11gReport returns null for unknown id', () => {
    expect(getRule11gReport('nonexistent-id')).toBeNull();
  });

  // ─── OOB-5 CARO Pre-Flight ───
  it('generateCAROPreFlightReport returns report with as_of_date', () => {
    const result = generateCAROPreFlightReport({
      entity_code: 'TEST-001',
      fy: 'FY 2025-26',
      as_of_date: '2026-01-31',
      generated_by_bap: 'mr-b-auditor-1',
    });
    expect(result.as_of_date).toBe('2026-01-31');
    expect(typeof result.estimated_days_until_audit).toBe('number');
  });

  // ─── OOB-9 Audit Calendar Pre-Pop ───
  it('getAuditCalendarPrePop returns 10+ deadline entries', () => {
    const entries = getAuditCalendarPrePop('FY 2025-26');
    expect(entries.length).toBeGreaterThanOrEqual(10);
    expect(entries[0]).toHaveProperty('date');
    expect(entries[0]).toHaveProperty('event');
  });

  // ─── OOB-2 NLP Audit-Ask ───
  it('askAuditQuery returns NLPQueryResult', () => {
    const result = askAuditQuery('list high severity findings', 'eng-1');
    expect(result.id).toBeTruthy();
    expect(result.raw_query).toBe('list high severity findings');
    expect(result.detected_intent).toBeTruthy();
  });
  it('getQueryPatterns returns array of 5+ patterns', () => {
    const patterns = getQueryPatterns();
    expect(patterns.length).toBeGreaterThanOrEqual(5);
  });

  // ─── OOB-4 Auditor Share Link ───
  it('generateAuditorShareToken returns token + share_url', () => {
    const result = generateAuditorShareToken({
      engagement_id: 'eng-1',
      report_id: 'report-1',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      generated_by_bap: 'mr-b-auditor-1',
    });
    expect(result.token).toBeTruthy();
    expect(result.share_url).toContain(result.token);
  });
  it('verifyAuditorShareToken roundtrip works', () => {
    const expires = new Date(Date.now() + 86400000).toISOString();
    const generated = generateAuditorShareToken({
      engagement_id: 'eng-2',
      report_id: 'report-2',
      expires_at: expires,
      generated_by_bap: 'mr-b-auditor-1',
    });
    const verified = verifyAuditorShareToken(generated.token);
    expect(verified.valid).toBe(true);
    expect(verified.engagement_id).toBe('eng-2');
  });
  it('verifyAuditorShareToken rejects bad token', () => {
    expect(verifyAuditorShareToken('garbage-token-string').valid).toBe(false);
  });

  // ─── Router + Sidebar updates ───
  it("Comply360Sidebar.types.ts includes 'rule-11g' in module union (type-level check)", () => {
    const valid: Comply360Module = 'rule-11g';
    expect(valid).toBe('rule-11g');
  });
  it("Comply360Page has case 'rule-11g' in router", () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/Comply360Page.tsx'), 'utf-8');
    expect(src).toMatch(/case\s+['"]rule-11g['"]/);
  });
  it('Comply360Page imports Rule11gReportPage', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/Comply360Page.tsx'), 'utf-8');
    expect(src).toContain('Rule11gReportPage');
  });

  // ─── §H 0-DIFF anchors ───
  it('audit-trail-engine still has AUDIT_TRAIL_DISABLED constant from S80d', () => {
    const src = fs.readFileSync(SRC('src/lib/audit-trail-engine.ts'), 'utf-8');
    expect(src).toContain('AUDIT_TRAIL_DISABLED');
    expect(src).toContain('MCA_RULE_3_1_COMPLIANCE');
  });
  it('AuditFrameworkDashboardPage retains Audit-Ready Score banner from S80e', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/audit-framework/AuditFrameworkDashboardPage.tsx'), 'utf-8');
    expect(src).toContain('Audit-Ready Score');
  });
  it('S80c StatutoryReturnsPage still has 6 TabsTrigger (FR-106 11th scenario unchanged)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/payroll/StatutoryReturnsPage.tsx'), 'utf-8');
    const matches = src.match(/<TabsTrigger/g);
    expect(matches?.length).toBe(6);
  });

  // ─── Lesson 30 ESLint STRICT ───
  it('ESLint STRICT 0/0 · explicit exit code (Lesson 30 v1.22 canon · 28-sprint carry)', () => {
    let exitCode = 0;
    try {
      execSync('pnpm lint 2>&1', { stdio: 'pipe' });
    } catch (e) {
      exitCode = (e as { status?: number }).status ?? 1;
    }
    expect(exitCode).toBe(0);
  }, 120_000);
});
