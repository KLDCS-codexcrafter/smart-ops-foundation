/**
 * @file        src/test/service-ticket-lifecycle.test.ts
 * @purpose     ServiceTicket 8-state lifecycle + HappyCode OTP gate
 * @sprint      T-Phase-1.C.1c · Block H.1
 * @iso        Reliability + Functional Suitability
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  raiseServiceTicket,
  acknowledgeTicket,
  assignTicketToEngineer,
  startTicketWork,
  putTicketOnHold,
  markTicketResolved,
  closeTicket,
  reopenTicket,
  listServiceTickets,
} from '@/lib/servicedesk-engine';

const ENTITY = 'OPRX';

function baseInput(): Parameters<typeof raiseServiceTicket>[0] {
  return {
    entity_id: ENTITY,
    branch_id: 'BR-1',
    customer_id: 'CUST-001',
    amc_record_id: null,
    call_type_code: 'CT-BREAKDOWN',
    channel: 'phone',
    severity: 'sev2_high',
    description: 'AC not cooling',
    sla_response_due_at: null,
    sla_resolution_due_at: null,
    flash_timer_minutes_remaining: 240,
    escalation_level: 0,
    assigned_engineer_id: null,
    repair_route_id: null,
    standby_loan_id: null,
    customer_in_voucher_id: null,
    customer_out_voucher_id: null,
    happy_code_otp_verified: false,
    happy_code_feedback_id: null,
    spares_consumed: [],
    photos: [],
    created_by: 'desk_user',
  };
}

describe('ServiceTicket lifecycle · 8 states', () => {
  beforeEach(() => localStorage.clear());

  it('raise → acknowledge → assign → start → resolve → close (with OTP)', () => {
    const t = raiseServiceTicket(baseInput());
    expect(t.status).toBe('raised');
    expect(t.ticket_no).toMatch(/^ST/);
    const ack = acknowledgeTicket(t.id, 'agent', ENTITY);
    expect(ack.status).toBe('acknowledged');
    expect(ack.acked_at).toBeTruthy();
    const asg = assignTicketToEngineer(t.id, 'ENG-1', 'agent', ENTITY);
    expect(asg.status).toBe('assigned');
    expect(asg.assigned_engineer_id).toBe('ENG-1');
    const wip = startTicketWork(t.id, 'ENG-1', ENTITY);
    expect(wip.status).toBe('in_progress');
    const res = markTicketResolved(t.id, 'ENG-1', ENTITY);
    expect(res.status).toBe('resolved');
    const closed = closeTicket(t.id, 'agent', true, ENTITY);
    expect(closed.status).toBe('closed');
    expect(closed.happy_code_otp_verified).toBe(true);
  });

  it('closeTicket BLOCKS without HappyCode OTP (Q-LOCK-7)', () => {
    const t = raiseServiceTicket(baseInput());
    markTicketResolved(t.id, 'ENG-1', ENTITY);
    expect(() => closeTicket(t.id, 'agent', false, ENTITY)).toThrow(/HappyCode/);
  });

  it('on_hold and reopen transitions', () => {
    const t = raiseServiceTicket(baseInput());
    const held = putTicketOnHold(t.id, 'ENG-1', 'awaiting parts', ENTITY);
    expect(held.status).toBe('on_hold');
    expect(held.on_hold_since).toBeTruthy();
    markTicketResolved(t.id, 'ENG-1', ENTITY);
    closeTicket(t.id, 'agent', true, ENTITY);
    const reop = reopenTicket(t.id, 'agent', 'recurrence', ENTITY);
    expect(reop.status).toBe('reopened');
    expect(reop.reopened_count).toBe(1);
  });

  it('audit trail accumulates entries', () => {
    const t = raiseServiceTicket(baseInput());
    acknowledgeTicket(t.id, 'agent', ENTITY);
    const found = listServiceTickets({ entity_id: ENTITY }).find((x) => x.id === t.id);
    expect(found?.audit_trail.length).toBeGreaterThanOrEqual(2);
  });
});
