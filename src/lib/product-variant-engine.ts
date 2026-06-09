/**
 * @file     src/lib/product-variant-engine.ts
 * @sprint   SP.1 · T-SP1-Variant-Builder
 * @realizes Super-admin product variants · CONSUMES card-entitlement +
 *           feature-gate + the 28/12 catalog (read-only).
 * @canon    Limits are STORED + DISPLAYED but NOT runtime-enforced (DP-7).
 *           resolveVariantEntitlements DELEGATES to seedDemoEntitlements —
 *           it does NOT reimplement CardEntitlement construction (AC3).
 * @[JWT]    Wave-2: runtime enforcement + provisioning + billing.
 */
import type {
  CardEntitlement,
  PlanTier,
} from '@/types/card-entitlement';
import {
  seedDemoEntitlements,
  cardEntitlementsKey as _cardEntitlementsKey,
} from '@/lib/card-entitlement-engine';
import { cardEntitlementsKey } from '@/types/card-entitlement';
import {
  productVariantsKey,
  variantAssignmentKey,
  EMPTY_VARIANT_LIMITS,
  type ProductVariant,
  type VariantAssignment,
  type VariantLimits,
  type TowerTenantPlan,
} from '@/types/product-variant';
import { logAudit } from '@/lib/audit-trail-engine';

// Touch private import to keep tree-shake honest — engine consumes the
// canonical seed function (greppable delegation · AC3).
void _cardEntitlementsKey;

/* ─────────────────────────────────────────────────────────────────────── */
/* §1 · DP-2 Plan reconciliation                                          */
/* ─────────────────────────────────────────────────────────────────────── */

const TENANT_PLAN_TO_PLAN_TIER: Record<TowerTenantPlan, PlanTier> = {
  Starter: 'starter',
  Professional: 'growth',
  Enterprise: 'enterprise',
};

/** DP-2 · Tower TenantPlan → canonical PlanTier. */
export function mapTenantPlanToPlanTier(tp: TowerTenantPlan): PlanTier {
  return TENANT_PLAN_TO_PLAN_TIER[tp];
}

/* ─────────────────────────────────────────────────────────────────────── */
/* §2 · Catalog id allowlists (read-only · mirror ModulesPage/AddOnsPage) */
/* ─────────────────────────────────────────────────────────────────────── */

/** Real 28 module ids — must stay in sync with ModulesPage catalog. */
export const VARIANT_MODULE_IDS: readonly string[] = [
  'accounts-basic', 'accounts-standard', 'consolidation', 'far',
  'salesx-basic', 'salesx-advanced', 'receivx',
  'purchase', 'store', 'quality-check',
  'bundle-purchase-store', 'bundle-store-qc', 'bundle-p2p', 'bundle-crm-accounts',
  'taskflow', 'dms', 'dms-full', 'budget',
  'production', 'cmms', 'payout', 'warehouse', 'servicedesk',
  'webstorex', 'ecomx', 'comply360', 'eximx', 'vetan-nidhi',
] as const;

/** Real 12 addon ids — must stay in sync with AddOnsPage catalog. */
export const VARIANT_ADDON_IDS: readonly string[] = [
  'barcode', 'whatsapp', 'ai-price', 'hardware',
  'approvals', 'einv-ewb', 'tally-sync',
  'master-cleanup', 'tamper-audit', 'omni-comms',
  'analytics-insightx', 'gate-weighbridge',
] as const;

export function isValidModuleId(id: string): boolean {
  return VARIANT_MODULE_IDS.includes(id);
}
export function isValidAddonId(id: string): boolean {
  return VARIANT_ADDON_IDS.includes(id);
}

/* ─────────────────────────────────────────────────────────────────────── */
/* §3 · Limits validation (honest · NOT enforced)                         */
/* ─────────────────────────────────────────────────────────────────────── */

export interface LimitsValidation {
  ok: boolean;
  errors: string[];
}

export function validateLimits(limits: VariantLimits): LimitsValidation {
  const errors: string[] = [];
  if (!Number.isFinite(limits.max_users) || limits.max_users < 0) {
    errors.push('max_users must be a non-negative number');
  }
  if (!Number.isFinite(limits.storage_gb) || limits.storage_gb < 0) {
    errors.push('storage_gb must be a non-negative number');
  }
  return { ok: errors.length === 0, errors };
}

/* ─────────────────────────────────────────────────────────────────────── */
/* §4 · Variant CRUD (localStorage · entity-scoped)                       */
/* ─────────────────────────────────────────────────────────────────────── */

function readVariants(entity: string): ProductVariant[] {
  try {
    const raw = localStorage.getItem(productVariantsKey(entity));
    return raw ? (JSON.parse(raw) as ProductVariant[]) : [];
  } catch {
    return [];
  }
}

function writeVariants(entity: string, list: ProductVariant[]): void {
  try {
    localStorage.setItem(productVariantsKey(entity), JSON.stringify(list));
  } catch {
    /* honest no-op on quota errors */
  }
}

export function listVariants(entity: string): ProductVariant[] {
  return readVariants(entity);
}

export function getVariant(entity: string, id: string): ProductVariant | null {
  return readVariants(entity).find((v) => v.id === id) ?? null;
}

export interface CreateVariantInput {
  name: string;
  description?: string;
  base_plan_tier: PlanTier;
  enabled_modules?: string[];
  enabled_addons?: string[];
  limits?: Partial<VariantLimits>;
  created_by?: string;
}

export function createVariant(
  entity: string,
  input: CreateVariantInput,
): ProductVariant {
  const now = new Date().toISOString();
  const limits: VariantLimits = { ...EMPTY_VARIANT_LIMITS, ...(input.limits ?? {}) };
  const v: ProductVariant = {
    id: `var-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim(),
    description: input.description,
    base_plan_tier: input.base_plan_tier,
    enabled_modules: (input.enabled_modules ?? []).filter(isValidModuleId),
    enabled_addons: (input.enabled_addons ?? []).filter(isValidAddonId),
    limits,
    status: 'draft',
    created_by: input.created_by,
    created_at: now,
    updated_at: now,
  };
  const list = readVariants(entity);
  list.push(v);
  writeVariants(entity, list);
  return v;
}

export function updateVariant(
  entity: string,
  id: string,
  patch: Partial<Omit<ProductVariant, 'id' | 'created_at'>>,
): ProductVariant | null {
  const list = readVariants(entity);
  const idx = list.findIndex((v) => v.id === id);
  if (idx === -1) return null;
  const current = list[idx];
  if (current.status === 'published') return current; // immutable once published
  const next: ProductVariant = {
    ...current,
    ...patch,
    enabled_modules: (patch.enabled_modules ?? current.enabled_modules).filter(isValidModuleId),
    enabled_addons: (patch.enabled_addons ?? current.enabled_addons).filter(isValidAddonId),
    id: current.id,
    created_at: current.created_at,
    updated_at: new Date().toISOString(),
  };
  list[idx] = next;
  writeVariants(entity, list);
  return next;
}

export function publishVariant(
  entity: string,
  id: string,
): ProductVariant | null {
  const list = readVariants(entity);
  const idx = list.findIndex((v) => v.id === id);
  if (idx === -1) return null;
  const next: ProductVariant = {
    ...list[idx],
    status: 'published',
    updated_at: new Date().toISOString(),
  };
  list[idx] = next;
  writeVariants(entity, list);
  // Audit on publish (institutional canon).
  void logAudit({
    entityType: 'config',
    entityId: id,
    action: 'create',
    actorId: next.created_by ?? 'super-admin',
    actorRole: 'super_admin',
    summary: `Published product variant "${next.name}" (${next.base_plan_tier})`,
    payload: {
      variant_id: id,
      base_plan_tier: next.base_plan_tier,
      enabled_modules_count: next.enabled_modules.length,
      enabled_addons_count: next.enabled_addons.length,
    },
  });
  return next;
}

export function deleteVariant(entity: string, id: string): boolean {
  const list = readVariants(entity);
  const next = list.filter((v) => v.id !== id || v.status === 'published');
  const removed = next.length !== list.length;
  if (removed) writeVariants(entity, next);
  return removed;
}

/* ─────────────────────────────────────────────────────────────────────── */
/* §5 · Variant → entitlement resolution (CONSUMES card-entitlement)      */
/* ─────────────────────────────────────────────────────────────────────── */

/**
 * Resolve a variant to a CardEntitlement[] for a target tenant.
 * DELEGATES to seedDemoEntitlements (card-entitlement-engine) — this engine
 * NEVER constructs CardEntitlement rows from scratch (AC3 · greppable).
 * The variant's base_plan_tier overrides the seed's plan_tier; feature_flags
 * from the variant's limits are propagated onto every row.
 */
export function resolveVariantEntitlements(
  variant: ProductVariant,
  tenantId: string,
): CardEntitlement[] {
  // CONSUMES card-entitlement engine — single source of CardEntitlement shape.
  const seeded = seedDemoEntitlements(tenantId);
  const now = new Date().toISOString();
  return seeded.map((e) => ({
    ...e,
    plan_tier: variant.base_plan_tier,
    feature_flags: [...variant.limits.feature_flags] as unknown as string[],
    notes: `variant:${variant.id}`,
    updated_at: now,
  }));
}

/**
 * Assign a variant to a tenant. Persists the assignment record AND seeds
 * the tenant's CardEntitlement[] via resolveVariantEntitlements (Tier-L).
 * NOTE: Limits are STORED but NOT runtime-enforced (DP-7 · Wave-2).
 */
export function assignVariantToTenant(
  entity: string,
  tenantId: string,
  variantId: string,
): { assignment: VariantAssignment; entitlements: CardEntitlement[] } | null {
  const v = getVariant(entity, variantId);
  if (!v || v.status !== 'published') return null;
  const assignment: VariantAssignment = {
    tenant_id: tenantId,
    variant_id: variantId,
    assigned_at: new Date().toISOString(),
  };
  // Persist assignment
  try {
    const raw = localStorage.getItem(variantAssignmentKey(entity));
    const list = raw ? (JSON.parse(raw) as VariantAssignment[]) : [];
    const next = list.filter((a) => a.tenant_id !== tenantId);
    next.push(assignment);
    localStorage.setItem(variantAssignmentKey(entity), JSON.stringify(next));
  } catch {
    /* no-op */
  }
  // Seed tenant entitlements via resolution (CONSUMES card-entitlement).
  const entitlements = resolveVariantEntitlements(v, tenantId);
  try {
    localStorage.setItem(cardEntitlementsKey(tenantId), JSON.stringify(entitlements));
  } catch {
    /* no-op */
  }
  return { assignment, entitlements };
}

export function listAssignments(entity: string): VariantAssignment[] {
  try {
    const raw = localStorage.getItem(variantAssignmentKey(entity));
    return raw ? (JSON.parse(raw) as VariantAssignment[]) : [];
  } catch {
    return [];
  }
}
