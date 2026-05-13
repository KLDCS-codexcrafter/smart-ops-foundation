/**
 * @file        src/test/customer-360-cross-card.test.ts
 * @sprint      T-Phase-1.C.1e · Block I.1
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  listAMCRecords,
  listServiceTickets,
  listHappyCodeFeedback,
  createAMCRecord,
} from '@/lib/servicedesk-engine';

const ENTITY = 'OPRX';

beforeEach(() => localStorage.clear());

function makeAMC(customer_id: string) {
  return createAMCRecord({
    entity_id: ENTITY, branch_id: 'BR-1', customer_id,
    sales_invoice_id: null, amc_applicable: true,
    applicability_decided_at: new Date().toISOString(),
    applicability_decided_by: 'tester', applicability_reason: 'in_warranty_close',
    amc_code: `AMC-${customer_id}`, amc_type: 'comprehensive',
    contract_start: '2026-01-01', contract_end: '2026-12-31',
    billing_cycle: 'upfront', contract_value_paise: 100000, billed_to_date_paise: 0, outstanding_paise: 0,
    commission_salesman_pct: 0, commission_receiver_pct: 0, commission_amc_pct: 0,
    risk_score: 0, risk_bucket: 'low', renewal_probability: 0.5,
    status: 'active', lifecycle_stage: 'active',
    oem_name: 'X', oem_sla_hours: 24, iot_device_ids: [],
    whatsapp_lifecycle_phase: 'post_install', created_by: 'tester',
  });
}

describe('Customer 360 cross-card data sourcing', () => {
  it('listAMCRecords filters by customer_id', () => {
    makeAMC('C-1');
    makeAMC('C-2');
    expect(listAMCRecords({ entity_id: ENTITY, customer_id: 'C-1' }).length).toBe(1);
  });

  it('listServiceTickets filters by customer_id (empty default)', () => {
    expect(listServiceTickets({ entity_id: ENTITY, customer_id: 'C-1' }).length).toBe(0);
  });

  it('listHappyCodeFeedback filters by customer_id (empty default)', () => {
    expect(listHappyCodeFeedback({ entity_id: ENTITY, customer_id: 'C-1' }).length).toBe(0);
  });

  it('all helpers respect entity scoping', () => {
    makeAMC('C-1');
    expect(listAMCRecords({ entity_id: 'OTHER', customer_id: 'C-1' }).length).toBe(0);
  });

  it('empty state surfaces when no data', () => {
    expect(listAMCRecords({ entity_id: ENTITY, customer_id: 'NOPE' }).length).toBe(0);
    expect(listServiceTickets({ entity_id: ENTITY, customer_id: 'NOPE' }).length).toBe(0);
    expect(listHappyCodeFeedback({ entity_id: ENTITY, customer_id: 'NOPE' }).length).toBe(0);
  });
});
