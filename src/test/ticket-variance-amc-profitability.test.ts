/**
 * @file        src/test/ticket-variance-amc-profitability.test.ts
 * @purpose     C.1d · computeTicketVariance + computeAMCProfitability analytics
 * @sprint      T-Phase-1.C.1d · Block H.3
 * @iso         Functional Suitability + Reliability
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  raiseServiceTicket,
  acknowledgeTicket,
  startTicketWork,
  markTicketResolved,
  computeTicketVariance,
  createAMCRecord,
  computeAMCProfitability,
} from '@/lib/servicedesk-engine';

const ENTITY = 'OPRX';

describe('computeTicketVariance', () => {
  beforeEach(() => localStorage.clear());

  it('returns null for tickets that are not closed', () => {
    const t = raiseServiceTicket({
      entity_id: ENTITY, branch_id: 'BR-1', customer_id: 'C-1', amc_record_id: null,
      call_type_code: 'REPAIR', channel: 'phone', severity: 'sev3_medium',
      description: 'noise', created_by: 'tester',
    });
    acknowledgeTicket(t.id, 'tester', ENTITY);
    const v = computeTicketVariance(t.id, { timeline_days: 1, cost_paise: 100000, route_type: 'in_warranty', spares_qty: 0 }, ENTITY);
    expect(v).toBeNull();
  });
});

describe('computeAMCProfitability', () => {
  beforeEach(() => localStorage.clear());

  it('returns null for unknown AMC id', () => {
    const r = computeAMCProfitability('nope', ENTITY);
    expect(r).toBeNull();
  });

  it('revenue == billed_to_date and cost == 0 for AMC with no tickets', () => {
    const amc = createAMCRecord({
      entity_id: ENTITY, branch_id: 'BR-1', customer_id: 'C-1', invoice_id: 'INV-1',
      amc_value_paise: 12_00_000, billed_to_date_paise: 6_00_000,
      contract_start: '2026-01-01', contract_end: '2026-12-31',
      lifecycle_stage: 'active', call_credits_remaining: 10,
      pms_calls_completed_count: 0, pms_calls_total_count: 4,
      created_by: 'tester',
    });
    const r = computeAMCProfitability(amc.id, ENTITY);
    expect(r).toBeTruthy();
    expect(r?.revenue_paise).toBe(6_00_000);
    expect(r?.cost_paise).toBe(0);
    expect(r?.margin_paise).toBe(6_00_000);
    expect(r?.margin_pct).toBe(100);
  });
});
