/**
 * @file        bill-passing-engine.ts
 * @sprint      T-Phase-1.2.6f-c-2 · Block A · per D-285 + D-286
 * @purpose     Bill Passing engine · 3-way/4-way Match · variance computation · approval workflow.
 *              Reads PO + GIT + vendor invoice · computes line-level match · emits variance flags.
 *              On approval · triggers FinCore PI auto-draft via finance-pi-bridge (Block C).
 * @decisions   D-285 · D-286 (hybrid match · item flag) · D-287 (FCPI auto-draft) · D-194 localStorage
 * @reuses      po-management-engine · git-engine · audit-trail-hash-chain · decimal-helpers
 *              · leak-register-engine · finecore-engine.generateDocNo · freight-match-engine pattern
 * @[JWT]       POST /api/bill-passing
 */

import type {
  BillPassingRecord, BillPassingLine, BillPassingStatus, MatchType, LineMatchStatus,
} from '@/types/bill-passing';
import { billPassingKey } from '@/types/bill-passing';
import type { PurchaseOrderRecord, PurchaseOrderLine } from '@/types/po';
import { getPurchaseOrder } from './po-management-engine';
import type { GitStage1Record, GitStage1Line } from '@/types/git';
import { getGitStage1 } from './git-engine';
import { appendAuditEntry } from './audit-trail-hash-chain';
import { dSub, dPct, dSum, dMul, dAdd, round2 } from './decimal-helpers';
import { emitLeakEvent } from './leak-register-engine';
import { generateDocNo } from './finecore-engine';

// ---------- Tolerance defaults (per-tenant override candidate · 3-c-3 may wire master) ----------
const DEFAULT_TOLERANCE_PCT = 2;
const DEFAULT_TOLERANCE_AMOUNT = 500;
const LEAKAGE_VARIANCE_PCT = 5; // FR-44 · D-279 emit threshold

const newId = (p: string): string =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ---------- Storage ----------
function read(entityCode: string): BillPassingRecord[] {
  try {
    // [JWT] GET /api/bill-passing?entityCode=...
    const raw = localStorage.getItem(billPassingKey(entityCode));
    return raw ? (JSON.parse(raw) as BillPassingRecord[]) : [];
  } catch {
    return [];
  }
}

function write(entityCode: string, list: BillPassingRecord[]): void {
  try {
    // [JWT] POST /api/bill-passing
    localStorage.setItem(billPassingKey(entityCode), JSON.stringify(list));
  } catch {
    /* quota silent */
  }
}

// ---------- Reads ----------
export function listBillPassing(entityCode: string): BillPassingRecord[] {
  return read(entityCode);
}

export function getBillPassing(id: string, entityCode: string): BillPassingRecord | null {
  return read(entityCode).find((b) => b.id === id) ?? null;
}

export function listPendingMatch(entityCode: string): BillPassingRecord[] {
  return read(entityCode).filter(
    (b) => b.status === 'pending_match' || b.status === 'awaiting_qa',
  );
}

export function listMatchedWithVariance(entityCode: string): BillPassingRecord[] {
  return read(entityCode).filter((b) => b.status === 'matched_with_variance');
}

export function listApprovedForFcpi(entityCode: string): BillPassingRecord[] {
  return read(entityCode).filter(
    (b) => b.status === 'approved_for_fcpi' || b.status === 'fcpi_drafted',
  );
}

export function getBillsForPo(poId: string, entityCode: string): BillPassingRecord[] {
  return read(entityCode).filter((b) => b.po_id === poId);
}

// ---------- Totals ----------
export function computeBillPassingTotals(lines: BillPassingLine[]): {
  invoice: number; po: number; grn: number; variance: number; variance_pct: number;
} {
  const invoice = round2(dSum(lines, (l) => l.invoice_total));
  const po = round2(dSum(lines, (l) => l.po_value));
  const grn = round2(dSum(lines, (l) => dMul(l.grn_qty, l.po_rate)));
  const variance = round2(dSub(invoice, po));
  const variance_pct = po > 0 ? round2(dPct(variance, 100) / po * 100) : 0;
  // simpler safe: variance_pct = (variance / po) * 100 rounded
  const safePct = po > 0 ? round2((variance / po) * 100) : 0;
  return { invoice, po, grn, variance, variance_pct: safePct };
}

// ---------- Line match (mirrors freight-match-engine 3-way pattern) ----------
export function computeLineMatch(
  invLine: Omit<BillPassingLine, 'qty_variance' | 'rate_variance' | 'total_variance' | 'match_status' | 'variance_reason'>,
  poLine: PurchaseOrderLine | null,
  grnLine: GitStage1Line | null,
  tolerancePct: number,
  toleranceAmount: number,
): BillPassingLine {
  if (!poLine) {
    return {
      ...invLine,
      qty_variance: invLine.invoice_qty,
      rate_variance: invLine.invoice_rate,
      total_variance: invLine.invoice_total,
      match_status: 'unmatched',
      variance_reason: 'No matching PO line',
    };
  }

  const refQty = grnLine ? grnLine.qty_accepted : poLine.qty;
  const qty_variance = round2(dSub(invLine.invoice_qty, refQty));
  const rate_variance = round2(dSub(invLine.invoice_rate, poLine.rate));
  const total_variance = round2(dSub(invLine.invoice_total, poLine.amount_after_tax));

  const qtyPct = refQty > 0 ? Math.abs((qty_variance / refQty) * 100) : 0;
  const ratePct = poLine.rate > 0 ? Math.abs((rate_variance / poLine.rate) * 100) : 0;
  const totalPct = poLine.amount_after_tax > 0
    ? Math.abs((total_variance / poLine.amount_after_tax) * 100) : 0;

  // Tax reconciliation: invoice_value * tax_pct should ≈ invoice_tax_value
  const expectedTax = round2(dMul(invLine.invoice_value, invLine.invoice_tax_pct) / 100);
  const taxDelta = Math.abs(round2(dSub(invLine.invoice_tax_value, expectedTax)));

  let status: LineMatchStatus = 'clean';
  let reason = '';

  if (qtyPct > tolerancePct && Math.abs(qty_variance) > 0) {
    status = 'qty_variance';
    reason = `Qty variance ${qty_variance.toFixed(2)} (${qtyPct.toFixed(2)}%)`;
  } else if (ratePct > tolerancePct) {
    status = 'rate_variance';
    reason = `Rate variance ₹${rate_variance.toFixed(2)} (${ratePct.toFixed(2)}%)`;
  } else if (taxDelta > toleranceAmount) {
    status = 'tax_variance';
    reason = `Tax mismatch ₹${taxDelta.toFixed(2)}`;
  } else if (totalPct > tolerancePct && Math.abs(total_variance) > toleranceAmount) {
    status = 'total_variance';
    reason = `Total variance ₹${total_variance.toFixed(2)} (${totalPct.toFixed(2)}%)`;
  }

  return {
    ...invLine,
    qty_variance,
    rate_variance,
    total_variance,
    match_status: status,
    variance_reason: reason,
  };
}

// ---------- Create ----------
export interface CreateBillPassingLineInput {
  po_line_id: string;
  invoice_qty: number;
  invoice_rate: number;
  invoice_tax_pct: number;
  requires_inspection?: boolean;
}

export interface CreateBillPassingInput {
  po_id: string;
  git_id: string | null;
  vendor_invoice_no: string;
  vendor_invoice_date: string;
  lines: CreateBillPassingLineInput[];
  tolerance_pct?: number;
  tolerance_amount?: number;
  notes?: string;
  mode_of_payment_id?: string | null;
  terms_of_payment_id?: string | null;
  terms_of_delivery_id?: string | null;
  narration?: string;
  terms_conditions?: string;
}

export async function createBillPassing(
  input: CreateBillPassingInput,
  entityCode: string,
  byUserId: string,
): Promise<BillPassingRecord> {
  const po = getPurchaseOrder(input.po_id, entityCode);
  if (!po) throw new Error(`PO not found: ${input.po_id}`);

  const grn = input.git_id ? getGitStage1(input.git_id, entityCode) : null;

  const tolerance_pct = input.tolerance_pct ?? DEFAULT_TOLERANCE_PCT;
  const tolerance_amount = input.tolerance_amount ?? DEFAULT_TOLERANCE_AMOUNT;

  // Build lines
  const lines: BillPassingLine[] = input.lines.map((il, idx) => {
    const poLine = po.lines.find((p) => p.id === il.po_line_id) ?? null;
    const grnLine = grn
      ? grn.lines.find((g) => g.po_line_id === il.po_line_id) ?? null
      : null;

    const invoice_value = round2(dMul(il.invoice_qty, il.invoice_rate));
    const invoice_tax_value = round2(dMul(invoice_value, il.invoice_tax_pct) / 100);
    const invoice_total = round2(dAdd(invoice_value, invoice_tax_value));

    const requires_inspection = il.requires_inspection ?? false;

    const baseLine: Omit<BillPassingLine, 'qty_variance' | 'rate_variance' | 'total_variance' | 'match_status' | 'variance_reason'> = {
      id: newId('bpl'),
      line_no: idx + 1,
      po_line_id: il.po_line_id,
      git_line_id: grnLine ? grnLine.id : null,
      item_id: poLine ? poLine.item_id : '',
      item_name: poLine ? poLine.item_name : '(unmatched)',
      po_qty: poLine ? poLine.qty : 0,
      po_rate: poLine ? poLine.rate : 0,
      po_value: poLine ? poLine.amount_after_tax : 0,
      grn_qty: grnLine ? grnLine.qty_accepted : 0,
      invoice_qty: il.invoice_qty,
      invoice_rate: il.invoice_rate,
      invoice_value,
      invoice_tax_pct: il.invoice_tax_pct,
      invoice_tax_value,
      invoice_total,
      requires_inspection,
      qa_passed: null,
    };

    return computeLineMatch(baseLine, poLine, grnLine, tolerance_pct, tolerance_amount);
  });

  const totals = computeBillPassingTotals(lines);
  const match_type: MatchType = lines.some((l) => l.requires_inspection) ? '4-way' : '3-way';

  // Derive status
  const hasVariance = lines.some((l) => l.match_status !== 'clean');
  let status: BillPassingStatus;
  if (match_type === '4-way') status = 'awaiting_qa';
  else if (hasVariance) status = 'matched_with_variance';
  else status = 'matched_clean';

  const now = new Date().toISOString();
  const bill: BillPassingRecord = {
    id: newId('bp'),
    bill_no: generateDocNo('PO', entityCode).replace(/^PO\//, 'BILL/'),
    bill_date: now.slice(0, 10),
    entity_id: po.entity_id,
    branch_id: po.branch_id,
    po_id: po.id,
    po_no: po.po_no,
    git_id: input.git_id,
    vendor_id: po.vendor_id,
    vendor_name: po.vendor_name,
    vendor_invoice_no: input.vendor_invoice_no,
    vendor_invoice_date: input.vendor_invoice_date,
    match_type,
    qa_inspection_id: null,
    lines,
    total_invoice_value: totals.invoice,
    total_po_value: totals.po,
    total_grn_value: totals.grn,
    total_variance: totals.variance,
    variance_pct: totals.variance_pct,
    tolerance_pct,
    tolerance_amount,
    approver_user_id: null,
    approval_notes: '',
    approved_at: null,
    fcpi_voucher_id: null,
    fcpi_drafted_at: null,
    mode_of_payment_id: input.mode_of_payment_id ?? null,
    terms_of_payment_id: input.terms_of_payment_id ?? null,
    terms_of_delivery_id: input.terms_of_delivery_id ?? null,
    narration: input.narration ?? '',
    terms_conditions: input.terms_conditions ?? '',
    status,
    notes: input.notes ?? '',
    created_at: now,
    updated_at: now,
  };

  const list = read(entityCode);
  list.push(bill);
  write(entityCode, list);

  await appendAuditEntry({
    entityCode,
    entityId: bill.entity_id,
    voucherId: bill.id,
    voucherKind: 'vendor_quotation',
    action: 'bill_passing_created',
    actorUserId: byUserId,
    payload: {
      bill_no: bill.bill_no, po_no: bill.po_no, vendor_invoice_no: bill.vendor_invoice_no,
      match_type, status, total_invoice_value: totals.invoice, variance_pct: totals.variance_pct,
    },
  });

  // Leak emit if variance significant
  if (Math.abs(totals.variance_pct) >= LEAKAGE_VARIANCE_PCT) {
    emitLeakEvent({
      entity_id: bill.entity_id,
      category: 'cost',
      sub_kind: 'bill_passing_variance',
      ref_type: 'invoice',
      ref_id: bill.id,
      ref_label: bill.bill_no,
      amount: totals.variance,
      baseline_amount: totals.po,
      variance_pct: totals.variance_pct,
      notes: `Bill ${bill.bill_no} variance ${totals.variance_pct.toFixed(2)}% vs PO ${bill.po_no}`,
      emitted_by: byUserId,
    });
  }

  return bill;
}

// ---------- Re-run match ----------
export async function runMatch(
  billId: string,
  entityCode: string,
  byUserId: string,
): Promise<BillPassingRecord | null> {
  const list = read(entityCode);
  const idx = list.findIndex((b) => b.id === billId);
  if (idx < 0) return null;
  const cur = list[idx];

  const po = getPurchaseOrder(cur.po_id, entityCode);
  if (!po) return null;
  const grn = cur.git_id ? getGitStage1(cur.git_id, entityCode) : null;

  const recomputed = cur.lines.map((l) => {
    const poLine = po.lines.find((p) => p.id === l.po_line_id) ?? null;
    const grnLine = grn ? grn.lines.find((g) => g.id === l.git_line_id) ?? null : null;
    return computeLineMatch(l, poLine, grnLine, cur.tolerance_pct, cur.tolerance_amount);
  });

  const totals = computeBillPassingTotals(recomputed);
  const hasVariance = recomputed.some((l) => l.match_status !== 'clean');

  let status: BillPassingStatus = cur.status;
  if (cur.status === 'pending_match' || cur.status === 'matched_clean' || cur.status === 'matched_with_variance') {
    status = hasVariance ? 'matched_with_variance' : 'matched_clean';
  }

  const updated: BillPassingRecord = {
    ...cur,
    lines: recomputed,
    total_invoice_value: totals.invoice,
    total_po_value: totals.po,
    total_grn_value: totals.grn,
    total_variance: totals.variance,
    variance_pct: totals.variance_pct,
    status,
    updated_at: new Date().toISOString(),
  };

  list[idx] = updated;
  write(entityCode, list);

  await appendAuditEntry({
    entityCode,
    entityId: cur.entity_id,
    voucherId: cur.id,
    voucherKind: 'vendor_quotation',
    action: 'bill_passing_match_run',
    actorUserId: byUserId,
    payload: { bill_no: cur.bill_no, status, variance_pct: totals.variance_pct },
  });

  if (Math.abs(totals.variance_pct) >= LEAKAGE_VARIANCE_PCT) {
    emitLeakEvent({
      entity_id: cur.entity_id,
      category: 'cost',
      sub_kind: 'bill_passing_variance',
      ref_type: 'invoice',
      ref_id: cur.id,
      ref_label: cur.bill_no,
      amount: totals.variance,
      baseline_amount: totals.po,
      variance_pct: totals.variance_pct,
      notes: `Re-match: bill ${cur.bill_no} variance ${totals.variance_pct.toFixed(2)}%`,
      emitted_by: byUserId,
    });
  }

  return updated;
}

// ---------- Status transitions ----------
const VALID_TRANSITIONS: Record<BillPassingStatus, BillPassingStatus[]> = {
  pending_match: ['matched_clean', 'matched_with_variance', 'awaiting_qa', 'cancelled'],
  matched_clean: ['approved_for_fcpi', 'cancelled'],
  matched_with_variance: ['approved_for_fcpi', 'rejected', 'cancelled'],
  awaiting_qa: ['qa_failed', 'matched_clean', 'matched_with_variance', 'cancelled'],
  qa_failed: ['matched_with_variance', 'cancelled'],
  approved_for_fcpi: ['fcpi_drafted', 'cancelled'],
  fcpi_drafted: [],
  rejected: [],
  cancelled: [],
};

export async function transitionBillPassingStatus(
  id: string,
  newStatus: BillPassingStatus,
  entityCode: string,
  byUserId: string,
  notes?: string,
): Promise<BillPassingRecord | null> {
  const list = read(entityCode);
  const idx = list.findIndex((b) => b.id === id);
  if (idx < 0) return null;
  const cur = list[idx];

  if (!VALID_TRANSITIONS[cur.status].includes(newStatus)) {
    throw new Error(`Invalid transition: ${cur.status} → ${newStatus}`);
  }

  const updated: BillPassingRecord = {
    ...cur,
    status: newStatus,
    notes: notes ? `${cur.notes}\n${notes}`.trim() : cur.notes,
    updated_at: new Date().toISOString(),
  };
  list[idx] = updated;
  write(entityCode, list);

  await appendAuditEntry({
    entityCode,
    entityId: cur.entity_id,
    voucherId: cur.id,
    voucherKind: 'vendor_quotation',
    action: `bill_passing_${newStatus}`,
    actorUserId: byUserId,
    payload: { bill_no: cur.bill_no, from: cur.status, to: newStatus, notes: notes ?? '' },
  });

  return updated;
}

// ---------- Approve ----------
export async function approveBill(
  id: string,
  approvalNotes: string,
  entityCode: string,
  byUserId: string,
): Promise<BillPassingRecord | null> {
  const list = read(entityCode);
  const idx = list.findIndex((b) => b.id === id);
  if (idx < 0) return null;
  const cur = list[idx];

  if (cur.status !== 'matched_clean' && cur.status !== 'matched_with_variance') {
    throw new Error(`Cannot approve from status ${cur.status}`);
  }
  if (cur.status === 'matched_with_variance' && !approvalNotes.trim()) {
    throw new Error('Approval notes required for variance override');
  }

  const now = new Date().toISOString();
  const updated: BillPassingRecord = {
    ...cur,
    status: 'approved_for_fcpi',
    approver_user_id: byUserId,
    approval_notes: approvalNotes,
    approved_at: now,
    updated_at: now,
  };
  list[idx] = updated;
  write(entityCode, list);

  await appendAuditEntry({
    entityCode,
    entityId: cur.entity_id,
    voucherId: cur.id,
    voucherKind: 'vendor_quotation',
    action: 'bill_passing_approved',
    actorUserId: byUserId,
    payload: { bill_no: cur.bill_no, notes: approvalNotes },
  });

  // D-287: finance-pi-bridge.draftPiFromBill is invoked by caller (UI) after approveBill resolves.
  // Engines do not import bridges to avoid circular deps.

  return updated;
}

// ---------- Reject ----------
export async function rejectBill(
  id: string,
  reason: string,
  entityCode: string,
  byUserId: string,
): Promise<BillPassingRecord | null> {
  const list = read(entityCode);
  const idx = list.findIndex((b) => b.id === id);
  if (idx < 0) return null;
  const cur = list[idx];

  if (!reason.trim()) throw new Error('Rejection reason required');

  const updated: BillPassingRecord = {
    ...cur,
    status: 'rejected',
    approval_notes: reason,
    approver_user_id: byUserId,
    updated_at: new Date().toISOString(),
  };
  list[idx] = updated;
  write(entityCode, list);

  await appendAuditEntry({
    entityCode,
    entityId: cur.entity_id,
    voucherId: cur.id,
    voucherKind: 'vendor_quotation',
    action: 'bill_passing_rejected',
    actorUserId: byUserId,
    payload: { bill_no: cur.bill_no, reason },
  });

  emitLeakEvent({
    entity_id: cur.entity_id,
    category: 'cost',
    sub_kind: 'bill_passing_rejected',
    ref_type: 'invoice',
    ref_id: cur.id,
    ref_label: cur.bill_no,
    amount: cur.total_invoice_value,
    notes: `Bill rejected: ${reason}`,
    emitted_by: byUserId,
  });

  return updated;
}

// ---------- Internal write helper used by Block C bridge ----------
export function setFcpiLink(
  id: string,
  fcpiVoucherId: string,
  entityCode: string,
): BillPassingRecord | null {
  const list = read(entityCode);
  const idx = list.findIndex((b) => b.id === id);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  list[idx] = {
    ...list[idx],
    fcpi_voucher_id: fcpiVoucherId,
    fcpi_drafted_at: now,
    status: 'fcpi_drafted',
    updated_at: now,
  };
  write(entityCode, list);
  return list[idx];
}

// 3-c-3 will ADD sibling validateContractCompliance(invoice, contract) · this engine zero-touch from 3-c-3.
