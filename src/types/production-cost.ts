/**
 * @file     production-cost.ts
 * @sprint   T-Phase-1.3-3a-pre-1
 * @purpose  3-Layer Cost of Production architecture (Master · Budget · Actual + 7-way variance + forex).
 * @decisions D-501.5 · D-512
 */

export type CostRateBasis =
  | 'master_standard'
  | 'budget_rate'
  | 'last_purchase'
  | 'current_rate';

export type CostAllocationMethod = 'direct' | 'weighted_average' | 'activity_based';

export interface ProductionCostLayer {
  direct_material: number;
  direct_labour: number;
  direct_expense: number;
  manufacturing_overhead: number;
  other_direct_costs: number;
  total: number;
  per_unit: number;
}

export interface VarianceDecomposition {
  total_amount: number;
  total_pct: number;
  is_unfavourable: boolean;
  threshold_breached: boolean;
  by_component: {
    direct_material: number;
    direct_labour: number;
    direct_expense: number;
    manufacturing_overhead: number;
    other_direct_costs: number;
  };
  by_variance_type: {
    quantity_variance: number;
    price_variance: number;
    mix_variance: number;
    yield_variance: number;
    efficiency_variance: number;
    rate_variance: number;
    overhead_variance: number;
  };
}

export interface ProductionForexComponent {
  base_currency: string;
  transaction_currency: string;
  base_to_transaction_rate: number;
  current_rate: number;
  forex_variance_amount: number;
}

export interface ProductionCostStructure {
  master: ProductionCostLayer;
  budget: ProductionCostLayer;
  actual: ProductionCostLayer;
  variance: {
    master_vs_budget: VarianceDecomposition;
    budget_vs_actual: VarianceDecomposition;
    master_vs_actual: VarianceDecomposition;
  };
  forex: ProductionForexComponent | null;
  budget_rate_basis: CostRateBasis;
  master_rate_basis: 'master_standard';
  cost_allocation_method: CostAllocationMethod;
  master_snapshot_at: string;
  budget_snapshot_at: string | null;
  actual_last_updated_at: string | null;
}

export function emptyCostLayer(): ProductionCostLayer {
  return {
    direct_material: 0,
    direct_labour: 0,
    direct_expense: 0,
    manufacturing_overhead: 0,
    other_direct_costs: 0,
    total: 0,
    per_unit: 0,
  };
}

export function emptyVarianceDecomposition(): VarianceDecomposition {
  return {
    total_amount: 0,
    total_pct: 0,
    is_unfavourable: false,
    threshold_breached: false,
    by_component: {
      direct_material: 0,
      direct_labour: 0,
      direct_expense: 0,
      manufacturing_overhead: 0,
      other_direct_costs: 0,
    },
    by_variance_type: {
      quantity_variance: 0,
      price_variance: 0,
      mix_variance: 0,
      yield_variance: 0,
      efficiency_variance: 0,
      rate_variance: 0,
      overhead_variance: 0,
    },
  };
}

export function emptyCostStructure(): ProductionCostStructure {
  return {
    master: emptyCostLayer(),
    budget: emptyCostLayer(),
    actual: emptyCostLayer(),
    variance: {
      master_vs_budget: emptyVarianceDecomposition(),
      budget_vs_actual: emptyVarianceDecomposition(),
      master_vs_actual: emptyVarianceDecomposition(),
    },
    forex: null,
    budget_rate_basis: 'last_purchase',
    master_rate_basis: 'master_standard',
    cost_allocation_method: 'direct',
    master_snapshot_at: new Date().toISOString(),
    budget_snapshot_at: null,
    actual_last_updated_at: null,
  };
}
