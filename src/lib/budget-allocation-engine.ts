/**
 * @file        budget-allocation-engine.ts
 * @sprint      T-Phase-2.HK-5 · Block B · D-NEW-GL · 22nd SIBLING ⭐
 * @purpose     Procurement budget engine · CRUD + commitment/consumption ledger + PO budget check
 * @decisions   FR-19 SIBLING · po-management-engine 0-DIFF (consumes its PUBLIC API only)
 * @disciplines FR-22 canonical · FR-26 entity-scoped · FR-54 CC SSOT preserved
 * @reuses      budget-allocation type + key · po-management-engine listPurchaseOrders (read-only)
 * @[JWT]       erp_budget_allocations_<entityCode>
 */
import {
  budgetAllocationsKey,
  type BudgetAllocation,
  type BudgetCheckResult,
  type BudgetScope,
} from '@/types/budget-allocation';
import { listPurchaseOrders } from '@/lib/po-management-engine';

const nowIso = (): string => new Date().toISOString();

/** India fiscal year string for a given date (Apr–Mar). */
export function fiscalYearOf(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0 = Jan
  const start = m >= 3 ? y : y - 1;
  const end = start + 1;
  return `FY${String(start).slice(-2)}-${String(end).slice(-2)}`;
}

export function listBudgets(entityCode: string): BudgetAllocation[] {
  try {
    // [JWT] GET /api/budget-allocations
    const raw = localStorage.getItem(budgetAllocationsKey(entityCode));
    return raw ? (JSON.parse(raw) as BudgetAllocation[]) : [];
  } catch {
    return [];
  }
}

function writeBudgets(entityCode: string, all: BudgetAllocation[]): void {
  try {
    // [JWT] PUT /api/budget-allocations (bulk)
    localStorage.setItem(budgetAllocationsKey(entityCode), JSON.stringify(all));
  } catch {
    /* quota silent */
  }
}

export function createBudget(
  entityCode: string,
  patch: Omit<BudgetAllocation, 'id' | 'committed_amount' | 'consumed_amount' | 'created_at' | 'updated_at'>,
): BudgetAllocation {
  const now = nowIso();
  const rec: BudgetAllocation = {
    ...patch,
    id: `bud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    committed_amount: 0,
    consumed_amount: 0,
    created_at: now,
    updated_at: now,
  };
  const all = listBudgets(entityCode);
  writeBudgets(entityCode, [rec, ...all]);
  return rec;
}

export function updateBudget(
  entityCode: string,
  id: string,
  patch: Partial<BudgetAllocation>,
): BudgetAllocation | null {
  const all = listBudgets(entityCode);
  const i = all.findIndex((b) => b.id === id);
  if (i < 0) return null;
  const next: BudgetAllocation = { ...all[i], ...patch, id: all[i].id, updated_at: nowIso() };
  all[i] = next;
  writeBudgets(entityCode, all);
  return next;
}

export function deleteBudget(entityCode: string, id: string): void {
  const all = listBudgets(entityCode).filter((b) => b.id !== id);
  writeBudgets(entityCode, all);
}

export function recordCommitment(entityCode: string, budgetId: string, amount: number): void {
  const b = listBudgets(entityCode).find((x) => x.id === budgetId);
  if (!b) return;
  updateBudget(entityCode, budgetId, { committed_amount: b.committed_amount + amount });
}

export function releaseCommitment(entityCode: string, budgetId: string, amount: number): void {
  const b = listBudgets(entityCode).find((x) => x.id === budgetId);
  if (!b) return;
  updateBudget(entityCode, budgetId, {
    committed_amount: Math.max(0, b.committed_amount - amount),
  });
}

export function recordConsumption(entityCode: string, budgetId: string, amount: number): void {
  const b = listBudgets(entityCode).find((x) => x.id === budgetId);
  if (!b) return;
  updateBudget(entityCode, budgetId, {
    consumed_amount: b.consumed_amount + amount,
    committed_amount: Math.max(0, b.committed_amount - amount),
  });
}

export function computeUtilizationPct(b: BudgetAllocation): number {
  if (b.allocated_amount <= 0) return 0;
  return Math.round(((b.committed_amount + b.consumed_amount) / b.allocated_amount) * 1000) / 10;
}

export function computeHeadroom(b: BudgetAllocation): number {
  return Math.max(0, b.allocated_amount - b.committed_amount - b.consumed_amount);
}

export function findApplicableBudget(
  entityCode: string,
  fiscalYear: string,
  scope: BudgetScope,
  scopeRefId: string | null,
): BudgetAllocation | null {
  const all = listBudgets(entityCode).filter(
    (b) => b.is_active && b.fiscal_year === fiscalYear,
  );
  // Exact scope+ref match first
  const exact = all.find(
    (b) => b.scope === scope && (b.scope_ref_id ?? null) === (scopeRefId ?? null),
  );
  if (exact) return exact;
  // Fall back to entity-level umbrella budget
  return all.find((b) => b.scope === 'entity') ?? null;
}

export function checkBudgetForAmount(
  entityCode: string,
  amount: number,
  options?: {
    scope?: BudgetScope;
    scope_ref_id?: string | null;
    fiscal_year?: string;
  },
): BudgetCheckResult {
  const fy = options?.fiscal_year ?? fiscalYearOf();
  const scope: BudgetScope = options?.scope ?? 'entity';
  const refId = options?.scope_ref_id ?? null;
  const budget = findApplicableBudget(entityCode, fy, scope, refId);
  if (!budget) {
    return {
      status: 'no_budget',
      budget: null,
      utilization_pct: 0,
      headroom: 0,
      rationale: `No active ${scope} budget configured for ${fy}`,
    };
  }
  const projectedUtil = budget.allocated_amount > 0
    ? ((budget.committed_amount + budget.consumed_amount + amount) / budget.allocated_amount) * 100
    : 0;
  const headroom = computeHeadroom(budget);
  if (projectedUtil > 100) {
    return {
      status: 'breach',
      budget,
      utilization_pct: Math.round(projectedUtil * 10) / 10,
      headroom,
      rationale: `Amount exceeds budget headroom by ₹${(amount - headroom).toLocaleString('en-IN')}`,
    };
  }
  if (projectedUtil >= budget.warning_threshold_pct) {
    return {
      status: 'warning',
      budget,
      utilization_pct: Math.round(projectedUtil * 10) / 10,
      headroom,
      rationale: `Projected utilization ${Math.round(projectedUtil)}% crosses ${budget.warning_threshold_pct}% warning threshold`,
    };
  }
  return {
    status: 'within',
    budget,
    utilization_pct: Math.round(projectedUtil * 10) / 10,
    headroom,
    rationale: `Within budget · projected utilization ${Math.round(projectedUtil)}%`,
  };
}

/**
 * Cross-check actual committed amount against open POs (read-only audit helper).
 * po-management-engine stays 0-DIFF · consumes its listPurchaseOrders PUBLIC API only.
 */
export function reconcileCommittedFromPos(
  entityCode: string,
  budget: BudgetAllocation,
): number {
  const pos = listPurchaseOrders(entityCode).filter(
    (p) => p.status !== 'cancelled' && p.status !== 'closed',
  );
  let total = 0;
  for (const po of pos) {
    if (budget.scope === 'entity') total += po.total_basic_value;
    else if (budget.scope === 'department' && po.department_id === budget.scope_ref_id) total += po.total_basic_value;
    else if (budget.scope === 'cost_center' && po.cost_center_id === budget.scope_ref_id) total += po.total_basic_value;
  }
  return total;
}

export interface BudgetUtilizationSummary {
  total_allocated: number;
  total_committed: number;
  total_consumed: number;
  overall_utilization_pct: number;
  breach_count: number;
  warning_count: number;
  budget_count: number;
}

export function summarizeUtilization(entityCode: string): BudgetUtilizationSummary {
  const all = listBudgets(entityCode).filter((b) => b.is_active);
  let allocated = 0, committed = 0, consumed = 0, breach = 0, warn = 0;
  for (const b of all) {
    allocated += b.allocated_amount;
    committed += b.committed_amount;
    consumed += b.consumed_amount;
    const util = computeUtilizationPct(b);
    if (util > 100) breach += 1;
    else if (util >= b.warning_threshold_pct) warn += 1;
  }
  return {
    total_allocated: allocated,
    total_committed: committed,
    total_consumed: consumed,
    overall_utilization_pct: allocated > 0
      ? Math.round(((committed + consumed) / allocated) * 1000) / 10
      : 0,
    breach_count: breach,
    warning_count: warn,
    budget_count: all.length,
  };
}
