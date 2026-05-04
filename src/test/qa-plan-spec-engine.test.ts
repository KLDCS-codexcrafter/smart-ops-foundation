/**
 * @file        qa-plan-spec-engine.test.ts
 * @sprint      T-Phase-1.2.6f-d-2-card5-5-pre-1 · Block C · 4 NEW tests
 * @covers      D-324 per-vendor · D-336 per-customer · D-330 voucher-kind filter · D-331 master_lookup
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createQaPlan, findApplicablePlan, listQaPlans,
} from '@/lib/qa-plan-engine';
import {
  createQaSpec, interpretParameter,
} from '@/lib/qa-spec-engine';
import { qaPlanKey } from '@/types/qa-plan';
import { qaSpecKey } from '@/types/qa-spec';

const E = 'TST5P1';

beforeEach(() => {
  localStorage.removeItem(qaPlanKey(E));
  localStorage.removeItem(qaSpecKey(E));
});

describe('qa-plan-engine · D-324 + D-336 · party variant resolution', () => {
  it('D-324 · prefers per-vendor plan over default for incoming', () => {
    const spec = createQaSpec({ code: 'S1', name: 'Spec1', parameters: [] }, E);
    createQaPlan({ code: 'P-DEF', name: 'Default', plan_type: 'incoming', spec_id: spec.id }, E);
    createQaPlan({
      code: 'P-V1', name: 'Vendor1', plan_type: 'incoming', spec_id: spec.id,
      vendor_id: 'V1', vendor_name: 'Vendor One',
    }, E);
    const hit = findApplicablePlan(null, 'V1', 'vendor', null, E);
    expect(hit?.code).toBe('P-V1');
    const fallback = findApplicablePlan(null, 'V99', 'vendor', null, E);
    expect(fallback?.code).toBe('P-DEF');
    expect(listQaPlans(E)).toHaveLength(2);
  });

  it('D-336 · prefers per-customer plan for outgoing (symmetric with vendor)', () => {
    const spec = createQaSpec({ code: 'S2', name: 'Spec2', parameters: [] }, E);
    createQaPlan({ code: 'OUT-DEF', name: 'OutDefault', plan_type: 'outgoing', spec_id: spec.id }, E);
    createQaPlan({
      code: 'OUT-C5', name: 'CustomerFive', plan_type: 'outgoing', spec_id: spec.id,
      customer_id: 'C5', customer_name: 'Cust 5',
    }, E);
    const hit = findApplicablePlan(null, 'C5', 'customer', null, E);
    expect(hit?.code).toBe('OUT-C5');
  });

  it('D-330 · applicable_voucher_kinds filter narrows match', () => {
    const spec = createQaSpec({ code: 'S3', name: 'Spec3', parameters: [] }, E);
    createQaPlan({
      code: 'GRN-ONLY', name: 'GRN Only', plan_type: 'incoming', spec_id: spec.id,
      applicable_voucher_kinds: ['grn'],
    }, E);
    createQaPlan({
      code: 'SAMPLE-ONLY', name: 'Sample Only', plan_type: 'sample', spec_id: spec.id,
      applicable_voucher_kinds: ['sample_in'],
    }, E);
    const grnHit = findApplicablePlan(null, null, 'vendor', 'grn', E);
    expect(grnHit?.code).toBe('GRN-ONLY');
    const sampleHit = findApplicablePlan(null, null, 'vendor', 'sample_in', E);
    expect(sampleHit?.code).toBe('SAMPLE-ONLY');
  });
});

describe('qa-spec-engine · D-331 · 4 parameter types', () => {
  it('D-331 · numeric range, boolean, text, master_lookup all evaluate', () => {
    const spec = createQaSpec({
      code: 'S-MULTI', name: 'Multi',
      parameters: [
        { name: 'pH', parameter_type: 'numeric', unit: null, min_value: 6, max_value: 8,
          expected_text: null, lookup_master: null, is_critical: false, test_method: null },
        { name: 'Pass', parameter_type: 'boolean', unit: null, min_value: null, max_value: null,
          expected_text: 'true', lookup_master: null, is_critical: false, test_method: null },
        { name: 'Grade', parameter_type: 'text', unit: null, min_value: null, max_value: null,
          expected_text: 'A', lookup_master: null, is_critical: false, test_method: null },
        { name: 'Colour', parameter_type: 'master_lookup', unit: null, min_value: null,
          max_value: null, expected_text: null, lookup_master: 'colour_master',
          is_critical: false, test_method: null },
      ],
    }, E);
    const [pH, pass, grade, colour] = spec.parameters;
    expect(interpretParameter(pH, '7').pass).toBe(true);
    expect(interpretParameter(pH, '9').pass).toBe(false);
    expect(interpretParameter(pass, 'true').pass).toBe(true);
    expect(interpretParameter(pass, 'false').pass).toBe(false);
    expect(interpretParameter(grade, 'A').pass).toBe(true);
    expect(interpretParameter(grade, 'B').pass).toBe(false);
    expect(interpretParameter(colour, 'Red').pass).toBe(true);
  });
});
