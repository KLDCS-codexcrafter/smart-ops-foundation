/**
 * @file        src/lib/internal-pricing-engine.ts
 * @sibling     NEW @ Sprint 99 · T-Phase-6.A.0.4 · Arc 0 Master Data Foundation
 * @realizes    4 inter-scope price lists (6 rule_types · 7 pricing methods) across
 *              the 7-tier hierarchy. Effective-dating via idea-1 Time-Travel Masters
 *              (no re-implementation). Decimal-safe (FR-31, decimal-helpers).
 * @reads-from  idea-1-time-travel-masters-engine (USE-SITE) · master-replication-engine (type only)
 * @audit       Owns + logs `pricing_rule_change` (module: 'mca-roc').
 * @sprint      T-Phase-6.A.0.4 · Block 2
 * [JWT] Phase 8: GET /api/internal-pricing/rules · POST /api/internal-pricing/rules
 */
import { dAdd, dSub, dPct, round2 } from '@/lib/decimal-helpers';
import { logAudit } from '@/lib/audit-trail-engine';
import { registerAuditEntityType } from '@/lib/comply360-audit-trail-aggregator-engine';
import { recordMasterVersion, getMasterAsOf } from '@/lib/idea-1-time-travel-masters-engine';
import type { MasterType } from '@/lib/master-replication-engine';

export const READS_FROM = {
  engines: ['idea-1-time-travel-masters-engine'],
  storage_keys: ['erp_internal_pricing_rules'],
} as const;

registerAuditEntityType({
  id: 'pricing_rule_change',
  module: 'mca-roc',
  label: 'Internal Pricing Rule Change',
});

// idea-1 stores history under master_type; cast since `pricing_rule` is a
// pricing-domain virtual key (storage path: erp_master_versions_pricing_rule_<id>)
const PRICING_RULE_MASTER_TYPE = 'pricing_rule' as unknown as MasterType;

export type PricingRuleType =
  | 'inter_entity' | 'inter_branch' | 'inter_division'
  | 'inter_department' | 'inter_project' | 'inter_site';

export type PricingMethod =
  | 'cost_plus_markup' | 'arms_length_market' | 'standard_cost'
  | 'budget_rate' | 'lowest_external_rate' | 'mrp_minus_discount'
  | 'actual_cost_plus_overhead';

export const PRICING_METHODS: readonly PricingMethod[] = [
  'cost_plus_markup', 'arms_length_market', 'standard_cost',
  'budget_rate', 'lowest_external_rate', 'mrp_minus_discount',
  'actual_cost_plus_overhead',
] as const;

export const PRICING_RULE_TYPES: readonly PricingRuleType[] = [
  'inter_entity', 'inter_branch', 'inter_division',
  'inter_department', 'inter_project', 'inter_site',
] as const;

export interface PricingScope {
  entity_id: string;
  branch_id?: string;
  division_id?: string;
  department_id?: string;
  project_id?: string;
  site_id?: string;
}

export interface InternalPricingRule {
  pricing_rule_id: string;
  rule_type: PricingRuleType;
  from_scope: PricingScope;
  to_scope: PricingScope;
  item_scope: 'all' | 'specific_items' | 'item_category' | 'service_category';
  item_key: string;                 // 'ALL' for item_scope='all'; otherwise item id / category
  pricing_method: PricingMethod;
  markup_percentage: number;
  overhead_allocation_pct: number;
  variance_handling: 'absorb_at_source' | 'split_50_50' | 'transfer_to_buying';
  // Inputs feeding the method computation (decimal-safe). Optional per method.
  base_cost: number;
  market_rate: number;
  standard_cost: number;
  budget_rate: number;
  mrp: number;
  lowest_external_rate: number;
  effective_from: string;            // YYYY-MM-DD · feeds idea-1 effective-dating
  effective_to: string | null;
  approval_workflow: 'auto' | 'cfo_approval' | 'tp_committee';
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = 'erp_internal_pricing_rules';

function readRules(): InternalPricingRule[] {
  try {
    // [JWT] GET /api/internal-pricing/rules
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as InternalPricingRule[]) : [];
  } catch { return []; }
}

function writeRules(rules: InternalPricingRule[]): void {
  try {
    // [JWT] POST /api/internal-pricing/rules
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch { /* quota silent */ }
}

/** Pure pricing-method calculator. Decimal-safe (no raw float). */
export function computePriceForMethod(rule: InternalPricingRule): number {
  switch (rule.pricing_method) {
    case 'cost_plus_markup':
      return round2(dAdd(rule.base_cost, dPct(rule.base_cost, rule.markup_percentage)));
    case 'arms_length_market':
      return round2(rule.market_rate);
    case 'standard_cost':
      return round2(rule.standard_cost);
    case 'budget_rate':
      return round2(rule.budget_rate);
    case 'lowest_external_rate':
      return round2(rule.lowest_external_rate);
    case 'mrp_minus_discount':
      return round2(dSub(rule.mrp, dPct(rule.mrp, rule.markup_percentage)));
    case 'actual_cost_plus_overhead':
      return round2(dAdd(rule.base_cost, dPct(rule.base_cost, dAdd(rule.markup_percentage, rule.overhead_allocation_pct))));
    default:
      return 0;
  }
}

/** Idempotent upsert by pricing_rule_id. Records an idea-1 version. Audited. */
export function upsertPricingRule(input: InternalPricingRule): InternalPricingRule {
  const all = readRules();
  const idx = all.findIndex((r) => r.pricing_rule_id === input.pricing_rule_id);
  const now = new Date().toISOString();
  const next: InternalPricingRule = {
    ...input,
    effective_from: input.effective_from.slice(0, 10),
    effective_to: input.effective_to ? input.effective_to.slice(0, 10) : null,
    created_at: idx >= 0 ? all[idx].created_at : (input.created_at || now),
    updated_at: now,
  };
  const before = idx >= 0 ? all[idx] : null;
  const updated = idx >= 0 ? all.map((r, i) => (i === idx ? next : r)) : [...all, next];
  writeRules(updated);

  // Effective-dated history via idea-1 (no reimplementation).
  recordMasterVersion({
    master_type: PRICING_RULE_MASTER_TYPE,
    master_key: next.pricing_rule_id,
    snapshot: next as unknown as Record<string, unknown>,
    effective_from_date: next.effective_from,
    changed_by: next.from_scope.entity_id || 'system',
  });

  logAudit({
    entityCode: next.from_scope.entity_id || 'UNKNOWN',
    action: idx >= 0 ? 'update' : 'create',
    entityType: 'pricing_rule_change',
    recordId: next.pricing_rule_id,
    recordLabel: `${next.rule_type}/${next.pricing_method}/${next.item_key}`,
    beforeState: before as unknown as Record<string, unknown> | null,
    afterState: next as unknown as Record<string, unknown>,
    sourceModule: 'internal-pricing-engine',
  });

  return next;
}

function scopeMatches(a: PricingScope, b: PricingScope): boolean {
  const keys: (keyof PricingScope)[] = [
    'entity_id', 'branch_id', 'division_id',
    'department_id', 'project_id', 'site_id',
  ];
  for (const k of keys) {
    const av = a[k];
    const bv = b[k];
    if (av === undefined || bv === undefined) continue;
    if (av !== bv) return false;
  }
  return a.entity_id === b.entity_id;
}

export interface ResolvePriceInput {
  rule_type: PricingRuleType;
  from_scope: PricingScope;
  to_scope: PricingScope;
  item_key: string;
  as_of_date?: string;
}

export interface ResolvedPrice {
  price: number;
  method: PricingMethod;
  rule_id: string;
  variance_handling: InternalPricingRule['variance_handling'];
  effective_from: string;
}

export function resolvePrice(input: ResolvePriceInput): ResolvedPrice | null {
  const asOf = input.as_of_date ? input.as_of_date.slice(0, 10) : null;
  const candidates = readRules().filter((r) =>
    r.rule_type === input.rule_type &&
    scopeMatches(r.from_scope, input.from_scope) &&
    scopeMatches(r.to_scope, input.to_scope) &&
    (r.item_scope === 'all' || r.item_key === input.item_key)
  );
  if (candidates.length === 0) return null;

  let chosen: InternalPricingRule | null = null;

  if (asOf) {
    // Time-travel via idea-1: pick the historical snapshot effective on asOf.
    for (const c of candidates) {
      const ver = getMasterAsOf({
        master_type: PRICING_RULE_MASTER_TYPE,
        master_key: c.pricing_rule_id,
        as_of_date: asOf,
      });
      if (ver) {
        chosen = ver.snapshot as unknown as InternalPricingRule;
        break;
      }
    }
  } else {
    // Current: newest rule whose window covers today.
    const today = new Date().toISOString().slice(0, 10);
    const active = candidates.filter((c) =>
      c.effective_from <= today && (c.effective_to === null || c.effective_to >= today)
    );
    chosen = (active.length > 0 ? active : candidates)
      .slice()
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
  }

  if (!chosen) return null;

  return {
    price: computePriceForMethod(chosen),
    method: chosen.pricing_method,
    rule_id: chosen.pricing_rule_id,
    variance_handling: chosen.variance_handling,
    effective_from: chosen.effective_from,
  };
}

export function listPricingRules(filter?: Partial<InternalPricingRule>): InternalPricingRule[] {
  const all = readRules();
  if (!filter) return all;
  return all.filter((r) => {
    for (const [k, v] of Object.entries(filter)) {
      if (v === undefined) continue;
      if ((r as unknown as Record<string, unknown>)[k] !== v) return false;
    }
    return true;
  });
}

export function _clearPricingRulesForTests(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
