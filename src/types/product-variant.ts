/**
 * @file     src/types/product-variant.ts
 * @sprint   SP.1 · T-SP1-Variant-Builder
 * @purpose  Type model for super-admin Product Variant Builder. A variant is
 *           a free-form named edition: base PlanTier + module/addon/limit
 *           overrides (DP-1). Limits are STORED + DISPLAYED but NOT runtime-
 *           enforced this sprint (DP-7 · Wave-2 honest).
 * @canon    Module ids reference the REAL 28-module catalog (ModulesPage).
 *           Addon  ids reference the REAL 12-addon catalog (AddOnsPage).
 *           PlanTier is canonical (starter/growth/enterprise/trial · DP-2).
 *           Tower TenantPlan (Starter/Professional/Enterprise) maps via
 *           mapTenantPlanToPlanTier in product-variant-engine.
 */
import type { PlanTier } from '@/types/card-entitlement';
import type { FeatureId } from '@/types/plan-features';

export type VariantStatus = 'draft' | 'published';

/** Tower-facing TenantPlan label (DP-2 reconciliation source). */
export type TowerTenantPlan = 'Starter' | 'Professional' | 'Enterprise';

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

export interface ProductVariant {
  id: string;
  name: string;
  description?: string;
  base_plan_tier: PlanTier;
  /** Module ids drawn from ModulesPage catalog (28 ids). */
  enabled_modules: string[];
  /** Addon ids drawn from AddOnsPage catalog (12 ids). */
  enabled_addons: string[];
  limits: VariantLimits;
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

/** Default empty limits used by composer scaffolding. */
export const EMPTY_VARIANT_LIMITS: VariantLimits = {
  max_users: 5,
  storage_gb: 10,
  feature_flags: [],
  extra: {},
};

/** Honest Wave-2 banner copy — single source of truth. */
export const VARIANT_LIMITS_HONESTY =
  'Limits are recorded for product definition; runtime enforcement, billing & provisioning arrive with Wave-2.';
