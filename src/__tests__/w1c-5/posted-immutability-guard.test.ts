/**
 * @file        posted-immutability-guard.test.ts
 * @sprint      W1C-5 · Block 4a · audit B-03 HIGH
 * @purpose     Attack-test: in-place mutation of posted/cancelled vouchers MUST throw.
 *              Draft mutations remain unaffected. CGST Rule 56(8).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { postVoucher, vouchersKey } from '@/lib/fincore-engine';
import { saveCycleAdjustmentVouchers, loadCycleAdjustmentVouchers } from '@/lib/cycle-count-voucher-engine';
import type { Voucher } from '@/types/voucher';
import type { CycleAdjustmentVoucher } from '@/types/cycle-count-voucher';

const ENTITY = 'W1C5IMM';

function makeBalancedVoucher(id: string): Voucher {
  return {
    id,
    voucher_no: `JV/25-26/${id}`,
    base_voucher_type: 'Journal',
    voucher_type_name: 'Journal',
    entity_id: ENTITY,
    date: new Date().toISOString().slice(0, 10),
    status: 'draft',
    narration: 'imm test',
    party_id: null,
    party_name: null,
    ledger_lines: [
      { ledger_id: 'l1', ledger_code: 'L1', ledger_name: 'Cash', ledger_group_code: 'CA',
        dr_amount: 100, cr_amount: 0, narration: '', bill_ref: null },
      { ledger_id: 'l2', ledger_code: 'L2', ledger_name: 'Sales', ledger_group_code: 'SA',
        dr_amount: 0, cr_amount: 100, narration: '', bill_ref: null },
    ] as never,
    inventory_lines: [],
    posted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Voucher;
}

describe('W1C-5 · Block 4a · Posted-record immutability (attack-test)', () => {
  beforeEach(() => { localStorage.clear(); });

  it('THROWS when re-posting an already-posted voucher in place', () => {
    const v = makeBalancedVoucher('v-imm-1');
    postVoucher(v, ENTITY);
    // Attempt to mutate-and-repost the SAME id (status now 'posted' on disk)
    const mutated = { ...v, narration: 'TAMPERED' };
    expect(() => postVoucher(mutated, ENTITY)).toThrow(
      /cannot be mutated in place.*CGST Rule 56\(8\)/,
    );
  });

  it('ALLOWS posting a fresh draft (no prior on-disk record)', () => {
    const v = makeBalancedVoucher('v-imm-2');
    expect(() => postVoucher(v, ENTITY)).not.toThrow();
    const stored = JSON.parse(localStorage.getItem(vouchersKey(ENTITY)) || '[]');
    expect(stored.length).toBe(1);
    expect(stored[0].status).toBe('posted');
  });

  it('cycle-count engine THROWS on in-place edit of posted adjustment voucher', () => {
    const posted: CycleAdjustmentVoucher = {
      id: 'cav-1',
      voucher_no: 'CAV/0001',
      entity_id: ENTITY,
      status: 'posted',
      related_cycle_count_id: 'cc-1',
      related_cycle_count_no: 'CC/0001',
      voucher_date: '2026-04-01',
      lines: [],
      total_lines: 0,
      net_value_inr: 0,
      posted_at: new Date().toISOString(),
      cancelled_at: null,
      cancellation_reason: null,
      created_by: 'sys',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never;
    saveCycleAdjustmentVouchers(ENTITY, [posted]); // seed on disk
    // Attempt to mutate: incoming status still 'posted' but content changed
    const tampered = { ...posted, net_value_inr: 999999 };
    expect(() => saveCycleAdjustmentVouchers(ENTITY, [tampered])).toThrow(
      /cannot be mutated in place.*CGST Rule 56\(8\)/,
    );
    // Original on disk unchanged
    const after = loadCycleAdjustmentVouchers(ENTITY);
    expect(after[0].net_value_inr).toBe(0);
  });

  it('cycle-count engine ALLOWS legitimate cancel transition (posted → cancelled)', () => {
    const posted: CycleAdjustmentVoucher = {
      id: 'cav-2',
      voucher_no: 'CAV/0002',
      entity_id: ENTITY,
      status: 'posted',
      related_cycle_count_id: 'cc-2',
      related_cycle_count_no: 'CC/0002',
      voucher_date: '2026-04-01',
      lines: [],
      total_lines: 0,
      net_value_inr: 0,
      posted_at: new Date().toISOString(),
      cancelled_at: null,
      cancellation_reason: null,
      created_by: 'sys',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never;
    saveCycleAdjustmentVouchers(ENTITY, [posted]);
    const cancelled = { ...posted, status: 'cancelled' as const, cancelled_at: new Date().toISOString() };
    expect(() => saveCycleAdjustmentVouchers(ENTITY, [cancelled])).not.toThrow();
  });
});
