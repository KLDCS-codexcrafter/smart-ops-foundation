/**
 * @file     src/types/product-variant.ts
 * @sprint   SP.2 · T-SP2-Prudent360-ERP (extends SP.1)
 * @purpose  Type model for super-admin Product Variant Builder. A variant is
 *           a free-form named edition: base PlanTier + module/addon/limit
 *           overrides (SP.1 · DP-1). SP.2 extends additively with
 *           product_kind + enabled_cards + full LimitSet + PricingPlan.
 * @canon    Module ids reference the REAL 28-module catalog (ModulesPage).
 *           Addon  ids reference the REAL 12-addon catalog (AddOnsPage).
 *           Enabled_cards reference REAL CardId union (no fabricated).
 *           Limits + Pricing are STORED + DISPLAYED but NOT enforced/charged
 *           (DP-7 · Wave-2 honest banner). SP.1 fields preserved 0-DIFF.
 */
import type { CardId, PlanTier } from '@/types/card-entitlement';
import type { FeatureId } from '@/types/plan-features';

export type VariantStatus = 'draft' | 'published';

/** Tower-facing TenantPlan label (SP.1 · DP-2 reconciliation source). */
export type TowerTenantPlan = 'Starter' | 'Professional' | 'Enterprise';

/** SP.2 · product taxonomy. */
export type ProductKind = 'erp' | 'module' | 'addon' | 'bundle';

/** Support-tier ladder (SP.2 · stored not enforced). */
export type SupportTier = 'basic' | 'standard' | 'premium' | 'enterprise';

/**
 * SP.1 legacy limits shape — preserved 0-DIFF. New code should prefer LimitSet
 * (which extends this) so SP.1 consumers keep typechecking.
 */
export interface VariantLimits {
  /** Display-only · stored not enforced (Wave-2). */
  max_users: number;
  /** Storage allowance in gigabytes · display-only. */
  storage_gb: number;
  /** Feature flags from plan-features catalog (FeatureId). */
  feature_flags: FeatureId[];
  /** Extensible bag — operator-defined key/value extras. */
  extra: Record<string, number | string | boolean>;
}

/** SP.2 · full LimitSet — additive to VariantLimits. All STORED · NOT enforced. */
export interface LimitSet extends VariantLimits {
  companies: number;
  users: number;
  space_gb: number;
  branches: number;
  transactions_per_month: number;
  retention_years: number;
  api_calls: number;
  support_tier: SupportTier;
}

/** SP.2 · pricing models (display math only · NOT charged). */
export type PricingModel = 'per_seat' | 'per_company' | 'flat_tier' | 'usage' | 'hybrid';
export type BillingCycle = 'monthly' | 'annual' | 'multi_year';

export interface PricingPlan {
  model: PricingModel;
  /** Base price in INR (display only). */
  base_price: number;
  per_user_price?: number;
  per_company_price?: number;
  per_gb_price?: number;
  billing_cycle: BillingCycle;
  /** Discount percent applied to subtotal (0-100). */
  discount_pct?: number;
  trial_days?: number;
  /** Channel/partner margin percent (ties to Partner Portal). */
  channel_margin_pct?: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  description?: string;
  base_plan_tier: PlanTier;
  /** SP.2 · product taxonomy. Defaults to 'module' for SP.1 back-compat. */
  product_kind?: ProductKind;
  /** SP.2 · for product_kind='erp' · real CardIds (no fabricated). */
  enabled_cards?: CardId[];
  /** Module ids drawn from ModulesPage catalog (28 ids). */
  enabled_modules: string[];
  /** Addon ids drawn from AddOnsPage catalog (12 ids). */
  enabled_addons: string[];
  /** SP.2 · widened to LimitSet (extends VariantLimits · SP.1 0-DIFF). */
  limits: LimitSet;
  /** SP.2 · pricing model (stored · not charged). */
  pricing?: PricingPlan;
  status: VariantStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/** localStorage key for variants (entity-scoped). */
export const productVariantsKey = (entity: string) =>
  `tower_product_variants_${entity}`;

/** localStorage key for variant→tenant assignments. */
export const variantAssignmentKey = (entity: string) =>
  `tower_variant_assignments_${entity}`;

export interface VariantAssignment {
  tenant_id: string;
  variant_id: string;
  assigned_at: string;
}

/** SP.1 default empty limits — preserved for legacy callers. */
export const EMPTY_VARIANT_LIMITS: VariantLimits = {
  max_users: 5,
  storage_gb: 10,
  feature_flags: [],
  extra: {},
};

/** SP.2 default empty LimitSet — used by composer scaffolding. */
export const EMPTY_LIMIT_SET: LimitSet = {
  ...EMPTY_VARIANT_LIMITS,
  companies: 1,
  users: 5,
  space_gb: 10,
  branches: 1,
  transactions_per_month: 1000,
  retention_years: 7,
  api_calls: 10000,
  support_tier: 'standard',
};

/** SP.2 default empty PricingPlan. */
export const EMPTY_PRICING_PLAN: PricingPlan = {
  model: 'per_seat',
  base_price: 0,
  per_user_price: 0,
  per_company_price: 0,
  per_gb_price: 0,
  billing_cycle: 'monthly',
  discount_pct: 0,
  trial_days: 14,
  channel_margin_pct: 0,
};

/** Honest Wave-2 banner copy — single source of truth (SP.1 · SP.2). */
export const VARIANT_LIMITS_HONESTY =
  'Product definition only; runtime enforcement of limits, usage metering and billing/charging arrive with Wave-2.';
