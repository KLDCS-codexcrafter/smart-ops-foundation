/**
 * multi-sourcing-strategy-engine.test.ts — Sprint T-Phase-1.2.6f-d-2 · Block C
 * Validates Q3=A 3 strategies and Q4=A pure-function discipline.
 */
import { describe, expect, it } from 'vitest';
import {
  recommendStrategy,
  type VendorPoolEntry,
} from '@/lib/multi-sourcing-strategy-engine';
import type { MaterialIndent } from '@/types/material-indent';

const E = 'TST';

function buildIndent(value: number, lineCount = 1, category = 'raw_material'): MaterialIndent {
  return {
    id: 'mi-1',
    entity_id: 'e1',
    voucher_type_id: 'vt-mi',
    voucher_no: 'MI/202605/0001',
    date: '2026-05-04',
    branch_id: 'br1',
    division_id: 'd1',
    originating_department_id: 'dept-1',
    originating_department_name: 'Production',
    cost_center_id: 'cc-1',
    category: category as MaterialIndent['category'],
    sub_type: 'standard',
    priority: 'normal',
    requested_by_user_id: 'u-1',
    requested_by_name: 'Test User',
    hod_user_id: 'hod-1',
    project_id: null,
    preferred_vendor_id: null,
    payment_terms: null,
    lines: Array.from({ length: lineCount }, (_, i) => ({
      id: `l-${i}`,
      line_no: i + 1,
      item_id: `item-${i}`,
      item_name: `Item ${i}`,
      description: '',
      uom: 'NOS',
      qty: 1,
      current_stock_qty: 0,
      estimated_rate: value / lineCount,
      estimated_value: value / lineCount,
      required_date: '2026-05-15',
      schedule_qty: null,
      schedule_date: null,
      remarks: '',
      target_godown_id: 'g1',
      target_godown_name: 'Main',
      is_stocked: true,
      stock_check_status: 'pending' as const,
      store_action: null,
      store_actor_id: null,
      store_action_at: null,
      parent_indent_line_id: null,
      cascade_reason: null,
    })),
    total_estimated_value: value,
    status: 'submitted',
    approval_tier: 1,
    pending_approver_user_id: null,
    approval_history: [],
    parent_indent_id: null,
    cascade_reason: null,
    created_at: new Date().toISOString(),
    created_by: 'u-1',
    updated_at: new Date().toISOString(),
    updated_by: 'u-1',
  };
}

const PREFERRED_VENDOR: VendorPoolEntry = {
  id: 'v-1', name: 'Acme Suppliers', status: 'active', is_preferred: true,
  categories: ['raw_material', 'general'],
};
function buildPool(n: number, preferred = false): VendorPoolEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `v-${i}`,
    name: `Vendor ${i}`,
    status: 'active',
    is_preferred: preferred && i === 0,
    categories: ['raw_material'],
  }));
}

describe('multi-sourcing-strategy-engine · recommendStrategy', () => {
  it('returns single_source for low-value indent with a preferred eligible vendor', () => {
    const indent = buildIndent(25_000);
    const rec = recommendStrategy(indent, [PREFERRED_VENDOR, ...buildPool(2)], E);
    expect(rec.strategy).toBe('single_source');
    expect(rec.vendor_count_recommended).toBe(1);
    expect(rec.confidence).toBe('high');
    expect(rec.reasoning.length).toBeGreaterThanOrEqual(1);
  });

  it('returns multi_quote in the standard ₹50K – ₹5L range', () => {
    const indent = buildIndent(150_000);
    const rec = recommendStrategy(indent, buildPool(4), E);
    expect(rec.strategy).toBe('multi_quote');
    expect(rec.vendor_count_recommended).toBeGreaterThan(0);
    expect(rec.est_savings_pct).toBe(4.5);
  });

  it('returns reverse_auction for ≥ ₹5L value', () => {
    const indent = buildIndent(750_000);
    const rec = recommendStrategy(indent, buildPool(6), E);
    expect(rec.strategy).toBe('reverse_auction');
    expect(rec.est_savings_pct).toBe(8.5);
    expect(rec.vendor_count_recommended).toBeGreaterThanOrEqual(5);
  });

  it('downgrades multi_quote confidence to low when fewer than 3 eligible vendors', () => {
    const indent = buildIndent(150_000);
    const rec = recommendStrategy(indent, buildPool(2), E);
    expect(rec.strategy).toBe('multi_quote');
    expect(rec.confidence).toBe('low');
    expect(rec.warnings.some((w) => w.includes('expand vendor pool'))).toBe(true);
  });

  it('emits warnings + low confidence when no eligible vendors', () => {
    const indent = buildIndent(150_000);
    const rec = recommendStrategy(indent, [], E);
    expect(rec.confidence).toBe('low');
    expect(rec.warnings.some((w) => w.toLowerCase().includes('no eligible vendors'))).toBe(true);
  });
});
