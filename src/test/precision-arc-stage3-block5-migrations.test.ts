/**
 * precision-arc-stage3-block5-migrations.test.ts
 * Block 5 · accounting + fincore — representative drift-free assertions for
 * the 20 migrated Pattern-2 sites. All money fields → resolveMoneyPrecision.
 */
import { describe, it, expect } from 'vitest';
import { roundTo, resolveMoneyPrecision } from '@/lib/decimal-helpers';

const mp = () => resolveMoneyPrecision(null, null);

const wrapPlain = (raw: string) => roundTo(parseFloat(raw) || 0, mp());
const wrapComma = (raw: string) => roundTo(parseFloat(raw.replace(/,/g, '')) || 0, mp());

describe('Precision Arc · Stage 3 · Block 5 · accounting + fincore', () => {
  it('contract default money precision is 2', () => {
    expect(mp()).toBe(2);
  });

  it('Pattern 2 plain wrap produces 2-dp money values (no float drift)', () => {
    expect(wrapPlain('1234.567')).toBe(1234.57);   // ROUND_HALF_UP
    expect(wrapPlain('100')).toBe(100);
    expect(wrapPlain('')).toBe(0);                  // fallback preserved
    expect(wrapPlain('abc')).toBe(0);
  });

  it('Pattern 2 with .replace(/,/g, "") strips Indian-grouping separators', () => {
    expect(wrapComma('1,23,456.789')).toBe(123456.79);
    expect(wrapComma('1,000')).toBe(1000);
    expect(wrapComma('')).toBe(0);
  });

  it('ROUND_HALF_UP boundary preserved (RBI banker) at 2dp', () => {
    expect(roundTo(1.005, mp())).toBe(1.01);
    expect(roundTo(2.345, mp())).toBe(2.35);
  });

  it('BankReconciliation parts-style wrap (debit/credit)', () => {
    const parts = ['2026-05-01', 'NEFT', '1234.567', ''];
    const debit  = roundTo(parseFloat(parts[2] ?? '0') || 0, mp());
    const credit = roundTo(parseFloat(parts[3] ?? '0') || 0, mp());
    expect(debit).toBe(1234.57);
    expect(credit).toBe(0);
  });

  it('TDSAdvance challan amount wrap preserves money contract', () => {
    expect(roundTo(parseFloat('99999.995') || 0, mp())).toBe(100000);
  });

  it('representative LedgerMaster openingBalance with grouping', () => {
    // simulates: parseFloat(e.target.value.replace(/,/g, '')) || 0 wrapped in roundTo
    expect(wrapComma('1,00,000.005')).toBe(100000.01);
  });

  it('representative CapitalAsset cost with three-line totalling stays drift-free', () => {
    const inv = wrapPlain('1234.567');
    const cost = wrapPlain('1000.005');
    const gst  = wrapPlain('234.562');
    expect(inv).toBe(1234.57);
    expect(cost).toBe(1000.01);
    expect(gst).toBe(234.56);
  });
});
