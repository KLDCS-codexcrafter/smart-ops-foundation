/**
 * @file     production-variance.ts
 * @sprint   T-Phase-1.3-3a-pre-3 · Block A · D-556
 * @purpose  7-way variance decomposition with drill-down (Q10=a · Q18=a).
 *           Wraps the stub VarianceDecomposition.by_variance_type from production-cost.ts.
 *
 * Q18=a Financial priority order:
 *   1. Rate · 2. Efficiency · 3. Yield · 4. Substitution · 5. Mix · 6. Timing · 7. Scope
 * @[JWT]    erp_production_variances_<entityCode>
 */

export type ProductionVarianceType =
  | 'rate'
  | 'efficiency'
  | 'yield'
  | 'substitution'
  | 'mix'
  | 'timing'
  | 'scope';

export interface VarianceComponent {
  type: ProductionVarianceType;
  amount: number;
  pct: number;
  is_unfavourable: boolean;
  threshold_breached: boolean;
  contributing_factors: string[];
  drilldown_data: Record<string, unknown>;
}

export interface ProductionVariance {
  id: string;
  entity_id: string;
  po_id: string;
  po_doc_no: string;
  computed_at: string;

  rate_variance: VarianceComponent;
  efficiency_variance: VarianceComponent;
  yield_variance: VarianceComponent;
  substitution_variance: VarianceComponent;
  mix_variance: VarianceComponent;
  timing_variance: VarianceComponent;
  scope_variance: VarianceComponent;

  total_variance_amount: number;
  total_variance_pct: number;
  total_unfavourable_count: number;
  threshold_breach_count: number;

  contributing_min_ids: string[];
  contributing_pc_ids: string[];
  contributing_jwo_jwr_pairs: Array<[string, string]>;
  contributing_substituted_line_ids: string[];

  is_frozen: boolean;
  frozen_at: string | null;
  frozen_by_user_id: string | null;
}

export const productionVariancesKey = (entityCode: string): string =>
  `erp_production_variances_${entityCode}`;
