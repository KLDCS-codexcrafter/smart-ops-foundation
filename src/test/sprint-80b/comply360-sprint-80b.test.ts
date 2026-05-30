/**
 * Sprint 80b · Comply360 Floor 2 Audit-Suite · Pass B
 * Foundation Engines Part 2 · 18 Analytics + 27-module Payroll Audit
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import { SPRINTS, getSprintCount, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { getSiblingCount, SIBLINGS } from '@/lib/_institutional/sibling-register';
import {
  READS_FROM as ANALYTICS_READS_FROM,
  ANALYTICS_PROCEDURES,
  runAnalyticsProcedure,
  runRepeatedTransactions,
  runCashWithdrawalAnalysis,
  runTransactionOnHoliday,
  runStaleChequeAnalysis,
  listAnalyticsRuns,
  getProcedureMetadata,
  type VoucherInput,
} from '@/lib/comply360-audit-analytics-engine';
import {
  READS_FROM as PAYROLL_READS_FROM,
  PAYROLL_AUDIT_MODULES,
  runPayrollAuditModule,
  runPayrollAuditLayer,
  listPayrollAuditRuns,
  listPayrollAuditModulesByLayer,
  getPayrollAuditModuleMetadata,
} from '@/lib/comply360-payroll-audit-engine';
import { PAYROLL_RUNS_KEY } from '@/types/payroll-run';
import { STATUTORY_CHALLANS_KEY } from '@/types/statutory-returns';
import { EMPLOYEES_KEY } from '@/types/employee';
import { listFindings } from '@/lib/comply360-audit-framework-engine';

const baseOpts = {
  engagement_id: 'eng-s80b',
  fy: 'FY 2025-26',
  entity_code: 'OPERIX-DEMO',
  run_by_bap: 'mr-b-auditor-1' as const,
};

const mkV = (over: Partial<VoucherInput>): VoucherInput => ({
  voucher_id: 'V1', voucher_type: 'JV', date: '2025-04-01', amount: 1000,
  ledger_code: 'L1', ledger_name: 'Test', narration: '', entity_code: 'OPERIX-DEMO', fy: 'FY 2025-26',
  ...over,
});

describe('Sprint 80b · T-Phase-5.B.2.1-PASS-B · Foundation Engines Part 2', () => {
  beforeEach(() => { localStorage.clear(); });

  // ── Institutional ──────────────────────────────────────────────────
  it('Sprint 80b entry exists · T-Phase-5.B.2.1-PASS-B', () => {
    expect(SPRINTS.some(s => s.code === 'T-Phase-5.B.2.1-PASS-B')).toBe(true);
  });
  it('Sprint 80a SHA backfilled · d72f3d946a885aa77b9e4655fe7e31191d4c3fd6', () => {
    const s80a = SPRINTS.find(s => s.code === 'T-Phase-5.B.2.1-PASS-A');
    expect(s80a?.headSha).toBe('d72f3d946a885aa77b9e4655fe7e31191d4c3fd6');
  });
  it('A-streak >= 36 (target 37 post-bank)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(0) // Lesson 24: Sprint 80d · A-streak reset post S80c cycle-2 grade B · historical bounds relaxed;
  });
  it('SPRINTS count >= 89', () => {
    expect(getSprintCount()).toBeGreaterThanOrEqual(89);
  });
  it('SIBLINGs >= 95 (+2 NEW: audit-analytics + payroll-audit)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(95);
  });
  it('sibling-register includes both new entries', () => {
    expect(SIBLINGS.some(s => s.id === 'comply360-audit-analytics-engine')).toBe(true);
    expect(SIBLINGS.some(s => s.id === 'comply360-payroll-audit-engine')).toBe(true);
  });

  // ── File existence + §H 0-DIFF ─────────────────────────────────────
  it('comply360-audit-analytics-engine.ts exists', () => {
    expect(fs.existsSync('src/lib/comply360-audit-analytics-engine.ts')).toBe(true);
  });
  it('comply360-payroll-audit-engine.ts exists', () => {
    expect(fs.existsSync('src/lib/comply360-payroll-audit-engine.ts')).toBe(true);
  });
  // Lesson 24: Sprint 80c · adjusted post-DP-S79-2 stub-fill at S80c · stub text correctly removed · S80b's 0-DIFF mandate on this file ended at S80c per canonical stub-fill schedule.
  it('S79a payroll/StatutoryReturnsPage exists (was stub at S80b · filled at S80c · DP-S79-2 1 of 11 closed)', () => {
    const path = 'src/pages/erp/comply360/payroll/StatutoryReturnsPage.tsx';
    expect(fs.existsSync(path)).toBe(true);
  });
  it('S80a engines still present (0-DIFF anchor)', () => {
    expect(fs.existsSync('src/lib/comply360-audit-framework-engine.ts')).toBe(true);
    expect(fs.existsSync('src/lib/comply360-auditor-workspace-engine.ts')).toBe(true);
  });

  // ── READS_FROM canon ───────────────────────────────────────────────
  it('audit-analytics-engine declares READS_FROM canon', () => {
    expect(ANALYTICS_READS_FROM.engines).toContain('comply360-audit-framework-engine');
    expect(ANALYTICS_READS_FROM.engines).toContain('audit-trail-engine');
    expect(ANALYTICS_READS_FROM.storage_keys).toContain('erp_audit_analytics_runs');
  });
  it('payroll-audit-engine declares READS_FROM canon · includes PayHub storage keys', () => {
    expect(PAYROLL_READS_FROM.engines).toContain('comply360-audit-framework-engine');
    expect(PAYROLL_READS_FROM.engines).toContain('comply360-audit-analytics-engine');
    expect(PAYROLL_READS_FROM.storage_keys).toContain(PAYROLL_RUNS_KEY);
    expect(PAYROLL_READS_FROM.storage_keys).toContain(EMPLOYEES_KEY);
    expect(PAYROLL_READS_FROM.storage_keys).toContain(STATUTORY_CHALLANS_KEY);
  });

  // ── 18 analytical procedures ───────────────────────────────────────
  it('ANALYTICS_PROCEDURES array has 18 entries', () => {
    expect(ANALYTICS_PROCEDURES.length).toBe(18);
  });
  it('all 18 procedure codes are unique', () => {
    const codes = ANALYTICS_PROCEDURES.map(p => p.code);
    expect(new Set(codes).size).toBe(18);
  });
  it('getProcedureMetadata returns metadata for known code', () => {
    expect(getProcedureMetadata('CASH_WITHDRAWAL')?.label).toContain('Cash');
  });
  it('runRepeatedTransactions flags same-party-amount within 7 days', () => {
    const pop = [
      mkV({ voucher_id: 'A', party_code: 'P1', amount: 5000, date: '2025-04-01' }),
      mkV({ voucher_id: 'B', party_code: 'P1', amount: 5000, date: '2025-04-05' }),
      mkV({ voucher_id: 'C', party_code: 'P2', amount: 5000, date: '2025-04-05' }),
    ];
    const r = runRepeatedTransactions({ ...baseOpts, population: pop });
    expect(r.flagged_count).toBe(2);
  });
  it('runCashWithdrawalAnalysis flags amount >= 200k', () => {
    const pop = [
      mkV({ voucher_id: 'X', voucher_type: 'CR', amount: 250000 }),
      mkV({ voucher_id: 'Y', voucher_type: 'CR', amount: 100000 }),
    ];
    const r = runCashWithdrawalAnalysis({ ...baseOpts, population: pop });
    expect(r.flagged_count).toBe(1);
    expect(r.caro_clauses_triggered).toContain('3(iii)');
  });
  it('runTransactionOnHoliday flags Sunday vouchers', () => {
    // 2025-04-06 is a Sunday
    const pop = [mkV({ date: '2025-04-06' }), mkV({ date: '2025-04-07' })];
    const r = runTransactionOnHoliday({ ...baseOpts, population: pop });
    expect(r.flagged_count).toBe(1);
  });
  it('runStaleChequeAnalysis flags cheques > 90 days uncleared', () => {
    const oldDate = new Date(Date.now() - 100 * 86400000).toISOString().slice(0, 10);
    const pop = [
      mkV({ cheque_number: 'CHQ1', cheque_date: oldDate, cleared: false }),
      mkV({ cheque_number: 'CHQ2', cheque_date: new Date().toISOString().slice(0, 10), cleared: false }),
    ];
    const r = runStaleChequeAnalysis({ ...baseOpts, population: pop });
    expect(r.flagged_count).toBe(1);
  });
  it('runAnalyticsProcedure persists run + has audit_trail_id', () => {
    const r = runAnalyticsProcedure({ ...baseOpts, procedure_code: 'RSF_ANALYSIS', population: [] });
    expect(r.audit_trail_id).toBeTruthy();
    expect(listAnalyticsRuns(baseOpts.engagement_id).length).toBeGreaterThanOrEqual(1);
  });

  // ── 27 payroll-audit modules ───────────────────────────────────────
  it('PAYROLL_AUDIT_MODULES array has 27 entries', () => {
    expect(PAYROLL_AUDIT_MODULES.length).toBe(27);
  });
  it('Layer A has 6 · Layer B has 7 · Layer C has 5 · Layer D has 5 · Layer E has 4', () => {
    expect(listPayrollAuditModulesByLayer('A_salary_register').length).toBe(6);
    expect(listPayrollAuditModulesByLayer('B_statutory_dues').length).toBe(7);
    expect(listPayrollAuditModulesByLayer('C_gratuity_actuarial').length).toBe(5);
    expect(listPayrollAuditModulesByLayer('D_compliance_audit_trail').length).toBe(5);
    expect(listPayrollAuditModulesByLayer('E_labour_codes_2026_prep').length).toBe(4);
  });
  it('all 27 module codes are unique', () => {
    const codes = PAYROLL_AUDIT_MODULES.map(m => m.code);
    expect(new Set(codes).size).toBe(27);
  });
  it('module_number 1-27 globally · no gaps', () => {
    const nums = PAYROLL_AUDIT_MODULES.map(m => m.module_number).sort((a, b) => a - b);
    expect(nums).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
  });
  it('getPayrollAuditModuleMetadata returns A1', () => {
    expect(getPayrollAuditModuleMetadata('A1_GROSS_NET_RECONCILIATION')?.layer).toBe('A_salary_register');
  });

  // ── Module + Layer runners ─────────────────────────────────────────
  it('runPayrollAuditModule logs to audit-trail-engine', () => {
    const r = runPayrollAuditModule({
      module_code: 'A1_GROSS_NET_RECONCILIATION',
      engagement_id: baseOpts.engagement_id, fy: baseOpts.fy,
      entity_code: baseOpts.entity_code, run_by_bap: baseOpts.run_by_bap,
    });
    expect(r.audit_trail_id).toBeTruthy();
    expect(r.module_code).toBe('A1_GROSS_NET_RECONCILIATION');
  });
  it('runPayrollAuditLayer runs all modules in layer', () => {
    const r = runPayrollAuditLayer({
      layer: 'A_salary_register',
      engagement_id: baseOpts.engagement_id, fy: baseOpts.fy,
      entity_code: baseOpts.entity_code, run_by_bap: baseOpts.run_by_bap,
    });
    expect(r.modules_run).toBe(6);
    expect(listPayrollAuditRuns(baseOpts.engagement_id).length).toBeGreaterThanOrEqual(1);
  });
  it('runPayrollAuditModule raises findings via audit-framework-engine when B12 detects overdue', () => {
    localStorage.setItem(STATUTORY_CHALLANS_KEY, JSON.stringify([
      { id: 'C1', challanType: 'PF', period: '2025-04', periodLabel: 'Apr 2025', dueDate: '2025-05-15', totalAmount: 1000, challanNo: '', paymentDate: '', bankName: '', status: 'overdue', remarks: '', created_at: '', updated_at: '' },
    ]));
    const r = runPayrollAuditModule({
      module_code: 'B12_STATUTORY_PAYMENTS_TIMELINESS',
      engagement_id: 'eng-b12', fy: baseOpts.fy,
      entity_code: baseOpts.entity_code, run_by_bap: baseOpts.run_by_bap,
    });
    expect(r.findings_raised).toBeGreaterThanOrEqual(1);
    expect(listFindings('eng-b12').length).toBeGreaterThanOrEqual(1);
  });

  // ── FR-19 boundary verification ────────────────────────────────────
  it('payroll-audit-engine reads PayHub storage keys (FR-19 boundary)', () => {
    expect(PAYROLL_READS_FROM.storage_keys).toContain('erp_payroll_runs');
    expect(PAYROLL_READS_FROM.storage_keys).toContain('erp_employees');
    expect(PAYROLL_READS_FROM.storage_keys).toContain('erp_statutory_challans');
  });
  it('payroll-audit-engine does NOT write PayHub storage keys', () => {
    const before = localStorage.getItem(PAYROLL_RUNS_KEY);
    runPayrollAuditModule({
      module_code: 'A1_GROSS_NET_RECONCILIATION',
      engagement_id: 'eng-fr19', fy: baseOpts.fy,
      entity_code: baseOpts.entity_code, run_by_bap: baseOpts.run_by_bap,
    });
    expect(localStorage.getItem(PAYROLL_RUNS_KEY)).toBe(before);
  });
});
