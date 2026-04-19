/**
 * scheme-seed.ts — Realistic demo schemes for first-run UX
 */

import type { Scheme } from '@/types/scheme';

export function seedDemoSchemes(entityCode: string): Scheme[] {
  const now = new Date();
  const nowIso = now.toISOString();
  const endOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0).toISOString();
  const endOfYear = new Date(now.getFullYear(), 11, 31).toISOString();

  return [
    {
      id: 'scm-diwali', entity_id: entityCode, code: 'DIWALI2026',
      name: 'Diwali Slab Discount', description: '5 / 10 / 15% slab discount on rice',
      type: 'slab_discount', status: 'active',
      valid_from: nowIso, valid_until: endOfYear,
      scope: { audience: 'both', item_ids: ['item-rice'] },
      payload: { slabs: [
        { min_qty: 50,  discount_percent: 5 },
        { min_qty: 100, discount_percent: 10 },
        { min_qty: 250, discount_percent: 15 },
      ] },
      priority: 10, stackable: false,
      max_uses_per_customer: null,
      created_at: nowIso, updated_at: nowIso, created_by: 'system',
    },
    {
      id: 'scm-atta10', entity_id: entityCode, code: 'ATTA1FREE',
      name: 'Buy 10 Atta Get 1 Free',
      description: '10 bags atta unlocks 1 free bag',
      type: 'buy_n_get_m', status: 'active',
      valid_from: nowIso, valid_until: endOfQuarter,
      scope: { audience: 'distributor' },
      payload: { trigger_item_id: 'item-atta', trigger_qty: 10,
        reward_item_id: 'item-atta', reward_qty: 1 },
      priority: 8, stackable: true,
      max_uses_per_customer: null,
      created_at: nowIso, updated_at: nowIso, created_by: 'system',
    },
    {
      id: 'scm-bigorder', entity_id: entityCode, code: 'BIGORDER5K',
      name: '₹500 off ₹50k+ orders',
      description: 'Flat ₹500 discount when order ≥ ₹50,000',
      type: 'flat_amount', status: 'active',
      valid_from: nowIso, valid_until: endOfQuarter,
      scope: { audience: 'both', min_order_value_paise: 5_000_000 },
      payload: { discount_paise: 50_000 },
      priority: 5, stackable: true,
      max_uses_per_customer: null,
      created_at: nowIso, updated_at: nowIso, created_by: 'system',
    },
    {
      id: 'scm-gold8pc', entity_id: entityCode, code: 'GOLDTIER',
      name: 'Gold Tier 8% Off',
      description: '8% flat discount for Gold distributors',
      type: 'flat_percent', status: 'active',
      valid_from: nowIso, valid_until: null,
      scope: { audience: 'distributor', distributor_tiers: ['gold'] },
      payload: { discount_percent: 8 },
      priority: 3, stackable: false,
      max_uses_per_customer: null,
      created_at: nowIso, updated_at: nowIso, created_by: 'system',
    },
    {
      id: 'scm-qps-q4', entity_id: entityCode, code: 'QPS-Q4',
      name: 'Q4 Quarterly Performance Scheme',
      description: 'Hit 500 units in Q4 → 6% rebate on total period value',
      type: 'qps_target', status: 'active',
      valid_from: nowIso, valid_until: endOfQuarter,
      scope: { audience: 'distributor', distributor_tiers: ['gold', 'silver'] },
      payload: { period_start: nowIso, period_end: endOfQuarter,
        target_qty: 500, rebate_percent: 6 },
      priority: 2, stackable: true,
      max_uses_per_customer: null,
      created_at: nowIso, updated_at: nowIso, created_by: 'system',
    },
  ];
}
