/**
 * Sprint A.5 · T-A5-ProjX-GapClose · block-behavioral suite
 * Honest-study canon: ProjX ~80% built · A.5 closes 2 stubs only.
 * P&L preview stub kept 0-DIFF (D-216 · by-design).
 */
import { describe, it, expect } from 'vitest';
import {
  inferMilestonesFromQuotation,
  computeMilestoneInvoiceAmount,
  computeProjectPnLStub,
  computeProjectPnL,
  recomputeProjectFinancials,
  DEFAULT_MILESTONE_SPLIT,
} from '@/lib/projx-engine';
import type { Project } from '@/types/projx/project';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const baseProject: Project = {
  id: 'prj-a5-1',
  entity_id: 'ACME',
  project_no: 'PRJ/26-27/0001',
  project_name: 'A.5 Test Project',
  project_code: 'A5T',
  project_type: 'product_implementation',
  status: 'planning',
  customer_id: null, customer_name: null,
  project_centre_id: 'pc-1',
  source_quotation_id: null, source_quotation_no: null,
  source_so_id: null, source_so_no: null,
  reference_project_id: null, estimation_snapshot_id: null,
  is_export_project: false,
  start_date: '2026-06-01',
  target_end_date: '2026-12-31',
  actual_end_date: null,
  original_contract_value: 1_000_000,
  current_contract_value: 1_000_000,
  contract_value: 1_000_000,
  billed_to_date: 0, cost_to_date: 0, margin_pct: 0,
  change_request_count: 0,
  project_manager_id: null, project_manager_name: null,
  milestone_count: 0, milestones_completed: 0,
  schedule_risk_index: null,
  status_history: [],
  description: '',
  is_active: true,
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
  deleted_at: null, deleted_by_id: null, deletion_reason: null,
};

describe('A.5 · inferMilestonesFromQuotation (gap-fix)', () => {
  it('returns a non-empty schedule (no longer `never[]`)', () => {
    const ms = inferMilestonesFromQuotation(baseProject);
    expect(ms.length).toBeGreaterThan(0);
  });
  it('uses the documented 20/50/30 default split', () => {
    const ms = inferMilestonesFromQuotation(baseProject);
    expect(ms.map(m => m.invoice_pct)).toEqual([20, 50, 30]);
  });
  it('default-split sums to 100 (no rounding drift)', () => {
    const sum = DEFAULT_MILESTONE_SPLIT.reduce((s, m) => s + m.pct, 0);
    expect(sum).toBe(100);
  });
  it('exposes split as a documented constant (editable defaults)', () => {
    expect(DEFAULT_MILESTONE_SPLIT.length).toBe(3);
    expect(DEFAULT_MILESTONE_SPLIT[0].name).toBe('Advance');
  });
  it('proposal inherits entity / project / centre from project', () => {
    const ms = inferMilestonesFromQuotation(baseProject);
    expect(ms.every(m => m.entity_id === baseProject.entity_id)).toBe(true);
    expect(ms.every(m => m.project_id === baseProject.id)).toBe(true);
    expect(ms.every(m => m.project_centre_id === baseProject.project_centre_id)).toBe(true);
  });
  it('target_date defaults to project target_end_date', () => {
    const ms = inferMilestonesFromQuotation(baseProject);
    expect(ms.every(m => m.target_date === baseProject.target_end_date)).toBe(true);
  });
  it('milestone numbers are sequential M-01..M-03', () => {
    const ms = inferMilestonesFromQuotation(baseProject);
    expect(ms.map(m => m.milestone_no)).toEqual(['M-01', 'M-02', 'M-03']);
  });
  it('proposal is pure — running twice yields same pct + amount shape', () => {
    const a = inferMilestonesFromQuotation(baseProject);
    const b = inferMilestonesFromQuotation(baseProject);
    expect(a.map(m => m.invoice_pct)).toEqual(b.map(m => m.invoice_pct));
    expect(a.map(m => m.invoice_amount)).toEqual(b.map(m => m.invoice_amount));
  });
  it('proposal status is pending (never auto-completes)', () => {
    const ms = inferMilestonesFromQuotation(baseProject);
    expect(ms.every(m => m.status === 'pending')).toBe(true);
  });
  it('proposal is_billed = false (honest · never auto-bills)', () => {
    const ms = inferMilestonesFromQuotation(baseProject);
    expect(ms.every(m => m.is_billed === false)).toBe(true);
  });
});

describe('A.5 · computeMilestoneInvoiceAmount (additive helper)', () => {
  it('= round2(pct/100 × current_contract_value)', () => {
    const v = computeMilestoneInvoiceAmount(baseProject, 20);
    expect(v).toBe(200_000);
  });
  it('handles 50% on a 1L project (rounding sanity)', () => {
    const p = { ...baseProject, current_contract_value: 100_000 };
    expect(computeMilestoneInvoiceAmount(p, 50)).toBe(50_000);
  });
  it('returns 0 when contract value is 0 (HONEST · no fabrication)', () => {
    const p = { ...baseProject, current_contract_value: 0 };
    expect(computeMilestoneInvoiceAmount(p, 50)).toBe(0);
  });
  it('returns 0 when pct is 0', () => {
    expect(computeMilestoneInvoiceAmount(baseProject, 0)).toBe(0);
  });
  it('returns 0 when pct is negative', () => {
    expect(computeMilestoneInvoiceAmount(baseProject, -10)).toBe(0);
  });
  it('returns 0 when contract value is negative', () => {
    const p = { ...baseProject, current_contract_value: -100 };
    expect(computeMilestoneInvoiceAmount(p, 30)).toBe(0);
  });
  it('handles fractional pct (12.5% of 1L = 12500)', () => {
    const p = { ...baseProject, current_contract_value: 100_000 };
    expect(computeMilestoneInvoiceAmount(p, 12.5)).toBe(12_500);
  });
  it('rounds to 2 decimals via decimal helpers', () => {
    const p = { ...baseProject, current_contract_value: 33_333 };
    const v = computeMilestoneInvoiceAmount(p, 33);
    // ≈ 10999.89 round2
    expect(v).toBeCloseTo(10_999.89, 2);
  });
  it('three-step proposal amounts sum to current_contract_value when split is 100', () => {
    const ms = inferMilestonesFromQuotation(baseProject);
    const sum = ms.reduce((s, m) => s + m.invoice_amount, 0);
    expect(sum).toBe(baseProject.current_contract_value);
  });
});

describe('A.5 · 0-DIFF guards (D-216 · stub kept by-design)', () => {
  it('computeProjectPnLStub export remains a function', () => {
    expect(typeof computeProjectPnLStub).toBe('function');
  });
  it('computeProjectPnL export remains a function (full path 0-DIFF)', () => {
    expect(typeof computeProjectPnL).toBe('function');
  });
  it('recomputeProjectFinancials export remains a function', () => {
    expect(typeof recomputeProjectFinancials).toBe('function');
  });
  it('computeProjectPnLStub still returns the live-preview shape', () => {
    const r = computeProjectPnLStub(baseProject);
    expect(r).toHaveProperty('revenue_billed');
    expect(r).toHaveProperty('cost_committed', 0); // stub zeros committed (D-216 preview)
  });
});

describe('A.5 · history row', () => {
  it('A.5 row registered with empty newSiblings (no new engine)', () => {
    const a5 = SPRINTS.find(s => s.code === 'T-A5-ProjX-GapClose');
    expect(a5).toBeDefined();
    expect(a5?.newSiblings).toEqual([]);
  });
  it('A.5 predecessor flipped to 08e143d5 (A.3 banked SHA)', () => {
    const a5 = SPRINTS.find(s => s.code === 'T-A5-ProjX-GapClose');
    expect(a5?.predecessorSha).toBe('08e143d5');
  });
  it('A.3 row banked at 08e143d5 (HEAD at A.5 pre-flight)', () => {
    const a3 = SPRINTS.find(s => s.code === 'T-A3-ServiceDesk-Capstone');
    expect(a3?.headSha).toBe('08e143d5');
  });
});
