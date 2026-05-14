/**
 * Block 4 · inventory cluster · Precision Arc Stage 3
 * Verifies money/qty resolver precision and drift-free arithmetic
 * for representative migrated paths in OpeningStockEntry, StorageMatrix,
 * MaterialIssueNote, GRNEntry, ConsumptionEntry, ItemCraft.
 */
import { describe, it, expect } from 'vitest';
import { roundTo, dMul, dAdd, resolveMoneyPrecision, resolveQtyPrecision } from '@/lib/decimal-helpers';

describe('Precision Arc · Stage 3 · Block 4 · inventory migrations', () => {
  const mp = resolveMoneyPrecision(null, null);
  const qp = resolveQtyPrecision(undefined);

  it('contract defaults: money=2dp, qty=2dp (no entity/UoM context)', () => {
    expect(mp).toBe(2);
    expect(qp).toBe(2);
  });

  it('MaterialIssueNote/ConsumptionEntry/GRNEntry rate input rounds to 2dp', () => {
    // simulate parseFloat input + roundTo wrap
    expect(roundTo(parseFloat('123.456') || 0, mp)).toBe(123.46);
    expect(roundTo(parseFloat('') || 0, mp)).toBe(0);
    expect(roundTo(parseFloat('1.005') || 0, mp)).toBe(1.01); // ROUND_HALF_UP
  });

  it('StorageMatrix total_capacity preserves ||null fallback (qty)', () => {
    expect(roundTo(parseFloat('100.5'), qp) || null).toBe(100.5);
    expect(roundTo(parseFloat(''), qp) || null).toBe(null);   // NaN → falsy → null
    expect(roundTo(parseFloat('0'), qp) || null).toBe(null);   // 0 → falsy → null (preserved)
  });

  it('StorageMatrix monthly_rent preserves ||null fallback (money)', () => {
    expect(roundTo(parseFloat('25000.555'), mp) || null).toBe(25000.56);
    expect(roundTo(parseFloat(''), mp) || null).toBe(null);
  });

  it('ItemCraft net_weight / gross_weight (qty) rounds to 2dp', () => {
    expect(roundTo(parseFloat('1.234'), qp) || null).toBe(1.23);
    expect(roundTo(parseFloat('1.005'), qp) || null).toBe(1.01);
  });

  it('OpeningStockEntry totalValue: drift-free batch aggregation', () => {
    // 0.1 × 0.2 × 1000 lines naive would drift; dMul/dAdd does not
    let v = 0;
    for (let i = 0; i < 1000; i++) {
      const q = roundTo(parseFloat('0.1') || 0, qp); // 0.10
      const r = roundTo(parseFloat('0.20') || 0, mp);
      v = dAdd(v, dMul(q, r));
    }
    expect(roundTo(v, mp)).toBe(20);
  });

  it('OpeningStockEntry post-path: value = qty × rate via dMul + roundTo', () => {
    const qty = roundTo(parseFloat('3.333') || 0, qp);   // 3.33
    const rate = roundTo(parseFloat('99.999') || 0, mp); // 100.00
    const value = roundTo(dMul(qty, rate), mp);
    expect(value).toBe(333);
  });

  it('OpeningStockEntry batchQtyByGodown aggregator: drift-free sum', () => {
    let acc = 0;
    ['0.1', '0.2', '0.3', '0.4'].forEach(s => {
      acc = dAdd(acc, roundTo(parseFloat(s) || 0, qp));
    });
    expect(acc).toBe(1);
  });
});
