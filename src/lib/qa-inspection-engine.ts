/**
 * @file        qa-inspection-engine.ts
 * @sprint      T-Phase-1.2.6f-c-2 · Block D · per D-286 4-way upgrade
 * @purpose     QA inspection engine · QA pass cascades Bill Passing matched_clean · QA fail → qa_failed.
 * @decisions   D-286 · D-194 localStorage
 * @[JWT]       POST /api/qa/inspections
 */

import type {
  QaInspectionRecord, QaInspectionLine, QaInspectionStatus,
} from '@/types/qa-inspection';
import { qaInspectionKey } from '@/types/qa-inspection';
import { transitionBillPassingStatus, getBillPassing } from './bill-passing-engine';
import { appendAuditEntry } from './audit-trail-hash-chain';

const newId = (p: string): string =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function read(entityCode: string): QaInspectionRecord[] {
  try {
    // [JWT] GET /api/qa/inspections?entityCode=...
    const raw = localStorage.getItem(qaInspectionKey(entityCode));
    return raw ? (JSON.parse(raw) as QaInspectionRecord[]) : [];
  } catch { return []; }
}

function write(entityCode: string, list: QaInspectionRecord[]): void {
  try {
    // [JWT] POST /api/qa/inspections
    localStorage.setItem(qaInspectionKey(entityCode), JSON.stringify(list));
  } catch { /* quota silent */ }
}

function nextQaNo(list: QaInspectionRecord[]): string {
  const ym = new Date().toISOString().slice(0, 7).replace('-', '');
  return `QA/${ym}/${String(list.length + 1).padStart(4, '0')}`;
}

export function listQaInspections(entityCode: string): QaInspectionRecord[] {
  return read(entityCode);
}

export function getQaInspection(id: string, entityCode: string): QaInspectionRecord | null {
  return read(entityCode).find((q) => q.id === id) ?? null;
}

export function listPendingQa(entityCode: string): QaInspectionRecord[] {
  return read(entityCode).filter((q) => q.status === 'pending' || q.status === 'in_progress');
}

export interface CreateQaInspectionLineInput {
  bill_line_id: string;
  qty_inspected: number;
}

export interface CreateQaInspectionInput {
  bill_id: string;
  inspector_user_id: string;
  inspection_location: string;
  lines: CreateQaInspectionLineInput[];
}

export async function createQaInspection(
  input: CreateQaInspectionInput,
  entityCode: string,
  byUserId: string,
): Promise<QaInspectionRecord> {
  const bill = getBillPassing(input.bill_id, entityCode);
  if (!bill) throw new Error(`Bill not found: ${input.bill_id}`);

  const list = read(entityCode);
  const now = new Date().toISOString();
  const lines: QaInspectionLine[] = input.lines.map((il) => {
    const bl = bill.lines.find((b) => b.id === il.bill_line_id);
    return {
      id: newId('qal'),
      bill_line_id: il.bill_line_id,
      item_id: bl?.item_id ?? '',
      item_name: bl?.item_name ?? '(unmatched)',
      qty_inspected: il.qty_inspected,
      qty_passed: 0,
      qty_failed: 0,
      failure_reason: null,
      inspection_parameters: {},
    };
  });

  const rec: QaInspectionRecord = {
    id: newId('qa'),
    qa_no: nextQaNo(list),
    bill_id: bill.id,
    bill_no: bill.bill_no,
    git_id: bill.git_id,
    po_id: bill.po_id,
    po_no: bill.po_no,
    entity_id: bill.entity_id,
    branch_id: bill.branch_id,
    inspector_user_id: input.inspector_user_id,
    inspection_date: now.slice(0, 10),
    inspection_location: input.inspection_location,
    lines,
    status: 'pending',
    notes: '',
    created_at: now,
    updated_at: now,
  };
  list.push(rec);
  write(entityCode, list);

  await appendAuditEntry({
    entityCode,
    entityId: rec.entity_id,
    voucherId: rec.id,
    voucherKind: 'vendor_quotation',
    action: 'qa_inspection_created',
    actorUserId: byUserId,
    payload: { qa_no: rec.qa_no, bill_no: bill.bill_no },
  });

  return rec;
}

export async function updateInspectionLine(
  qaId: string,
  lineId: string,
  qtyPassed: number,
  qtyFailed: number,
  failureReason: string | null,
  entityCode: string,
  byUserId: string,
): Promise<QaInspectionRecord | null> {
  const list = read(entityCode);
  const idx = list.findIndex((q) => q.id === qaId);
  if (idx < 0) return null;
  const cur = list[idx];
  const updatedLines = cur.lines.map((l) =>
    l.id === lineId
      ? { ...l, qty_passed: qtyPassed, qty_failed: qtyFailed, failure_reason: failureReason }
      : l,
  );
  const updated: QaInspectionRecord = {
    ...cur,
    lines: updatedLines,
    status: cur.status === 'pending' ? 'in_progress' : cur.status,
    updated_at: new Date().toISOString(),
  };
  list[idx] = updated;
  write(entityCode, list);

  await appendAuditEntry({
    entityCode,
    entityId: cur.entity_id,
    voucherId: cur.id,
    voucherKind: 'vendor_quotation',
    action: 'qa_line_updated',
    actorUserId: byUserId,
    payload: { qa_no: cur.qa_no, line_id: lineId, qty_passed: qtyPassed, qty_failed: qtyFailed },
  });

  return updated;
}

function aggregateStatus(lines: QaInspectionLine[]): QaInspectionStatus {
  const allPass = lines.every((l) => l.qty_failed === 0 && l.qty_passed > 0);
  const allFail = lines.every((l) => l.qty_passed === 0 && l.qty_failed > 0);
  if (allPass) return 'passed';
  if (allFail) return 'failed';
  return 'partial_pass';
}

export async function completeInspection(
  qaId: string,
  entityCode: string,
  byUserId: string,
): Promise<QaInspectionRecord | null> {
  const list = read(entityCode);
  const idx = list.findIndex((q) => q.id === qaId);
  if (idx < 0) return null;
  const cur = list[idx];
  const finalStatus = aggregateStatus(cur.lines);

  const updated: QaInspectionRecord = {
    ...cur,
    status: finalStatus,
    updated_at: new Date().toISOString(),
  };
  list[idx] = updated;
  write(entityCode, list);

  await appendAuditEntry({
    entityCode,
    entityId: cur.entity_id,
    voucherId: cur.id,
    voucherKind: 'vendor_quotation',
    action: `qa_${finalStatus}`,
    actorUserId: byUserId,
    payload: { qa_no: cur.qa_no, bill_id: cur.bill_id },
  });

  // Cascade to Bill Passing
  try {
    const bill = getBillPassing(cur.bill_id, entityCode);
    if (bill && bill.status === 'awaiting_qa') {
      if (finalStatus === 'passed' || finalStatus === 'partial_pass') {
        const hasVariance = bill.lines.some((l) => l.match_status !== 'clean');
        await transitionBillPassingStatus(
          bill.id,
          hasVariance ? 'matched_with_variance' : 'matched_clean',
          entityCode,
          byUserId,
          `QA ${finalStatus} via ${cur.qa_no}`,
        );
      } else if (finalStatus === 'failed') {
        await transitionBillPassingStatus(
          bill.id, 'qa_failed', entityCode, byUserId, `QA failed via ${cur.qa_no}`,
        );
      }
    }
  } catch { /* cascade non-fatal */ }

  return updated;
}

export async function transitionQaStatus(
  id: string,
  newStatus: QaInspectionStatus,
  entityCode: string,
  byUserId: string,
): Promise<QaInspectionRecord | null> {
  const list = read(entityCode);
  const idx = list.findIndex((q) => q.id === id);
  if (idx < 0) return null;
  const cur = list[idx];
  list[idx] = { ...cur, status: newStatus, updated_at: new Date().toISOString() };
  write(entityCode, list);

  await appendAuditEntry({
    entityCode,
    entityId: cur.entity_id,
    voucherId: cur.id,
    voucherKind: 'vendor_quotation',
    action: `qa_status_${newStatus}`,
    actorUserId: byUserId,
    payload: { qa_no: cur.qa_no, from: cur.status, to: newStatus },
  });

  return list[idx];
}

export async function cancelInspection(
  qaId: string,
  reason: string,
  entityCode: string,
  byUserId: string,
): Promise<QaInspectionRecord | null> {
  const list = read(entityCode);
  const idx = list.findIndex((q) => q.id === qaId);
  if (idx < 0) return null;
  list[idx] = {
    ...list[idx],
    status: 'cancelled',
    notes: `${list[idx].notes}\nCancelled: ${reason}`.trim(),
    updated_at: new Date().toISOString(),
  };
  write(entityCode, list);

  await appendAuditEntry({
    entityCode,
    entityId: list[idx].entity_id,
    voucherId: list[idx].id,
    voucherKind: 'vendor_quotation',
    action: 'qa_cancelled',
    actorUserId: byUserId,
    payload: { qa_no: list[idx].qa_no, reason },
  });
  return list[idx];
}

// ════════════════════════════════════════════════════════════════════════
// Sprint T-Phase-1.2.6f-d-2-card5-5-pre-1 · Block C · D-329 MINIMAL EXTENSION
// CORE 9 functions above are BYTE-IDENTICAL preserved.
// Only the helper + closure-trigger-stub below are NEW.
// ════════════════════════════════════════════════════════════════════════

import { findApplicablePlan, type PartyKind } from './qa-plan-engine';
import type { QaPlan, QaPlanVoucherKind } from '@/types/qa-plan';

/**
 * D-329 helper · resolve plan applicable to an inspection's item+party+voucher kind.
 * Sibling delegation to qa-plan-engine; existing inspection logic unchanged.
 */
export function findApplicablePlanForInspection(
  itemId: string | null,
  partyId: string | null,
  partyKind: PartyKind,
  voucherKind: QaPlanVoucherKind | null,
  entityCode: string,
): QaPlan | null {
  return findApplicablePlan(itemId, partyId, partyKind, voucherKind, entityCode);
}

/**
 * D-329 stub · 5-pre-2 will replace with qa-closure-resolver auto-routing
 * (movement journals → quarantine / sample / rejection / approved godowns).
 * For now it is a no-op that reports intent so callers can wire safely.
 */
export interface InspectionClosureIntent {
  qa_id: string;
  routed: false;
  reason: 'pending-resolver';
}

export function triggerInspectionClosure(qaId: string): InspectionClosureIntent {
  return { qa_id: qaId, routed: false, reason: 'pending-resolver' };
}

