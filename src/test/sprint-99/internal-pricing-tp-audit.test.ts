/**
 * @file        src/test/sprint-99/internal-pricing-tp-audit.test.ts
 * @sprint      Sprint 99 · T-Phase-6.A.0.4 · Block 5
 * @scope       internal-pricing-engine (7 methods · 6 rule_types · idea-1 effective-dating)
 *              + idea-7-transfer-pricing-audit-engine (orchestrator · USE-SITE READS) +
 *              institutional integrity (sibling-register, audit types, no FR-44 dup).
 * @goal        >=30 discrete it() blocks. Currently 35.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import {
  PRICING_METHODS,
  PRICING_RULE_TYPES,
  upsertPricingRule,
  resolvePrice,
  listPricingRules,
  computePriceForMethod,
  _clearPricingRulesForTests,
  type InternalPricingRule,
} from '@/lib/internal-pricing-engine';

import {
  generateTPAudit,
  listTPAudits,
  setCommitteeDecision,
  _clearTPAuditsForTests,
} from '@/lib/idea-7-transfer-pricing-audit-engine';

import { recommendALPMethod, isAboveThreshold } from '@/lib/tp-benchmarking-engine';
import { buildForm3CEBSnapshot } from '@/lib/form-3ceb-engine';
import { getMasterAsOf } from '@/lib/idea-1-time-travel-masters-engine';
import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { readAuditTrail } from '@/lib/audit-trail-engine';

// ─── localStorage shim ───────────────────────────────────────────────
class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
  get length() { return this.m.size; }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
}
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage();
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage.clear();
  _clearPricingRulesForTests();
  _clearTPAuditsForTests();
});

function makeRule(overrides: Partial<InternalPricingRule> = {}): InternalPricingRule {
  return {
    pricing_rule_id: 'pr-001',
    rule_type: 'inter_entity',
    from_scope: { entity_id: 'sinha-trading' },
    to_scope: { entity_id: 'sinha-holdings' },
    item_scope: 'specific_items',
    item_key: 'ITM-001',
    pricing_method: 'cost_plus_markup',
    markup_percentage: 10,
    overhead_allocation_pct: 5,
    variance_handling: 'absorb_at_source',
    base_cost: 1000,
    market_rate: 1200,
    standard_cost: 1100,
    budget_rate: 1150,
    mrp: 1500,
    lowest_external_rate: 1080,
    effective_from: '2026-04-01',
    effective_to: null,
    approval_workflow: 'tp_committee',
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

// ═════════════════════════════════════════════════════════════════════
// §A · internal-pricing-engine — pricing methods (AC#3)
// ═════════════════════════════════════════════════════════════════════
describe('internal-pricing-engine · 7 pricing methods (decimal-safe)', () => {
  it('exports exactly 7 PRICING_METHODS', () => {
    expect(PRICING_METHODS.length).toBe(7);
  });

  it('cost_plus_markup = base * (1 + markup%)', () => {
    const r = makeRule({ pricing_method: 'cost_plus_markup', base_cost: 1000, markup_percentage: 10 });
    expect(computePriceForMethod(r)).toBe(1100);
  });

  it('arms_length_market returns market_rate', () => {
    const r = makeRule({ pricing_method: 'arms_length_market', market_rate: 1234.56 });
    expect(computePriceForMethod(r)).toBe(1234.56);
  });

  it('standard_cost returns standard_cost', () => {
    const r = makeRule({ pricing_method: 'standard_cost', standard_cost: 999 });
    expect(computePriceForMethod(r)).toBe(999);
  });

  it('budget_rate returns budget_rate', () => {
    const r = makeRule({ pricing_method: 'budget_rate', budget_rate: 1300 });
    expect(computePriceForMethod(r)).toBe(1300);
  });

  it('lowest_external_rate returns lowest_external_rate', () => {
    const r = makeRule({ pricing_method: 'lowest_external_rate', lowest_external_rate: 900 });
    expect(computePriceForMethod(r)).toBe(900);
  });

  it('mrp_minus_discount = mrp * (1 - discount%)', () => {
    const r = makeRule({ pricing_method: 'mrp_minus_discount', mrp: 1000, markup_percentage: 20 });
    expect(computePriceForMethod(r)).toBe(800);
  });

  it('actual_cost_plus_overhead applies markup + overhead', () => {
    const r = makeRule({ pricing_method: 'actual_cost_plus_overhead', base_cost: 1000, markup_percentage: 10, overhead_allocation_pct: 5 });
    expect(computePriceForMethod(r)).toBe(1150);
  });

  it('uses decimal-helpers (no float drift on 0.1 + 0.2 style sums)', () => {
    const r = makeRule({ pricing_method: 'cost_plus_markup', base_cost: 0.1, markup_percentage: 200 });
    // 0.1 + 0.1*200/100 = 0.1 + 0.2 = 0.3 exact (not 0.30000000000000004)
    expect(computePriceForMethod(r)).toBe(0.3);
  });
});

// ═════════════════════════════════════════════════════════════════════
// §B · internal-pricing-engine — rule_types + scopes (AC#4, #6, #7)
// ═════════════════════════════════════════════════════════════════════
describe('internal-pricing-engine · 6 rule_types + idempotent upsert', () => {
  it('exports exactly 6 PRICING_RULE_TYPES', () => {
    expect(PRICING_RULE_TYPES.length).toBe(6);
  });

  it.each(PRICING_RULE_TYPES.map((rt) => [rt]))('supports rule_type %s', (rt) => {
    const r = upsertPricingRule(makeRule({ pricing_rule_id: `pr-${rt}`, rule_type: rt }));
    expect(r.rule_type).toBe(rt);
  });

  it('upsertPricingRule is idempotent on same id', () => {
    upsertPricingRule(makeRule());
    upsertPricingRule(makeRule({ markup_percentage: 15 }));
    const all = listPricingRules();
    expect(all.length).toBe(1);
    expect(all[0].markup_percentage).toBe(15);
  });

  it('variance_handling preserved through round-trip', () => {
    upsertPricingRule(makeRule({ variance_handling: 'split_50_50' }));
    const all = listPricingRules();
    expect(all[0].variance_handling).toBe('split_50_50');
  });

  it('listPricingRules filter narrows by rule_type', () => {
    upsertPricingRule(makeRule({ pricing_rule_id: 'a', rule_type: 'inter_branch' }));
    upsertPricingRule(makeRule({ pricing_rule_id: 'b', rule_type: 'inter_entity' }));
    expect(listPricingRules({ rule_type: 'inter_branch' }).length).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════
// §C · resolvePrice + idea-1 effective-dating (AC#5)
// ═════════════════════════════════════════════════════════════════════
describe('internal-pricing-engine · resolvePrice + idea-1 time-travel', () => {
  it('resolvePrice returns current rule', () => {
    upsertPricingRule(makeRule({ effective_from: '2020-01-01' }));
    const r = resolvePrice({
      rule_type: 'inter_entity',
      from_scope: { entity_id: 'sinha-trading' },
      to_scope: { entity_id: 'sinha-holdings' },
      item_key: 'ITM-001',
    });
    expect(r).not.toBeNull();
    expect(r?.price).toBe(1100);
  });

  it('resolvePrice returns null on no match', () => {
    const r = resolvePrice({
      rule_type: 'inter_entity',
      from_scope: { entity_id: 'x' },
      to_scope: { entity_id: 'y' },
      item_key: 'NOPE',
    });
    expect(r).toBeNull();
  });

  it('resolvePrice as_of_date uses idea-1 historical snapshot', () => {
    upsertPricingRule(makeRule({ markup_percentage: 10, effective_from: '2026-01-01' }));
    upsertPricingRule(makeRule({ markup_percentage: 20, effective_from: '2026-06-01' }));
    const past = resolvePrice({
      rule_type: 'inter_entity',
      from_scope: { entity_id: 'sinha-trading' },
      to_scope: { entity_id: 'sinha-holdings' },
      item_key: 'ITM-001',
      as_of_date: '2026-03-15',
    });
    expect(past).not.toBeNull();
    // Earliest version had markup 10 → price = 1100
    expect(past?.price).toBe(1100);
  });

  it('idea-1 recordMasterVersion was called by upsert (history exists)', () => {
    upsertPricingRule(makeRule());
    const v = getMasterAsOf({
      master_type: 'pricing_rule' as never,
      master_key: 'pr-001',
      as_of_date: '2026-04-15',
    });
    expect(v).not.toBeNull();
  });

  it('resolvePrice returns method + rule_id', () => {
    upsertPricingRule(makeRule());
    const r = resolvePrice({
      rule_type: 'inter_entity',
      from_scope: { entity_id: 'sinha-trading' },
      to_scope: { entity_id: 'sinha-holdings' },
      item_key: 'ITM-001',
    });
    expect(r?.method).toBe('cost_plus_markup');
    expect(r?.rule_id).toBe('pr-001');
  });

  it('item_scope=all matches any item_key', () => {
    upsertPricingRule(makeRule({ item_scope: 'all', item_key: 'ALL' }));
    const r = resolvePrice({
      rule_type: 'inter_entity',
      from_scope: { entity_id: 'sinha-trading' },
      to_scope: { entity_id: 'sinha-holdings' },
      item_key: 'ANYTHING',
    });
    expect(r).not.toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════
// §D · audit-trail — pricing_rule_change (AC#8)
// ═════════════════════════════════════════════════════════════════════
describe('internal-pricing-engine · audit trail', () => {
  it('upsertPricingRule writes pricing_rule_change audit', () => {
    upsertPricingRule(makeRule());
    const trail = readAuditTrail('sinha-trading');
    const matches = trail.filter((e) => e.entity_type === 'pricing_rule_change');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('source_module is internal-pricing-engine', () => {
    upsertPricingRule(makeRule());
    const trail = readAuditTrail('sinha-trading');
    const e = trail.find((x) => x.entity_type === 'pricing_rule_change');
    expect(e?.source_module).toBe('internal-pricing-engine');
  });
});

// ═════════════════════════════════════════════════════════════════════
// §E · idea-7 orchestrator — USE-SITE READS (AC#9-13)
// ═════════════════════════════════════════════════════════════════════
describe('idea-7-transfer-pricing-audit-engine · orchestrator', () => {
  it('generateTPAudit produces a record', () => {
    upsertPricingRule(makeRule());
    const rec = generateTPAudit({ pricing_rule_id: 'pr-001', entity_code: 'sinha-trading', financial_year: 'FY2025-26' });
    expect(rec.tp_audit_id).toBeTruthy();
    expect(rec.pricing_rule_id).toBe('pr-001');
  });

  it('alp_method_source is the tp-benchmarking-engine USE-SITE READ tag', () => {
    upsertPricingRule(makeRule());
    const rec = generateTPAudit({ pricing_rule_id: 'pr-001' });
    expect(rec.alp_method_source).toBe('tp-benchmarking-engine.recommendALPMethod');
  });

  it('methodology equals recommendALPMethod for the mapped txn type (inter_entity → integrated → TNMM)', () => {
    upsertPricingRule(makeRule({ rule_type: 'inter_entity' }));
    const rec = generateTPAudit({ pricing_rule_id: 'pr-001' });
    expect(rec.methodology).toBe(recommendALPMethod('integrated'));
  });

  it('section92_applicable uses isAboveThreshold', () => {
    upsertPricingRule(makeRule({ base_cost: 100000, markup_percentage: 10 }));
    const rec = generateTPAudit({ pricing_rule_id: 'pr-001' });
    expect(rec.section92_applicable).toBe(isAboveThreshold(rec.threshold_basis_inr));
  });

  it('inter_entity above-threshold rule generates Form 3CEB snapshot via form-3ceb-engine', () => {
    upsertPricingRule(makeRule({ base_cost: 5000000 }));
    const rec = generateTPAudit({ pricing_rule_id: 'pr-001', entity_code: 'sinha-trading', financial_year: 'FY2025-26' });
    expect(rec.section92_applicable).toBe(true);
    expect(rec.form3ceb_snapshot_id).toBeTruthy();
    // assert form-3ceb-engine actually built a snapshot we can re-read
    const snap = buildForm3CEBSnapshot('sinha-trading', 'FY2025-26');
    expect(snap.id).toBe(rec.form3ceb_snapshot_id);
  });

  it('non-inter_entity rule never builds 3CEB snapshot', () => {
    upsertPricingRule(makeRule({ rule_type: 'inter_branch' }));
    const rec = generateTPAudit({ pricing_rule_id: 'pr-001' });
    expect(rec.form3ceb_snapshot_id).toBeNull();
  });

  it('committee_approval starts pending', () => {
    upsertPricingRule(makeRule());
    const rec = generateTPAudit({ pricing_rule_id: 'pr-001' });
    expect(rec.committee_approval).toBe('pending');
  });

  it('setCommitteeDecision flips to approved', () => {
    upsertPricingRule(makeRule());
    const rec = generateTPAudit({ pricing_rule_id: 'pr-001' });
    const next = setCommitteeDecision(rec.tp_audit_id, 'approved');
    expect(next.committee_approval).toBe('approved');
  });

  it('setCommitteeDecision flips to rejected', () => {
    upsertPricingRule(makeRule());
    const rec = generateTPAudit({ pricing_rule_id: 'pr-001' });
    const next = setCommitteeDecision(rec.tp_audit_id, 'rejected');
    expect(next.committee_approval).toBe('rejected');
  });

  it('generateTPAudit twice on same rule increments version (idempotent on identity)', () => {
    upsertPricingRule(makeRule());
    const a = generateTPAudit({ pricing_rule_id: 'pr-001' });
    const b = generateTPAudit({ pricing_rule_id: 'pr-001' });
    expect(b.tp_audit_id).toBe(a.tp_audit_id);
    expect(b.version).toBe(a.version + 1);
  });

  it('listTPAudits returns persisted records', () => {
    upsertPricingRule(makeRule());
    generateTPAudit({ pricing_rule_id: 'pr-001' });
    expect(listTPAudits().length).toBe(1);
  });

  it('throws on unknown pricing_rule_id', () => {
    expect(() => generateTPAudit({ pricing_rule_id: 'nope' })).toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════════
// §F · audit-trail — transfer_pricing_event (AC#12)
// ═════════════════════════════════════════════════════════════════════
describe('idea-7 · audit trail', () => {
  it('generateTPAudit writes transfer_pricing_event audit', () => {
    upsertPricingRule(makeRule());
    generateTPAudit({ pricing_rule_id: 'pr-001' });
    const trail = readAuditTrail('sinha-trading');
    expect(trail.some((e) => e.entity_type === 'transfer_pricing_event')).toBe(true);
  });

  it('source_module is idea-7-transfer-pricing-audit-engine', () => {
    upsertPricingRule(makeRule());
    generateTPAudit({ pricing_rule_id: 'pr-001' });
    const trail = readAuditTrail('sinha-trading');
    const e = trail.find((x) => x.entity_type === 'transfer_pricing_event');
    expect(e?.source_module).toBe('idea-7-transfer-pricing-audit-engine');
  });
});

// ═════════════════════════════════════════════════════════════════════
// §G · FR-44 no-duplication (AC#11)
// ═════════════════════════════════════════════════════════════════════
describe('FR-44 · idea-7 does NOT duplicate comply360-transfer-pricing-engine', () => {
  const idea7Src = readFileSync(
    resolve(process.cwd(), 'src/lib/idea-7-transfer-pricing-audit-engine.ts'),
    'utf8',
  );

  it('idea-7 source does not import comply360-transfer-pricing-engine', () => {
    expect(idea7Src).not.toMatch(/comply360-transfer-pricing-engine/);
  });

  it('idea-7 source contains no Master File / 3CEAA / CbCR / Equalisation Levy logic', () => {
    expect(idea7Src).not.toMatch(/3CEAA/i);
    expect(idea7Src).not.toMatch(/CbCR/i);
    expect(idea7Src).not.toMatch(/Equalisation\s*Levy/i);
    expect(idea7Src).not.toMatch(/MasterFile/i);
  });

  it('idea-7 source DOES call recommendALPMethod (USE-SITE READ)', () => {
    expect(idea7Src).toMatch(/recommendALPMethod/);
  });

  it('idea-7 source DOES call buildForm3CEBSnapshot (USE-SITE READ)', () => {
    expect(idea7Src).toMatch(/buildForm3CEBSnapshot/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// §H · Institutional integrity (AC#17, #18, #19, #20)
// ═════════════════════════════════════════════════════════════════════
describe('institutional · sibling-register + audit-trail types', () => {
  it('sibling count >= 165 (snapshot drifts as later sprints add engines)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(165);
  });

  it('internal-pricing-engine appears exactly once', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'internal-pricing-engine');
    expect(matches.length).toBe(1);
  });

  it('idea-7-transfer-pricing-audit-engine appears exactly once', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'idea-7-transfer-pricing-audit-engine');
    expect(matches.length).toBe(1);
  });

  it('comply360-tier2-extensions-engine remains exactly once (no double-insert)', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'comply360-tier2-extensions-engine');
    expect(matches.length).toBe(1);
  });

  it('command-center page registers fincore-internal-pricing-hub module', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/features/command-center/pages/CommandCenterPage.tsx'),
      'utf8',
    );
    expect(src).toMatch(/fincore-internal-pricing-hub/);
    expect(src).toMatch(/InternalPricingHubPage/);
  });
});
