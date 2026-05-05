/**
 * @file        store-hub-workflow.test.ts
 * @sprint      T-Phase-1.2.6f-d-2-card7-7-pre-2 · Block J · Q7=a
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { promoteReorderToIndent } from '@/lib/reorder-indent-bridge';
import type { ReorderSuggestion } from '@/lib/store-hub-engine';
import { materialIndentsKey } from '@/types/material-indent';

const ENTITY = 'TEST-CARD7P2';

const sampleSuggestion = (overrides: Partial<ReorderSuggestion> = {}): ReorderSuggestion => ({
  item_id: 'item-1', item_name: 'Steel Rod 12mm',
  godown_id: 'gd-main', godown_name: 'Main Stores',
  current_balance: 50, reorder_level: 200, reorder_qty: 400, shortfall: 150,
  uom: 'nos', urgency: 'critical', safety_stock: 100,
  ...overrides,
});

beforeEach(() => { localStorage.clear(); });

describe('Card #7 7-pre-2 · Store Hub Workflow + Integration', () => {
  it('promoteReorderToIndent creates MaterialIndent with MI prefix (D-385 · D-128 preserved)', () => {
    const r = promoteReorderToIndent({
      suggestion: sampleSuggestion(),
      department_id: 'production', department_name: 'Production',
      notes: 'urgent', created_by: 'stores-mgr',
    }, ENTITY);
    expect(r.ok).toBe(true);
    expect(r.indent_id).toBeTruthy();
    expect(r.voucher_no).toMatch(/MI\/.+\/.+/);
  });

  it('promoteReorderToIndent persists to materialIndentsKey (D-385 · D-194 entity-scoped)', () => {
    promoteReorderToIndent({
      suggestion: sampleSuggestion(),
      department_id: 'production', department_name: 'Production',
      notes: '', created_by: 'stores-mgr',
    }, ENTITY);
    const stored = JSON.parse(localStorage.getItem(materialIndentsKey(ENTITY)) ?? '[]');
    expect(stored.length).toBe(1);
    expect(stored[0].lines.length).toBe(1);
    expect(stored[0].lines[0].item_id).toBe('item-1');
    expect(stored[0].lines[0].qty).toBe(400);
  });

  it('promoteReorderToIndent with shortfall <= 0 returns ok=false (validation)', () => {
    const r = promoteReorderToIndent({
      suggestion: sampleSuggestion({ shortfall: 0 }),
      department_id: 'production', department_name: 'Production',
      notes: '', created_by: 'stores-mgr',
    }, ENTITY);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('no-shortfall');
  });

  it('promoteReorderToIndent stores reference_no with REORDER provenance (D-385 audit)', () => {
    promoteReorderToIndent({
      suggestion: sampleSuggestion(),
      department_id: 'production', department_name: 'Production',
      notes: '', created_by: 'stores-mgr',
    }, ENTITY);
    const stored = JSON.parse(localStorage.getItem(materialIndentsKey(ENTITY)) ?? '[]');
    expect(stored[0].reference_no).toMatch(/^REORDER:/);
  });

  it('multiple promotions create separate indents (idempotency · cross-card consumption)', () => {
    const r1 = promoteReorderToIndent({
      suggestion: sampleSuggestion({ item_id: 'i-A' }),
      department_id: 'production', department_name: 'Production',
      notes: '', created_by: 'stores-mgr',
    }, ENTITY);
    const r2 = promoteReorderToIndent({
      suggestion: sampleSuggestion({ item_id: 'i-B' }),
      department_id: 'qc', department_name: 'QC',
      notes: '', created_by: 'stores-mgr',
    }, ENTITY);
    expect(r1.ok && r2.ok).toBe(true);
    expect(r1.indent_id).not.toBe(r2.indent_id);
    const stored = JSON.parse(localStorage.getItem(materialIndentsKey(ENTITY)) ?? '[]');
    expect(stored.length).toBe(2);
  });
});
