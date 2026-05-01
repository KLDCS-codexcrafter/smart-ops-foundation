/**
 * decimal-helpers.test.ts — Sprint T-Phase-1.2.5h-c1 · M-1 test floor.
 * Verifies all 7 exported helpers produce decimal-safe results.
 */
import { describe, it, expect } from 'vitest';
import { dAdd, dSub, dMul, dPct, round2, dEq, dSum } from '@/lib/decimal-helpers';

describe('decimal-helpers · M-1', () => {
  it('D1 · dAdd avoids float drift', () => {
    expect(dAdd(0.1, 0.2)).toBe(0.3);
  });
  it('D2 · dAdd treats null/undefined as 0', () => {
    expect(dAdd(null as unknown as number, 5)).toBe(5);
    expect(dAdd(undefined as unknown as number, 0)).toBe(0);
  });
  it('D3 · dSub avoids float drift', () => {
    expect(dSub(1.0, 0.7)).toBe(0.3);
  });
  it('D4 · dMul · 0.1 × 3 returns 0.3 (no 0.30000000000000004)', () => {
    expect(dMul(0.1, 3)).toBe(0.3);
  });
  it('D5 · dPct · 18% of ₹1234.56 = 222.2208', () => {
    expect(dPct(1234.56, 18)).toBeCloseTo(222.2208, 4);
  });
  it('D6 · round2 uses ROUND_HALF_UP (banker) on 1.005 → 1.01', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.345)).toBe(2.35);
  });
  it('D7 · dEq with places performs tolerance comparison', () => {
    expect(dEq(0.1 + 0.2, 0.3)).toBe(true);
    expect(dEq(1.234, 1.235, 2)).toBe(true);
    expect(dEq(1.234, 1.245, 2)).toBe(false);
  });
  it('D8 · dSum sums an array decimal-safely', () => {
    expect(dSum([0.1, 0.2, 0.3, 0.4])).toBe(1);
    expect(dSum([{ x: 1.1 }, { x: 2.2 }], r => r.x)).toBe(3.3);
  });
});
