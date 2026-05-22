/**
 * @file        budget-allocation.ts
 * @sprint      T-Phase-2.HK-5 · Block B · D-NEW-GL
 * @purpose     Procurement budget allocations · entity / department / cost-center scoped · fiscal-year aware
 * @[JWT]       erp_budget_allocations_<entityCode>
 */

export type BudgetScope = 'entity' | 'department' | 'cost_center' | 'category';

export interface BudgetAllocation {
  id: string;
  entity_id: string;
  fiscal_year: string;            // e.g. 'FY26-27'
  scope: BudgetScope;
  scope_ref_id: string | null;    // dept_id / cost_center_id / category code; null if scope === 'entity'
  scope_ref_label: string;        // human label cached for display
  allocated_amount: number;       // ₹ paise-rounded display number
  committed_amount: number;       // sum of open POs against this budget
  consumed_amount: number;        // sum of bill-passed invoices against this budget
  warning_threshold_pct: number;  // e.g. 80 → badge turns amber at >= 80% utilization
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const budgetAllocationsKey = (entityCode: string): string =>
  `erp_budget_allocations_${entityCode}`;

export interface BudgetCheckResult {
  status: 'no_budget' | 'within' | 'warning' | 'breach';
  budget: BudgetAllocation | null;
  utilization_pct: number;
  headroom: number;
  rationale: string;
}
