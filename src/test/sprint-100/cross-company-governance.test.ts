/**
 * @file        src/test/sprint-100/cross-company-governance.test.ts
 * @sprint      Sprint 100 · T-Phase-6.A.0.5
 * @purpose     >=35 discrete it() asserting:
 *               · 9 cross-company reports run + owner_company tagging + ledger-voucher drill
 *               · heatmap classifyCell green/yellow/red
 *               · idea-5 getAccess per role + master_access_change audit
 *               · idea-6 evaluateInterDeptApproval threshold + CALLS approval-matrix + approval-workflow (§P · no dup)
 *               · idea-8 buildCrossStitch from ProjectCentre + cost_centre_cross_stitch audit
 *               · sibling-register count = 169 REAL · Standalone Page #26 route present
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  ALL_CROSS_CO_REPORTS,
  runCrossCoReport,
  runAllReports,
} from '@/lib/cross-company-reports-engine';
import {
  getAccess,
  setAccessRule,
  listAccessRules,
  clearAccessRules,
  DEFAULT_ACCESS_RULES,
  getFieldAccess,
} from '@/lib/idea-5-master-access-matrix-engine';
import {
  evaluateInterDeptApproval,
  recordInterDeptDecision,
  listInterDeptWorkflows,
  INTER_DEPT_THRESHOLD_PCT,
} from '@/lib/idea-6-inter-dept-approval-bridge-engine';
import * as approvalMatrix from '@/lib/approval-matrix-engine';
import * as approvalWorkflow from '@/lib/approval-workflow-engine';
import {
  buildCrossStitch,
  listCrossStitches,
} from '@/lib/idea-8-cost-centre-cross-stitch-engine';
import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { readAuditTrail } from '@/lib/audit-trail-engine';
import { classifyCell } from '@/features/master-visibility/classifyCell';

beforeEach(() => {
  localStorage.clear();
  clearAccessRules();
});

function seedVoucher(entityCode: string, id: string, base: string, amount: number, date = '2026-04-15') {
  const key = `erp_group_vouchers_${entityCode}`;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  existing.push({
    id, voucher_no: id, base_voucher_type: base, date,
    journal: [
      { ledger_id: 'L1', dr_amount: amount, cr_amount: 0, narration: 'test' },
      { ledger_id: 'L2', dr_amount: 0, cr_amount: amount, narration: 'test' },
    ],
  });
  localStorage.setItem(key, JSON.stringify(existing));
}

function seedProjectCentre(entityCode: string, id: string, name: string, division_id: string | null, department_id: string | null) {
  const key = `erp_project_centres_${entityCode}`;
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  list.push({
    id, code: id, name, category: 'service', parent_project_centre_id: null,
    division_id, department_id, customer_id: null, customer_name: null,
    status: 'active', description: '', entity_id: entityCode,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
  localStorage.setItem(key, JSON.stringify(list));
}

// ── Block 2 · cross-company-reports-engine ──
describe('Block 2 · cross-company-reports-engine · 9 reports + owner_company tagging', () => {
  it('ALL_CROSS_CO_REPORTS has exactly 9 entries', () => {
    expect(ALL_CROSS_CO_REPORTS).toHaveLength(9);
  });
  it('runAllReports returns 9 result rows (one per report type)', () => {
    const all = runAllReports();
    expect(all).toHaveLength(9);
  });
  it('multi_company_cash_book runs and returns totals.row_count', () => {
    seedVoucher('SMRT', 'V1', 'cash_payment', 1000);
    const r = runCrossCoReport({ report: 'multi_company_cash_book' });
    expect(r.totals).toHaveProperty('row_count');
  });
  it('multi_company_bank_book runs and aggregates bank voucher rows', () => {
    seedVoucher('SMRT', 'V2', 'bank_payment', 2500);
    const r = runCrossCoReport({ report: 'multi_company_bank_book' });
    expect(r.totals.grand_total).toBeGreaterThan(0);
  });
  it('group_sales_register filters by sales/invoice voucher types', () => {
    seedVoucher('SMRT', 'V3', 'sales_invoice', 5000);
    const r = runCrossCoReport({ report: 'group_sales_register' });
    expect(r.rows.length).toBeGreaterThan(0);
  });
  it('group_purchase_register filters by purchase/bill voucher types', () => {
    seedVoucher('SMRT', 'V4', 'purchase_bill', 7500);
    const r = runCrossCoReport({ report: 'group_purchase_register' });
    expect(r.rows.length).toBeGreaterThan(0);
  });
  it('multi_company_bill_payable_outstanding runs even with empty stores', () => {
    const r = runCrossCoReport({ report: 'multi_company_bill_payable_outstanding' });
    expect(r.rows).toBeDefined();
    expect(r.totals.row_count).toBe(r.rows.length);
  });
  it('multi_company_bill_receivable_outstanding runs and returns totals', () => {
    const r = runCrossCoReport({ report: 'multi_company_bill_receivable_outstanding' });
    expect(r.totals).toHaveProperty('grand_total');
  });
  it('multi_company_graph aggregates per company', () => {
    seedVoucher('SMRT', 'V5', 'sales_invoice', 100);
    const r = runCrossCoReport({ report: 'multi_company_graph' });
    expect(r.rows.every((row) => 'owner_company' in row)).toBe(true);
  });
  it('multi_company_group_comparison returns sales/purchase/cash/bank per company', () => {
    seedVoucher('SMRT', 'V6', 'sales_invoice', 100);
    const r = runCrossCoReport({ report: 'multi_company_group_comparison' });
    expect(r.totals).toHaveProperty('sales_total');
  });
  it('multi_company_ledger_voucher carries owner_company on every row (drill back)', () => {
    seedVoucher('SMRT', 'V7', 'sales_invoice', 100);
    const r = runCrossCoReport({ report: 'multi_company_ledger_voucher' });
    expect(r.rows.length).toBeGreaterThan(0);
    expect(r.rows.every((row) => typeof row.owner_company === 'string')).toBe(true);
  });
  it('every report row carries owner_company tag', () => {
    seedVoucher('SMRT', 'V8', 'sales_invoice', 100);
    const all = runAllReports();
    for (const result of all) {
      for (const row of result.rows) {
        expect(row).toHaveProperty('owner_company');
      }
    }
  });
  it('reports are READ-ONLY · NO new audit type registered for cross-company-reports-engine', () => {
    // Engine source has no registerAuditEntityType call
    const src = fs.readFileSync(path.resolve('src/lib/cross-company-reports-engine.ts'), 'utf8');
    expect(src).not.toContain('registerAuditEntityType');
  });
  it('reports walk loadEntities via mock-entities (USE-SITE READ)', () => {
    const src = fs.readFileSync(path.resolve('src/lib/cross-company-reports-engine.ts'), 'utf8');
    expect(src).toContain('loadEntities');
  });
  it('reports use fincore-engine vouchersKey (USE-SITE READ)', () => {
    const src = fs.readFileSync(path.resolve('src/lib/cross-company-reports-engine.ts'), 'utf8');
    expect(src).toContain('vouchersKey');
  });
  it('from_date/to_date filtering scopes voucher iteration', () => {
    seedVoucher('SMRT', 'V9', 'sales_invoice', 100, '2025-01-01');
    seedVoucher('SMRT', 'V10', 'sales_invoice', 100, '2026-04-01');
    const r = runCrossCoReport({ report: 'group_sales_register', from_date: '2026-01-01', to_date: '2026-12-31' });
    expect(r.rows.length).toBe(1);
  });
});

// ── Block 3 · MasterVisibilityHeatmapPage · classifyCell ──
describe('Block 3 · MasterVisibilityHeatmapPage · classifyCell colour logic', () => {
  it('returns red when not present', () => {
    expect(classifyCell({ present: false, hasOverride: false })).toBe('red');
  });
  it('returns yellow when present + override exists', () => {
    expect(classifyCell({ present: true, hasOverride: true })).toBe('yellow');
  });
  it('returns green when present and no override', () => {
    expect(classifyCell({ present: true, hasOverride: false })).toBe('green');
  });
  it('red dominates even when override flag is true (missing wins)', () => {
    expect(classifyCell({ present: false, hasOverride: true })).toBe('red');
  });
  it('heatmap page is wired as standalone module (not a SIBLING)', () => {
    expect(SIBLINGS.find((s) => s.id === 'master-visibility-heatmap-page')).toBeUndefined();
  });
  it('CommandCenterPage routes fincore-master-visibility-heatmap', () => {
    const src = fs.readFileSync(path.resolve('src/features/command-center/pages/CommandCenterPage.tsx'), 'utf8');
    expect(src).toContain('fincore-master-visibility-heatmap');
    expect(src).toContain('MasterVisibilityHeatmapPage');
  });
});

// ── Block 4 · idea-5-master-access-matrix-engine ──
describe('Block 4 · idea-5 master-access-matrix-engine', () => {
  it('DEFAULT_ACCESS_RULES exists and is non-empty', () => {
    expect(DEFAULT_ACCESS_RULES.length).toBeGreaterThan(0);
  });
  it('hq_finance defaults to edit on customer master', () => {
    expect(getAccess({ master_type: 'customer', entity_code: 'SMRT', role: 'hq_finance' })).toBe('edit');
  });
  it('branch_manager defaults to view on customer master', () => {
    expect(getAccess({ master_type: 'customer', entity_code: 'SMRT', role: 'branch_manager' })).toBe('view');
  });
  it('project_manager defaults to view_request_approval', () => {
    expect(getAccess({ master_type: 'item', entity_code: 'SMRT', role: 'project_manager' })).toBe('view_request_approval');
  });
  it('setAccessRule persists and supersedes default', () => {
    setAccessRule({ master_type: 'customer', entity_code: 'SMRT', role: 'branch_manager', permission: 'edit' });
    expect(getAccess({ master_type: 'customer', entity_code: 'SMRT', role: 'branch_manager' })).toBe('edit');
  });
  it('setAccessRule writes master_access_change audit', () => {
    setAccessRule({ master_type: 'vendor', entity_code: 'SMRT', role: 'branch_manager', permission: 'edit' });
    const audit = readAuditTrail('SMRT');
    expect(audit.some((a) => a.entity_type === 'master_access_change')).toBe(true);
  });
  it('field_overrides additive — TDS section editable even when row permission is view', () => {
    setAccessRule({
      master_type: 'customer', entity_code: 'SMRT', role: 'branch_manager',
      permission: 'view',
      field_overrides: [{ field: 'tds_section_override', permission: 'edit' }],
    });
    expect(getFieldAccess({ master_type: 'customer', entity_code: 'SMRT', role: 'branch_manager', field: 'tds_section_override' })).toBe('edit');
    expect(getFieldAccess({ master_type: 'customer', entity_code: 'SMRT', role: 'branch_manager', field: 'name' })).toBe('view');
  });
  it('listAccessRules returns stored + defaults', () => {
    expect(listAccessRules().length).toBeGreaterThanOrEqual(DEFAULT_ACCESS_RULES.length);
  });
});

// ── Block 5 · idea-6-inter-dept-approval-bridge-engine ──
describe('Block 5 · idea-6 inter-dept-approval-bridge (ORCHESTRATOR · §P)', () => {
  it('INTER_DEPT_THRESHOLD_PCT = 5', () => {
    expect(INTER_DEPT_THRESHOLD_PCT).toBe(5);
  });
  it('no approval required when variance <= 5%', () => {
    const r = evaluateInterDeptApproval({ from_department: 'PROD', to_department: 'SALES', internal_price: 102, budget_rate: 100 });
    expect(r.requires_approval).toBe(false);
  });
  it('approval required when variance > 5%', () => {
    const r = evaluateInterDeptApproval({ from_department: 'PROD', to_department: 'SALES', internal_price: 110, budget_rate: 100 });
    expect(r.requires_approval).toBe(true);
    expect(r.workflow_id).toBeDefined();
  });
  it('CALLS approval-matrix-engine.findApplicableTemplate (orchestration · no dup)', () => {
    const spy = vi.spyOn(approvalMatrix, 'findApplicableTemplate');
    evaluateInterDeptApproval({ from_department: 'A', to_department: 'B', internal_price: 200, budget_rate: 100 });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
  it('CALLS approval-workflow-engine.submit (state machine reused · no dup)', () => {
    const spy = vi.spyOn(approvalWorkflow, 'submit');
    evaluateInterDeptApproval({ from_department: 'A', to_department: 'B', internal_price: 200, budget_rate: 100 });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
  it('recordInterDeptDecision approved routes to workflow.approve', () => {
    const e = evaluateInterDeptApproval({ from_department: 'A', to_department: 'B', internal_price: 200, budget_rate: 100 });
    const spy = vi.spyOn(approvalWorkflow, 'approve');
    const ok = recordInterDeptDecision(e.workflow_id!, 'approved');
    expect(ok.ok).toBe(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
  it('recordInterDeptDecision rejected routes to workflow.reject with reason', () => {
    const e = evaluateInterDeptApproval({ from_department: 'A', to_department: 'B', internal_price: 200, budget_rate: 100 });
    const spy = vi.spyOn(approvalWorkflow, 'reject');
    const ok = recordInterDeptDecision(e.workflow_id!, 'rejected', 'over budget');
    expect(ok.ok).toBe(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
  it('listInterDeptWorkflows returns the persisted workflow', () => {
    evaluateInterDeptApproval({ from_department: 'A', to_department: 'B', internal_price: 200, budget_rate: 100 });
    expect(listInterDeptWorkflows().length).toBeGreaterThan(0);
  });
  it('idea-6 source contains @orchestrator-exemption header (§P)', () => {
    const src = fs.readFileSync(path.resolve('src/lib/idea-6-inter-dept-approval-bridge-engine.ts'), 'utf8');
    expect(src).toContain('@orchestrator-exemption');
  });
  it('idea-6 does NOT call registerAuditEntityType (no new audit type · §P)', () => {
    const src = fs.readFileSync(path.resolve('src/lib/idea-6-inter-dept-approval-bridge-engine.ts'), 'utf8');
    expect(src).not.toContain('registerAuditEntityType');
  });
});

// ── Block 6 · idea-8-cost-centre-cross-stitch-engine ──
describe('Block 6 · idea-8 cost-centre-cross-stitch', () => {
  it('buildCrossStitch reads ProjectCentre.division_id and department_id', () => {
    seedProjectCentre('SMRT', 'pc-1', 'Hyderabad EPC', 'div-A', 'dept-7');
    const link = buildCrossStitch('pc-1');
    expect(link).not.toBeNull();
    expect(link!.division_id).toBe('div-A');
    expect(link!.department_id).toBe('dept-7');
  });
  it('cost_centre_id equals project_id (PROJECT-ONLY · locked)', () => {
    seedProjectCentre('SMRT', 'pc-2', 'Mumbai AMC', null, null);
    const link = buildCrossStitch('pc-2');
    expect(link!.cost_centre_id).toBe('pc-2');
  });
  it('buildCrossStitch writes cost_centre_cross_stitch audit', () => {
    seedProjectCentre('SMRT', 'pc-3', 'Pune Service', null, null);
    buildCrossStitch('pc-3');
    const audit = readAuditTrail('SMRT');
    expect(audit.some((a) => a.entity_type === 'cost_centre_cross_stitch')).toBe(true);
  });
  it('buildCrossStitch returns null for unknown project', () => {
    expect(buildCrossStitch('does-not-exist')).toBeNull();
  });
  it('listCrossStitches filters inactive project centres', () => {
    seedProjectCentre('SMRT', 'pc-4', 'X', null, null);
    expect(listCrossStitches('SMRT').length).toBe(1);
  });
});

// ── Block 7 · sibling-register integrity + meta ──
describe('Block 7 · institutional integrity', () => {
  it('sibling-register count >= 169 (S100 floor; later sprints add engines)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(169);
  });
  it('cross-company-reports-engine registered exactly once', () => {
    expect(SIBLINGS.filter((s) => s.id === 'cross-company-reports-engine').length).toBe(1);
  });
  it('idea-5-master-access-matrix-engine registered exactly once', () => {
    expect(SIBLINGS.filter((s) => s.id === 'idea-5-master-access-matrix-engine').length).toBe(1);
  });
  it('idea-6-inter-dept-approval-bridge-engine registered exactly once', () => {
    expect(SIBLINGS.filter((s) => s.id === 'idea-6-inter-dept-approval-bridge-engine').length).toBe(1);
  });
  it('idea-8-cost-centre-cross-stitch-engine registered exactly once', () => {
    expect(SIBLINGS.filter((s) => s.id === 'idea-8-cost-centre-cross-stitch-engine').length).toBe(1);
  });
  it('comply360-tier2-extensions-engine sibling count unchanged (still 1)', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'comply360-tier2-extensions-engine');
    expect(matches.length).toBe(1);
  });
});
