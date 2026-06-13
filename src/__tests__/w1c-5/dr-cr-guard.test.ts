/**
 * @file        dr-cr-guard.test.ts
 * @sprint      W1C-5 · Block 1 · audit B2 HIGH
 * @purpose     Attack-test: unbalanced journal must NOT post. Wires the dead Dr=Cr guard.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { postVoucher } from '@/lib/fincore-engine';
import type { Voucher } from '@/types/voucher';

const ENTITY = 'W1C5DRCR';

function makeVoucher(overrides: Partial<Voucher> = {}): Voucher {
  return {
    id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    voucher_no: 'JV/25-26/0001',
    base_voucher_type: 'Journal',
    voucher_type_name: 'Journal',
    entity_id: ENTITY,
    date: new Date().toISOString().slice(0, 10),
    status: 'draft',
    narration: 'w1c5 dr=cr test',
    party_id: null,
    party_name: null,
    ledger_lines: [],
    inventory_lines: [],
    posted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as Voucher;
}

describe('W1C-5 · Block 1 · Dr=Cr guard (attack-test)', () => {
  beforeEach(() => { localStorage.clear(); });

  it('REJECTS unbalanced journal (Dr 100 / Cr 90) with imbalance message', () => {
    const v = makeVoucher({
      ledger_lines: [
        { ledger_id: 'l1', ledger_code: 'L1', ledger_name: 'Cash', ledger_group_code: 'CA',
          dr_amount: 100, cr_amount: 0, narration: '', bill_ref: null } as never,
        { ledger_id: 'l2', ledger_code: 'L2', ledger_name: 'Sales', ledger_group_code: 'IN',
          dr_amount: 0, cr_amount: 90, narration: '', bill_ref: null } as never,
      ],
    });
    expect(() => postVoucher(v, ENTITY)).toThrow(/not balanced|rejected/i);
  });

  it('ACCEPTS balanced journal (Dr 100 / Cr 100)', () => {
    const v = makeVoucher({
      ledger_lines: [
        { ledger_id: 'l1', ledger_code: 'L1', ledger_name: 'Cash', ledger_group_code: 'CA',
          dr_amount: 100, cr_amount: 0, narration: '', bill_ref: null } as never,
        { ledger_id: 'l2', ledger_code: 'L2', ledger_name: 'Sales', ledger_group_code: 'IN',
          dr_amount: 0, cr_amount: 100, narration: '', bill_ref: null } as never,
      ],
    });
    expect(() => postVoucher(v, ENTITY)).not.toThrow();
  });

  it('ACCEPTS voucher without ledger_lines (non-journal types unaffected)', () => {
    const v = makeVoucher({
      base_voucher_type: 'Delivery Note',
      voucher_type_name: 'Delivery Note',
      ledger_lines: [],
    });
    expect(() => postVoucher(v, ENTITY)).not.toThrow();
  });
});
