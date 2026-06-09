/**
 * @file   src/test/sprint-sp2/sp2-block-behavioral.test.ts
 * @sprint SP.2 · T-SP2-Prudent360-ERP
 * @canon  Behavioral guardrails — product_kind + enabled_cards + LimitSet +
 *         PricingPlan model, flagship Prudent360-ERP seed, delegation to
 *         card-entitlement, honest stored-not-enforced posture, §H walls.
 *         Non-forward-looking roadmap assertions only.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  createVariant,
  publishVariant,
  listVariants,
  resolveErpCardEntitlements,
  resolveVariantEntitlements,
  assignVariantToTenant,
  validateLimitSet,
  computeListPrice,
  computeChannelPrice,
  ALL_CARD_IDS,
  VARIANT_MODULE_IDS,
  VARIANT_ADDON_IDS,
  isValidCardId,
  seedFlagshipPrudent360,
  FLAGSHIP_SEED_NAMES,
} from '@/lib/product-variant-engine';
import {
  productVariantsKey,
  variantAssignmentKey,
  EMPTY_LIMIT_SET,
  EMPTY_PRICING_PLAN,
  VARIANT_LIMITS_HONESTY,
  type LimitSet,
  type PricingPlan,
} from '@/types/product-variant';
import { cardEntitlementsKey } from '@/types/card-entitlement';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ENTITY = 'test-entity-sp2';
const TENANT = 'test-tenant-sp2';
const ROOT = path.resolve(__dirname, '../../..');

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function clearAll() {
  localStorage.removeItem(productVariantsKey(ENTITY));
  localStorage.removeItem(variantAssignmentKey(ENTITY));
  localStorage.removeItem(cardEntitlementsKey(TENANT));
}

describe('SP.2 · ProductVariant extension · types', () => {
  beforeEach(() => clearAll());

  it('product_kind accepts erp/module/addon/bundle on create', () => {
    const v = createVariant(ENTITY, {
      name: 'X', base_plan_tier: 'growth', product_kind: 'erp',
    });
    expect(v.product_kind).toBe('erp');
  });

  it('enabled_cards persisted only when CardId is real (no fabricated)', () => {
    const v = createVariant(ENTITY, {
      name: 'X', base_plan_tier: 'growth', product_kind: 'erp',
      enabled_cards: ['fincore', 'made-up-card' as unknown as never, 'salesx'],
    });
    expect(v.enabled_cards).toEqual(['fincore', 'salesx']);
  });

  it('ALL_CARD_IDS contains only real CardIds (isValidCardId true for each)', () => {
    for (const id of ALL_CARD_IDS) expect(isValidCardId(id)).toBe(true);
    expect(isValidCardId('fabricated')).toBe(false);
  });

  it('ALL_CARD_IDS roster has at least 33 entries', () => {
    expect(ALL_CARD_IDS.length).toBeGreaterThanOrEqual(33);
  });
});

describe('SP.2 · LimitSet · stored, validated, NOT enforced', () => {
  it('EMPTY_LIMIT_SET carries all 8 new dims plus SP.1 legacy fields', () => {
    expect(EMPTY_LIMIT_SET.companies).toBeGreaterThanOrEqual(0);
    expect(EMPTY_LIMIT_SET.users).toBeGreaterThanOrEqual(0);
    expect(EMPTY_LIMIT_SET.space_gb).toBeGreaterThanOrEqual(0);
    expect(EMPTY_LIMIT_SET.branches).toBeGreaterThanOrEqual(0);
    expect(EMPTY_LIMIT_SET.transactions_per_month).toBeGreaterThanOrEqual(0);
    expect(EMPTY_LIMIT_SET.retention_years).toBeGreaterThanOrEqual(0);
    expect(EMPTY_LIMIT_SET.api_calls).toBeGreaterThanOrEqual(0);
    expect(EMPTY_LIMIT_SET.support_tier).toBeDefined();
    expect(EMPTY_LIMIT_SET.max_users).toBeGreaterThanOrEqual(0);
    expect(EMPTY_LIMIT_SET.storage_gb).toBeGreaterThanOrEqual(0);
  });

  it('validateLimitSet accepts non-negative values', () => {
    expect(validateLimitSet(EMPTY_LIMIT_SET).ok).toBe(true);
  });

  it('validateLimitSet rejects a negative companies count', () => {
    const bad: LimitSet = { ...EMPTY_LIMIT_SET, companies: -1 };
    expect(validateLimitSet(bad).ok).toBe(false);
  });

  it('validateLimitSet rejects negative api_calls', () => {
    const bad: LimitSet = { ...EMPTY_LIMIT_SET, api_calls: -5 };
    expect(validateLimitSet(bad).ok).toBe(false);
  });

  it('engine never wires runtime enforcement for limits (Tier-L)', () => {
    const src = readSrc('src/lib/product-variant-engine.ts');
    expect(src).not.toMatch(/enforce(Limit|Quota|LimitSet|Variant)/i);
    expect(src).not.toMatch(/throw\s+new\s+Error\(['"`].*limit/i);
    expect(src).not.toMatch(/charge\(|invoiceCustomer|chargeCard/);
  });
});

describe('SP.2 · PricingPlan · display math (NOT charged)', () => {
  it('computeListPrice · per_seat = base + per_user × users', () => {
    const pricing: PricingPlan = { ...EMPTY_PRICING_PLAN, model: 'per_seat', base_price: 1000, per_user_price: 100 };
    const limits: LimitSet = { ...EMPTY_LIMIT_SET, users: 10 };
    expect(computeListPrice(pricing, limits)).toBe(2000);
  });

  it('computeListPrice · per_company = base + per_company × companies', () => {
    const pricing: PricingPlan = { ...EMPTY_PRICING_PLAN, model: 'per_company', base_price: 500, per_company_price: 250 };
    const limits: LimitSet = { ...EMPTY_LIMIT_SET, companies: 4 };
    expect(computeListPrice(pricing, limits)).toBe(1500);
  });

  it('computeListPrice · flat_tier = base price only', () => {
    const pricing: PricingPlan = { ...EMPTY_PRICING_PLAN, model: 'flat_tier', base_price: 9999 };
    expect(computeListPrice(pricing, EMPTY_LIMIT_SET)).toBe(9999);
  });

  it('computeListPrice · usage = base + per_gb × space_gb', () => {
    const pricing: PricingPlan = { ...EMPTY_PRICING_PLAN, model: 'usage', base_price: 100, per_gb_price: 5 };
    const limits: LimitSet = { ...EMPTY_LIMIT_SET, space_gb: 20 };
    expect(computeListPrice(pricing, limits)).toBe(200);
  });

  it('computeListPrice · hybrid sums seat + company + gb components', () => {
    const pricing: PricingPlan = {
      ...EMPTY_PRICING_PLAN, model: 'hybrid', base_price: 1000,
      per_user_price: 10, per_company_price: 100, per_gb_price: 1,
    };
    const limits: LimitSet = { ...EMPTY_LIMIT_SET, users: 5, companies: 2, space_gb: 50 };
    expect(computeListPrice(pricing, limits)).toBe(1000 + 50 + 200 + 50);
  });

  it('computeListPrice applies discount_pct', () => {
    const pricing: PricingPlan = { ...EMPTY_PRICING_PLAN, model: 'flat_tier', base_price: 1000, discount_pct: 10 };
    expect(computeListPrice(pricing, EMPTY_LIMIT_SET)).toBe(900);
  });

  it('computeChannelPrice = list − margin% (10/20/30)', () => {
    expect(computeChannelPrice(1000, 10)).toBe(900);
    expect(computeChannelPrice(1000, 20)).toBe(800);
    expect(computeChannelPrice(1000, 30)).toBe(700);
  });
});

describe('SP.2 · resolveErpCardEntitlements · CONSUMES card-entitlement', () => {
  beforeEach(() => clearAll());

  it('greppable delegation: imports seedDemoEntitlements + filters by enabled_cards', () => {
    const src = readSrc('src/lib/product-variant-engine.ts');
    expect(src).toMatch(/seedDemoEntitlements/);
    expect(src).toMatch(/resolveErpCardEntitlements/);
    // never fabricates a CardEntitlement literal inline
    expect(src).not.toMatch(/card_id:\s*'[a-z]/);
  });

  it('returns only the cards listed in enabled_cards (subset of seed)', () => {
    const v = createVariant(ENTITY, {
      name: 'ERP-mini', base_plan_tier: 'growth', product_kind: 'erp',
      enabled_cards: ['fincore', 'salesx', 'insightx'],
    });
    const ents = resolveErpCardEntitlements(v, TENANT);
    const ids = ents.map((e) => e.card_id).sort();
    expect(ids).toEqual(['fincore', 'insightx', 'salesx']);
  });

  it('returns empty when enabled_cards is empty (honest)', () => {
    const v = createVariant(ENTITY, {
      name: 'Empty', base_plan_tier: 'starter', product_kind: 'erp',
      enabled_cards: [],
    });
    expect(resolveErpCardEntitlements(v, TENANT)).toEqual([]);
  });

  it('assignVariantToTenant routes erp-kind through the card filter', () => {
    const v = createVariant(ENTITY, {
      name: 'ERP-2', base_plan_tier: 'enterprise', product_kind: 'erp',
      enabled_cards: ['fincore', 'salesx'],
    });
    publishVariant(ENTITY, v.id);
    const result = assignVariantToTenant(ENTITY, TENANT, v.id);
    expect(result).not.toBeNull();
    expect(result!.entitlements.map((e) => e.card_id).sort()).toEqual(['fincore', 'salesx']);
  });

  it('module-kind path continues to use resolveVariantEntitlements (SP.1 0-DIFF)', () => {
    const v = createVariant(ENTITY, {
      name: 'Mod', base_plan_tier: 'growth', product_kind: 'module',
    });
    const ents = resolveVariantEntitlements(v, TENANT);
    expect(ents.length).toBeGreaterThan(0);
  });
});

describe('SP.2 · Flagship Prudent360-ERP seed', () => {
  beforeEach(() => clearAll());

  it('seeds three flagship variants on first call', () => {
    seedFlagshipPrudent360(ENTITY);
    const names = listVariants(ENTITY).map((v) => v.name);
    for (const n of FLAGSHIP_SEED_NAMES) expect(names).toContain(n);
  });

  it('flagship "Prudent360 ERP" carries ALL card ids', () => {
    seedFlagshipPrudent360(ENTITY);
    const flagship = listVariants(ENTITY).find((v) => v.name === 'Prudent360 ERP');
    expect(flagship).toBeDefined();
    expect(flagship?.product_kind).toBe('erp');
    expect((flagship?.enabled_cards ?? []).length).toBe(ALL_CARD_IDS.length);
  });

  it('Lite + Manufacturing editions are card-subsets of the flagship', () => {
    seedFlagshipPrudent360(ENTITY);
    const all = listVariants(ENTITY);
    const lite = all.find((v) => v.name === 'Prudent360 ERP — Lite');
    const mfg  = all.find((v) => v.name === 'Prudent360 ERP — Manufacturing');
    expect((lite?.enabled_cards ?? []).length).toBeLessThan(ALL_CARD_IDS.length);
    expect((mfg?.enabled_cards ?? []).length).toBeLessThan(ALL_CARD_IDS.length);
    for (const c of lite?.enabled_cards ?? []) expect(ALL_CARD_IDS).toContain(c);
    for (const c of mfg?.enabled_cards ?? []) expect(ALL_CARD_IDS).toContain(c);
  });

  it('seed is idempotent — re-invoking does not duplicate', () => {
    seedFlagshipPrudent360(ENTITY);
    const first = listVariants(ENTITY).length;
    seedFlagshipPrudent360(ENTITY);
    expect(listVariants(ENTITY).length).toBe(first);
  });

  it('flagship variants carry a PricingPlan (display only)', () => {
    seedFlagshipPrudent360(ENTITY);
    const flagship = listVariants(ENTITY).find((v) => v.name === 'Prudent360 ERP');
    expect(flagship?.pricing).toBeDefined();
    expect(flagship?.pricing?.model).toBeDefined();
  });
});

describe('SP.2 · Honest banner + walls', () => {
  it('VARIANT_LIMITS_HONESTY banner mentions Wave-2 + billing/charging', () => {
    expect(VARIANT_LIMITS_HONESTY).toMatch(/Wave-2/);
    expect(VARIANT_LIMITS_HONESTY).toMatch(/billing|charging|charge/i);
  });

  it('Variant Builder page renders the Wave-2 banner', () => {
    const src = readSrc('src/pages/tower/VariantBuilder.tsx');
    expect(src).toContain('VARIANT_LIMITS_HONESTY');
  });

  it('SP.1 module/addon catalog lists remain at 28 + 12 (walls held)', () => {
    expect(VARIANT_MODULE_IDS).toHaveLength(28);
    expect(VARIANT_ADDON_IDS).toHaveLength(12);
  });

  it('card-entitlement-engine is consumed read-only (no symbol mutation)', () => {
    const eng = readSrc('src/lib/product-variant-engine.ts');
    expect(eng).not.toMatch(/seedDemoEntitlements\s*=/);
    expect(eng).not.toMatch(/CardEntitlement\s*=/);
  });
});

describe('SP.2 · Sprint history rows (non-forward-looking)', () => {
  it('SP.1 row is flipped to predecessor SHA 83d28166 (banked)', () => {
    const sp1 = SPRINTS.find((s) => s.code === 'T-SP1-Variant-Builder');
    expect(sp1?.headSha).toBe('83d28166');
  });

  it('SP.2 row exists with predecessorSha 83d28166 + empty newSiblings', () => {
    const sp2 = SPRINTS.find((s) => s.code === 'T-SP2-Prudent360-ERP');
    expect(sp2).toBeDefined();
    expect(sp2?.predecessorSha).toBe('83d28166');
    expect(sp2?.newSiblings).toEqual([]);
  });
});
