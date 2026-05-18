/**
 * @file        src/types/vendor-financial-health.ts
 * @purpose     Vendor financial health risk profiling · 25-field record per craft_canvas hybrid port (A-Q13=C)
 * @who         Admin · Procurement HOD · MD · Risk Officer
 * @when        2026-05-18 (Sprint A.2)
 * @sprint      T-Phase-1.A.2-VendorPortal-Architecture-Seeds
 * @iso         ISO 25010 Maintainability · Functional Suitability
 * @whom        Audit Owner
 * @decisions   D-NEW-DP (craft_canvas hybrid port · types verbatim · components canonical) ·
 *              D-NEW-DN (Vendor Portal canonical) · A-Q14=A (plant all 3 vendor-risk types in A.2)
 * @disciplines FR-30 · FR-79 (engine-side stamping · not yet wired · seed only)
 * @reuses      none (pure type seed · localStorage Phase 1 · Supabase Phase 2 deferred)
 * @[JWT]       N/A (type file)
 *
 * Hybrid port from craft_canvas/src/types/vendor-risk.ts · adapted to Operix localStorage idiom.
 * Sprint A.2 plants the TYPES · Sprint A-b builds the consuming panel.
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type FinancialHealthStatus =
  | 'healthy'
  | 'stable'
  | 'concerning'
  | 'critical'
  | 'unknown';

/**
 * Vendor financial health record · per-vendor risk profile assessment.
 *
 * 25 fields covering: credit · payment delay · concentration · insurance · revenue · ratios · risk score.
 */
export interface VendorFinancialHealth {
  // Identity (4)
  id: string;
  party_id: string;
  assessment_date: string;    // ISO date
  entity_code: string;        // FR-50 multi-entity scope

  // Credit (4)
  credit_score?: number;
  credit_rating_agency?: string;
  credit_rating?: string;
  credit_limit_utilization?: number;  // 0-100 percentage

  // Payment behavior (4)
  avg_payment_delay_days?: number;
  on_time_payment_rate?: number;       // 0-100 percentage
  outstanding_receivables?: number;
  overdue_receivables?: number;

  // Business profile (4)
  years_in_business?: number;
  annual_revenue?: number;
  revenue_trend?: 'growing' | 'stable' | 'declining' | 'unknown';
  profitability_indicator?: 'profitable' | 'breakeven' | 'loss' | 'unknown';

  // Financial ratios (2)
  debt_to_equity_ratio?: number;
  working_capital_ratio?: number;

  // Concentration risk (2)
  our_revenue_share_percent?: number;          // % of vendor's revenue from us
  vendor_concentration_risk?: 'low' | 'medium' | 'high' | 'unknown';

  // Insurance + bonds (3)
  liability_insurance_amount?: number;
  insurance_expiry_date?: string;              // ISO date
  performance_bond_amount?: number;

  // Aggregate risk (2)
  financial_risk_score?: number;               // 0-100
  financial_risk_level?: RiskLevel;

  // Metadata (3)
  notes?: string;
  created_at: string;                          // ISO datetime
  updated_at: string;                          // ISO datetime
  created_by?: string;
}

/** localStorage key generator · entity-scoped per FR-50 */
export function vendorFinancialHealthKey(entityCode: string): string {
  return `erp_vendor_financial_health_${entityCode}`;
}
