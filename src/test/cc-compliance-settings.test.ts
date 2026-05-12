/**
 * Sprint T-Phase-1.C.1a · Block I.3 + I.4 · CC compliance settings + Call Type master
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getRiskEngineSettings,
  updateRiskEngineSettings,
  getCommissionRateSettings,
  updateCommissionRateSettings,
  getRenewalCascadeSettings,
  getServiceTierSettings,
  getEmailTemplateSettings,
  getSLAMatrixSettings,
  getTellicallerTriggerSettings,
  validateRiskWeights,
  validateRenewalCascade,
} from '@/lib/cc-compliance-settings';
import { STANDARD_CALL_TYPES } from '@/types/call-type';

beforeEach(() => localStorage.clear());

describe('cc-compliance-settings · 7 setting groups', () => {
  it('returns risk engine defaults', () => {
    const s = getRiskEngineSettings('OPRX');
    expect(s.risk_threshold_high).toBe(70);
  });
  it('updates and persists risk engine settings', () => {
    updateRiskEngineSettings('OPRX', { risk_threshold_high: 80 }, 'admin');
    expect(getRiskEngineSettings('OPRX').risk_threshold_high).toBe(80);
  });
  it('returns commission defaults', () => {
    expect(getCommissionRateSettings('OPRX').amc_default_rate).toBe(5.0);
  });
  it('updates commission settings', () => {
    updateCommissionRateSettings('OPRX', { amc_default_rate: 6.5 }, 'admin');
    expect(getCommissionRateSettings('OPRX').amc_default_rate).toBe(6.5);
  });
  it('returns renewal cascade 4-stage defaults', () => {
    const s = getRenewalCascadeSettings('OPRX');
    expect([s.first_reminder_days, s.second_reminder_days, s.third_reminder_days, s.final_reminder_days]).toEqual([90, 60, 30, 7]);
  });
  it('returns service tier + email template + SLA matrix + tellicaller defaults', () => {
    expect(getServiceTierSettings('OPRX').tiers.length).toBe(0);
    expect(getEmailTemplateSettings('OPRX').templates.length).toBe(0);
    expect(getSLAMatrixSettings('OPRX').matrix.length).toBe(28);
    expect(getTellicallerTriggerSettings('OPRX').triggers.length).toBeGreaterThan(0);
  });
});

describe('cc-compliance-settings · T2 audit log + validators', () => {
  it('audit-logs every settings update with updated_by (AC-T2-3)', () => {
    updateRiskEngineSettings('OPRX', { risk_threshold_high: 80 }, 'admin');
    const log = JSON.parse(localStorage.getItem('cc_compliance_v1_audit_OPRX') ?? '[]');
    expect(log.length).toBe(1);
    expect(log[0].by).toBe('admin');
    expect(log[0].setting_group).toBe('risk_engine');
  });
  it('validates risk weights sum to ~100 (AC-T2-10)', () => {
    expect(validateRiskWeights({ payment_history: 25, expiry_proximity: 25, contract_value: 25, service_status: 25, customer_activity: 0 }).valid).toBe(true);
    expect(validateRiskWeights({ payment_history: 10, expiry_proximity: 10, contract_value: 10, service_status: 10, customer_activity: 10 }).valid).toBe(false);
  });
  it('validates renewal cascade strictly descending', () => {
    expect(validateRenewalCascade({ first_reminder_days: 90, second_reminder_days: 60, third_reminder_days: 30, final_reminder_days: 7, oem_overrides: {}, customer_class_overrides: {} }).valid).toBe(true);
    expect(validateRenewalCascade({ first_reminder_days: 30, second_reminder_days: 60, third_reminder_days: 90, final_reminder_days: 7, oem_overrides: {}, customer_class_overrides: {} }).valid).toBe(false);
  });
});

describe('call-type master · 12 standard call types', () => {
  it('seeds 12 call types', () => {
    expect(STANDARD_CALL_TYPES.length).toBe(12);
  });
  it('all have unique codes', () => {
    const codes = new Set(STANDARD_CALL_TYPES.map((c) => c.call_type_code));
    expect(codes.size).toBe(12);
  });
  it('all have 3-level escalation matrices', () => {
    STANDARD_CALL_TYPES.forEach((c) => expect(c.escalation_matrix.length).toBe(3));
  });
});
