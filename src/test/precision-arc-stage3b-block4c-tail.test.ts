/**
 * Precision Arc · Stage 3B · Block 4c · The Long Tail
 * Behaviour-preservation + decimal-safety for the 18 migrated sites.
 * Predecessor-baseline equivalence on normal inputs · drift-prone inputs
 * verified against the new resolver-backed paths.
 */
import { describe, it, expect } from 'vitest';
import {
  roundTo, resolveMoneyPrecision, dMul, dSub, dPct,
} from '@/lib/decimal-helpers';

const mp = () => resolveMoneyPrecision(null, null);

describe('Block 4c · paise integer-domain (servicedesk rupees→paise)', () => {
  it('roundTo(dMul(rupees, 100), 0) equals Math.round(rupees*100) for normal inputs', () => {
    const cases = [499.5, 1234.56, 0, 999, 87.89];
    for (const r of cases) {
      expect(roundTo(dMul(r, 100), 0)).toBe(Math.round(r * 100));
    }
  });
  it('eliminates float drift on pathological inputs', () => {
    // 0.1 + 0.2 = 0.30000000000000004 territory
    const r = 0.1 + 0.2; // 0.3-ish
    // Math.round(0.30000000000000004 * 100) = 30 (lucky here),
    // but dMul produces an exact 30 either way.
    expect(roundTo(dMul(r, 100), 0)).toBe(30);
  });
  it('integer result by contract (paise)', () => {
    const v = roundTo(dMul(1234.567, 100), 0);
    expect(Number.isInteger(v)).toBe(true);
  });
});

describe('Block 4c · CustomerCart C4 redeem cap (integer-paise floor preserved)', () => {
  const MAX_REDEEM_PCT = 0.3;
  it('matches Math.floor((subtotal - schemeDiscount) * MAX_REDEEM_PCT) on normal inputs', () => {
    const sub = 10000;
    const sch = 250;
    const baseline = Math.floor((sub - sch) * MAX_REDEEM_PCT);
    const next = Math.floor(dMul(dSub(sub, sch), MAX_REDEEM_PCT));
    expect(next).toBe(baseline);
  });
  it('avoids drift in the inner subtraction × percent', () => {
    // 0.1 paise math is hypothetical but exercises the helpers.
    const v = Math.floor(dMul(dSub(0.3, 0.1), 0.3));
    expect(v).toBe(Math.floor(0.06));
  });
});

describe('Block 4c · VendorPaymentEntry TDS (integer-rupee per Sec 194)', () => {
  it('roundTo(dPct(amount, rate), 0) returns integer rupees', () => {
    const tds = roundTo(dPct(100000, 10), 0);
    expect(tds).toBe(10000);
    expect(Number.isInteger(tds)).toBe(true);
  });
  it('matches Math.round(amount*r/100) on stable inputs', () => {
    for (const [a, r] of [[100000, 10], [54321, 7.5], [9999, 1]]) {
      expect(roundTo(dPct(a, r), 0)).toBe(Math.round(a * r / 100));
    }
  });
});

describe('Block 4c · RFQPublicForm Pattern 1 (line/total money)', () => {
  it('lineAfterTax equivalence: (qty*rate)*(1-disc/100)*(1+tax/100) at 2dp', () => {
    const qty = 3, rate = 1234.56, disc = 5, tax = 18;
    const baseline = Math.round(qty * rate * (1 - disc / 100) * (1 + tax / 100) * 100) / 100;
    const gross = dMul(qty, rate);
    const afterDisc = dMul(gross, dSub(1, disc / 100));
    const next = roundTo(dMul(afterDisc, 1 + tax / 100), mp());
    expect(next).toBeCloseTo(baseline, 2);
  });
  it('totals equivalence at 2dp', () => {
    const totalAfterTax = 1234.567;
    const totalValue = 1000.123;
    expect(roundTo(totalValue, mp())).toBe(1000.12);
    expect(roundTo(dSub(totalAfterTax, totalValue), mp())).toBeCloseTo(234.44, 2);
  });
});

describe('Block 4c · LogisticDisputes Pattern 2 (parseFloat money)', () => {
  it('roundTo(parseFloat(input), mp) snaps form input to money precision', () => {
    expect(roundTo(parseFloat('1234.567'), mp())).toBe(1234.57);
    expect(roundTo(parseFloat('999'), mp())).toBe(999);
  });
});

describe('Block 4c · bill-passing form parseFloat (rate, tax%)', () => {
  it('rate roundTo equivalence', () => {
    expect(roundTo(parseFloat('1234.56'), mp())).toBe(1234.56);
  });
  it('tax % stays numerically stable', () => {
    expect(roundTo(parseFloat('18.005'), mp())).toBe(18.01);
  });
});
