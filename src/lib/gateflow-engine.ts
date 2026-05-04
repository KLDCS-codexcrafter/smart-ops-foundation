/**
 * @file        gateflow-engine.ts
 * @sprint      T-Phase-1.2.6f-d-2-card4-4-pre-1 · Block B · per D-302 · D-305
 * @purpose     Gate Pass CRUD + state machine + linking · single source of truth for GateFlow.
 *              No modifications to Card #3 audited engines (sibling discipline · D-285+D-286+D-287 lesson).
 *              Doc number generation via finecore-engine.generateDocNo (Q5=A · 'GP' prefix added in Block C).
 * @decisions   D-302 (state machine · 5 states + partial · direction discriminator · optional FK)
 *              · D-303 (doc-no via finecore-engine)
 *              · D-305 (storage namespace)
 *              · D-127/D-128 (FineCore voucher schemas ZERO TOUCH · we READ types only)
 * @reuses      types/gate-pass · types/gate-entry · finecore-engine.generateDocNo
 *              · audit-trail-hash-chain (state transition logging)
 * [JWT] POST /api/gateflow/passes · PATCH /api/gateflow/passes/:id/transition
 */

import type {
  GatePass, GatePassDirection, GatePassStatus, LinkedVoucherType,
} from '@/types/gate-pass';
import { gatePassesKey } from '@/types/gate-pass';
import { generateDocNo } from '@/lib/finecore-engine';
import { appendAuditEntry } from '@/lib/audit-trail-hash-chain';

// ============================================================
// PUBLIC TYPES
// ============================================================

export interface CreateInwardEntryInput {
  vehicle_no: string;
  vehicle_type: string;
  driver_name: string;
  driver_phone: string;
  driver_license_no?: string;
  linked_voucher_type?: LinkedVoucherType;
  linked_voucher_id?: string;
  linked_voucher_no?: string;
  counterparty_name: string;
  counterparty_id?: string;
  purpose: string;
  remarks?: string;
}

export type CreateOutwardEntryInput = CreateInwardEntryInput;

export interface AttachLinkedVoucherInput {
  gate_pass_id: string;
  linked_voucher_type: LinkedVoucherType;
  linked_voucher_id: string;
  linked_voucher_no: string;
}

// ============================================================
// STATE MACHINE · Q4=A · 5-state + partial
// ============================================================

const ALLOWED_TRANSITIONS: Record<GatePassStatus, GatePassStatus[]> = {
  pending:     ['verified', 'cancelled'],
  verified:    ['in_progress', 'cancelled'],
  in_progress: ['completed', 'partial', 'cancelled'],
  partial:     ['completed', 'cancelled'],
  completed:   [],
  cancelled:   [],
};

// ============================================================
// PUBLIC FUNCTIONS · CRUD + state machine + linking
// ============================================================

/** Create inward gate pass (vehicle arriving with goods) */
export async function createInwardEntry(
  input: CreateInwardEntryInput,
  entityCode: string,
  byUserId: string,
): Promise<GatePass> {
  return createPass(input, 'inward', entityCode, byUserId);
}

/** Create outward gate pass (vehicle leaving with goods) */
export async function createOutwardEntry(
  input: CreateOutwardEntryInput,
  entityCode: string,
  byUserId: string,
): Promise<GatePass> {
  return createPass(input, 'outward', entityCode, byUserId);
}

async function createPass(
  input: CreateInwardEntryInput,
  direction: GatePassDirection,
  entityCode: string,
  byUserId: string,
): Promise<GatePass> {
  const now = new Date().toISOString();
  const gp: GatePass = {
    id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `gp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    gate_pass_no: generateDocNo('GP', entityCode),
    direction,
    entity_id: entityCode,
    entity_code: entityCode,
    status: 'pending',
    vehicle_no: input.vehicle_no.trim().toUpperCase(),
    vehicle_type: input.vehicle_type,
    driver_name: input.driver_name.trim(),
    driver_phone: input.driver_phone.trim(),
    driver_license_no: input.driver_license_no?.trim(),
    linked_voucher_type: input.linked_voucher_type ?? null,
    linked_voucher_id: input.linked_voucher_id,
    linked_voucher_no: input.linked_voucher_no,
    counterparty_name: input.counterparty_name.trim(),
    counterparty_id: input.counterparty_id,
    entry_time: now,
    purpose: input.purpose.trim(),
    remarks: input.remarks,
    created_at: now,
    created_by_user_id: byUserId,
    updated_at: now,
  };

  const list = read(entityCode);
  list.push(gp);
  write(entityCode, list);

  await appendAuditEntry({
    entityCode,
    entityId: entityCode,
    voucherId: gp.id,
    // GatePass kind not yet in audit chain · use closest ('vendor_quotation') · 4-pre-2 may add 'gate_pass' kind.
    voucherKind: 'vendor_quotation',
    action: `gate_pass_created_${direction}`,
    actorUserId: byUserId,
    payload: { gate_pass_no: gp.gate_pass_no, direction, vehicle_no: gp.vehicle_no },
  });

  return gp;
}

/** Transition gate pass status with state machine validation */
export async function transitionGatePass(
  id: string,
  toStatus: GatePassStatus,
  entityCode: string,
  byUserId: string,
  byUserName?: string,
): Promise<GatePass | null> {
  const list = read(entityCode);
  const idx = list.findIndex((gp) => gp.id === id);
  if (idx < 0) return null;

  const cur = list[idx];
  const allowed = ALLOWED_TRANSITIONS[cur.status];
  if (!allowed.includes(toStatus)) {
    throw new Error(`Invalid transition: ${cur.status} → ${toStatus}`);
  }

  const now = new Date().toISOString();
  const updated: GatePass = {
    ...cur,
    status: toStatus,
    updated_at: now,
    ...(toStatus === 'verified'
      ? { verified_time: now, verified_by_user_id: byUserId, verified_by_name: byUserName }
      : {}),
    ...(toStatus === 'in_progress' ? { in_progress_time: now } : {}),
    ...(toStatus === 'completed' || toStatus === 'partial' || toStatus === 'cancelled'
      ? { exit_time: now } : {}),
  };

  list[idx] = updated;
  write(entityCode, list);

  await appendAuditEntry({
    entityCode,
    entityId: entityCode,
    voucherId: updated.id,
    voucherKind: 'vendor_quotation',
    action: `gate_pass_${toStatus}`,
    actorUserId: byUserId,
    payload: { gate_pass_no: updated.gate_pass_no, from: cur.status, to: toStatus },
  });

  return updated;
}

/** Attach voucher reference to existing gate pass (e.g., GIT created from inward pass) */
export async function attachLinkedVoucher(
  input: AttachLinkedVoucherInput,
  entityCode: string,
): Promise<GatePass | null> {
  const list = read(entityCode);
  const idx = list.findIndex((gp) => gp.id === input.gate_pass_id);
  if (idx < 0) return null;

  list[idx] = {
    ...list[idx],
    linked_voucher_type: input.linked_voucher_type,
    linked_voucher_id: input.linked_voucher_id,
    linked_voucher_no: input.linked_voucher_no,
    updated_at: new Date().toISOString(),
  };
  write(entityCode, list);
  return list[idx];
}

// ============================================================
// QUERIES
// ============================================================

export function listGatePasses(entityCode: string): GatePass[] {
  return read(entityCode).sort((a, b) => b.entry_time.localeCompare(a.entry_time));
}

export function listInwardQueue(entityCode: string): GatePass[] {
  return listGatePasses(entityCode).filter(
    (gp) => gp.direction === 'inward' &&
            gp.status !== 'completed' && gp.status !== 'cancelled',
  );
}

export function listOutwardQueue(entityCode: string): GatePass[] {
  return listGatePasses(entityCode).filter(
    (gp) => gp.direction === 'outward' &&
            gp.status !== 'completed' && gp.status !== 'cancelled',
  );
}

export function getGatePass(id: string, entityCode: string): GatePass | null {
  return read(entityCode).find((gp) => gp.id === id) ?? null;
}

// ============================================================
// PRIVATE HELPERS
// ============================================================

function read(e: string): GatePass[] {
  // [JWT] GET /api/gateflow/passes?entityCode=...
  try {
    const raw = localStorage.getItem(gatePassesKey(e));
    return raw ? (JSON.parse(raw) as GatePass[]) : [];
  } catch { return []; }
}

function write(e: string, list: GatePass[]): void {
  // [JWT] POST /api/gateflow/passes
  localStorage.setItem(gatePassesKey(e), JSON.stringify(list));
}

// Export ALLOWED_TRANSITIONS for UI (action button enablement)
export { ALLOWED_TRANSITIONS };
