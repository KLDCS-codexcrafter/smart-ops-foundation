/**
 * Stage 3B Block 4b — trade/stock page-form precision migrations.
 * Behaviour-preservation regression + decimal-safety guards.
 *
 * Sites covered (representative):
 *   distributor: CreditApprovalQueue, DistributorCart paise cluster, DistributorCatalog,
 *                DistributorCreditRequest, DistributorDisputeQueue, DistributorInvoices,
 *                DistributorPayments
 *   inventory:   ItemRatesMRP (Pattern 1 + Pattern 2), OpeningStockEntry (Pattern 2),
 *                PriceListManager (Pattern 1 + Pattern 2)
 */
import { describe, it, expect } from 'vitest';
import {
  dMul, dSub, dPct, roundTo, resolveMoneyPrecision, resolveQtyPrecision,
} from '@/lib/decimal-helpers';

const mp = resolveMoneyPrecision(null, null); // 2
const qp = resolveQtyPrecision(undefined);    // 2

describe('Block 4b · DistributorCart paise-allocation cluster (integer paise)', () => {
  it('preserves Math.round behaviour for normal ratios', () => {
    const taxable = 100000; // 100000 paise = ₹1000
    const ratio = 2 / 1;
    const old = Math.round(taxable * ratio);
    const next = roundTo(dMul(taxable, ratio), 0);
    expect(next).toBe(old);
  });
  it('result is integer paise (no fractional paise)', () => {
    const next = roundTo(dMul(123, 0.7), 0);
    expect(Number.isInteger(next)).toBe(true);
  });
  it('decimal-safe on drift-prone ratio', () => {
    // 0.1 * 3 in JS = 0.30000000000000004; the migrated path must not leak that drift.
    const r = roundTo(dMul(10, 0.3), 0);
    expect(r).toBe(3);
  });
});

describe('Block 4b · rupees → integer paise (DistributorCatalog/Invoices/Payments)', () => {
  it('Catalog fallback: rupees * 100 → integer paise', () => {
    const old = Math.round(123.45 * 100);
    const next = roundTo(dMul(123.45, 100), 0);
    expect(next).toBe(old);
    expect(Number.isInteger(next)).toBe(true);
  });
  it('Invoices disputed paise: shortQty * rate * 100', () => {
    const shortQty = 3, rate = 12.34;
    const old = Math.round(shortQty * rate * 100);
    const next = roundTo(dMul(dMul(shortQty, rate), 100), 0);
    expect(next).toBe(old);
  });
  it('Payments amount_paise: rupees * 100', () => {
    const old = Math.round(99.99 * 100);
    const next = roundTo(dMul(99.99, 100), 0);
    expect(next).toBe(old);
  });
});

describe('Block 4b · Pattern 2 wrap parseFloat money input', () => {
  it('CreditApprovalQueue partial lakhs preserves valid input', () => {
    const inp = '2.5';
    const old = parseFloat(inp);
    const next = roundTo(parseFloat(inp), mp);
    expect(next).toBe(old);
  });
  it('lakhs → paise floor preserved', () => {
    const lakhs = 2.5;
    const old = Math.floor(lakhs * 100000 * 100);
    const next = Math.floor(dMul(dMul(lakhs, 100000), 100));
    expect(next).toBe(old);
    expect(Number.isInteger(next)).toBe(true);
  });
  it('NaN propagation preserved when input invalid', () => {
    expect(roundTo(parseFloat('not-a-number'), mp)).toBeNaN();
  });
});

describe('Block 4b · ItemRatesMRP / PriceListManager Pattern 1 percent application', () => {
  it('Math.round(nv*100)/100 idiom equivalent to roundTo(_, mp)', () => {
    const old = 123.456;
    const pct = 7.5;
    const idiom = Math.round(old * (1 + pct / 100) * 100) / 100;
    const migrated = roundTo(dMul(old, 1 + pct / 100), mp);
    expect(migrated).toBe(idiom);
  });
  it('PriceListManager pct_of_std: dPct equivalent', () => {
    const std = 199.99;
    const pct = 80;
    const idiom = Math.round(std * (pct / 100) * 100) / 100;
    const migrated = roundTo(dPct(std, pct), mp);
    expect(migrated).toBe(idiom);
  });
  it('PriceListManager fixed_pct_discount: 1 - disc/100', () => {
    const std = 199.99;
    const disc = 10;
    const idiom = Math.round(std * (1 - disc / 100) * 100) / 100;
    const migrated = roundTo(dSub(std, dPct(std, disc)), mp);
    expect(migrated).toBe(idiom);
  });
});

describe('Block 4b · OpeningStockEntry money-vs-quantity resolver', () => {
  it('mrp uses money precision', () => {
    expect(roundTo(parseFloat('12.345'), mp)).toBe(12.35);
  });
  it('min_qty uses quantity precision', () => {
    expect(roundTo(parseFloat('1.005'), qp)).toBe(1.01);
  });
});
