/**
 * @file        src/test/ticket-variance-amc-profitability.test.ts
 * @purpose     C.1d · computeTicketVariance + computeAMCProfitability analytics
 * @sprint      T-Phase-1.C.1d · Block H.3
 * @iso         Functional Suitability + Reliability
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeTicketVariance,
  createAMCRecord,
  computeAMCProfitability,
} from '@/lib/servicedesk-engine';
import type { AMCRecord } from '@/types/servicedesk';

const ENTITY = 'OPRX';

type AMCInput = Omit<AMCRecord, 'id' | 'created_at' | 'updated_at' | 'audit_trail'>;

function makeAMCInput(overrides: Partial<AMCInput> = {}): AMCInput {
  return {
    entity_id: ENTITY,
    branch_id: 'BR-1',
    customer_id: 'C-1',
    sales_invoice_id: 'INV-1',
    amc_applicable: true,
    applicability_decided_at: new Date().toISOString(),
    applicability_decided_by: 'tester',
    applicability_reason: 'in_warranty_close',
    amc_code: 'AMC-T1',
    amc_type: 'comprehensive',
    contract_start: '2026-01-01',
    contract_end: '2026-12-31',
    billing_cycle: 'annual',
    contract_value_paise: 12_00_000,
    billed_to_date_paise: 6_00_000,
    outstanding_paise: 6_00_000,
    commission_salesman_pct: 2.5,
    commission_receiver_pct: 1,
    commission_amc_pct: 5,
    risk_score: 30,
    risk_bucket: 'low',
    renewal_probability: 0.7,
    status: 'active',
    lifecycle_stage: 'active',
    oem_name: 'BoschIN',
    oem_sla_hours: 24,
    iot_device_ids: [],
    whatsapp_lifecycle_phase: 'post_install',
    created_by: 'tester',
    ...overrides,
  };
}

describe('computeTicketVariance', () => {
  beforeEach(() => localStorage.clear());

  it('returns null for unknown ticket', () => {
    const v = computeTicketVariance('nope', { timeline_days: 1, cost_paise: 100, route_type: 'in_warranty', spares_qty: 0 }, ENTITY);
    expect(v).toBeNull();
  });
});

describe('computeAMCProfitability', () => {
  beforeEach(() => localStorage.clear());

  it('returns null for unknown AMC id', () => {
    expect(computeAMCProfitability('nope', ENTITY)).toBeNull();
  });

  it('revenue == billed_to_date and cost == 0 for AMC with no tickets', () => {
    const amc = createAMCRecord(makeAMCInput());
    const r = computeAMCProfitability(amc.id, ENTITY);
    expect(r).toBeTruthy();
    expect(r?.revenue_paise).toBe(6_00_000);
    expect(r?.cost_paise).toBe(0);
    expect(r?.margin_paise).toBe(6_00_000);
    expect(r?.margin_pct).toBe(100);
  });

  it('zero revenue yields margin_pct 0', () => {
    const amc = createAMCRecord(makeAMCInput({ billed_to_date_paise: 0 }));
    const r = computeAMCProfitability(amc.id, ENTITY);
    expect(r?.margin_pct).toBe(0);
  });
});
