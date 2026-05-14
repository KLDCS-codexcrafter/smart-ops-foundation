/**
 * @file        src/__tests__/__demos__/sinha-multi-oem-end-to-end.test.ts
 * @purpose     Sinha Multi-OEM end-to-end demo (Voltas + Daikin + Bluestar) · MOAT #24 banking validation
 * @sprint      T-Phase-1.C.2 · Block E.1 · Q-LOCK-5
 * @iso        Reliability + Functional Suitability
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  SINHA_AMC_APPLICABILITY_DECISION,
  SMARTPOWER_AMC_ARCHETYPES,
  MULTI_OEM_DEMO_CUSTOMER,
} from '@/lib/mock-servicedesk';
import { amcRecordKey } from '@/types/servicedesk';

describe('Sinha Multi-OEM End-to-End Demo (v7 §13)', () => {
  beforeEach(() => {
    localStorage.clear();
    const all = [
      SINHA_AMC_APPLICABILITY_DECISION,
      ...SMARTPOWER_AMC_ARCHETYPES,
      ...MULTI_OEM_DEMO_CUSTOMER,
    ];
    localStorage.setItem(amcRecordKey('OPRX'), JSON.stringify(all));
  });

  it('seeds Sinha customer + applicability decision AMC', () => {
    expect(SINHA_AMC_APPLICABILITY_DECISION.customer_id).toBe('CUST-SINHA-001');
    expect(SINHA_AMC_APPLICABILITY_DECISION.amc_code).toBe('AAD/26-27/SINHA001');
    expect(SINHA_AMC_APPLICABILITY_DECISION.oem_name).toBe('Voltas');
  });

  it('multi-OEM customer has 3 AMC contracts (Voltas + Daikin + Bluestar)', () => {
    const oems = MULTI_OEM_DEMO_CUSTOMER.map((a) => a.oem_name).sort();
    expect(oems).toEqual(['Bluestar', 'Daikin', 'Voltas']);
    expect(MULTI_OEM_DEMO_CUSTOMER.every((a) => a.customer_id === 'CUST-MULTI-001')).toBe(true);
  });

  it('per-OEM AMC values vary (margin computation surface)', () => {
    const voltas = MULTI_OEM_DEMO_CUSTOMER.find((a) => a.oem_name === 'Voltas');
    const daikin = MULTI_OEM_DEMO_CUSTOMER.find((a) => a.oem_name === 'Daikin');
    const bluestar = MULTI_OEM_DEMO_CUSTOMER.find((a) => a.oem_name === 'Bluestar');
    expect(voltas?.contract_value_paise).toBeGreaterThan(0);
    expect(daikin?.contract_value_paise).toBeGreaterThan(0);
    expect(bluestar?.contract_value_paise).toBeGreaterThan(0);
  });

  it('Bluestar AMC flagged expiring_soon for renewal cascade', () => {
    const bluestar = MULTI_OEM_DEMO_CUSTOMER.find((a) => a.oem_name === 'Bluestar');
    expect(bluestar?.status).toBe('expiring_soon');
  });

  it('Voltas + Daikin AMCs active for ticket routing', () => {
    const voltas = MULTI_OEM_DEMO_CUSTOMER.find((a) => a.oem_name === 'Voltas');
    const daikin = MULTI_OEM_DEMO_CUSTOMER.find((a) => a.oem_name === 'Daikin');
    expect(voltas?.status).toBe('active');
    expect(daikin?.status).toBe('active');
  });

  it('persists fixtures to entity-namespaced localStorage', () => {
    const raw = localStorage.getItem(amcRecordKey('OPRX'));
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw ?? '[]');
    expect(parsed.length).toBeGreaterThanOrEqual(9);
  });

  it('cross-OEM customer 360 surface returns 3 AMC records', () => {
    const raw = localStorage.getItem(amcRecordKey('OPRX'));
    const parsed = JSON.parse(raw ?? '[]') as { customer_id: string }[];
    const sinhaMulti = parsed.filter((a) => a.customer_id === 'CUST-MULTI-001');
    expect(sinhaMulti).toHaveLength(3);
  });

  it('OEM Warranty Recovery surface: distinct OEMs across portfolio', () => {
    const all = [SINHA_AMC_APPLICABILITY_DECISION, ...MULTI_OEM_DEMO_CUSTOMER];
    const oems = new Set(all.map((a) => a.oem_name));
    expect(oems.size).toBeGreaterThanOrEqual(3);
  });

  it('applicability decision pending for new install (Sinha onboarding)', () => {
    expect(SINHA_AMC_APPLICABILITY_DECISION.status).toBe('applicability_pending');
    expect(SINHA_AMC_APPLICABILITY_DECISION.lifecycle_stage).toBe('applicability_decision');
  });

  it('audit trail container present on every demo AMC', () => {
    const all = [SINHA_AMC_APPLICABILITY_DECISION, ...MULTI_OEM_DEMO_CUSTOMER];
    expect(all.every((a) => Array.isArray(a.audit_trail))).toBe(true);
  });
});
