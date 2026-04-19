/**
 * scheme.ts — Promotional scheme types
 * Sprint 12. Audience-agnostic: used by Distributor Hub (Sprint 12),
 * Customer Hub (Sprint 13), and Mobile (Sprint 14) without modification.
 */

export type SchemeType =
  | 'buy_n_get_m'       // buy N of item X, get M of item Y free
  | 'slab_discount'     // tiered % discount by quantity
  | 'flat_percent'      // flat % off when conditions met
  | 'flat_amount'       // flat ₹ off when conditions met
  | 'qps_target'        // Quarterly Performance Scheme — volume rebate
  | 'bundle'            // X + Y together at fixed price
  | 'free_sample';      // free qty of sample item with any purchase

export type SchemeAudience = 'distributor' | 'customer' | 'both';

export type SchemeStatus = 'draft' | 'active' | 'paused' | 'expired';

/** Scope — who the scheme applies to. */
export interface SchemeScope {
  audience: SchemeAudience;
  distributor_tiers?: Array<'gold' | 'silver' | 'bronze'>;
  customer_segments?: string[];
  item_ids?: string[];          // empty/undefined = all items
  category_ids?: string[];
  territory_ids?: string[];
  min_order_value_paise?: number;
}

/** Type-specific payload. Exactly one shape per scheme. */
export interface BuyNGetMPayload {
  trigger_item_id: string;
  trigger_qty: number;
  reward_item_id: string;
  reward_qty: number;
}

export interface SlabDiscountPayload {
  slabs: { min_qty: number; discount_percent: number }[];
}

export interface FlatPercentPayload { discount_percent: number }
export interface FlatAmountPayload  { discount_paise: number }

export interface QPSTargetPayload {
  period_start: string;
  period_end: string;
  target_qty: number;
  rebate_percent: number;
}

export interface BundlePayload {
  components: { item_id: string; qty: number }[];
  bundle_price_paise: number;
}

export interface FreeSamplePayload {
  sample_item_id: string;
  sample_qty: number;
  min_purchase_value_paise: number;
}

export type SchemePayload =
  | BuyNGetMPayload | SlabDiscountPayload | FlatPercentPayload
  | FlatAmountPayload | QPSTargetPayload | BundlePayload | FreeSamplePayload;

export interface Scheme {
  id: string;
  entity_id: string;
  code: string;
  name: string;
  description: string;
  type: SchemeType;
  status: SchemeStatus;
  valid_from: string;
  valid_until: string | null;
  scope: SchemeScope;
  payload: SchemePayload;
  priority: number;
  stackable: boolean;
  max_uses_per_customer: number | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

/** Applied scheme record (attached to cart/order line or order header). */
export interface AppliedScheme {
  scheme_id: string;
  scheme_code: string;
  scheme_name: string;
  applies_to: 'line' | 'order';
  line_id?: string;
  discount_paise: number;
  free_items?: { item_id: string; qty: number; value_paise: number }[];
  note: string;
}

export const schemesKey = (e: string) => `erp_schemes_${e}`;
export const appliedSchemesKey = (e: string) => `erp_applied_schemes_${e}`;
