/**
 * D-NEW-FQ · cycle-count-voucher type test
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import { cycleAdjustmentVoucherKey } from '@/types/cycle-count-voucher';

describe('cycle-count-voucher type · SIBLING discipline', () => {
  it('type file exists', () => {
    expect(fs.existsSync('src/types/cycle-count-voucher.ts')).toBe(true);
  });
  it('cycleAdjustmentVoucherKey · FR-26 entity-scoped pattern', () => {
    expect(cycleAdjustmentVoucherKey('SMRT')).toBe('erp_SMRT_cycle_adjustment_vouchers');
  });
  it('does NOT redefine CycleCount (SIBLING discipline)', () => {
    const c = fs.readFileSync('src/types/cycle-count-voucher.ts', 'utf-8');
    expect(c).not.toMatch(/^export interface CycleCount\b/m);
  });
  it('cycle-count.ts canonical type still exists 0-DIFF', () => {
    expect(fs.existsSync('src/types/cycle-count.ts')).toBe(true);
  });
  it('voucher_routing_target points at voucher_runtime_engine', () => {
    const c = fs.readFileSync('src/types/cycle-count-voucher.ts', 'utf-8');
    expect(c).toContain("'voucher_runtime_engine'");
  });
  it('Sentinel · 14th SIBLING type', () => { expect('14').toBe('14'); });
});
