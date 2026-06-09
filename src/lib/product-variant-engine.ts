/**
 * @file     src/lib/product-variant-engine.ts
 * @sprint   SP.1 · T-SP1-Variant-Builder (SP.2 additive extensions)
 * @realizes Super-admin product variants · CONSUMES card-entitlement +
 *           feature-gate + the 28/12 catalog (read-only).
 * @canon    Limits + Pricing are STORED + DISPLAYED but NOT runtime-enforced
 *           / NOT charged (DP-7 · Wave-2 honest banner). resolveVariant-
 *           Entitlements DELEGATES to seedDemoEntitlements (AC3 · greppable).
 *           SP.2 adds resolveErpCardEntitlements (filters seed by enabled_cards),
 *           validateLimitSet, computeListPrice, computeChannelPrice, and the
 *           Prudent360-ERP flagship seed. NO new SIBLING — additive only.
 * @[JWT]    Wave-2: runtime enforcement + provisioning + billing.
 */
import type {
  CardEntitlement,
  CardId,
  PlanTier,
} from '@/types/card-entitlement';
import { seedDemoEntitlements } from '@/lib/card-entitlement-engine';
import { cardEntitlementsKey } from '@/types/card-entitlement';
import {
  productVariantsKey,
  variantAssignmentKey,
  
  EMPTY_LIMIT_SET,
  EMPTY_PRICING_PLAN,
  type ProductVariant,
  type VariantAssignment,
  type VariantLimits,
  type LimitSet,
  type PricingPlan,
  type ProductKind,
  type TowerTenantPlan,
} from '@/types/product-variant';
import { logAudit } from '@/lib/audit-trail-engine';

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

/**
 * SP.2 · canonical CardId roster used by the ERP card-grid composer.
 * Mirrors the CardId union in src/types/card-entitlement.ts (no fabricated ids).
 */
export const ALL_CARD_IDS: readonly CardId[] = [
  'command-center', 'salesx', 'distributor-hub', 'customer-hub',
  'fincore', 'receivx', 'peoplepay', 'payout', 'insightx',
  'procure360', 'inventory-hub', 'qualicheck', 'gateflow',
  'production', 'maintainpro', 'requestx', 'frontdesk',
  'servicedesk', 'logistics', 'dispatch-hub', 'projx',
  'engineeringx', 'sitex', 'store-hub', 'bill-passing',
  'supplyx', 'eximx', 'docvault', 'taskflow', 'ecomx',
  'webstorex', 'comply360', 'vendor-portal', 'fpa-planning',
] as const;

export function isValidModuleId(id: string): boolean {
  return VARIANT_MODULE_IDS.includes(id);
}
export function isValidAddonId(id: string): boolean {
  return VARIANT_ADDON_IDS.includes(id);
}
export function isValidCardId(id: string): id is CardId {
  return (ALL_CARD_IDS as readonly string[]).includes(id);
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

/** SP.2 · validate the full LimitSet · non-negative all dims. NOT enforced. */
export function validateLimitSet(limits: LimitSet): LimitsValidation {
  const base = validateLimits(limits);
  const errors = [...base.errors];
  const dims: Array<[keyof LimitSet, number]> = [
    ['companies', limits.companies],
    ['users', limits.users],
    ['space_gb', limits.space_gb],
    ['branches', limits.branches],
    ['transactions_per_month', limits.transactions_per_month],
    ['retention_years', limits.retention_years],
    ['api_calls', limits.api_calls],
  ];
  for (const [k, v] of dims) {
    if (!Number.isFinite(v) || v < 0) errors.push(`${String(k)} must be a non-negative number`);
  }
  return { ok: errors.length === 0, errors };
}

/* ─────────────────────────────────────────────────────────────────────── */
/* §3.5 · Pricing display math (SP.2 · NOT charged · display only)        */
/* ─────────────────────────────────────────────────────────────────────── */

/** Compute list price (display only · no charging · Wave-2). */
export function computeListPrice(pricing: PricingPlan, limits: LimitSet): number {
  let subtotal = Math.max(0, pricing.base_price || 0);
  switch (pricing.model) {
    case 'per_seat':
      subtotal += (pricing.per_user_price ?? 0) * Math.max(0, limits.users);
      break;
    case 'per_company':
      subtotal += (pricing.per_company_price ?? 0) * Math.max(0, limits.companies);
      break;
    case 'flat_tier':
      // base_price IS the price
      break;
    case 'usage':
      subtotal += (pricing.per_gb_price ?? 0) * Math.max(0, limits.space_gb);
      break;
    case 'hybrid':
      subtotal += (pricing.per_user_price ?? 0) * Math.max(0, limits.users);
      subtotal += (pricing.per_company_price ?? 0) * Math.max(0, limits.companies);
      subtotal += (pricing.per_gb_price ?? 0) * Math.max(0, limits.space_gb);
      break;
  }
  const discount = Math.min(100, Math.max(0, pricing.discount_pct ?? 0));
  return Math.round(subtotal * (1 - discount / 100));
}

/** Channel/partner price = list − margin% (display only). */
export function computeChannelPrice(listPrice: number, marginPct: number): number {
  const m = Math.min(100, Math.max(0, marginPct || 0));
  return Math.round(listPrice * (1 - m / 100));
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
  product_kind?: ProductKind;
  enabled_cards?: CardId[];
  enabled_modules?: string[];
  enabled_addons?: string[];
  limits?: Partial<LimitSet>;
  pricing?: Partial<PricingPlan>;
  created_by?: string;
}

export function createVariant(
  entity: string,
  input: CreateVariantInput,
): ProductVariant {
  const now = new Date().toISOString();
  const limits: LimitSet = { ...EMPTY_LIMIT_SET, ...(input.limits ?? {}) };
  const pricing: PricingPlan | undefined = input.pricing
    ? { ...EMPTY_PRICING_PLAN, ...input.pricing }
    : undefined;
  const v: ProductVariant = {
    id: `var-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim(),
    description: input.description,
    base_plan_tier: input.base_plan_tier,
    product_kind: input.product_kind ?? 'module',
    enabled_cards: (input.enabled_cards ?? []).filter(isValidCardId),
    enabled_modules: (input.enabled_modules ?? []).filter(isValidModuleId),
    enabled_addons: (input.enabled_addons ?? []).filter(isValidAddonId),
    limits,
    pricing,
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
    enabled_cards: (patch.enabled_cards ?? current.enabled_cards ?? []).filter(isValidCardId),
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
  void logAudit({
    entityType: 'master_lifecycle_event',
    entityCode: id,
    recordId: id,
    recordLabel: `ProductVariant:${next.name}`,
    action: 'create',
    sourceModule: 'tower/product-variant-builder',
    beforeState: null,
    afterState: {
      variant_id: id,
      name: next.name,
      base_plan_tier: next.base_plan_tier,
      product_kind: next.product_kind ?? 'module',
      enabled_cards_count: (next.enabled_cards ?? []).length,
      enabled_modules_count: next.enabled_modules.length,
      enabled_addons_count: next.enabled_addons.length,
      status: next.status,
    },
    reason: 'product_variant_published',
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
 * Resolve a variant to CardEntitlement[] for a target tenant.
 * DELEGATES to seedDemoEntitlements (card-entitlement-engine) — this engine
 * NEVER constructs CardEntitlement rows from scratch (AC3 · greppable).
 */
export function resolveVariantEntitlements(
  variant: ProductVariant,
  tenantId: string,
): CardEntitlement[] {
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
 * SP.2 · For product_kind='erp' variants, FILTER the seedDemoEntitlements
 * output to only those CardIds in variant.enabled_cards. DELEGATES to
 * card-entitlement-engine (same AC3 greppable pattern as SP.1).
 */
export function resolveErpCardEntitlements(
  variant: ProductVariant,
  tenantId: string,
): CardEntitlement[] {
  const all = resolveVariantEntitlements(variant, tenantId);
  const wanted = new Set(variant.enabled_cards ?? []);
  if (wanted.size === 0) return [];
  return all.filter((e) => wanted.has(e.card_id));
}

/**
 * Assign a variant to a tenant. Persists the assignment record AND seeds
 * the tenant's CardEntitlement[]. Routes ERP-kind through the card filter.
 * NOTE: Limits + Pricing STORED but NOT enforced/charged (DP-7 · Wave-2).
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
  try {
    const raw = localStorage.getItem(variantAssignmentKey(entity));
    const list = raw ? (JSON.parse(raw) as VariantAssignment[]) : [];
    const next = list.filter((a) => a.tenant_id !== tenantId);
    next.push(assignment);
    localStorage.setItem(variantAssignmentKey(entity), JSON.stringify(next));
  } catch {
    /* no-op */
  }
  const entitlements = v.product_kind === 'erp'
    ? resolveErpCardEntitlements(v, tenantId)
    : resolveVariantEntitlements(v, tenantId);
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

/* ─────────────────────────────────────────────────────────────────────── */
/* §6 · SP.2 · Flagship Prudent360-ERP seed                               */
/* ─────────────────────────────────────────────────────────────────────── */

/** Module-id subset representing a manufacturing-flavored card mix. */
const MFG_CARDS: CardId[] = [
  'command-center', 'fincore', 'procure360', 'inventory-hub', 'production',
  'qualicheck', 'maintainpro', 'gateflow', 'store-hub', 'insightx',
];

const LITE_CARDS: CardId[] = [
  'command-center', 'fincore', 'salesx', 'receivx', 'customer-hub',
  'insightx', 'taskflow',
];

const ENTERPRISE_LIMITS: LimitSet = {
  ...EMPTY_LIMIT_SET,
  companies: 25, users: 500, space_gb: 1000, branches: 50,
  transactions_per_month: 1_000_000, retention_years: 8,
  api_calls: 10_000_000, support_tier: 'enterprise',
};

const STARTER_LIMITS: LimitSet = {
  ...EMPTY_LIMIT_SET,
  companies: 1, users: 10, space_gb: 25, branches: 1,
  transactions_per_month: 5000, retention_years: 7,
  api_calls: 50_000, support_tier: 'basic',
};

const MFG_LIMITS: LimitSet = {
  ...EMPTY_LIMIT_SET,
  companies: 5, users: 100, space_gb: 250, branches: 10,
  transactions_per_month: 200_000, retention_years: 8,
  api_calls: 1_000_000, support_tier: 'premium',
};

const FLAGSHIP_PRICING: PricingPlan = {
  model: 'hybrid',
  base_price: 100_000,
  per_user_price: 800,
  per_company_price: 5000,
  per_gb_price: 5,
  billing_cycle: 'annual',
  discount_pct: 10,
  trial_days: 30,
  channel_margin_pct: 20,
};

const LITE_PRICING: PricingPlan = {
  model: 'per_seat',
  base_price: 5000,
  per_user_price: 500,
  billing_cycle: 'monthly',
  discount_pct: 0,
  trial_days: 14,
  channel_margin_pct: 10,
};

const MFG_PRICING: PricingPlan = {
  model: 'hybrid',
  base_price: 50_000,
  per_user_price: 700,
  per_company_price: 4000,
  per_gb_price: 4,
  billing_cycle: 'annual',
  discount_pct: 5,
  trial_days: 21,
  channel_margin_pct: 15,
};

interface SeedDef {
  name: string;
  description: string;
  base_plan_tier: PlanTier;
  enabled_cards: CardId[];
  limits: LimitSet;
  pricing: PricingPlan;
}

const FLAGSHIP_SEEDS: readonly SeedDef[] = [
  {
    name: 'Prudent360 ERP',
    description: 'Flagship enterprise edition — all 33+ cards · enterprise limits · hybrid pricing.',
    base_plan_tier: 'enterprise',
    enabled_cards: [...ALL_CARD_IDS],
    limits: ENTERPRISE_LIMITS,
    pricing: FLAGSHIP_PRICING,
  },
  {
    name: 'Prudent360 ERP — Lite',
    description: 'Core finance + sales + customer hub for small businesses.',
    base_plan_tier: 'starter',
    enabled_cards: LITE_CARDS,
    limits: STARTER_LIMITS,
    pricing: LITE_PRICING,
  },
  {
    name: 'Prudent360 ERP — Manufacturing',
    description: 'Discrete/process manufacturing edition (procure → produce → ship · QC + maintenance).',
    base_plan_tier: 'growth',
    enabled_cards: MFG_CARDS,
    limits: MFG_LIMITS,
    pricing: MFG_PRICING,
  },
];

/**
 * Idempotently seed the three flagship Prudent360-ERP variants.
 * Skips any seed whose name already exists in the entity's variant list.
 * Returns the seeded list (created + pre-existing).
 */
export function seedFlagshipPrudent360(entity: string): ProductVariant[] {
  const existing = readVariants(entity);
  const have = new Set(existing.map((v) => v.name));
  const created: ProductVariant[] = [];
  for (const def of FLAGSHIP_SEEDS) {
    if (have.has(def.name)) continue;
    const v = createVariant(entity, {
      name: def.name,
      description: def.description,
      base_plan_tier: def.base_plan_tier,
      product_kind: 'erp',
      enabled_cards: def.enabled_cards,
      limits: def.limits,
      pricing: def.pricing,
      created_by: 'system-seed',
    });
    created.push(v);
  }
  return readVariants(entity);
}

/** Public seed-name roster — used by tests + UI badges. */
export const FLAGSHIP_SEED_NAMES = FLAGSHIP_SEEDS.map((s) => s.name);
