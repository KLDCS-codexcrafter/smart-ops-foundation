/**
 * @file        budget-allocation-engine.test.ts
 * @sprint      T-Phase-2.HK-5 · Block B · D-NEW-GL
 * Engine spec · 22nd SIBLING ⭐
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  fiscalYearOf,
  createBudget,
  listBudgets,
  updateBudget,
  deleteBudget,
  recordCommitment,
  releaseCommitment,
  recordConsumption,
  computeUtilizationPct,
  computeHeadroom,
  findApplicableBudget,
  checkBudgetForAmount,
  summarizeUtilization,
} from '@/lib/budget-allocation-engine';
import { budgetAllocationsKey } from '@/types/budget-allocation';

const ENT = 'TEST-ENT';

beforeEach(() => {
  localStorage.removeItem(budgetAllocationsKey(ENT));
});

function makeBudget(overrides: Partial<Parameters<typeof createBudget>[1]> = {}) {
  return createBudget(ENT, {
    entity_id: 'e1',
    fiscal_year: fiscalYearOf(),
    scope: 'entity',
    scope_ref_id: null,
    scope_ref_label: 'Entity',
    allocated_amount: 1_000_000,
    warning_threshold_pct: 80,
    is_active: true,
    notes: '',
    ...overrides,
  });
}

describe('fiscalYearOf', () => {
  it('returns FYxx-yy format', () => {
    const fy = fiscalYearOf(new Date(2026, 5, 1)); // June 2026 -> FY26-27
    expect(fy).toBe('FY26-27');
  });
  it('rolls back for Jan-Mar', () => {
    const fy = fiscalYearOf(new Date(2026, 1, 15)); // Feb 2026 -> FY25-26
    expect(fy).toBe('FY25-26');
  });
});

describe('CRUD', () => {
  it('creates with zero committed/consumed', () => {
    const b = makeBudget();
    expect(b.committed_amount).toBe(0);
    expect(b.consumed_amount).toBe(0);
    expect(b.id).toMatch(/^bud-/);
  });
  it('lists created budgets', () => {
    makeBudget();
    makeBudget({ scope: 'department', scope_ref_id: 'd1', scope_ref_label: 'Engg' });
    expect(listBudgets(ENT)).toHaveLength(2);
  });
  it('updates preserve id', () => {
    const b = makeBudget();
    const u = updateBudget(ENT, b.id, { notes: 'x' });
    expect(u?.id).toBe(b.id);
    expect(u?.notes).toBe('x');
  });
  it('returns null when updating missing budget', () => {
    expect(updateBudget(ENT, 'missing', {})).toBeNull();
  });
  it('delete removes the budget', () => {
    const b = makeBudget();
    deleteBudget(ENT, b.id);
    expect(listBudgets(ENT)).toHaveLength(0);
  });
});

describe('commitment ledger', () => {
  it('recordCommitment adds to committed_amount', () => {
    const b = makeBudget();
    recordCommitment(ENT, b.id, 200_000);
    const u = listBudgets(ENT)[0];
    expect(u.committed_amount).toBe(200_000);
  });
  it('releaseCommitment subtracts but clamps at 0', () => {
    const b = makeBudget();
    recordCommitment(ENT, b.id, 100_000);
    releaseCommitment(ENT, b.id, 500_000);
    expect(listBudgets(ENT)[0].committed_amount).toBe(0);
  });
  it('recordConsumption moves committed→consumed', () => {
    const b = makeBudget();
    recordCommitment(ENT, b.id, 100_000);
    recordConsumption(ENT, b.id, 100_000);
    const u = listBudgets(ENT)[0];
    expect(u.consumed_amount).toBe(100_000);
    expect(u.committed_amount).toBe(0);
  });
});

describe('computations', () => {
  it('utilization is 0 when allocated_amount is 0', () => {
    const b = { ...makeBudget(), allocated_amount: 0 };
    expect(computeUtilizationPct(b)).toBe(0);
  });
  it('headroom respects committed + consumed', () => {
    const b = makeBudget({ allocated_amount: 1000 });
    recordCommitment(ENT, b.id, 300);
    recordConsumption(ENT, b.id, 0);
    const after = listBudgets(ENT)[0];
    expect(computeHeadroom(after)).toBe(700);
  });
});

describe('findApplicableBudget', () => {
  it('returns exact scope match before entity umbrella', () => {
    const fy = fiscalYearOf();
    makeBudget(); // entity
    const dept = makeBudget({ scope: 'department', scope_ref_id: 'd1', scope_ref_label: 'Engg' });
    const found = findApplicableBudget(ENT, fy, 'department', 'd1');
    expect(found?.id).toBe(dept.id);
  });
  it('falls back to entity budget when no exact match', () => {
    const fy = fiscalYearOf();
    const ent = makeBudget();
    const found = findApplicableBudget(ENT, fy, 'department', 'd-missing');
    expect(found?.id).toBe(ent.id);
  });
  it('returns null when nothing matches', () => {
    expect(findApplicableBudget(ENT, 'FY99-00', 'entity', null)).toBeNull();
  });
});

describe('checkBudgetForAmount', () => {
  it('no_budget when nothing configured', () => {
    const r = checkBudgetForAmount(ENT, 1000);
    expect(r.status).toBe('no_budget');
  });
  it('within when projected utilization < threshold', () => {
    makeBudget({ allocated_amount: 1_000_000, warning_threshold_pct: 80 });
    const r = checkBudgetForAmount(ENT, 100_000);
    expect(r.status).toBe('within');
  });
  it('warning when projected utilization crosses threshold', () => {
    makeBudget({ allocated_amount: 1_000_000, warning_threshold_pct: 80 });
    const r = checkBudgetForAmount(ENT, 850_000);
    expect(r.status).toBe('warning');
  });
  it('breach when amount exceeds headroom', () => {
    makeBudget({ allocated_amount: 1_000_000, warning_threshold_pct: 80 });
    const r = checkBudgetForAmount(ENT, 1_500_000);
    expect(r.status).toBe('breach');
  });
});

describe('summarizeUtilization', () => {
  it('aggregates across active budgets only', () => {
    makeBudget({ allocated_amount: 500_000 });
    const b2 = makeBudget({ allocated_amount: 500_000 });
    recordCommitment(ENT, b2.id, 250_000);
    makeBudget({ allocated_amount: 999_999, is_active: false });
    const s = summarizeUtilization(ENT);
    expect(s.budget_count).toBe(2);
    expect(s.total_allocated).toBe(1_000_000);
    expect(s.total_committed).toBe(250_000);
  });
  it('counts breach when utilization > 100%', () => {
    const b = makeBudget({ allocated_amount: 100, warning_threshold_pct: 80 });
    recordCommitment(ENT, b.id, 150);
    const s = summarizeUtilization(ENT);
    expect(s.breach_count).toBe(1);
  });
});
