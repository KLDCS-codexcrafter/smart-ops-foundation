/**
 * distributor-rating.ts — Bidirectional rating + composite credit score
 */

export type RatingDirection = 'tenant_to_distributor' | 'distributor_to_tenant';

export type RatingDimension =
  // tenant rates distributor on:
  | 'payment_reliability'   | 'order_volume'         | 'quality_adherence'
  // distributor rates tenant on:
  | 'fulfilment_speed'      | 'pricing_fairness'     | 'support_quality';

export interface RatingEntry {
  id: string;
  entity_id: string;
  distributor_id: string;
  direction: RatingDirection;
  dimension: RatingDimension;
  stars: number;                  // 1-5
  comment: string | null;
  rated_by: string;
  rated_at: string;
}

export interface CompositeScore {
  distributor_id: string;
  tenant_to_distributor_avg: number;
  distributor_to_tenant_avg: number;
  payment_weight: number;
  credit_score: number;            // 300-900 (CIBIL-like)
  credit_grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  computed_at: string;
}

export const ratingsKey        = (e: string) => `erp_distributor_ratings_${e}`;
export const compositeScoreKey = (e: string) => `erp_distributor_composite_${e}`;
