/**
 * @file        inward-receipt-engine.ts
 * @sprint      T-Phase-1.2.6f-d-2-card6-6-pre-1 · Block B
 * @purpose     Inward Receipt CRUD + state machine + QualiCheck-driven quarantine routing.
 *              Pure engine · no React · sibling discipline (mirrors gateflow-engine.ts shape).
 * @decisions   D-127 (lives in src/lib/, NOT finecore-engine touched)
 *              · D-128 (NOT a voucher; no GL post)
 *              · D-228 (UTH stamping)
 * @reuses      types/inward-receipt · finecore-engine.generateDocNo · audit-trail-hash-chain
 * [JWT] POST /api/logistic/inward-receipts · PATCH /api/logistic/inward-receipts/:id/transition
 */

import type {
  InwardReceipt,
  InwardReceiptLine,
  InwardReceiptStatus,
  InwardRoutingDecision,
} from '@/types/inward-receipt';
import { inwardReceiptsKey } from '@/types/inward-receipt';
import { generateDocNo } from '@/lib/finecore-engine';
import { appendAuditEntry } from '@/lib/audit-trail-hash-chain';
import {
  comply360QCKey, DEFAULT_QC_CONFIG, type QualiCheckConfig,
} from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';

// ============================================================
// PUBLIC TYPES
// ============================================================

export interface CreateInwardReceiptLineInput {
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  expected_qty: number;
  received_qty: number;
  batch_no?: string | null;
  heat_no?: string | null;
  qa_plan_id?: string | null;
}

export interface CreateInwardReceiptInput {
  entity_id: string;
  po_id?: string | null;
  po_no?: string | null;
  gate_entry_id?: string | null;
  gate_entry_no?: string | null;
  vendor_id: string;
  vendor_name: string;
  vendor_invoice_no?: string | null;
  vendor_invoice_date?: string | null;
  vehicle_no?: string | null;
  lr_no?: string | null;
  driver_name?: string | null;
  driver_mobile?: string | null;
  godown_id: string;
  godown_name: string;
  received_by_id: string;
  received_by_name: string;
  lines: CreateInwardReceiptLineInput[];
  narration?: string;
  reference_no?: string | null;
}

// ============================================================
// STATE MACHINE
// ============================================================

const ALLOWED_TRANSITIONS: Record<InwardReceiptStatus, InwardReceiptStatus[]> = {
  draft:      ['arrived', 'cancelled'],
  arrived:    ['quarantine', 'released', 'rejected', 'cancelled'],
  quarantine: ['released', 'rejected', 'cancelled'],
  released:   [],
  rejected:   [],
  cancelled:  [],
};

// ============================================================
// ROUTING ENGINE · Quarantine vs Auto-Release
// ============================================================

/**
 * Decide routing for a single line based on QA plan presence and qty match.
 * Pure function · deterministic · testable.
 */
export function decideLineRouting(input: {
  expected_qty: number;
  received_qty: number;
  has_qa_plan: boolean;
}): { decision: InwardRoutingDecision; reason: string } {
  if (input.received_qty <= 0) {
    return { decision: 'rejected', reason: 'Received quantity is zero' };
  }
  if (input.has_qa_plan) {
    return { decision: 'inspection_required', reason: 'QA plan attached · inspection required' };
  }
  if (input.received_qty > input.expected_qty * 1.05) {
    return { decision: 'quarantine', reason: 'Received qty exceeds expected by >5%' };
  }
  return { decision: 'auto_release', reason: 'No QA plan · qty within tolerance' };
}

function buildLine(input: CreateInwardReceiptLineInput): InwardReceiptLine {
  const routing = decideLineRouting({
    expected_qty: input.expected_qty,
    received_qty: input.received_qty,
    has_qa_plan: !!input.qa_plan_id,
  });
  return {
    id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `irl-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    item_id: input.item_id,
    item_code: input.item_code,
    item_name: input.item_name,
    uom: input.uom,
    expected_qty: input.expected_qty,
    received_qty: input.received_qty,
    batch_no: input.batch_no ?? null,
    heat_no: input.heat_no ?? null,
    qa_plan_id: input.qa_plan_id ?? null,
    routing_decision: routing.decision,
    routing_reason: routing.reason,
  };
}

function summarize(lines: InwardReceiptLine[]) {
  return {
    total_lines: lines.length,
    quarantine_lines: lines.filter(l =>
      l.routing_decision === 'quarantine' || l.routing_decision === 'inspection_required',
    ).length,
    released_lines: lines.filter(l => l.routing_decision === 'auto_release').length,
    rejected_lines: lines.filter(l => l.routing_decision === 'rejected').length,
  };
}

function pickInitialStatus(summary: ReturnType<typeof summarize>): InwardReceiptStatus {
  if (summary.quarantine_lines > 0) return 'quarantine';
  if (summary.released_lines > 0) return 'arrived';
  if (summary.rejected_lines === summary.total_lines) return 'rejected';
  return 'arrived';
}

// ============================================================
// PUBLIC FUNCTIONS · CRUD + state machine
// ============================================================

export async function createInwardReceipt(
  input: CreateInwardReceiptInput,
  entityCode: string,
  byUserId: string,
): Promise<InwardReceipt> {
  if (!input.lines.length) throw new Error('Inward receipt requires at least one line');

  const now = new Date().toISOString();
  const lines = input.lines.map(buildLine);
  const summary = summarize(lines);
  const status = pickInitialStatus(summary);

  const ir: InwardReceipt = {
    id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `ir-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    entity_id: input.entity_id,
    receipt_no: generateDocNo('IR', entityCode),
    status,
    po_id: input.po_id ?? null,
    po_no: input.po_no ?? null,
    gate_entry_id: input.gate_entry_id ?? null,
    gate_entry_no: input.gate_entry_no ?? null,
    vendor_id: input.vendor_id,
    vendor_name: input.vendor_name,
    vendor_invoice_no: input.vendor_invoice_no ?? null,
    vendor_invoice_date: input.vendor_invoice_date ?? null,
    vehicle_no: input.vehicle_no ?? null,
    lr_no: input.lr_no ?? null,
    driver_name: input.driver_name ?? null,
    driver_mobile: input.driver_mobile ?? null,
    arrival_date: now.slice(0, 10),
    arrival_time: now,
    received_by_id: input.received_by_id,
    received_by_name: input.received_by_name,
    godown_id: input.godown_id,
    godown_name: input.godown_name,
    lines,
    ...summary,
    grn_id: null,
    grn_no: null,
    qa_inspection_ids: [],
    narration: input.narration ?? '',
    effective_date: now.slice(0, 10),
    created_by: byUserId,
    updated_by: byUserId,
    cancel_reason: null,
    reference_no: input.reference_no ?? null,
    voucher_hash: null,
    created_at: now,
    updated_at: now,
    released_at: null,
    cancelled_at: null,
  };

  const list = read(entityCode);
  list.push(ir);
  write(entityCode, list);

  await appendAuditEntry({
    entityCode,
    entityId: entityCode,
    voucherId: ir.id,
    voucherKind: 'vendor_quotation',
    action: `inward_receipt_created_${status}`,
    actorUserId: byUserId,
    payload: {
      receipt_no: ir.receipt_no,
      vendor_id: ir.vendor_id,
      total_lines: summary.total_lines,
      quarantine_lines: summary.quarantine_lines,
    },
  });

  return ir;
}

export async function transitionInwardReceipt(
  id: string,
  toStatus: InwardReceiptStatus,
  entityCode: string,
  byUserId: string,
  reason?: string,
): Promise<InwardReceipt | null> {
  const list = read(entityCode);
  const idx = list.findIndex(r => r.id === id);
  if (idx < 0) return null;

  const cur = list[idx];
  const allowed = ALLOWED_TRANSITIONS[cur.status];
  if (!allowed.includes(toStatus)) {
    throw new Error(`Invalid transition: ${cur.status} → ${toStatus}`);
  }

  const now = new Date().toISOString();
  const updated: InwardReceipt = {
    ...cur,
    status: toStatus,
    updated_at: now,
    updated_by: byUserId,
    ...(toStatus === 'released' ? { released_at: now } : {}),
    ...(toStatus === 'cancelled'
      ? { cancelled_at: now, cancel_reason: reason ?? null }
      : {}),
  };

  list[idx] = updated;
  write(entityCode, list);

  await appendAuditEntry({
    entityCode,
    entityId: entityCode,
    voucherId: updated.id,
    voucherKind: 'vendor_quotation',
    action: `inward_receipt_${toStatus}`,
    actorUserId: byUserId,
    payload: { receipt_no: updated.receipt_no, from: cur.status, to: toStatus, reason },
  });

  return updated;
}

export async function linkGrnToInwardReceipt(
  id: string,
  grnId: string,
  grnNo: string,
  entityCode: string,
): Promise<InwardReceipt | null> {
  const list = read(entityCode);
  const idx = list.findIndex(r => r.id === id);
  if (idx < 0) return null;

  list[idx] = {
    ...list[idx],
    grn_id: grnId,
    grn_no: grnNo,
    updated_at: new Date().toISOString(),
  };
  write(entityCode, list);
  return list[idx];
}

export async function attachQaInspection(
  id: string,
  qaInspectionId: string,
  entityCode: string,
): Promise<InwardReceipt | null> {
  const list = read(entityCode);
  const idx = list.findIndex(r => r.id === id);
  if (idx < 0) return null;

  const existing = list[idx].qa_inspection_ids;
  if (existing.includes(qaInspectionId)) return list[idx];

  list[idx] = {
    ...list[idx],
    qa_inspection_ids: [...existing, qaInspectionId],
    updated_at: new Date().toISOString(),
  };
  write(entityCode, list);
  return list[idx];
}

// ============================================================
// QUERIES
// ============================================================

export function listInwardReceipts(entityCode: string): InwardReceipt[] {
  return read(entityCode).sort((a, b) => b.arrival_time.localeCompare(a.arrival_time));
}

export function listQuarantineQueue(entityCode: string): InwardReceipt[] {
  return listInwardReceipts(entityCode).filter(r => r.status === 'quarantine');
}

export function listOpenInwardReceipts(entityCode: string): InwardReceipt[] {
  return listInwardReceipts(entityCode).filter(
    r => r.status !== 'released' && r.status !== 'cancelled' && r.status !== 'rejected',
  );
}

export function getInwardReceipt(id: string, entityCode: string): InwardReceipt | null {
  return read(entityCode).find(r => r.id === id) ?? null;
}

// ============================================================
// PRIVATE HELPERS
// ============================================================

function read(e: string): InwardReceipt[] {
  // [JWT] GET /api/logistic/inward-receipts?entityCode=...
  try {
    const raw = localStorage.getItem(inwardReceiptsKey(e));
    return raw ? (JSON.parse(raw) as InwardReceipt[]) : [];
  } catch { return []; }
}

function write(e: string, list: InwardReceipt[]): void {
  // [JWT] POST /api/logistic/inward-receipts
  localStorage.setItem(inwardReceiptsKey(e), JSON.stringify(list));
}

export { ALLOWED_TRANSITIONS };
