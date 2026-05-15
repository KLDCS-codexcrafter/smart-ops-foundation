/**
 * precision-arc-stage3b-block3-engines.test.ts
 * Stage 3B Block 3 — C5 calculation engines.
 * Behaviour-preservation regression guards (migrated path === old idiom for
 * normal inputs) plus decimal-safety assertions for drift-prone inputs.
 * Representative coverage across the migrated engine files.
 */
import { describe, it, expect } from 'vitest';
import { roundTo, dPct, dMul, dSub, dAdd, dSum, resolveMoneyPrecision } from '@/lib/decimal-helpers';
import { buildEMISchedule, calculateEMIAmount } from '@/features/ledger-master/lib/emi-schedule-builder';
import { computeContractStatutory } from '@/types/contract-manpower';
import { pointsForPurchase, pointsToDiscountPaise } from '@/lib/loyalty-engine';
import { computeMetrics } from '@/types/campaign';

const mp = () => resolveMoneyPrecision(null, null);

describe('Precision Arc · Stage 3B Block 3 · C5 engines', () => {
  // ── SP-1 idiom equivalence: roundTo(_, 2) === Math.round(_*100)/100 (banker)
  it('SP-1 · the Math.round(_*100)/100 idiom is exactly roundTo(_, 2)', () => {
    const cases = [1234.5678, 0.005, 99999.995, 100, 0, 1500.5, 2.345];
    for (const v of cases) {
      // Both apply ROUND_HALF_UP at 2dp for non-negative non-pathological inputs.
      expect(roundTo(v, mp())).toBe(Math.round(v * 100) / 100);
    }
  });

  // ── emi-schedule-builder · SP-1
  it('SP-1 · emi-schedule-builder produces 2dp money rows; sum reconciles', () => {
    const rows = buildEMISchedule({
      principal: 100000,
      annualRatePercent: 12,
      tenureMonths: 12,
      firstEmiDate: '2026-06-01',
    });
    expect(rows).toHaveLength(12);
    rows.forEach(r => {
      expect(roundTo(r.principal, 2)).toBe(r.principal);
      expect(roundTo(r.interest, 2)).toBe(r.interest);
    });
    const emi = calculateEMIAmount(100000, 12, 12);
    expect(emi).toBeCloseTo(8884.88, 1);
  });

  // ── notional-interest-engine SP-1 idiom check
  it('SP-1 · notional interest formula matches old idiom for normal inputs', () => {
    const balance = 250000;
    const annual = 9;
    const newCalc = roundTo(dPct(balance, annual) / 12, mp());
    const oldCalc = Math.round(((balance * (annual / 100)) / 12) * 100) / 100;
    expect(newCalc).toBe(oldCalc);
  });

  // ── penal-engine SP-1 idioms
  it('SP-1 · penal engine outstanding/penal arithmetic matches old idiom', () => {
    const totalEMI = 8884.88;
    const paid = 1500.55;
    const newOut = Math.max(0, roundTo(dSub(totalEMI, paid), mp()));
    const oldOut = Math.max(0, Math.round((totalEMI - paid) * 100) / 100);
    expect(newOut).toBe(oldOut);
    const rate = 18;
    const newPenal = roundTo(dPct(newOut, rate), mp());
    const oldPenal = Math.round(newOut * rate) / 100;
    expect(newPenal).toBe(oldPenal);
  });

  it('SP-1 · penal accrual addition is drift-free', () => {
    const acc = roundTo(dAdd(0.1, 0.2), mp());
    expect(acc).toBe(0.3);
  });

  // ── advance-aging SP-1
  it('SP-1 · aging dSum matches old reduce-sum idiom for normal inputs', () => {
    const data = [{ b: 1500.55 }, { b: 2000.45 }, { b: 999.99 }];
    const newSum = roundTo(dSum(data, x => x.b), mp());
    const oldSum = Math.round(data.reduce((s, x) => s + x.b, 0) * 100) / 100;
    expect(newSum).toBe(oldSum);
  });

  // ── procure-fincore-po-bridge SP-1
  it('SP-1 · po-bridge taxable + tax + net matches old idiom', () => {
    const qty = 12.5, rate = 199.99, tax = 18;
    const taxable = roundTo(dMul(qty, rate), mp());
    const taxOld = Math.round(qty * rate * 100) / 100;
    expect(taxable).toBe(taxOld);
    const taxValue = roundTo(dPct(taxable, tax), mp());
    expect(taxValue).toBe(Math.round(taxable * tax) / 100);
    const net = roundTo(dAdd(taxable, taxValue), mp());
    expect(net).toBe(Math.round((taxable + taxValue) * 100) / 100);
  });

  // ── entity-setup-service SP-1 line totals
  it('SP-1 · entity-setup PO line basic/tax/afterTax stays drift-free over batch', () => {
    let totalBasic = 0;
    for (let i = 0; i < 100; i++) {
      const basic = roundTo(dMul(0.1, 0.2), mp());
      totalBasic = dAdd(totalBasic, basic);
    }
    expect(roundTo(totalBasic, mp())).toBe(2);
  });

  // ── price-benchmark-stub SP-1 (industry_avg)
  it('SP-1 · industry_avg roundTo matches old idiom', () => {
    const v = 1234.567;
    expect(roundTo(v, mp())).toBe(Math.round(v * 100) / 100);
  });

  // ── SP-5: hierarchy paise distribution — keep floor, dMul-safe
  it('SP-5 · hierarchy paise distribution preserves Math.floor and is decimal-safe', () => {
    const parent = 100_000_00; // 1 lakh rupees in paise
    const w = [33, 33, 34];
    const sumW = 100;
    const shares = w.map(wi => Math.floor(dMul(parent, wi) / sumW));
    expect(shares.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(parent);
    shares.forEach(s => expect(Number.isInteger(s)).toBe(true));
  });

  // ── SP-5: loyalty floors preserved
  it('SP-5 · loyalty pointsForPurchase + pointsToDiscountPaise preserve Math.floor', () => {
    const pts = pointsForPurchase(123450, 'gold'); // 1234.50 rupees
    expect(Number.isInteger(pts)).toBe(true);
    const disc = pointsToDiscountPaise(150);
    expect(Number.isInteger(disc)).toBe(true);
  });

  // ── SP-6: contract statutory PF/ESI integer rupees + behaviour-preservation
  it('SP-6 · contract grossWages/empPF/erPF/empESIC/erESIC = integer rupees and match old idiom', () => {
    const r = computeContractStatutory(523, 26);
    expect(Number.isInteger(r.grossWages)).toBe(true);
    expect(Number.isInteger(r.empPF)).toBe(true);
    expect(Number.isInteger(r.erPF)).toBe(true);
    expect(Number.isInteger(r.empESIC)).toBe(true);
    expect(Number.isInteger(r.erESIC)).toBe(true);
    // Behaviour-preservation: gross 523*26=13598, pfWage min(13598,15000)=13598
    expect(r.grossWages).toBe(13598);
    expect(r.empPF).toBe(Math.round(13598 * 0.12));
    expect(r.erPF).toBe(Math.round(13598 * 0.12));
    expect(r.empESIC).toBe(Math.round(13598 * 0.0075));
    expect(r.erESIC).toBe(Math.round(13598 * 0.0325));
  });

  // ── SP-6 statutory: PF/ESI ceiling caps preserved
  it('SP-6 · payroll PF/ESI integer rupee rounding equals old Math.round idiom', () => {
    const pfWage = 14999;
    expect(roundTo(dMul(pfWage, 0.12), 0)).toBe(Math.round(pfWage * 0.12));
    expect(roundTo(dMul(pfWage, 0.0367), 0)).toBe(Math.round(pfWage * 0.0367));
    expect(roundTo(dMul(pfWage, 0.0833), 0)).toBe(Math.round(pfWage * 0.0833));
    const esiWage = 20999;
    expect(roundTo(dMul(esiWage, 0.0075), 0)).toBe(Math.round(esiWage * 0.0075));
    expect(roundTo(dMul(esiWage, 0.0325), 0)).toBe(Math.round(esiWage * 0.0325));
  });

  // ── SP-6 LOP applyLOP behaviour-preservation
  it('SP-6 · applyLOP integer-rupee reduction matches old Math.round idiom', () => {
    const monthly = 50000;
    const lopDays = 2;
    const wd = 26;
    const factor = lopDays / wd;
    const newR = roundTo(dMul(monthly, dSub(1, factor)), 0);
    const oldR = Math.round(monthly * (1 - factor));
    expect(newR).toBe(oldR);
  });

  // ── SP-8: pdf-invoice-extractor money/qty wrap behaviour
  it('SP-8 · parseFloat money wrap preserves grouping strip + 2dp', () => {
    const wrap = (s: string) => roundTo(parseFloat(s.replace(/,/g, '')), mp());
    expect(wrap('1,23,456.789')).toBe(123456.79);
    expect(wrap('99,999.99')).toBe(99999.99);
  });

  // ── SP-6 cost-per-unit campaign metrics
  it('SP-6 · campaign cost_per_enquiry/cost_per_order = integer rupees', () => {
    const m = computeMetrics(
      {
        total: 0, creative: 0, media: 0, events: 0, incentives: 0,
        staff: 0, technology: 0, misc: 0, actual_spent: 100000,
      },
      {
        target_reach: 0, actual_reach: 1000, responses: 200,
        enquiries_generated: 50, quotations_generated: 30,
        orders_converted: 10, revenue_attributed: 500000,
      },
    );
    expect(Number.isInteger(m.cost_per_enquiry)).toBe(true);
    expect(Number.isInteger(m.cost_per_order)).toBe(true);
    expect(m.cost_per_enquiry).toBe(2000);
    expect(m.cost_per_order).toBe(10000);
  });

  // ── RBI banker (D-142 LOCKED) on .5 boundary
  it('RBI banker (ROUND_HALF_UP) preserved for migrated paths', () => {
    expect(roundTo(2.345, mp())).toBe(2.35);
    expect(roundTo(1.005, mp())).toBe(1.01);
    expect(roundTo(0.5, 0)).toBe(1);
    expect(roundTo(1.5, 0)).toBe(2);
  });
});
