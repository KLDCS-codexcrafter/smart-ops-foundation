/**
 * @file        src/test/tier-1-oobs.test.ts
 * @sprint      T-Phase-1.C.1e · Block I.5 · S21 Service Availed + S23 Comm Log + integrations
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordServiceAvailed,
  listServiceAvailedForAMC,
  computeRemainingServices,
  createAMCRecord,
  createCustomerReminder,
  listAllRemindersForCustomer,
} from '@/lib/servicedesk-engine';

const ENTITY = 'OPRX';

beforeEach(() => localStorage.clear());

function makeAMC(extra: Record<string, unknown> = {}) {
  return createAMCRecord({
    entity_id: ENTITY, branch_id: 'BR-1', customer_id: 'C-1',
    sales_invoice_id: null, amc_applicable: true,
    applicability_decided_at: new Date().toISOString(),
    applicability_decided_by: 'tester', applicability_reason: 'in_warranty_close',
    amc_code: 'AMC-1', amc_type: 'comprehensive',
    contract_start: '2026-01-01', contract_end: '2026-12-31',
    billing_cycle: 'upfront', contract_value_paise: 100000,
    billed_to_date_paise: 0, outstanding_paise: 0,
    commission_salesman_pct: 0, commission_receiver_pct: 0, commission_amc_pct: 0,
    risk_score: 0, risk_bucket: 'low', renewal_probability: 0.5,
    status: 'active', lifecycle_stage: 'active',
    oem_name: 'X', oem_sla_hours: 24, iot_device_ids: [],
    whatsapp_lifecycle_phase: 'post_install', created_by: 'tester',
    ...extra,
  });
}

describe('S21 Service Availed', () => {
  it('recordServiceAvailed throws for unknown AMC', () => {
    expect(() => recordServiceAvailed('nope', 'TK-1', 0, ENTITY)).toThrow();
  });

  it('recordServiceAvailed persists and listServiceAvailedForAMC returns it', () => {
    const amc = makeAMC();
    recordServiceAvailed(amc.id, 'TK-1', 5000, ENTITY);
    const list = listServiceAvailedForAMC(amc.id, ENTITY);
    expect(list.length).toBe(1);
    expect(list[0].spares_value_paise).toBe(5000);
  });

  it('computeRemainingServices returns 0 for unknown AMC', () => {
    const r = computeRemainingServices('nope', ENTITY);
    expect(r.included).toBe(0);
    expect(r.availed).toBe(0);
    expect(r.remaining).toBe(0);
  });

  it('computeRemainingServices counts availed records', () => {
    const amc = makeAMC({ included_service_count: 5 } as Record<string, unknown>);
    recordServiceAvailed(amc.id, 'TK-1', 0, ENTITY);
    recordServiceAvailed(amc.id, 'TK-2', 0, ENTITY);
    const r = computeRemainingServices(amc.id, ENTITY);
    expect(r.included).toBe(5);
    expect(r.availed).toBe(2);
    expect(r.remaining).toBe(3);
  });

  it('remaining never goes negative', () => {
    const amc = makeAMC({ included_service_count: 1 } as Record<string, unknown>);
    recordServiceAvailed(amc.id, 'TK-1', 0, ENTITY);
    recordServiceAvailed(amc.id, 'TK-2', 0, ENTITY);
    const r = computeRemainingServices(amc.id, ENTITY);
    expect(r.remaining).toBe(0);
  });
});

describe('S23 CustomerCommLog · aggregates reminders for customer', () => {
  it('lists all reminders newest first', () => {
    createCustomerReminder({
      entity_id: ENTITY, customer_id: 'C-X', reminder_type: 'birthday',
      trigger_date: '2027-01-01', advance_days: 7, template_id: null,
      notes: '', created_by: 'tester',
    });
    createCustomerReminder({
      entity_id: ENTITY, customer_id: 'C-X', reminder_type: 'amc_anniversary',
      trigger_date: '2027-02-01', advance_days: 7, template_id: null,
      notes: '', created_by: 'tester',
    });
    createCustomerReminder({
      entity_id: ENTITY, customer_id: 'OTHER', reminder_type: 'birthday',
      trigger_date: '2027-01-01', advance_days: 7, template_id: null,
      notes: '', created_by: 'tester',
    });
    expect(listAllRemindersForCustomer('C-X', ENTITY).length).toBe(2);
  });
});
