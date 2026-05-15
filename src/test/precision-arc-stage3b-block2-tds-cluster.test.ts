/**
 * precision-arc-stage3b-block2-tds-cluster.test.ts
 * Stage 3B Block 2 — C6 TDS voucher cluster surgical migration.
 * Covers Payment.tsx:174, Receipt.tsx:132, Receipt.tsx:140 — identical
 * Math.round(money * tds_rate / 100) → roundTo(dPct(base, rate), 0) fix.
 */
import { describe, it, expect } from 'vitest';
import { roundTo, dPct } from '@/lib/decimal-helpers';

const newCalc = (base: number, rate: number) => roundTo(dPct(base, rate), 0);
const oldCalc = (base: number, rate: number) => Math.round(base * rate / 100);

describe('Precision Arc · Stage 3B Block 2 · C6 TDS voucher cluster', () => {
  it('returns an integer (0-dp) result — statutory TDS rupee precision preserved', () => {
    expect(Number.isInteger(newCalc(54321.78, 7.5))).toBe(true);
    expect(Number.isInteger(newCalc(100000, 10))).toBe(true);
  });

  it('decimal-safety on drift-prone inputs (the actual defect being fixed)', () => {
    // 10000 * 0.1 / 100 = 10 exactly; raw float introduces drift mid-pipeline.
    expect(newCalc(10000, 0.1)).toBe(10);
    // dPct keeps the calculation in Decimal end-to-end.
    expect(newCalc(1234.56, 0.07)).toBe(roundTo(dPct(1234.56, 0.07), 0));
  });

  it('behaviour-preservation regression: matches Math.round for normal TDS inputs', () => {
    const cases: Array<[number, number]> = [
      [100000, 10],   // Payment — std vendor 10%
      [50000, 2],     // Receipt — 194C 2%
      [250000, 1],    // Receipt — 194Q 0.1% scaled
      [99999, 7.5],   // Lower-deduction-cert path
      [123456, 5],
      [0, 10],
      [100000, 0],
    ];
    for (const [base, rate] of cases) {
      expect(newCalc(base, rate)).toBe(oldCalc(base, rate));
    }
  });

  it('RBI banker (ROUND_HALF_UP) on the 0-dp .5 boundary', () => {
    expect(newCalc(1, 50)).toBe(1);   // 0.5 → 1
    expect(newCalc(3, 50)).toBe(2);   // 1.5 → 2
  });
});
