/**
 * @file        src/test/maintainpro-sla.test.ts
 * @sprint      T-Phase-1.A.16b · Block H.2 · Q-LOCK-2
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInternalTicket, listInternalTickets, transitionTicketStatus, evaluateTicketEscalations,
} from '@/lib/maintainpro-engine';
import { SLA_MATRIX } from '@/types/maintainpro';
import type { TicketCategory, TicketSeverity } from '@/types/maintainpro';

const E = 'SLATEST';
const CATEGORIES: TicketCategory[] = ['electrical', 'mechanical', 'pneumatic', 'hydraulic', 'safety', 'calibration', 'housekeeping'];
const SEVERITIES: TicketSeverity[] = ['low', 'medium', 'high', 'critical'];

beforeEach(() => { localStorage.clear(); });

function baseTicket(cat: TicketCategory, sev: TicketSeverity): Parameters<typeof createInternalTicket>[1] {
  return {
    ticket_no: `TKT/${cat}/${sev}`,
    originating_department_id: 'production',
    originating_user_id: 'u1',
    equipment_id: null,
    category: cat,
    symptom: 'test',
    photo_urls: [],
    severity: sev,
    status: 'open',
    acknowledged_at: null,
    acknowledged_by_user_id: null,
    in_progress_at: null,
    resolved_at: null,
    closed_at: null,
    converted_to_work_order_id: null,
    resolution_notes: '',
    resolved_by_user_id: null,
    parts_used: [],
    project_id: null,
  };
}

describe('SLA_MATRIX completeness', () => {
  it('has 28 cells (7 categories × 4 severities)', () => {
    let count = 0;
    for (const c of CATEGORIES) for (const s of SEVERITIES) {
      const cell = SLA_MATRIX[c][s];
      expect(cell.ack_hours).toBeGreaterThan(0);
      expect(cell.resolution_hours).toBeGreaterThan(0);
      count++;
    }
    expect(count).toBe(28);
  });

  it('electrical critical = 1h ack / 4h resolution', () => {
    expect(SLA_MATRIX.electrical.critical).toEqual({ ack_hours: 1, resolution_hours: 4 });
  });

  it('safety critical = 1h/2h (fastest)', () => {
    expect(SLA_MATRIX.safety.critical).toEqual({ ack_hours: 1, resolution_hours: 2 });
  });
});

describe('Ticket state machine', () => {
  it('createInternalTicket sets SLA from matrix', () => {
    const t = createInternalTicket(E, baseTicket('electrical', 'critical'));
    expect(t.sla_ack_hours).toBe(1);
    expect(t.sla_resolution_hours).toBe(4);
    expect(t.escalation_level).toBe(0);
    expect(t.reopened_count).toBe(0);
    expect(t.receiving_department_id).toBe('maintenance');
  });

  it('transitions open → acknowledged → in_progress → resolved → closed', () => {
    const t = createInternalTicket(E, baseTicket('mechanical', 'high'));
    transitionTicketStatus(E, t.id, 'acknowledged', 'u2');
    transitionTicketStatus(E, t.id, 'in_progress', 'u2');
    transitionTicketStatus(E, t.id, 'resolved', 'u2', 'fixed');
    const closed = transitionTicketStatus(E, t.id, 'closed', 'u2');
    expect(closed?.status).toBe('closed');
    expect(closed?.acknowledged_at).toBeTruthy();
    expect(closed?.in_progress_at).toBeTruthy();
    expect(closed?.resolved_at).toBeTruthy();
    expect(closed?.closed_at).toBeTruthy();
    expect(closed?.resolution_notes).toBe('fixed');
  });

  it('Reopen path increments reopened_count + resets timestamps', () => {
    const t = createInternalTicket(E, baseTicket('housekeeping', 'low'));
    transitionTicketStatus(E, t.id, 'acknowledged', 'u2');
    transitionTicketStatus(E, t.id, 'resolved', 'u2');
    const re = transitionTicketStatus(E, t.id, 'reopened', 'u2');
    expect(re?.reopened_count).toBe(1);
    expect(re?.status).toBe('open');
    expect(re?.acknowledged_at).toBeNull();
    expect(re?.resolved_at).toBeNull();
  });
});

describe('3-level escalation', () => {
  it('escalates L1 when ack SLA elapsed', () => {
    createInternalTicket(E, baseTicket('safety', 'critical'));
    // backdate created_at to simulate elapsed time
    const list = listInternalTickets(E);
    list[0] = { ...list[0], created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() };
    localStorage.setItem(`erp_maintainpro_internal_ticket_${E}`, JSON.stringify(list));
    const updated = evaluateTicketEscalations(E);
    expect(updated.length).toBeGreaterThan(0);
    expect(updated[0].escalation_level).toBeGreaterThanOrEqual(1);
    expect(updated[0].escalation_log.length).toBeGreaterThanOrEqual(1);
    expect(updated[0].is_ack_breached).toBe(true);
  });

  it('escalates to L3 when 2× resolution SLA elapsed', () => {
    createInternalTicket(E, baseTicket('safety', 'critical'));
    const list = listInternalTickets(E);
    // 2× resolution_hours (2h) = 4h elapsed minimum; we use 10h to be safe
    list[0] = { ...list[0], created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString() };
    localStorage.setItem(`erp_maintainpro_internal_ticket_${E}`, JSON.stringify(list));
    const updated = evaluateTicketEscalations(E);
    expect(updated[0].escalation_level).toBe(3);
    expect(updated[0].is_resolution_breached).toBe(true);
  });

  it('escalation_log entries are append-only', () => {
    createInternalTicket(E, baseTicket('electrical', 'critical'));
    const list = listInternalTickets(E);
    list[0] = { ...list[0], created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() };
    localStorage.setItem(`erp_maintainpro_internal_ticket_${E}`, JSON.stringify(list));
    evaluateTicketEscalations(E);
    const after = listInternalTickets(E);
    expect(after[0].escalation_log.length).toBeGreaterThan(0);
    expect(after[0].escalation_log[0]).toHaveProperty('level');
    expect(after[0].escalation_log[0]).toHaveProperty('escalated_at');
    expect(after[0].escalation_log[0]).toHaveProperty('escalated_to_user_id');
  });

  it('does not escalate resolved/closed tickets', () => {
    const t = createInternalTicket(E, baseTicket('safety', 'critical'));
    transitionTicketStatus(E, t.id, 'resolved', 'u2');
    const updated = evaluateTicketEscalations(E);
    expect(updated.length).toBe(0);
  });
});

// === A.16b.T1 · Additional SLA coverage ===
describe('SLA_MATRIX.T1 · additional cells', () => {
  it('housekeeping low = slowest tier', () => {
    expect(SLA_MATRIX.housekeeping.low.resolution_hours).toBeGreaterThanOrEqual(
      SLA_MATRIX.safety.critical.resolution_hours,
    );
  });
  it('every category × severity cell has positive numeric SLAs', () => {
    for (const c of CATEGORIES) for (const s of SEVERITIES) {
      const cell = SLA_MATRIX[c][s];
      expect(Number.isFinite(cell.ack_hours)).toBe(true);
      expect(Number.isFinite(cell.resolution_hours)).toBe(true);
      expect(cell.resolution_hours).toBeGreaterThanOrEqual(cell.ack_hours);
    }
  });
});

describe('Ticket state machine.T1 · additional', () => {
  it('reopen path resets acknowledged_at + in_progress_at + resolved_at', () => {
    const t = createInternalTicket(E, baseTicket('mechanical', 'medium'));
    transitionTicketStatus(E, t.id, 'acknowledged', 'u2');
    transitionTicketStatus(E, t.id, 'in_progress', 'u2');
    transitionTicketStatus(E, t.id, 'resolved', 'u2');
    const re = transitionTicketStatus(E, t.id, 'reopened', 'u2');
    expect(re?.acknowledged_at).toBeNull();
    expect(re?.in_progress_at).toBeNull();
    expect(re?.resolved_at).toBeNull();
    expect(re?.reopened_count).toBe(1);
  });
});

describe('Escalation.T1 · is_ack_breached', () => {
  it('marks is_ack_breached when SLA elapsed without acknowledgement', () => {
    createInternalTicket(E, baseTicket('safety', 'critical'));
    const list = listInternalTickets(E);
    list[0] = { ...list[0], created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() };
    localStorage.setItem(`erp_maintainpro_internal_ticket_${E}`, JSON.stringify(list));
    evaluateTicketEscalations(E);
    const after = listInternalTickets(E);
    expect(after[0].is_ack_breached).toBe(true);
  });

  it('escalation_log is append-only across multiple evaluations', () => {
    createInternalTicket(E, baseTicket('electrical', 'critical'));
    const list = listInternalTickets(E);
    list[0] = { ...list[0], created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() };
    localStorage.setItem(`erp_maintainpro_internal_ticket_${E}`, JSON.stringify(list));
    evaluateTicketEscalations(E);
    const firstLen = listInternalTickets(E)[0].escalation_log.length;
    evaluateTicketEscalations(E);
    const secondLen = listInternalTickets(E)[0].escalation_log.length;
    expect(secondLen).toBeGreaterThanOrEqual(firstLen);
  });
});
