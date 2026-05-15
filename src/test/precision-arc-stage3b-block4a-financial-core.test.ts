/**
 * precision-arc-stage3b-block4a-financial-core.test.ts
 * Stage 3B · Block 4a — financial-core page-form migrations.
 * Behaviour-preservation + decimal-safety for the migrated arithmetic.
 */
import { describe, it, expect } from 'vitest';
import { roundTo, resolveMoneyPrecision, dPct, dMul, dAdd } from '@/lib/decimal-helpers';

const mp = resolveMoneyPrecision(null, null);

describe('Block 4a · InventoryLineGrid GST line math (Pattern 1)', () => {
  it('cgst/sgst/igst — decimal-safe equivalent to Math.round(_*100)/100', () => {
    const taxable = 1234.56, halfRate = 9, gst = 18;
    expect(roundTo(dPct(taxable, halfRate), mp)).toBeCloseTo(Math.round(taxable*halfRate/100*100)/100, 2);
    expect(roundTo(dPct(taxable, gst), mp)).toBeCloseTo(Math.round(taxable*gst/100*100)/100, 2);
  });
  it('total — decimal-safe sum at 2dp', () => {
    const t = 1000, c = 90, s = 90, i = 0, cess = 5;
    expect(roundTo(dAdd(dAdd(dAdd(dAdd(t, c), s), i), cess), mp)).toBe(1185);
  });
});

describe('Block 4a · LedgerMaster EMI calc (Pattern 1)', () => {
  it('zero-rate EMI matches old Math.round(_*100)/100', () => {
    const p = 100000, m = 12;
    expect(roundTo(p / m, mp)).toBe(Math.round((p/m)*100)/100);
  });
  it('compound EMI matches old idiom for normal inputs', () => {
    const p = 100000, ar = 12, m = 24, r = ar/100/12;
    const expected = Math.round(p*r*Math.pow(1+r,m)/(Math.pow(1+r,m)-1)*100)/100;
    expect(roundTo(p*r*Math.pow(1+r,m)/(Math.pow(1+r,m)-1), mp)).toBeCloseTo(expected, 2);
  });
  it('schedule interest decimal-safe at 2dp', () => {
    expect(roundTo(dMul(50000, 12/100/12), mp)).toBe(500);
  });
});

describe('Block 4a · ExitAndFnF (Pattern 1 + C4 Math.floor preserved)', () => {
  it('gratuity — Math.floor(years) preserved, money decimal-safe', () => {
    const monthlyBasic = 30000, years = 7.4;
    const newG = roundTo(dMul(dMul(monthlyBasic, 15), Math.floor(years)) / 26, 0);
    const oldG = Math.round((monthlyBasic*15*Math.floor(years))/26);
    expect(newG).toBe(oldG);
  });
  it('leave encashment matches old Math.round', () => {
    const days = 30, basic = 26000;
    expect(roundTo(dMul(days, basic) / 26, 0)).toBe(Math.round(days * (basic/26)));
  });
  it('notice shortfall = shortfall*dailyRate rupee', () => {
    expect(roundTo(dMul(7, 1234.56), 0)).toBe(Math.round(7 * 1234.56));
  });
  it('pro-rata salary matches old', () => {
    const g = 50000, dw = 18, dim = 30;
    expect(roundTo(dMul(g, dw) / dim, 0)).toBe(Math.round((g/dim)*dw));
  });
});

describe('Block 4a · EmployeeFinance EMI (C4 Math.ceil preserved)', () => {
  it('nil EMI equals Math.ceil(p/n) for normal inputs', () => {
    const p = 100000, n = 12;
    expect(Math.ceil(roundTo(p/n, 4))).toBe(Math.ceil(p/n));
  });
  it('simple-interest total matches old formula', () => {
    const p = 100000, r = 12, n = 24;
    const oldTI = (p*r*n)/(100*12);
    const newTI = dPct(dMul(p, n), r) / 12;
    expect(newTI).toBeCloseTo(oldTI, 6);
  });
  it('compound EMI integer rupees match old formula on normal inputs', () => {
    const p = 250000, ar = 11, n = 36, r = ar/(12*100);
    const oldEmi = Math.ceil(p*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1));
    const newEmi = Math.ceil(roundTo(p*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1), 4));
    expect(newEmi).toBe(oldEmi);
  });
  it('drift-snap: ceil(roundTo(0.9999999999, 4)) = 1, not 1 from spurious bump', () => {
    expect(Math.ceil(roundTo(0.9999999999, 4))).toBe(1);
    expect(Math.ceil(roundTo(0.99994, 4))).toBe(1);
  });
});

describe('Block 4a · PayslipGeneration PF estimate (Pattern 1)', () => {
  it('PF estimate equals annualCTC * 0.048 capped at 21600 (rupee)', () => {
    const ctc = 1200000;
    expect(roundTo(Math.min(dPct(ctc, 4.8), 21600), 0)).toBe(21600);
  });
  it('matches old Math.round((ctc*0.4/12)*0.12*12) when below cap', () => {
    const ctc = 300000;
    const oldP = Math.round(Math.min((ctc*0.4/12)*0.12*12, 21600));
    const newP = roundTo(Math.min(dPct(ctc, 4.8), 21600), 0);
    expect(newP).toBe(oldP);
  });
});

describe('Block 4a · ContractManpower (Pattern 1)', () => {
  it('order value = rate*headcount*days, integer rupee', () => {
    expect(roundTo(dMul(dMul(450, 12), 31), 0)).toBe(Math.round(450 * 12 * 31));
  });
  it('variance integer rupee', () => {
    expect(roundTo(1234.56, 0)).toBe(Math.round(1234.56));
  });
});

describe('Block 4a · EmployeeExperience gratuity provision (Pattern 1)', () => {
  it('annualBasic*4.81/100 → integer rupee via dPct', () => {
    const ab = 360000;
    expect(roundTo(dPct(ab, 4.81), 0)).toBe(Math.round(ab*4.81/100));
  });
});

describe('Block 4a · SalaryStructureMaster (Pattern 1, integer-rupee)', () => {
  it('roundTo(val, 0) matches Math.round(val) for positives', () => {
    const v = 12345.67;
    expect(roundTo(v, 0)).toBe(Math.round(v));
  });
});

describe('Block 4a · GSTR9/PayHeadMaster/EmployeeMaster Pattern 2 (parseFloat→money)', () => {
  it('roundTo(parseFloat||0, mp) preserves whole-rupee inputs', () => {
    expect(roundTo(parseFloat('21000') || 0, mp)).toBe(21000);
    expect(roundTo(parseFloat('') || 0, mp)).toBe(0);
  });
  it('snaps drift-prone fractional inputs to 2dp', () => {
    expect(roundTo(parseFloat('1234.567') || 0, mp)).toBe(1234.57);
  });
});
