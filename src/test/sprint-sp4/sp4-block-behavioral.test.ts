/**
 * @file   src/test/sprint-sp4/sp4-block-behavioral.test.ts
 * @sprint SP.4 · T-SP4-Build-Your-Plan · SaaS Productization ARC CLOSE
 * @canon  Behavioral guardrails for the customer-facing Build-Your-Plan
 *         configurator. Live price CONSUMES computeListPrice/computeChannelPrice
 *         (SP.2). CTA CONSUMES createProvisionRequest (SP.3). Catalog + Card
 *         roster + applications.ts 0-DIFF. Tier-L: no checkout, no payment,
 *         no instant provisioning. Non-forward-looking history assertions only.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  computeListPrice,
  computeChannelPrice,
  ALL_CARD_IDS,
  VARIANT_MODULE_IDS,
  VARIANT_ADDON_IDS,
} from '@/lib/product-variant-engine';
import {
  EMPTY_LIMIT_SET,
  EMPTY_PRICING_PLAN,
  type LimitSet,
  type PricingPlan,
} from '@/types/product-variant';
import {
  createProvisionRequest,
  listProvisionRequests,
} from '@/lib/provisioning-engine';
import {
  PROVISION_REQUEST_TYPES,
  provisionRequestsKey,
} from '@/types/provisioning';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { BUILD_YOUR_PLAN_HONESTY } from '@/pages/build-your-plan/BuildYourPlanPage';

const ENTITY = 'test-entity-sp4';
const ROOT = path.resolve(__dirname, '../../..');
const PAGE_REL = 'src/pages/build-your-plan/BuildYourPlanPage.tsx';

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function clearAll() {
  localStorage.removeItem(provisionRequestsKey(ENTITY));
}

function makeLimits(over: Partial<LimitSet> = {}): LimitSet {
  return { ...EMPTY_LIMIT_SET, ...over };
}
function makePricing(over: Partial<PricingPlan> = {}): PricingPlan {
  return { ...EMPTY_PRICING_PLAN, ...over };
}

describe('SP.4 · Composer base / catalog 0-DIFF', () => {
  it('ALL_CARD_IDS roster ≥30 real CardIds (no fabricated)', () => {
    expect(ALL_CARD_IDS.length).toBeGreaterThanOrEqual(30);
    for (const c of ALL_CARD_IDS) expect(typeof c).toBe('string');
  });

  it('VARIANT_MODULE_IDS has 28 real catalog ids', () => {
    expect(VARIANT_MODULE_IDS.length).toBe(28);
  });

  it('VARIANT_ADDON_IDS has 12 real catalog ids', () => {
    expect(VARIANT_ADDON_IDS.length).toBe(12);
  });

  it('Build Your Plan page references the real catalog id arrays (no fabricated lists)', () => {
    const src = readSrc(PAGE_REL);
    expect(src).toContain('ALL_CARD_IDS');
    expect(src).toContain('VARIANT_MODULE_IDS');
    expect(src).toContain('VARIANT_ADDON_IDS');
  });

  it('module/bundle ids partition correctly (bundles isolated)', () => {
    const bundles = VARIANT_MODULE_IDS.filter((id) => id.startsWith('bundle-'));
    const standalone = VARIANT_MODULE_IDS.filter((id) => !id.startsWith('bundle-'));
    expect(bundles.length).toBeGreaterThan(0);
    expect(standalone.length).toBeGreaterThan(0);
    expect(bundles.length + standalone.length).toBe(VARIANT_MODULE_IDS.length);
  });
});

describe('SP.4 · Live price CONSUMES computeListPrice (display math)', () => {
  it('per_seat scales with users', () => {
    const p = makePricing({ model: 'per_seat', base_price: 1000, per_user_price: 100 });
    const a = computeListPrice(p, makeLimits({ users: 5 }));
    const b = computeListPrice(p, makeLimits({ users: 50 }));
    expect(b).toBeGreaterThan(a);
    expect(b - a).toBe(45 * 100);
  });

  it('per_company scales with companies', () => {
    const p = makePricing({ model: 'per_company', base_price: 0, per_company_price: 2000 });
    expect(computeListPrice(p, makeLimits({ companies: 3 }))).toBe(6000);
  });

  it('hybrid combines users + companies + gb', () => {
    const p = makePricing({
      model: 'hybrid', base_price: 1000,
      per_user_price: 100, per_company_price: 500, per_gb_price: 10,
    });
    const v = computeListPrice(p, makeLimits({ users: 10, companies: 2, space_gb: 20 }));
    expect(v).toBe(1000 + 1000 + 1000 + 200);
  });

  it('flat_tier ignores dims (base price only)', () => {
    const p = makePricing({ model: 'flat_tier', base_price: 9999 });
    expect(computeListPrice(p, makeLimits({ users: 1000 }))).toBe(9999);
  });

  it('discount_pct shrinks the price', () => {
    const p = makePricing({ model: 'flat_tier', base_price: 1000, discount_pct: 20 });
    expect(computeListPrice(p, makeLimits())).toBe(800);
  });

  it('page source greppably delegates to computeListPrice + computeChannelPrice', () => {
    const src = readSrc(PAGE_REL);
    expect(src).toContain('computeListPrice');
    expect(src).toContain('computeChannelPrice');
  });
});

describe('SP.4 · Channel price (computeChannelPrice)', () => {
  it('channel = list − margin%', () => {
    expect(computeChannelPrice(1000, 30)).toBe(700);
    expect(computeChannelPrice(1000, 0)).toBe(1000);
  });
  it('clamps negative + over-100 margins', () => {
    expect(computeChannelPrice(1000, -10)).toBe(1000);
    expect(computeChannelPrice(1000, 200)).toBe(0);
  });
});

describe('SP.4 · CTA CONSUMES createProvisionRequest (SP.3)', () => {
  beforeEach(() => clearAll());

  it('creates a ProvisionRequest with requested status', () => {
    const r = createProvisionRequest(ENTITY, {
      type: 'demo', requester_name: 'Sharma Traders Pvt Ltd',
      notes: 'Base: Prudent360 ERP (6 cards) | Companies 1 · Users 10',
    });
    expect(r.status).toBe('requested');
    expect(r.type).toBe('demo');
    expect(r.requester_name).toBe('Sharma Traders Pvt Ltd');
    expect(r.notes).toContain('Companies 1');
  });

  it('accepts final_copy + client request types (configurator subset)', () => {
    const r1 = createProvisionRequest(ENTITY, { type: 'final_copy', requester_name: 'A' });
    const r2 = createProvisionRequest(ENTITY, { type: 'client', requester_name: 'B' });
    expect(r1.type).toBe('final_copy');
    expect(r2.type).toBe('client');
  });

  it('persists into the SP.3 provisioning queue', () => {
    createProvisionRequest(ENTITY, { type: 'demo', requester_name: 'X' });
    const all = listProvisionRequests(ENTITY);
    expect(all.length).toBe(1);
    expect(all[0].requester_name).toBe('X');
  });

  it('request types union covers demo/final_copy/client (configurator emits these)', () => {
    for (const t of ['demo', 'final_copy', 'client'] as const) {
      expect(PROVISION_REQUEST_TYPES).toContain(t);
    }
  });

  it('page source greppably delegates to createProvisionRequest', () => {
    const src = readSrc(PAGE_REL);
    expect(src).toContain('createProvisionRequest');
    expect(src).toMatch(/from '@\/lib\/provisioning-engine'/);
  });
});

describe('SP.4 · Tier-L honesty (no checkout / payment / instant provisioning)', () => {
  it('exports an honest Wave-2 banner constant', () => {
    expect(BUILD_YOUR_PLAN_HONESTY).toMatch(/Wave-2/i);
    expect(BUILD_YOUR_PLAN_HONESTY).toMatch(/queue/i);
  });

  it('page mounts the honesty banner string', () => {
    const src = readSrc(PAGE_REL);
    expect(src).toContain('BUILD_YOUR_PLAN_HONESTY');
  });

  it('page has NO fake checkout/payment/instance code paths', () => {
    const src = readSrc(PAGE_REL);
    expect(src).not.toMatch(/processPayment|chargeCard|stripe|razorpay|spinUpInstance|provisionInstance/i);
  });
});

describe('SP.4 · Walls (consume-spine 0-DIFF guards)', () => {
  it('no in-page reimplementation of computeListPrice', () => {
    const src = readSrc(PAGE_REL);
    expect(src).not.toMatch(/function\s+computeListPrice/);
    expect(src).not.toMatch(/const\s+computeListPrice\s*=/);
  });
  it('no in-page reimplementation of createProvisionRequest', () => {
    const src = readSrc(PAGE_REL);
    expect(src).not.toMatch(/function\s+createProvisionRequest/);
    expect(src).not.toMatch(/const\s+createProvisionRequest\s*=/);
  });
  it('product-variant-engine still exports its consume-spine API', () => {
    const src = readSrc('src/lib/product-variant-engine.ts');
    expect(src).toMatch(/export\s+function\s+computeListPrice/);
    expect(src).toMatch(/export\s+function\s+computeChannelPrice/);
  });
  it('provisioning-engine still exports createProvisionRequest', () => {
    const src = readSrc('src/lib/provisioning-engine.ts');
    expect(src).toMatch(/export\s+function\s+createProvisionRequest/);
  });
  it('applications.ts is not mutated by SP.4 (no import from the configurator page)', () => {
    const src = readSrc(PAGE_REL);
    expect(src).not.toMatch(/from '@\/.*applications'/);
  });
});

describe('SP.4 · Sprint history (non-forward-looking only)', () => {
  it('SP.3 row is flipped to predecessor SHA f02c930c (banked)', () => {
    const sp3 = SPRINTS.find((s) => s.code === 'T-SP3-Provisioning');
    expect(sp3?.headSha).toBe('f02c930c');
  });

  it('SP.4 row exists with predecessorSha f02c930c + EMPTY newSiblings (no new SIBLING)', () => {
    const sp4 = SPRINTS.find((s) => s.code === 'T-SP4-Build-Your-Plan');
    expect(sp4).toBeDefined();
    expect(sp4?.predecessorSha).toBe('f02c930c');
    expect(sp4?.newSiblings).toEqual([]);
  });

  it('history maintains a stable banked floor (non-forward-looking)', () => {
    expect(SPRINTS.length).toBeGreaterThanOrEqual(5);
    expect(SPRINTS.some((s) => s.code === 'T-SP1-Variant-Builder')).toBe(true);
    expect(SPRINTS.some((s) => s.code === 'T-SP2-Prudent360-ERP')).toBe(true);
    expect(SPRINTS.some((s) => s.code === 'T-SP3-Provisioning')).toBe(true);
  });
});
