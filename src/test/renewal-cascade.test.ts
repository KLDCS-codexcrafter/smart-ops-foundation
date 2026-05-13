/**
 * @file        src/test/renewal-cascade.test.ts
 * @sprint      T-Phase-1.C.1b · Block I.3
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAMCRecord,
  fireRenewalCascadeStage,
  listCascadeFiresForAMC,
  getCascadeStageForAMC,
} from '@/lib/servicedesk-engine';

const mkAmc = (contract_end: string | null) =>
  createAMCRecord({
    entity_id: 'OPRX', branch_id: 'BR-1', customer_id: 'C-1', sales_invoice_id: null,
    amc_applicable: true, applicability_decided_at: null, applicability_decided_by: null, applicability_reason: '',
    amc_code: 'A1', amc_type: 'comprehensive', contract_start: null, contract_end,
    billing_cycle: 'upfront', contract_value_paise: 100, billed_to_date_paise: 0, outstanding_paise: 0,
    commission_salesman_pct: 0, commission_receiver_pct: 0, commission_amc_pct: 0,
    risk_score: 0, risk_bucket: 'low', renewal_probability: 50,
    status: 'active', lifecycle_stage: 'active',
    oem_name: 'V', oem_sla_hours: null, iot_device_ids: [], whatsapp_lifecycle_phase: 'post_install',
    created_by: 'test',
  });

const isoDaysFromNow = (n: number): string => new Date(Date.now() + n * 86400 * 1000).toISOString();

beforeEach(() => localStorage.clear());

describe('Renewal cascade', () => {
  it('returns first at 89 days', () => {
    const a = mkAmc(isoDaysFromNow(89));
    expect(getCascadeStageForAMC(a.id)).toBe('first');
  });
  it('returns second at 59', () => {
    const a = mkAmc(isoDaysFromNow(59));
    expect(getCascadeStageForAMC(a.id)).toBe('second');
  });
  it('returns third at 29', () => {
    const a = mkAmc(isoDaysFromNow(29));
    expect(getCascadeStageForAMC(a.id)).toBe('third');
  });
  it('returns final at 6', () => {
    const a = mkAmc(isoDaysFromNow(6));
    expect(getCascadeStageForAMC(a.id)).toBe('final');
  });
  it('returns null at 100 days', () => {
    const a = mkAmc(isoDaysFromNow(100));
    expect(getCascadeStageForAMC(a.id)).toBeNull();
  });
  it('fireRenewalCascadeStage creates record', () => {
    const a = mkAmc(isoDaysFromNow(50));
    const f = fireRenewalCascadeStage(a.id, 'second', 'user');
    expect(f.stage).toBe('second');
    expect(listCascadeFiresForAMC(a.id)).toHaveLength(1);
  });
  it('cascade history is append-only', () => {
    const a = mkAmc(isoDaysFromNow(50));
    fireRenewalCascadeStage(a.id, 'first', 'u');
    fireRenewalCascadeStage(a.id, 'second', 'u');
    expect(listCascadeFiresForAMC(a.id)).toHaveLength(2);
  });
});
