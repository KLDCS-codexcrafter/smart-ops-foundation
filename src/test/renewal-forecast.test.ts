/**
 * @file        src/test/renewal-forecast.test.ts
 * @sprint      T-Phase-1.C.1b · Block I.6
 */
import { describe, it, expect } from 'vitest';
import { buildForecast } from '@/pages/erp/servicedesk/reports/AMCRenewalForecast';
import type { AMCRecord } from '@/types/servicedesk';

const NOW = new Date('2026-05-15T00:00:00Z');

const mk = (overrides: Partial<AMCRecord>): AMCRecord => ({
  id: overrides.id ?? `a-${Math.random()}`,
  entity_id: 'OPRX', branch_id: 'BR-1', customer_id: 'C', sales_invoice_id: null,
  amc_applicable: true, applicability_decided_at: null, applicability_decided_by: null, applicability_reason: '',
  amc_code: 'A', amc_type: 'comprehensive', contract_start: null, contract_end: null,
  billing_cycle: 'upfront', contract_value_paise: 100_00, billed_to_date_paise: 0, outstanding_paise: 0,
  commission_salesman_pct: 0, commission_receiver_pct: 0, commission_amc_pct: 0,
  risk_score: 0, risk_bucket: 'low', renewal_probability: 50,
  status: 'active', lifecycle_stage: 'active',
  oem_name: 'V', oem_sla_hours: null, iot_device_ids: [], whatsapp_lifecycle_phase: 'post_install',
  created_at: '', updated_at: '', created_by: 't', audit_trail: [],
  ...overrides,
});

describe('Renewal forecast builder', () => {
  it('produces 6 buckets', () => {
    const data = buildForecast([], 'oem', NOW);
    expect(data).toHaveLength(6);
  });
  it('aggregates value into correct month', () => {
    const data = buildForecast([mk({ contract_end: '2026-07-20', contract_value_paise: 200_00 })], 'oem', NOW);
    expect(data[2].total).toBe(200);
  });
  it('risk-adjusted multiplies by renewal_probability/100', () => {
    const data = buildForecast([mk({ contract_end: '2026-06-15', contract_value_paise: 100_00, renewal_probability: 80 })], 'oem', NOW);
    expect(data[1].risk_adjusted).toBeCloseTo(80);
  });
  it('group-by oem aggregates per group', () => {
    const data = buildForecast([
      mk({ contract_end: '2026-06-01', oem_name: 'Voltas', contract_value_paise: 100_00 }),
      mk({ contract_end: '2026-06-10', oem_name: 'Daikin', contract_value_paise: 50_00 }),
    ], 'oem', NOW);
    expect(data[1].group['Voltas']).toBe(100);
    expect(data[1].group['Daikin']).toBe(50);
  });
  it('group-by branch aggregates', () => {
    const data = buildForecast([mk({ contract_end: '2026-06-01', branch_id: 'BR-MUM', contract_value_paise: 100_00 })], 'branch', NOW);
    expect(data[1].group['BR-MUM']).toBe(100);
  });
  it('returns zero-totals when empty', () => {
    const data = buildForecast([], 'oem', NOW);
    expect(data.every((d) => d.total === 0)).toBe(true);
  });
});
