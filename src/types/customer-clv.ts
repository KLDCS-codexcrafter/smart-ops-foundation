/**
 * customer-clv.ts — Customer Lifetime Value types
 * CLV projection = expected 12-month revenue per customer.
 * Standard formula: avg_order_value * purchase_frequency * gross_margin
 *                   * retention_probability
 */

export interface CLVInputs {
  customer_id: string;
  historical_orders: { placed_at: string; value_paise: number }[];
  first_order_at: string | null;
  last_order_at: string | null;
  has_churned: boolean;
}

export interface CLVResult {
  customer_id: string;
  historical_value_paise: number;       // all-time revenue to date
  trailing_12m_value_paise: number;     // last-12-month revenue
  avg_order_value_paise: number;
  purchase_frequency_per_year: number;  // orders per 365 days
  retention_probability: number;        // 0..1
  projected_12m_value_paise: number;    // THE key number
  clv_rank_tier: 'vip' | 'growth' | 'standard' | 'at_risk' | 'churned';
  computed_at: string;
}

/** Assumed gross margin for projection — tenant-configurable later. */
export const DEFAULT_GROSS_MARGIN = 0.35;

/** Churn threshold — days since last order beyond which retention decays. */
export const CHURN_DAYS_THRESHOLD = 180;

/** CLV tier thresholds (projected_12m_value_paise in paise). */
export const CLV_TIER_THRESHOLDS = {
  vip:      10_000_000,  // ₹1L+
  growth:    3_000_000,  // ₹30k+
  standard:    500_000,  // ₹5k+
};
