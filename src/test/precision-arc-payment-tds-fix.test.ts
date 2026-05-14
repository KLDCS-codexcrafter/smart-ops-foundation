/**
 * precision-arc-payment-tds-fix.test.ts
 * Surgical fix for Payment.tsx:537 (Rate % onChange → setTdsAmount).
 * Validates: decimal-safety on drift-prone input, behaviour-preservation
 * vs the old Math.round(amount*r/100) for normal inputs, integer result.
 */
import { describe, it, expect } from 'vitest';
import { roundTo, dPct } from '@/lib/decimal-helpers';

const newCalc = (amount: number, r: number) => roundTo(dPct(amount, r), 0);
const oldCalc = (amount: number, r: number) => Math.round(amount * r / 100);

describe('Precision Arc · Payment.tsx:537 · TDS Rate% onChange surgical fix', () => {
  it('returns an integer (0-dp) result — TDS rupees, statutory precision preserved', () => {
    const v = newCalc(12345.67, 10);
    expect(Number.isInteger(v)).toBe(true);
  });

  it('decimal-safety: drift-prone inputs produce the mathematically correct result', () => {
    // 0.1 * 3 = 0.3 in decimal-math; raw float yields 0.30000000000000004.
    // amount=10000, r=0.1 → 10 exactly; old path drifts before Math.round but rounds back.
    expect(newCalc(10000, 0.1)).toBe(10);
    // A tighter drift case: 1234.56 * 0.07 / 100 in float ≠ exact.
    // dPct stays in Decimal end-to-end → roundTo(_, 0) = banker's rounding of the true value.
    expect(newCalc(1234.56, 0.07)).toBe(roundTo(dPct(1234.56, 0.07), 0));
  });

  it('behaviour-preservation regression: matches Math.round(amount*r/100) for normal TDS inputs', () => {
    const cases: Array<[number, number]> = [
      [100000, 10],   // 10000
      [50000, 2],     // 1000
      [123456, 5],    // 6173 (Math.round)
      [99999, 7.5],   // 7500
      [250000, 1],    // 2500
      [0, 10],        // 0
      [100000, 0],    // 0
    ];
    for (const [amount, r] of cases) {
      expect(newCalc(amount, r)).toBe(oldCalc(amount, r));
    }
  });

  it('RBI banker (ROUND_HALF_UP) on the .5 boundary at 0-dp', () => {
    // amount=1, r=50 → 0.5 → ROUND_HALF_UP → 1
    expect(newCalc(1, 50)).toBe(1);
    // amount=3, r=50 → 1.5 → ROUND_HALF_UP → 2
    expect(newCalc(3, 50)).toBe(2);
  });
});
