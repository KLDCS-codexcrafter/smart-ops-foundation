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
