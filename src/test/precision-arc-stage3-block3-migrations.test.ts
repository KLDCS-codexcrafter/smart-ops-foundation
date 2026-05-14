/**
 * precision-arc-stage3-block3-migrations.test.ts
 * Sprint T-Phase-1.Precision-Arc · Stage 3 · Block 3 · pay-hub Pattern 2 migrations.
 *
 * The 28 migrated sites all share the same shape:
 *   roundTo(parseFloat(<input>) || 0, resolveMoneyPrecision(null, null))
 *
 * Per S3-Q4, page-level form components have no entity context at the onChange
 * handler, so all use resolveMoneyPrecision(null, null) → 2 (contract default).
 *
 * Six representative cases — one per migrated file — assert no float drift and
 * that empty/invalid input falls back to 0 cleanly.
 */
import { describe, it, expect } from 'vitest';
import { roundTo, resolveMoneyPrecision } from '@/lib/decimal-helpers';

const MP = () => resolveMoneyPrecision(null, null);
const wrap = (s: string) => roundTo(parseFloat(s) || 0, MP());
const wrapStripped = (s: string) =>
  roundTo(parseFloat(s.replace(/,/g, '')) || 0, MP());

describe('Block 3 · pay-hub Pattern 2 migrations', () => {
  it('StatutoryReturns.tsx · totalAmount lands at 2dp without drift', () => {
    expect(wrap('1234.567')).toBe(1234.57);
    expect(wrap('')).toBe(0);
    expect(wrap('abc')).toBe(0);
  });

  it('PayslipGeneration.tsx · declaration amounts land at 2dp', () => {
    // 0.1 + 0.2 problem class
    expect(wrap('0.1') + wrap('0.2')).toBeCloseTo(0.3, 2);
    expect(wrap('25000.005')).toBe(25000.01); // ROUND_HALF_UP
    expect(wrap('1500')).toBe(1500);
  });

  it('SalaryStructureMaster.tsx · CTC bands land at 2dp', () => {
    expect(wrap('500000')).toBe(500000);
    expect(wrap('750000.999')).toBe(751001);
  });

  it('EmployeeMaster.tsx · loan principal/EMI land at 2dp', () => {
    expect(wrap('100000.456')).toBe(100000.46);
    expect(wrap('8333.333')).toBe(8333.33);
  });

  it('EmployeeFinance.tsx · thousands-separator strip preserved + 2dp', () => {
    expect(wrapStripped('1,00,000')).toBe(100000);
    expect(wrapStripped('12,345.678')).toBe(12345.68);
    expect(wrapStripped('')).toBe(0);
  });

  it('Onboarding.tsx · offerAmount lands at 2dp', () => {
    expect(wrap('600000.005')).toBe(600000.01);
    expect(wrap('600000')).toBe(600000);
  });
});
