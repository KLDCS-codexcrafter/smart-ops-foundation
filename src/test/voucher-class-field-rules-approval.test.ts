/**
 * Sprint T-Phase-2.7-b · Voucher Class + Field Rules + Approval routing tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validateFieldRules } from '@/lib/field-rule-engine';
import { findVoucherTypeById, getVoucherTypesForFamily } from '@/lib/non-finecore-voucher-type-registry';

describe('Field Rule Engine · OOB-3 · Q2-c', () => {
  it('VC1 · mandatory rule on posted state blocks save', () => {
    const result = validateFieldRules(
      { invoice_no: '' },
      [{ field_path: 'invoice_no', field_label: 'Invoice No', rule: 'mandatory', enforce_on: 'posted' }],
      'posted',
    );
    expect(result.ok).toBe(false);
    expect(result.errors.invoice_no).toContain('required');
  });

  it('VC2 · mandatory rule on posted state warns on draft (Q2-c)', () => {
    const result = validateFieldRules(
      { invoice_no: '' },
      [{ field_path: 'invoice_no', field_label: 'Invoice No', rule: 'mandatory', enforce_on: 'posted' }],
      'draft',
    );
    expect(result.ok).toBe(true);
    expect(result.warnings.invoice_no).toBeTruthy();
  });

  it('VC3 · min_length validation', () => {
    const result = validateFieldRules(
      { narration: 'short' },
      [{ field_path: 'narration', field_label: 'Narration', rule: 'mandatory', enforce_on: 'posted', min_length: 10 }],
      'posted',
    );
    expect(result.ok).toBe(false);
  });

  it('VC4 · custom message overrides default', () => {
    const result = validateFieldRules(
      { reference_no: '' },
      [{ field_path: 'reference_no', field_label: 'Ref', rule: 'mandatory', enforce_on: 'posted', custom_message: 'BOE reference required for import' }],
      'posted',
    );
    expect(result.errors.reference_no).toBe('BOE reference required for import');
  });

  it('VC5 · forbidden rule rejects when value present', () => {
    const result = validateFieldRules(
      { vehicle_no: 'KA01AB1234' },
      [{ field_path: 'vehicle_no', field_label: 'Vehicle No', rule: 'forbidden', enforce_on: 'posted' }],
      'posted',
    );
    expect(result.ok).toBe(false);
  });

  it('VC6 · empty rule list returns ok', () => {
    const result = validateFieldRules({}, [], 'posted');
    expect(result.ok).toBe(true);
  });
});

describe('Voucher Type Registry · field_rules support', () => {
  beforeEach(() => localStorage.clear());

  it('VC7 · DEFAULT seed types with field_rules carry the array', () => {
    const grnDom = findVoucherTypeById('TEST', 'vt-grn-domestic');
    expect(grnDom).not.toBeNull();
    expect(Array.isArray(grnDom?.field_rules)).toBe(true);
    expect((grnDom?.field_rules?.length ?? 0)).toBeGreaterThan(0);
  });

  it('VC8 · sales_quote family has multiple types after demo seed (Q1-b progressive disclosure visible)', () => {
    const types = getVoucherTypesForFamily('TEST', 'sales_quote');
    expect(types.length).toBeGreaterThanOrEqual(2);
  });
});
