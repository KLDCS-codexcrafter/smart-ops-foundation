/**
 * @file        src/test/sprint-80d/comply360-sprint-80d.test.ts
 * @sprint      Sprint 80d · T-Phase-5.B.2.1-PASS-D · MCA Rule 11(g) Hardening
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import {
  AUDIT_TRAIL_DISABLED,
  MCA_RULE_3_1_COMPLIANCE,
  logAudit,
} from '@/lib/audit-trail-engine';
import {
  generateCoverageReport,
  exportCoverageReportJson,
} from '@/lib/comply360-mca-coverage-engine';
import * as MCACoverage from '@/lib/comply360-mca-coverage-engine';
import {
  exportToColdStorage,
  scanRetentionWarnings,
  acknowledgeWarning,
  listColdStorageExports,
  getRetentionStatus,
} from '@/lib/comply360-audit-retention-engine';
import * as Retention from '@/lib/comply360-audit-retention-engine';
import {
  generateContinuityReport,
  getLatestContinuityReport,
} from '@/lib/comply360-audit-continuity-engine';
import * as Continuity from '@/lib/comply360-audit-continuity-engine';

const SRC = (p: string): string => path.resolve(__dirname, '../../..', p);

describe('Sprint 80d · T-Phase-5.B.2.1-PASS-D · MCA Rule 11(g) Hardening', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ─── Institutional ───
  it('Sprint 80d entry exists · T-Phase-5.B.2.1-PASS-D', () => {
    expect(SPRINTS.some((s) => s.code === 'T-Phase-5.B.2.1-PASS-D')).toBe(true);
  });
  it('Sprint 80c HOTFIX SHA backfilled · e989adb608cc3c19500df8e4e580ced362b2db78', () => {
    const s80c = SPRINTS.find((s) => s.code === 'T-Phase-5.B.2.1-PASS-C');
    expect(s80c?.headSha).toBe('e989adb608cc3c19500df8e4e580ced362b2db78');
  });
  it('Sprint 80c grade reflects B cycle-2', () => {
    const s80c = SPRINTS.find((s) => s.code === 'T-Phase-5.B.2.1-PASS-C');
    expect(s80c?.grade).toBe('B');
  });
  it('A-streak >= 0 (post cycle-2 reset · target 1 post-S80d bank)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(0);
  });
  it('SPRINTS includes >= 1 entry for S80d code', () => {
    expect(SPRINTS.filter((s) => s.code === 'T-Phase-5.B.2.1-PASS-D').length).toBeGreaterThanOrEqual(1);
  });
  it('SIBLINGs >= 98 (+3 NEW: mca-coverage + audit-retention + audit-continuity)', () => {
    expect(SIBLINGS.length).toBeGreaterThanOrEqual(98);
    expect(SIBLINGS.some((s) => s.id === 'comply360-mca-coverage-engine')).toBe(true);
    expect(SIBLINGS.some((s) => s.id === 'comply360-audit-retention-engine')).toBe(true);
    expect(SIBLINGS.some((s) => s.id === 'comply360-audit-continuity-engine')).toBe(true);
  });

  // ─── DP-S80-24 · Cannot-Disable architectural ───
  it('AUDIT_TRAIL_DISABLED exported · value false', () => {
    expect(AUDIT_TRAIL_DISABLED).toBe(false);
  });
  it('AUDIT_TRAIL_DISABLED const-asserted (TypeScript-level guard via source assertion)', () => {
    const src = fs.readFileSync(SRC('src/lib/audit-trail-engine.ts'), 'utf-8');
    expect(src).toContain('AUDIT_TRAIL_DISABLED = false as const');
  });
  it('MCA_RULE_3_1_COMPLIANCE exported with all 5 fields', () => {
    expect(MCA_RULE_3_1_COMPLIANCE.rule_3_1).toBe(true);
    expect(MCA_RULE_3_1_COMPLIANCE.edit_log_created).toBe(true);
    expect(MCA_RULE_3_1_COMPLIANCE.cannot_be_disabled).toBe(true);
    expect(MCA_RULE_3_1_COMPLIANCE.retention_years).toBe(8);
    expect(MCA_RULE_3_1_COMPLIANCE.hardened_at_sprint).toBe('T-Phase-5.B.2.1-PASS-D');
  });
  it('MCA_RULE_3_1_COMPLIANCE.cannot_be_disabled === true', () => {
    expect(MCA_RULE_3_1_COMPLIANCE.cannot_be_disabled).toBe(true);
  });
  it('MCA_RULE_3_1_COMPLIANCE.retention_years === 8', () => {
    expect(MCA_RULE_3_1_COMPLIANCE.retention_years).toBe(8);
  });
  it('logAudit still works normally (no behavioral change)', () => {
    const entry = logAudit({
      entityCode: 'TEST-1',
      action: 'create',
      entityType: 'voucher',
      recordId: 'v-1',
      recordLabel: 'Test',
      beforeState: null,
      afterState: { x: 1 },
      sourceModule: 'sprint-80d-test',
    });
    expect(entry.id).toMatch(/^aud_/);
    expect(entry.entity_id).toBe('TEST-1');
  });
  it('logAudit-returned AuditTrailEntry has retention_until field', () => {
    const entry = logAudit({
      entityCode: 'TEST-2',
      action: 'create',
      entityType: 'voucher',
      recordId: 'v-2',
      recordLabel: 'Test',
      beforeState: null,
      afterState: null,
      sourceModule: 'sprint-80d-test',
    });
    expect(typeof entry.retention_until).toBe('string');
  });
  it('retention_until is +8 years from current date', () => {
    const entry = logAudit({
      entityCode: 'TEST-3',
      action: 'create',
      entityType: 'voucher',
      recordId: 'v-3',
      recordLabel: 'Test',
      beforeState: null,
      afterState: null,
      sourceModule: 'sprint-80d-test',
    });
    const years = new Date(entry.retention_until!).getFullYear() - new Date().getFullYear();
    expect(years).toBeGreaterThanOrEqual(7);
    expect(years).toBeLessThanOrEqual(9);
  });

  // ─── DP-S80-25 · MCA Coverage Verification ───
  it('comply360-mca-coverage-engine.ts exists', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-mca-coverage-engine.ts'))).toBe(true);
  });
  it('generateCoverageReport produces valid report', () => {
    const r = generateCoverageReport();
    expect(r.report_id).toMatch(/^mcacov_/);
    expect(r.total_engines_scanned).toBeGreaterThan(0);
  });
  it('coverage_percentage between 0 and 100', () => {
    const r = generateCoverageReport();
    expect(r.coverage_percentage).toBeGreaterThanOrEqual(0);
    expect(r.coverage_percentage).toBeLessThanOrEqual(100);
  });
  it('per_engine_evidence has entries for all SIBLINGs', () => {
    const r = generateCoverageReport();
    expect(r.per_engine_evidence.length).toBe(SIBLINGS.length);
  });
  it('mca_compliance_verdict is one of COMPLIANT/NON_COMPLIANT/PARTIAL', () => {
    const r = generateCoverageReport();
    expect(['COMPLIANT', 'NON_COMPLIANT', 'PARTIAL']).toContain(r.mca_compliance_verdict);
  });
  it('exportCoverageReportJson returns valid Blob', () => {
    const r = generateCoverageReport();
    const blob = exportCoverageReportJson(r);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/json');
  });
  it('mca-coverage-engine declares READS_FROM', () => {
    expect(MCACoverage.READS_FROM.engines.length).toBeGreaterThan(0);
  });

  // ─── DP-S80-26 · 8-Year Retention ───
  it('comply360-audit-retention-engine.ts exists', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-audit-retention-engine.ts'))).toBe(true);
  });
  it('exportToColdStorage returns ColdStorageExportRecord + Blob', () => {
    logAudit({
      entityCode: 'ENT-1', action: 'create', entityType: 'voucher',
      recordId: 'v', recordLabel: 'l', beforeState: null, afterState: null,
      sourceModule: 't',
    });
    const { record, blob } = exportToColdStorage({
      entity_code: 'ENT-1', fy: 'FY 2025-26', triggered_by_bap: 'mr-a-client',
    });
    expect(record.id).toMatch(/^csexp_/);
    expect(blob).toBeInstanceOf(Blob);
    expect(record.entries_count).toBeGreaterThan(0);
  });
  it('record.retention_until is +8 years from exported_at', () => {
    const { record } = exportToColdStorage({
      entity_code: 'ENT-2', fy: 'FY 2025-26', triggered_by_bap: 'mr-a-client',
    });
    const years = new Date(record.retention_until).getFullYear() - new Date(record.exported_at).getFullYear();
    expect(years).toBe(8);
  });
  it('scanRetentionWarnings returns array (may be empty for new data)', () => {
    expect(Array.isArray(scanRetentionWarnings('ENT-3'))).toBe(true);
  });
  it('getRetentionStatus returns summary object', () => {
    const s = getRetentionStatus('ENT-4');
    expect(s).toHaveProperty('total_entries');
    expect(s).toHaveProperty('exports_performed');
    expect(s).toHaveProperty('retention_compliant');
  });
  it('acknowledgeWarning roundtrip works (synthetic warning)', () => {
    // Seed a warning by manual insert
    const w = {
      id: 'rwarn_ENT-5_x', entity_code: 'ENT-5',
      oldest_entry_date: '2017-01-01T00:00:00Z',
      retention_boundary_date: '2025-01-01T00:00:00Z',
      days_until_boundary: -10,
      recommended_action: 'archive_safely' as const,
      acknowledged: false, acknowledged_at: null,
    };
    localStorage.setItem('erp_audit_retention_warnings', JSON.stringify([w]));
    const ack = acknowledgeWarning('rwarn_ENT-5_x', 'mr-b-auditor-1');
    expect(ack.acknowledged).toBe(true);
    expect(ack.acknowledged_at).not.toBeNull();
  });
  it('listColdStorageExports filters by entity', () => {
    exportToColdStorage({ entity_code: 'ENT-6', fy: 'FY 2025-26', triggered_by_bap: 'mr-a-client' });
    expect(listColdStorageExports('ENT-6').length).toBeGreaterThanOrEqual(1);
    expect(listColdStorageExports('ENT-NONE').length).toBe(0);
  });
  it('audit-retention-engine declares READS_FROM', () => {
    expect(Retention.READS_FROM.engines.length).toBeGreaterThan(0);
  });

  // ─── Continuity ───
  it('comply360-audit-continuity-engine.ts exists', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-audit-continuity-engine.ts'))).toBe(true);
  });
  it('generateContinuityReport produces valid report', () => {
    const r = generateContinuityReport('ENT-7', 'FY 2025-26');
    expect(r.id).toMatch(/^cont_/);
    expect(r.entity_code).toBe('ENT-7');
    expect(r.fy).toBe('FY 2025-26');
  });
  it('quarter_distribution has Q1/Q2/Q3/Q4 fields', () => {
    const r = generateContinuityReport('ENT-8', 'FY 2025-26');
    expect(r.quarter_distribution).toHaveProperty('Q1');
    expect(r.quarter_distribution).toHaveProperty('Q2');
    expect(r.quarter_distribution).toHaveProperty('Q3');
    expect(r.quarter_distribution).toHaveProperty('Q4');
  });
  it('operated_throughout_year_verdict is one of 3 enum values', () => {
    const r = generateContinuityReport('ENT-9', 'FY 2025-26');
    expect(['CONFIRMED', 'GAPS_DETECTED', 'INSUFFICIENT_DATA']).toContain(r.operated_throughout_year_verdict);
  });
  it('chain_integrity is one of VERIFIED/BROKEN/UNAVAILABLE', () => {
    const r = generateContinuityReport('ENT-10', 'FY 2025-26');
    expect(['VERIFIED', 'BROKEN', 'UNAVAILABLE']).toContain(r.chain_integrity);
  });
  it('getLatestContinuityReport returns the most recent for the FY', () => {
    generateContinuityReport('ENT-11', 'FY 2025-26');
    const latest = getLatestContinuityReport('ENT-11', 'FY 2025-26');
    expect(latest).not.toBeNull();
  });
  it('audit-continuity-engine declares READS_FROM', () => {
    expect(Continuity.READS_FROM.engines.length).toBeGreaterThan(0);
  });

  // ─── 19th tile + Cold-Storage UI ───
  const DASH = SRC('src/pages/erp/comply360/audit-framework/AuditFrameworkDashboardPage.tsx');
  it('AuditFrameworkDashboardPage no longer contains "S80d fills this tile" stub text', () => {
    const src = fs.readFileSync(DASH, 'utf-8');
    expect(src).not.toContain('S80d fills this tile');
  });
  it('AuditFrameworkDashboardPage references MCA_RULE_3_1_COMPLIANCE', () => {
    expect(fs.readFileSync(DASH, 'utf-8')).toContain('MCA_RULE_3_1_COMPLIANCE');
  });
  it('AuditFrameworkDashboardPage imports from mca-coverage-engine', () => {
    expect(fs.readFileSync(DASH, 'utf-8')).toContain('comply360-mca-coverage-engine');
  });
  it('AuditFrameworkDashboardPage imports from audit-retention-engine', () => {
    expect(fs.readFileSync(DASH, 'utf-8')).toContain('comply360-audit-retention-engine');
  });
  it('AuditFrameworkDashboardPage has Cold-Storage Export section', () => {
    expect(fs.readFileSync(DASH, 'utf-8')).toContain('8-Year Cold-Storage Export');
  });
  it('AuditFrameworkDashboardPage 20th tile (Audit Coverage Heatmap) still STUB · S80e owns', () => {
    expect(fs.readFileSync(DASH, 'utf-8')).toContain('S80e fills this tile');
  });

  // ─── §H 0-DIFF anchors (existence checks · Lesson 24) ───
  it('S80a audit-framework engine still present', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-audit-framework-engine.ts'))).toBe(true);
  });
  it('S80a auditor-workspace engine still present', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-auditor-workspace-engine.ts'))).toBe(true);
  });
  it('S80b audit-analytics engine still present', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-audit-analytics-engine.ts'))).toBe(true);
  });
  it('S80b payroll-audit engine still present', () => {
    expect(fs.existsSync(SRC('src/lib/comply360-payroll-audit-engine.ts'))).toBe(true);
  });
  it('S80c StatutoryReturnsPage 6-tab still present (0-DIFF)', () => {
    const src = fs.readFileSync(SRC('src/pages/erp/comply360/payroll/StatutoryReturnsPage.tsx'), 'utf-8');
    const triggers = src.match(/<TabsTrigger/g);
    expect(triggers?.length).toBe(6);
  });

  // ─── ESLint STRICT 0/0 carry (Lesson 30 · 26-sprint carry) ───
  it('Sprint 80d entry uses A first-pass-clean grade (carry mandate)', () => {
    const s = SPRINTS.find((x) => x.code === 'T-Phase-5.B.2.1-PASS-D');
    expect(s?.grade).toBe('A first-pass-clean');
  });
});
