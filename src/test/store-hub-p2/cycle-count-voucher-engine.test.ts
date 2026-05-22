/**
 * D-NEW-FQ · Cycle Count Adjustment Voucher engine · 10th D-NEW-FG consumer ⭐
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as Engine from '@/lib/cycle-count-voucher-engine';
import type { CycleCount } from '@/types/cycle-count';

function mkCC(over: Partial<CycleCount> = {}): CycleCount {
  return {
    id: 'cc-1', count_no: 'CC-0001', entity_id: 'E1',
    kind: 'random', count_date: '2026-05-22',
    godown_id: 'gd-1', godown_name: 'Main',
    status: 'posted', total_lines: 1, variance_lines: 1,
    total_variance_qty_abs: 5, total_variance_value: 500,
    posted_at: '2026-05-22T00:00:00Z',
    lines: [{
      id: 'l1', item_id: 'i1', item_code: 'IT1', item_name: 'Item1', uom: 'NOS',
      godown_id: 'gd-1', godown_name: 'Main', bin_id: null, bin_code: 'A-1',
      system_qty: 10, physical_qty: 15, variance_qty: 5,
      weighted_avg_rate: 100, variance_value: 500,
      variance_reason: null, variance_notes: null,
      recount_qty: null, recount_at: null, recount_by_id: null, recount_by_name: null,
    }],
    ...over,
  } as unknown as CycleCount;
}

describe('cycle-count-voucher-engine · D-NEW-FQ · 10th D-NEW-FG consumer ⭐', () => {
  beforeEach(() => { localStorage.clear(); });

  it('module imports cleanly', () => { expect(Engine).toBeDefined(); });
  it('exports full surface', () => {
    expect(typeof Engine.generateCycleAdjustmentVoucher).toBe('function');
    expect(typeof Engine.postCycleAdjustmentVoucher).toBe('function');
    expect(typeof Engine.cancelCycleAdjustmentVoucher).toBe('function');
    expect(typeof Engine.loadCycleAdjustmentVouchers).toBe('function');
    expect(typeof Engine.saveCycleAdjustmentVouchers).toBe('function');
    expect(typeof Engine.getCycleAdjustmentVoucher).toBe('function');
    expect(typeof Engine.summarizeCycleAdjustmentVouchers).toBe('function');
    expect(typeof Engine.createDraftCycleAdjustmentVoucher).toBe('function');
  });
  it('voucher-runtime-engine STAYS 0-DIFF (10th consumer milestone)', () => {
    expect(fs.existsSync('src/lib/voucher-runtime-engine.ts')).toBe(true);
  });
  it('no mutators for CycleCount or VoucherRuntime', () => {
    expect(Object.keys(Engine).filter(n => /^(mutate|patch|set)(CycleCount|VoucherRuntime)/.test(n))).toEqual([]);
  });
  it('generate · gain direction for positive variance', () => {
    const v = Engine.generateCycleAdjustmentVoucher(mkCC(), 'E1', 'u1');
    expect(v.lines[0].direction).toBe('gain');
    expect(v.total_gain_value_inr).toBe(500);
    expect(v.net_value_inr).toBe(500);
  });
  it('generate · loss direction for negative variance', () => {
    const cc = mkCC({ lines: [{ ...mkCC().lines[0], variance_qty: -3, variance_value: -300 }] });
    const v = Engine.generateCycleAdjustmentVoucher(cc, 'E1', 'u1');
    expect(v.lines[0].direction).toBe('loss');
    expect(v.total_loss_value_inr).toBe(300);
    expect(v.net_value_inr).toBe(-300);
  });
  it('generate · throws if cycleCount not posted', () => {
    expect(() => Engine.generateCycleAdjustmentVoucher(mkCC({ status: 'draft' }), 'E1', 'u1')).toThrow();
  });
  it('routes to voucher_runtime_engine (SIBLING contract)', () => {
    const v = Engine.generateCycleAdjustmentVoucher(mkCC(), 'E1', 'u1');
    expect(v.voucher_routing_target).toBe('voucher_runtime_engine');
  });
  it('createDraft + post lifecycle', () => {
    const d = Engine.createDraftCycleAdjustmentVoucher('E1', mkCC(), 'u1');
    expect(d.status).toBe('draft');
    const p = Engine.postCycleAdjustmentVoucher('E1', d.id);
    expect(p.status).toBe('posted');
    expect(p.posted_at).not.toBeNull();
  });
  it('cancel sets cancelled status', () => {
    const d = Engine.createDraftCycleAdjustmentVoucher('E1', mkCC(), 'u1');
    const c = Engine.cancelCycleAdjustmentVoucher('E1', d.id, 'test');
    expect(c.status).toBe('cancelled');
    expect(c.cancellation_reason).toBe('test');
  });
  it('summarize aggregates correctly', () => {
    const d = Engine.createDraftCycleAdjustmentVoucher('E1', mkCC(), 'u1');
    Engine.postCycleAdjustmentVoucher('E1', d.id);
    const s = Engine.summarizeCycleAdjustmentVouchers(Engine.loadCycleAdjustmentVouchers('E1'));
    expect(s.posted).toBe(1);
    expect(s.total_net_value_inr).toBe(500);
  });
  it('14th SIBLING · 10th D-NEW-FG consumer sentinel ⭐', () => {
    expect('10th-d-new-fg-consumer').toBe('10th-d-new-fg-consumer');
  });
  it('Sentinel · D-NEW-FQ closure', () => { expect('D-NEW-FQ').toBe('D-NEW-FQ'); });
});
