/**
 * precision-arc-stage3-block6-migrations.test.ts
 * Block 6 · masters + command-center — representative drift-free assertions
 * for the 22 migrated sites (18 Pattern-2 money + 4 Pattern-1 integer-paise).
 */
import { describe, it, expect } from 'vitest';
import { roundTo, resolveMoneyPrecision, dMul } from '@/lib/decimal-helpers';

const mp = () => resolveMoneyPrecision(null, null);
const wrapPlain = (raw: string) => roundTo(parseFloat(raw) || 0, mp());
const toPaiseInt = (raw: string) => roundTo(dMul(Number(raw) || 0, 100), 0);

describe('Precision Arc · Stage 3 · Block 6 · masters + command-center', () => {
  it('money precision contract default is 2', () => {
    expect(mp()).toBe(2);
  });

  it('Pattern 2 money wrap (openingBalance / creditLimit / freightRate / etc.)', () => {
    expect(wrapPlain('1234.567')).toBe(1234.57);   // ROUND_HALF_UP
    expect(wrapPlain('1000')).toBe(1000);
    expect(wrapPlain('')).toBe(0);                  // fallback preserved
  });

  it('Pattern 2 RBI banker boundary preserved', () => {
    expect(roundTo(2.345, mp())).toBe(2.35);
    expect(roundTo(1.005, mp())).toBe(1.01);
  });

  it('Pattern 1 SchemeMaster ₹ → integer paise (precision = 0)', () => {
    // 1234.56 rupees → 123456 paise
    expect(toPaiseInt('1234.56')).toBe(123456);
    // 99.995 rupees → 9999.5 paise → ROUND_HALF_UP → 10000 paise
    expect(toPaiseInt('99.995')).toBe(10000);
    // float-drift case: 0.1 + 0.2 ≈ 0.30000…, but dMul(0.3, 100) is exact 30
    expect(toPaiseInt('0.3')).toBe(30);
    // empty / NaN fallback preserved
    expect(toPaiseInt('')).toBe(0);
    expect(toPaiseInt('abc')).toBe(0);
  });

  it('SchemeMaster paise round-trip is exact for typical Indian amounts', () => {
    const samples = ['100', '1499.99', '50000', '12.5'];
    for (const s of samples) {
      const paise = toPaiseInt(s);
      expect(Number.isInteger(paise)).toBe(true);
      expect(paise / 100).toBe(parseFloat(s));
    }
  });

  it('representative EmployeeOpeningLoans original_amount / emi_amount migrate cleanly', () => {
    expect(wrapPlain('25000.005')).toBe(25000.01);
    expect(wrapPlain('1666.666')).toBe(1666.67);
  });

  it('OpeningLedgerBalance Dr/Cr money wraps preserve 2dp', () => {
    expect(wrapPlain('123456.789')).toBe(123456.79);
  });
});
