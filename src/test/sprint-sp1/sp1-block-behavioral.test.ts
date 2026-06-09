/**
 * @file   src/test/sprint-sp1/sp1-block-behavioral.test.ts
 * @sprint SP.1 · T-SP1-Variant-Builder
 * @canon  Behavioral guardrails — variant CRUD + entitlement delegation +
 *         tier reconciliation + limits stored-not-enforced + catalog id walls.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  createVariant,
  publishVariant,
  updateVariant,
  listVariants,
  getVariant,
  deleteVariant,
  resolveVariantEntitlements,
  assignVariantToTenant,
  mapTenantPlanToPlanTier,
  validateLimits,
  isValidModuleId,
  isValidAddonId,
  VARIANT_MODULE_IDS,
  VARIANT_ADDON_IDS,
} from '@/lib/product-variant-engine';
import {
  productVariantsKey,
  variantAssignmentKey,
  EMPTY_VARIANT_LIMITS,
  VARIANT_LIMITS_HONESTY,
} from '@/types/product-variant';
import { cardEntitlementsKey } from '@/types/card-entitlement';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ENTITY = 'test-entity';
const TENANT = 'test-tenant';

function clearAll() {
  localStorage.removeItem(productVariantsKey(ENTITY));
  localStorage.removeItem(variantAssignmentKey(ENTITY));
  localStorage.removeItem(cardEntitlementsKey(TENANT));
}

describe('SP.1 · Variant Builder · behavioral', () => {
  beforeEach(() => clearAll());

  /* ── §1 · CRUD ───────────────────────────────────────────────────────── */
  it('creates a draft variant and persists it', () => {
    const v = createVariant(ENTITY, { name: 'Pro', base_plan_tier: 'growth' });
    expect(v.status).toBe('draft');
    expect(listVariants(ENTITY)).toHaveLength(1);
  });

  it('lists multiple variants in order', () => {
    createVariant(ENTITY, { name: 'A', base_plan_tier: 'starter' });
    createVariant(ENTITY, { name: 'B', base_plan_tier: 'growth' });
    expect(listVariants(ENTITY).map((v) => v.name)).toEqual(['A', 'B']);
  });

  it('updates a draft variant', () => {
    const v = createVariant(ENTITY, { name: 'Pro', base_plan_tier: 'growth' });
    const updated = updateVariant(ENTITY, v.id, { name: 'Pro Plus' });
    expect(updated?.name).toBe('Pro Plus');
    expect(getVariant(ENTITY, v.id)?.name).toBe('Pro Plus');
  });

  it('publishes draft → published and stamps audit-ready state', () => {
    const v = createVariant(ENTITY, { name: 'Pro', base_plan_tier: 'enterprise' });
    const pub = publishVariant(ENTITY, v.id);
    expect(pub?.status).toBe('published');
  });

  it('published variants are immutable to updateVariant', () => {
    const v = createVariant(ENTITY, { name: 'Pro', base_plan_tier: 'growth' });
    publishVariant(ENTITY, v.id);
    const attempt = updateVariant(ENTITY, v.id, { name: 'Hacked' });
    expect(attempt?.name).toBe('Pro');
  });

  it('deleteVariant removes drafts but preserves published rows', () => {
    const a = createVariant(ENTITY, { name: 'A', base_plan_tier: 'starter' });
    const b = createVariant(ENTITY, { name: 'B', base_plan_tier: 'growth' });
    publishVariant(ENTITY, b.id);
    deleteVariant(ENTITY, a.id);
    deleteVariant(ENTITY, b.id);
    const names = listVariants(ENTITY).map((v) => v.name);
    expect(names).toEqual(['B']);
  });

  /* ── §2 · Tier reconciliation (DP-2) ──────────────────────────────────── */
  it('maps Starter → starter', () => {
    expect(mapTenantPlanToPlanTier('Starter')).toBe('starter');
  });
  it('maps Professional → growth', () => {
    expect(mapTenantPlanToPlanTier('Professional')).toBe('growth');
  });
  it('maps Enterprise → enterprise', () => {
    expect(mapTenantPlanToPlanTier('Enterprise')).toBe('enterprise');
  });

  /* ── §3 · resolveVariantEntitlements DELEGATES (AC3) ──────────────────── */
  it('resolveVariantEntitlements consumes card-entitlement (no in-engine fabrication)', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../lib/product-variant-engine.ts'),
      'utf8',
    );
    // Greppable delegation: must import seedDemoEntitlements; must NOT
    // hand-construct a CardEntitlement literal with `card_id:` inline.
    expect(src).toMatch(/seedDemoEntitlements/);
    expect(src).not.toMatch(/card_id:\s*'[a-z]/);
  });

  it('resolveVariantEntitlements returns CardEntitlement[] with variant tier applied', () => {
    const v = createVariant(ENTITY, { name: 'Pro', base_plan_tier: 'enterprise' });
    const ents = resolveVariantEntitlements(v, TENANT);
    expect(ents.length).toBeGreaterThan(0);
    expect(ents.every((e) => e.plan_tier === 'enterprise')).toBe(true);
    expect(ents.every((e) => e.tenant_id === TENANT)).toBe(true);
  });

  it('assignVariantToTenant resolves + seeds CardEntitlement[] under cardEntitlementsKey', () => {
    const v = createVariant(ENTITY, {
      name: 'Pro', base_plan_tier: 'growth',
      enabled_modules: ['accounts-basic', 'production'],
    });
    publishVariant(ENTITY, v.id);
    const result = assignVariantToTenant(ENTITY, TENANT, v.id);
    expect(result).not.toBeNull();
    const stored = localStorage.getItem(cardEntitlementsKey(TENANT));
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!) as Array<{ plan_tier: string }>;
    expect(parsed.every((e) => e.plan_tier === 'growth')).toBe(true);
  });

  it('assignVariantToTenant refuses draft variants (publish-gated)', () => {
    const v = createVariant(ENTITY, { name: 'Draft', base_plan_tier: 'growth' });
    const result = assignVariantToTenant(ENTITY, TENANT, v.id);
    expect(result).toBeNull();
  });

  /* ── §4 · Catalog id walls (AC4) ──────────────────────────────────────── */
  it('exposes exactly 28 real module ids', () => {
    expect(VARIANT_MODULE_IDS).toHaveLength(28);
    expect(isValidModuleId('accounts-basic')).toBe(true);
    expect(isValidModuleId('fabricated-id')).toBe(false);
  });

  it('exposes exactly 12 real addon ids', () => {
    expect(VARIANT_ADDON_IDS).toHaveLength(12);
    expect(isValidAddonId('tally-sync')).toBe(true);
    expect(isValidAddonId('made-up')).toBe(false);
  });

  it('module/addon ids on a variant filter out fabricated ids', () => {
    const v = createVariant(ENTITY, {
      name: 'Pro', base_plan_tier: 'growth',
      enabled_modules: ['accounts-basic', 'bogus-id'],
      enabled_addons: ['tally-sync', 'not-real'],
    });
    expect(v.enabled_modules).toEqual(['accounts-basic']);
    expect(v.enabled_addons).toEqual(['tally-sync']);
  });

  it('module catalog ids exactly mirror ModulesPage', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../pages/modules/ModulesPage.tsx'),
      'utf8',
    );
    for (const id of VARIANT_MODULE_IDS) {
      expect(src).toContain(`id: '${id}'`);
    }
  });

  it('addon catalog ids exactly mirror AddOnsPage', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../pages/addons/AddOnsPage.tsx'),
      'utf8',
    );
    for (const id of VARIANT_ADDON_IDS) {
      expect(src).toContain(`id: '${id}'`);
    }
  });

  /* ── §5 · Limits — stored, validated, NOT enforced (AC6 · DP-7) ──────── */
  it('validateLimits accepts non-negative values', () => {
    expect(validateLimits(EMPTY_VARIANT_LIMITS).ok).toBe(true);
  });

  it('validateLimits rejects negative max_users', () => {
    expect(validateLimits({ ...EMPTY_VARIANT_LIMITS, max_users: -1 }).ok).toBe(false);
  });

  it('validateLimits rejects negative storage_gb', () => {
    expect(validateLimits({ ...EMPTY_VARIANT_LIMITS, storage_gb: -5 }).ok).toBe(false);
  });

  it('engine never wires a runtime enforcement hook for limits', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../lib/product-variant-engine.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/enforce(Limit|Quota|Variant)/i);
    expect(src).not.toMatch(/throw\s+new\s+Error\(['"`].*limit/i);
  });

  it('Variant Builder page renders the honest Wave-2 banner', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../pages/tower/VariantBuilder.tsx'),
      'utf8',
    );
    expect(src).toContain('VARIANT_LIMITS_HONESTY');
    expect(VARIANT_LIMITS_HONESTY).toMatch(/runtime enforcement/i);
  });

  /* ── §6 · §H walls 0-DIFF (consumed) ──────────────────────────────────── */
  it('card-entitlement engine + types are consumed read-only (no symbols mutated)', () => {
    const eng = fs.readFileSync(
      path.resolve(__dirname, '../../lib/product-variant-engine.ts'),
      'utf8',
    );
    expect(eng).not.toMatch(/seedDemoEntitlements\s*=/);
    expect(eng).not.toMatch(/canUseFeature\s*=/);
  });

  /* ── §7 · Sprint history row + CAT1 flip ─────────────────────────────── */
  it('sprint-history contains the SP.1 row with predecessor d4db38ae', () => {
    const sp1 = SPRINTS.find((s) => s.code === 'T-SP1-Variant-Builder');
    expect(sp1).toBeDefined();
    expect(sp1?.predecessorSha).toBe('d4db38ae');
    expect(sp1?.newSiblings).toContain('product-variant-engine');
  });

  it('CATALOG-1 headSha is flipped to d4db38ae', () => {
    const cat1 = SPRINTS.find((s) => s.code === 'T-CAT1-Modules-AddOns');
    expect(cat1?.headSha).toBe('d4db38ae');
  });
});
