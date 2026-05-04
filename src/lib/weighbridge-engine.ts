/**
 * @file        weighbridge-engine.ts
 * @sprint      T-Phase-1.2.6f-d-2-card4-4-pre-2 · Block A · D-306 · D-308
 * @purpose     Weighbridge Ticket CRUD + 5-state machine + net computation.
 *              Manual entry + photo proof (Q1=A) · NO hardware integration.
 *              Doc-no via finecore-engine.generateDocNo with 'WB' prefix (D-308).
 * @reuses      types/weighbridge-ticket · finecore-engine.generateDocNo
 *              · decimal-helpers (dSub · round2) · audit-trail-hash-chain
 * [JWT] POST /api/weighbridge/tickets · PATCH /api/weighbridge/tickets/:id/weigh-in|weigh-out|close
 */

import type {
  WeighbridgeTicket, WeighbridgeTicketStatus,
} from '@/types/weighbridge-ticket';
import { weighbridgeTicketsKey } from '@/types/weighbridge-ticket';
import { generateDocNo } from '@/lib/finecore-engine';
import { dSub, round2 } from '@/lib/decimal-helpers';
import { appendAuditEntry } from '@/lib/audit-trail-hash-chain';

// ============================================================
// PUBLIC INPUT TYPES
// ============================================================

export interface CreateTicketInput {
  gate_pass_id: string;
  gate_pass_no: string;
  direction: 'inward' | 'outward';
  vehicle_no: string;
  vehicle_id?: string;
  weighbridge_serial?: string;
  remarks?: string;
}

export interface WeighInInput {
  ticket_id: string;
  gross_in_kg: number;
  tare_in_kg: number;
  in_photo_url?: string;
}

export interface WeighOutInput {
  ticket_id: string;
  gross_out_kg: number;
  tare_out_kg?: number;
  out_photo_url?: string;
}

export interface CloseTicketInput {
  ticket_id: string;
  variance_remarks?: string;
}

// ============================================================
// STATE MACHINE · Q5=A · 5 states
// ============================================================

const ALLOWED_TRANSITIONS: Record<WeighbridgeTicketStatus, WeighbridgeTicketStatus[]> = {
  pending_in:  ['pending_out'],   // weighIn moves to pending_out
  pending_out: ['weighed_out'],   // weighOut moves to weighed_out
  weighed_in:  ['pending_out'],   // legacy alias path (defensive)
  weighed_out: ['closed'],
  closed:      [],
};

// ============================================================
// PUBLIC FUNCTIONS
// ============================================================

export async function createTicket(
  input: CreateTicketInput,
  entityCode: string,
  byUserId: string,
): Promise<WeighbridgeTicket> {
  const now = new Date().toISOString();
  const ticket: WeighbridgeTicket = {
    id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `wb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    ticket_no: generateDocNo('WB', entityCode),
    entity_id: entityCode,
    entity_code: entityCode,
    status: 'pending_in',
    gate_pass_id: input.gate_pass_id,
    gate_pass_no: input.gate_pass_no,
    direction: input.direction,
    vehicle_no: input.vehicle_no.trim().toUpperCase(),
    vehicle_id: input.vehicle_id,
    weighbridge_serial: input.weighbridge_serial,
    remarks: input.remarks,
    created_at: now,
    created_by_user_id: byUserId,
    updated_at: now,
  };

  const list = read(entityCode);
  list.push(ticket);
  write(entityCode, list);

  await appendAuditEntry({
    entityCode, entityId: entityCode, voucherId: ticket.id,
    voucherKind: 'vendor_quotation',
    action: 'weighbridge_ticket_created',
    actorUserId: byUserId,
    payload: {
      ticket_no: ticket.ticket_no,
      gate_pass_no: ticket.gate_pass_no,
      direction: ticket.direction,
      vehicle_no: ticket.vehicle_no,
    },
  });

  return ticket;
}

export async function weighIn(
  input: WeighInInput,
  entityCode: string,
  byUserId: string,
): Promise<WeighbridgeTicket | null> {
  const list = read(entityCode);
  const idx = list.findIndex((t) => t.id === input.ticket_id);
  if (idx < 0) return null;
  const cur = list[idx];
  assertTransition(cur.status, 'pending_out');

  const net_in_kg = round2(dSub(input.gross_in_kg, input.tare_in_kg));
  const now = new Date().toISOString();
  const updated: WeighbridgeTicket = {
    ...cur,
    status: 'pending_out',
    gross_in_kg: input.gross_in_kg,
    tare_in_kg: input.tare_in_kg,
    net_in_kg,
    weighed_in_at: now,
    in_photo_url: input.in_photo_url,
    in_operator_user_id: byUserId,
    updated_at: now,
  };
  list[idx] = updated;
  write(entityCode, list);

  await appendAuditEntry({
    entityCode, entityId: entityCode, voucherId: updated.id,
    voucherKind: 'vendor_quotation',
    action: 'weighbridge_weigh_in',
    actorUserId: byUserId,
    payload: { ticket_no: updated.ticket_no, gross_in_kg: input.gross_in_kg, tare_in_kg: input.tare_in_kg, net_in_kg },
  });
  return updated;
}

export async function weighOut(
  input: WeighOutInput,
  entityCode: string,
  byUserId: string,
): Promise<WeighbridgeTicket | null> {
  const list = read(entityCode);
  const idx = list.findIndex((t) => t.id === input.ticket_id);
  if (idx < 0) return null;
  const cur = list[idx];
  assertTransition(cur.status, 'weighed_out');

  const grossIn = cur.gross_in_kg ?? 0;
  const net_dispatched_kg = round2(Math.abs(input.gross_out_kg - grossIn));
  const now = new Date().toISOString();
  const updated: WeighbridgeTicket = {
    ...cur,
    status: 'weighed_out',
    gross_out_kg: input.gross_out_kg,
    tare_out_kg: input.tare_out_kg,
    net_dispatched_kg,
    weighed_out_at: now,
    out_photo_url: input.out_photo_url,
    out_operator_user_id: byUserId,
    updated_at: now,
  };
  list[idx] = updated;
  write(entityCode, list);

  await appendAuditEntry({
    entityCode, entityId: entityCode, voucherId: updated.id,
    voucherKind: 'vendor_quotation',
    action: 'weighbridge_weigh_out',
    actorUserId: byUserId,
    payload: { ticket_no: updated.ticket_no, gross_out_kg: input.gross_out_kg, net_dispatched_kg },
  });
  return updated;
}

export async function closeTicket(
  input: CloseTicketInput,
  entityCode: string,
  byUserId: string,
): Promise<WeighbridgeTicket | null> {
  const list = read(entityCode);
  const idx = list.findIndex((t) => t.id === input.ticket_id);
  if (idx < 0) return null;
  const cur = list[idx];
  assertTransition(cur.status, 'closed');

  // Variance computation: for inward, expected net = net_in_kg; back-weigh confirms.
  // variance_kg = (net_in_kg ?? 0) - (net_dispatched_kg ?? 0) when both available.
  const expected = cur.net_in_kg ?? 0;
  const actual = cur.net_dispatched_kg ?? 0;
  const variance_kg = round2(dSub(expected, actual));
  const variance_pct = expected > 0 ? round2((variance_kg / expected) * 100) : 0;

  const now = new Date().toISOString();
  const updated: WeighbridgeTicket = {
    ...cur,
    status: 'closed',
    variance_kg,
    variance_pct,
    variance_remarks: input.variance_remarks,
    closed_at: now,
    closed_by_user_id: byUserId,
    updated_at: now,
  };
  list[idx] = updated;
  write(entityCode, list);

  await appendAuditEntry({
    entityCode, entityId: entityCode, voucherId: updated.id,
    voucherKind: 'vendor_quotation',
    action: 'weighbridge_ticket_closed',
    actorUserId: byUserId,
    payload: { ticket_no: updated.ticket_no, variance_kg, variance_pct },
  });
  return updated;
}

// ============================================================
// QUERIES
// ============================================================

export function listTickets(entityCode: string): WeighbridgeTicket[] {
  return read(entityCode).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getTicket(id: string, entityCode: string): WeighbridgeTicket | null {
  return read(entityCode).find((t) => t.id === id) ?? null;
}

export function listTicketsByGatePass(gatePassId: string, entityCode: string): WeighbridgeTicket[] {
  return read(entityCode).filter((t) => t.gate_pass_id === gatePassId);
}

// ============================================================
// PRIVATE
// ============================================================

function assertTransition(from: WeighbridgeTicketStatus, to: WeighbridgeTicketStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Invalid transition: ${from} → ${to}`);
  }
}

function read(e: string): WeighbridgeTicket[] {
  // [JWT] GET /api/weighbridge/tickets?entityCode=...
  try {
    const raw = localStorage.getItem(weighbridgeTicketsKey(e));
    return raw ? (JSON.parse(raw) as WeighbridgeTicket[]) : [];
  } catch { return []; }
}

function write(e: string, list: WeighbridgeTicket[]): void {
  // [JWT] POST /api/weighbridge/tickets
  localStorage.setItem(weighbridgeTicketsKey(e), JSON.stringify(list));
}

export { ALLOWED_TRANSITIONS };
