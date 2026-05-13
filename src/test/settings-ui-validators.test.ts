/**
 * @file        src/test/settings-ui-validators.test.ts
 * @sprint      T-Phase-1.C.1b · Block I.7
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  updateRiskEngineSettings,
  validateRiskWeights,
  validateRenewalCascade,
  updateRenewalCascadeSettings,
} from '@/lib/cc-compliance-settings';
import { createAMCRecord, recomputeAllAMCRiskScores, getAMCRecord } from '@/lib/servicedesk-engine';

beforeEach(() => localStorage.clear());

describe('Settings validators + recompute', () => {
  it('validateRiskWeights rejects sum 50', () => {
    const v = validateRiskWeights({ payment_history: 10, expiry_proximity: 10, contract_value: 10, service_status: 10, customer_activity: 10 });
    expect(v.valid).toBe(false);
  });
  it('validateRiskWeights accepts sum ~100', () => {
    const v = validateRiskWeights({ payment_history: 25, expiry_proximity: 20, contract_value: 15, service_status: 20, customer_activity: 20 });
    expect(v.valid).toBe(true);
  });
  it('updateRiskEngineSettings throws on invalid weights', () => {
    expect(() => updateRiskEngineSettings('OPRX', {
      risk_factor_weights: { payment_history: 1, expiry_proximity: 1, contract_value: 1, service_status: 1, customer_activity: 1 },
    }, 'u')).toThrow();
  });
  it('validateRenewalCascade rejects non-descending', () => {
    expect(validateRenewalCascade({ first_reminder_days: 30, second_reminder_days: 60, third_reminder_days: 10, final_reminder_days: 1, oem_overrides: {}, customer_class_overrides: {} }).valid).toBe(false);
  });
  it('updateRenewalCascadeSettings throws on bad order', () => {
    expect(() => updateRenewalCascadeSettings('OPRX', {
      first_reminder_days: 10, second_reminder_days: 20, third_reminder_days: 30, final_reminder_days: 40,
      oem_overrides: {}, customer_class_overrides: {},
    }, 'u')).toThrow();
  });
  it('recomputeAllAMCRiskScores updates audit_trail with action risk_recomputed_from_settings', () => {
    const r = createAMCRecord({
      entity_id: 'OPRX', branch_id: 'BR', customer_id: 'C', sales_invoice_id: null,
      amc_applicable: true, applicability_decided_at: null, applicability_decided_by: null, applicability_reason: '',
      amc_code: 'A', amc_type: 'comprehensive', contract_start: null, contract_end: '2026-12-31',
      billing_cycle: 'upfront', contract_value_paise: 100_000, billed_to_date_paise: 0, outstanding_paise: 0,
      commission_salesman_pct: 0, commission_receiver_pct: 0, commission_amc_pct: 0,
      risk_score: 0, risk_bucket: 'low', renewal_probability: 0,
      status: 'active', lifecycle_stage: 'active',
      oem_name: 'V', oem_sla_hours: null, iot_device_ids: [], whatsapp_lifecycle_phase: 'post_install',
      created_by: 't',
    });
    const result = recomputeAllAMCRiskScores('OPRX', 'sysuser');
    expect(result.recomputed).toBe(1);
    const got = getAMCRecord(r.id);
    expect(got?.audit_trail.some((a) => a.action === 'risk_recomputed_from_settings' && a.by === 'sysuser')).toBe(true);
  });
});
