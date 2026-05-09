/**
 * @file src/test/form-carry-forward-kit.test.ts
 * @purpose D-NEW-CE FormCarryForwardKit canonical · re-export integrity + roster invariants
 * @who All form authors
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.d-2-Trident-Closeout-FR29-Sidebar · Block A test
 * @iso ISO 25010 Testability
 * @whom Audit Owner
 * @decisions D-NEW-CE (FormCarryForwardKit canonical)
 * @disciplines FR-29 · FR-30 · FR-32
 * @reuses form-carry-forward-kit module
 * @[JWT] N/A (config / type level)
 */
import { describe, it, expect } from 'vitest';
import {
  UseLastVoucherButton, Sprint27d2Mount, Sprint27eMount, DraftRecoveryDialog,
} from '@/components/canonical/form-carry-forward-kit';
import {
  useSprint27d1Mount, dMul, round2,
  FORM_CARRY_FORWARD_ROSTER, useFormCarryForwardChecklist,
  type FormCarryForwardConfig,
} from '@/lib/form-carry-forward-kit';

describe('FormCarryForwardKit · D-NEW-CE canonical', () => {
  it('re-exports all 6 canonical mount components/hooks', () => {
    expect(typeof UseLastVoucherButton).toBe('function');
    expect(typeof Sprint27d2Mount).toBe('function');
    expect(Sprint27eMount).toBeTruthy();
    expect(typeof DraftRecoveryDialog).toBe('function');
    expect(typeof useSprint27d1Mount).toBe('function');
  });

  it('re-exports decimal-helpers correctly (dMul · round2 work)', () => {
    expect(round2(dMul(1.234, 2))).toBe(2.47);
  });

  it('FORM_CARRY_FORWARD_ROSTER has exactly 12 items in correct order', () => {
    expect(FORM_CARRY_FORWARD_ROSTER.length).toBe(12);
    expect(FORM_CARRY_FORWARD_ROSTER.map((r) => r.n)).toEqual([1,2,3,4,5,6,7,8,9,10,11,12]);
  });

  it('useFormCarryForwardChecklist accepts a fully-true config without throwing', () => {
    const allTrue: FormCarryForwardConfig = {
      useLastVoucher: true, sprint27d1: true, sprint27d2: true, sprint27e: true,
      keyboardOverlay: true, draftRecovery: true, decimalHelpers: true, fr30Header: true,
      smartDefaults: true, pinnedTemplates: true, ctrlSSave: true, saveAndNewCarryover: true,
    };
    expect(() => useFormCarryForwardChecklist('TestForm', allTrue)).not.toThrow();
  });

  it('useFormCarryForwardChecklist accepts partial-coverage config without throwing', () => {
    const partial: FormCarryForwardConfig = {
      useLastVoucher: true, sprint27d1: false, sprint27d2: true, sprint27e: false,
      keyboardOverlay: true, draftRecovery: false, decimalHelpers: true, fr30Header: true,
      smartDefaults: false, pinnedTemplates: false, ctrlSSave: true, saveAndNewCarryover: false,
    };
    expect(() => useFormCarryForwardChecklist('PartialForm', partial)).not.toThrow();
  });
});
