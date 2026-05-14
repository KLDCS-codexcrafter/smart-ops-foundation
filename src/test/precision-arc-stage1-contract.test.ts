/**
 * precision-arc-stage1-contract.test.ts
 * Sprint T-Phase-1.Precision-Arc · Stage 1 · The Contract
 * Verifies resolvers, roundTo, round2 backward-compat, and additive-field
 * type-checks. Source-level / pure-vitest pattern (no @testing-library/react).
 */
import { describe, it, expect } from 'vitest';
import {
  resolveMoneyPrecision,
  resolveQtyPrecision,
  roundTo,
  round2,
} from '@/lib/decimal-helpers';
import type { CompanySettings } from '@/types/company-settings';
import {
  DEFAULT_PAYROLL_PRECISION,
  type PayrollPrecisionConfig,
} from '@/types/payroll-masters';

describe('Precision Arc · Stage 1 · contract', () => {
  it('resolveMoneyPrecision returns entity override when number', () => {
    expect(resolveMoneyPrecision(3, 2)).toBe(3);
    expect(resolveMoneyPrecision(0, 2)).toBe(0);
  });
  it('resolveMoneyPrecision falls back to base currency when override null', () => {
    expect(resolveMoneyPrecision(null, 3)).toBe(3);
    expect(resolveMoneyPrecision(undefined, 0)).toBe(0);
  });
  it('resolveMoneyPrecision returns 2 when both null/undefined', () => {
    expect(resolveMoneyPrecision(null, null)).toBe(2);
    expect(resolveMoneyPrecision(undefined, undefined)).toBe(2);
  });

  it('resolveQtyPrecision returns UoM precision when number', () => {
    expect(resolveQtyPrecision(3)).toBe(3);
    expect(resolveQtyPrecision(0)).toBe(0);
  });
  it('resolveQtyPrecision returns 2 when null/undefined', () => {
    expect(resolveQtyPrecision(null)).toBe(2);
    expect(resolveQtyPrecision(undefined)).toBe(2);
  });

  it('roundTo applies RBI banker (ROUND_HALF_UP) at varied places', () => {
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(2.5, 0)).toBe(3);
    expect(roundTo(1.23449, 3)).toBe(1.234);
    expect(roundTo(1.2345, 3)).toBe(1.235);
  });

  it('round2 backward-compat: round2(x) === roundTo(x, 2) for spread of values', () => {
    const samples = [0, 1.005, 2.345, -1.005, 1234.5678, 0.1 + 0.2, 99.995];
    for (const x of samples) {
      expect(round2(x)).toBe(roundTo(x, 2));
    }
  });

  it('CompanySettings literal with money_decimal_places: null type-checks', () => {
    const cs: CompanySettings = {
      id: 'x', entity_id: 'e1',
      mrp_tax_treatment: 'inclusive',
      mrp_tax_treatment_label: 'Tax Inclusive (MRP includes GST)',
      rate_change_requires_reason: true,
      base_currency: 'INR',
      money_decimal_places: null,
      default_costing_method: 'weighted_avg',
      created_at: 'x', updated_at: 'x',
    };
    expect(cs.money_decimal_places).toBeNull();
  });

  it('DEFAULT_PAYROLL_PRECISION has expected shape', () => {
    const c: PayrollPrecisionConfig = DEFAULT_PAYROLL_PRECISION;
    expect(c.money_decimal_places).toBeNull();
    expect(c.unit_decimal_places).toBe(2);
  });
});
