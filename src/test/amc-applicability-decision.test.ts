/**
 * @file        src/test/amc-applicability-decision.test.ts
 * @sprint      T-Phase-1.C.1b · Block I.1
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAMCRecord,
  decideAMCApplicability,
  getAMCsAwaitingApplicabilityDecision,
  getAMCRecord,
} from '@/lib/servicedesk-engine';

const baseInput = {
  entity_id: 'OPRX',
  branch_id: 'BR-1',
  customer_id: 'C-1',
  sales_invoice_id: 'INV-1',
  amc_applicable: null,
  applicability_decided_at: null,
  applicability_decided_by: null,
  applicability_reason: '',
  amc_code: '',
  amc_type: 'comprehensive' as const,
  contract_start: null,
  contract_end: null,
  billing_cycle: 'upfront' as const,
  contract_value_paise: 0,
  billed_to_date_paise: 0,
  outstanding_paise: 0,
  commission_salesman_pct: 0,
  commission_receiver_pct: 0,
  commission_amc_pct: 0,
  risk_score: 0,
  risk_bucket: 'low' as const,
  renewal_probability: 0,
  status: 'applicability_pending' as const,
  lifecycle_stage: 'applicability_decision' as const,
  oem_name: 'Voltas',
  oem_sla_hours: null,
  iot_device_ids: [],
  whatsapp_lifecycle_phase: 'post_install' as const,
  created_by: 'test',
};

beforeEach(() => localStorage.clear());

describe('AMC applicability decision', () => {
  it('lists AMCs with amc_applicable=null', () => {
    createAMCRecord(baseInput);
    expect(getAMCsAwaitingApplicabilityDecision('OPRX')).toHaveLength(1);
  });
  it('flips to proposal_draft when applicable', () => {
    const r = createAMCRecord(baseInput);
    const next = decideAMCApplicability(r.id, true, 'user1', 'fits criteria');
    expect(next.status).toBe('proposal_draft');
    expect(next.lifecycle_stage).toBe('proposal');
    expect(next.amc_applicable).toBe(true);
    expect(next.applicability_decided_by).toBe('user1');
  });
  it('flips to not_applicable when no', () => {
    const r = createAMCRecord(baseInput);
    const next = decideAMCApplicability(r.id, false, 'user1', 'CAPEX out of scope');
    expect(next.status).toBe('not_applicable');
    expect(next.lifecycle_stage).toBe('lapsed');
  });
  it('captures decided_by + reason in audit_trail', () => {
    const r = createAMCRecord(baseInput);
    decideAMCApplicability(r.id, true, 'user1', 'reason X');
    const got = getAMCRecord(r.id);
    expect(got?.audit_trail.some((a) => a.action === 'applicability_decided' && a.by === 'user1')).toBe(true);
  });
  it('excludes decided AMCs from pending list', () => {
    const r = createAMCRecord(baseInput);
    decideAMCApplicability(r.id, true, 'u', '');
    expect(getAMCsAwaitingApplicabilityDecision('OPRX')).toHaveLength(0);
  });
  it('persists across reads', () => {
    const r = createAMCRecord(baseInput);
    decideAMCApplicability(r.id, true, 'u', 'r');
    expect(getAMCRecord(r.id)?.amc_applicable).toBe(true);
  });
});
