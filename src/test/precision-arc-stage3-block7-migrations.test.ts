/**
 * precision-arc-stage3-block7-migrations.test.ts
 * Block 7 · the tail — heterogeneous: Pattern 1 (engines + integer-paise),
 * Pattern 2 (page forms — money + qty), Pattern 3 (DSO/score — skipped).
 */
import { describe, it, expect } from 'vitest';
import {
  roundTo,
  resolveMoneyPrecision,
  resolveQtyPrecision,
  dAdd,
  dMul,
  dSum,
} from '@/lib/decimal-helpers';

const mp = () => resolveMoneyPrecision(null, null);
const qp = () => resolveQtyPrecision(undefined);

describe('Precision Arc · Stage 3 · Block 7 · the tail', () => {
  it('contract defaults: money=2, qty=2', () => {
    expect(mp()).toBe(2);
    expect(qp()).toBe(2);
  });

  it('Pattern 2 money wrap (page forms)', () => {
    const wrap = (raw: string) => roundTo(parseFloat(raw) || 0, mp());
    expect(wrap('1234.567')).toBe(1234.57);
    expect(wrap('')).toBe(0);
  });

  it('Pattern 2 qty wrap (PDFInvoiceUpload weight)', () => {
    const wrap = (raw: string) => roundTo(parseFloat(raw) || 0, qp());
    expect(wrap('12.345')).toBe(12.35);
    expect(wrap('')).toBe(0);
  });

  it('Pattern 2 OrgStructureHub null-fallback preserved (budget)', () => {
    // `roundTo(parseFloat(value), mp()) || null` — NaN → 0 → null; 0 → null; valid → number
    const compute = (v: string) =>
      v ? (roundTo(parseFloat(v), mp()) || null) : null;
    expect(compute('')).toBeNull();
    expect(compute('abc')).toBeNull();
    expect(compute('0')).toBeNull();
    expect(compute('100000.005')).toBe(100000.01);
  });

  it('Pattern 1 paise · QuotationEntry / TransporterInvoiceInbox / PackingMaterial / CustomerCatalog', () => {
    const toPaise = (rupees: number) => roundTo(dMul(rupees, 100), 0);
    expect(toPaise(1234.56)).toBe(123456);
    expect(toPaise(99.995)).toBe(10000);
    expect(toPaise(0.3)).toBe(30); // float-drift killer
    expect(Number.isInteger(toPaise(1499.99))).toBe(true);
  });

  it('Pattern 1 money · emi-lifecycle totalEMI / openingBalance via dAdd', () => {
    // totalEMI = roundTo(dAdd(principal, interest), mp)
    const totalEMI = roundTo(dAdd(8333.33, 1666.67), mp());
    expect(totalEMI).toBe(10000);
    // openingBalance = roundTo(dAdd(running, principal), mp)
    expect(roundTo(dAdd(99999.995, 0.005), mp())).toBe(100000);
  });

  it('Pattern 1 money · useEMIAlerts dSum', () => {
    const alerts = [{ amount: 0.1 }, { amount: 0.2 }, { amount: 0.7 }];
    expect(roundTo(dSum(alerts, a => a.amount), mp())).toBe(1);
  });

  it('Pattern 1 money · useEMISchedule outstandingAmount round to 2dp', () => {
    expect(roundTo(1234.5678, mp())).toBe(1234.57);
  });

  it('RBI banker boundary preserved (D-142)', () => {
    expect(roundTo(2.345, mp())).toBe(2.35);
    expect(roundTo(1.005, mp())).toBe(1.01);
  });
});
