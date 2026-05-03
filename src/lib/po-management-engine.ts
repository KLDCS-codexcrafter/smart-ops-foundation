/**
 * @file        po-management-engine.ts
 * @sprint      T-Phase-1.2.6f-c-1 · Block A · per D-283 sibling pattern
 * @purpose     Procure360 PO workflow engine · sibling of FineCore PurchaseOrder voucher (D-127 ZERO TOUCH).
 *              Reads voucher schema only · creates own status state machine · localStorage-backed (D-194).
 * @decisions   D-283 · D-127 · D-194 · D-256 (followup auto-fallback hint)
 * @reuses      vendor-quotation-engine (awarded source) · audit-trail-hash-chain · decimal-helpers
 * @[JWT]       POST /api/procure360/purchase-orders
 */

import type {
  PurchaseOrderRecord, PurchaseOrderLine, PoStatus, PoFollowup,
} from '@/types/po';
import { purchaseOrdersKey } from '@/types/po';
import { listQuotations } from './vendor-quotation-engine';
import { appendAuditEntry } from './audit-trail-hash-chain';
import { dAdd, round2 } from './decimal-helpers';

const newId = (p: string): string =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function readPos(entityCode: string): PurchaseOrderRecord[] {
  try {
    // [JWT] GET /api/procure360/purchase-orders?entityCode=...
    const raw = localStorage.getItem(purchaseOrdersKey(entityCode));
    return raw ? (JSON.parse(raw) as PurchaseOrderRecord[]) : [];
  } catch {
    return [];
  }
}

function writePos(entityCode: string, list: PurchaseOrderRecord[]): void {
  try {
    // [JWT] POST /api/procure360/purchase-orders
    localStorage.setItem(purchaseOrdersKey(entityCode), JSON.stringify(list));
  } catch {
    /* quota silent */
  }
}

function nextPoNo(existing: PurchaseOrderRecord[]): string {
  const ym = new Date().toISOString().slice(0, 7).replace('-', '');
  return `PO/${ym}/${String(existing.length + 1).padStart(4, '0')}`;
}

export function listPurchaseOrders(entityCode: string): PurchaseOrderRecord[] {
  return readPos(entityCode);
}

export function getPurchaseOrder(id: string, entityCode: string): PurchaseOrderRecord | null {
  return readPos(entityCode).find((p) => p.id === id) ?? null;
}

export function computePoTotals(lines: PurchaseOrderLine[]): { basic: number; tax: number; after_tax: number } {
  let basic = 0;
  let tax = 0;
  let after = 0;
  for (const l of lines) {
    basic = dAdd(basic, l.basic_value);
    tax = dAdd(tax, l.tax_value);
    after = dAdd(after, l.amount_after_tax);
  }
  return { basic: round2(basic), tax: round2(tax), after_tax: round2(after) };
}

export interface CreatePoFromAwardOptions {
  delivery_address?: string;
  expected_delivery_days?: number; // override; defaults to quotation lines max delivery_days
  branch_id?: string | null;
  division_id?: string | null;
  department_id?: string | null;
  cost_center_id?: string | null;
}

export async function createPOFromAward(
  awardedQuotationId: string,
  entityCode: string,
  byUserId: string,
  opts: CreatePoFromAwardOptions = {},
): Promise<PurchaseOrderRecord | null> {
  const quotations = listQuotations(entityCode);
  const q = quotations.find((qq) => qq.id === awardedQuotationId);
  if (!q || !q.is_awarded) return null;
  const list = readPos(entityCode);
  const now = new Date().toISOString();

  const lines: PurchaseOrderLine[] = q.lines.map((l, idx) => {
    const basic = round2(l.qty_quoted * l.rate);
    const taxValue = round2((basic * l.tax_percent) / 100);
    const afterTax = round2(basic + taxValue);
    return {
      id: newId('pol'),
      line_no: idx + 1,
      item_id: l.item_id,
      item_name: l.item_id,
      qty: l.qty_quoted,
      uom: 'NOS',
      rate: l.rate,
      basic_value: basic,
      tax_pct: l.tax_percent,
      tax_value: taxValue,
      amount_after_tax: afterTax,
      qty_received: 0,
    };
  });

  const totals = computePoTotals(lines);
  const days = opts.expected_delivery_days
    ?? (q.lines.length > 0 ? Math.max(...q.lines.map((l) => l.delivery_days || 0)) : 7);
  const expectedDelivery = new Date(Date.now() + days * 86400000).toISOString();

  const po: PurchaseOrderRecord = {
    id: newId('po'),
    po_no: nextPoNo(list),
    po_date: now,
    entity_id: q.entity_id,
    branch_id: opts.branch_id ?? null,
    division_id: opts.division_id ?? null,
    department_id: opts.department_id ?? null,
    cost_center_id: opts.cost_center_id ?? null,
    source_quotation_id: q.id,
    source_enquiry_id: q.parent_enquiry_id,
    vendor_id: q.vendor_id,
    vendor_name: q.vendor_name,
    lines,
    total_basic_value: totals.basic,
    total_tax_value: totals.tax,
    total_after_tax: totals.after_tax,
    expected_delivery_date: expectedDelivery,
    delivery_address: opts.delivery_address ?? '',
    approved_by_user_id: null,
    approved_at: null,
    status: 'draft',
    followups: [],
    notes: '',
    created_at: now,
    updated_at: now,
  };

  list.push(po);
  writePos(entityCode, list);
  await appendAuditEntry({
    entityCode,
    entityId: q.entity_id,
    voucherId: po.id,
    voucherKind: 'vendor_quotation',
    action: 'po_created',
    actorUserId: byUserId,
    payload: { po_no: po.po_no, vendor_id: po.vendor_id, total: po.total_after_tax },
  });
  return po;
}

const VALID_TRANSITIONS: Record<PoStatus, PoStatus[]> = {
  draft: ['pending_approval', 'cancelled'],
  pending_approval: ['approved', 'cancelled'],
  approved: ['sent_to_vendor', 'cancelled'],
  sent_to_vendor: ['partially_received', 'fully_received', 'cancelled'],
  partially_received: ['fully_received', 'cancelled'],
  fully_received: ['closed'],
  closed: [],
  cancelled: [],
};

export async function transitionPoStatus(
  id: string,
  newStatus: PoStatus,
  entityCode: string,
  byUserId: string,
): Promise<PurchaseOrderRecord | null> {
  const list = readPos(entityCode);
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  const cur = list[idx];
  if (!VALID_TRANSITIONS[cur.status].includes(newStatus)) return null;
  const updated: PurchaseOrderRecord = { ...cur, status: newStatus, updated_at: new Date().toISOString() };
  list[idx] = updated;
  writePos(entityCode, list);
  await appendAuditEntry({
    entityCode,
    entityId: cur.entity_id,
    voucherId: cur.id,
    voucherKind: 'vendor_quotation',
    action: `po_${newStatus}`,
    actorUserId: byUserId,
    payload: { po_no: cur.po_no, from: cur.status, to: newStatus },
  });
  return updated;
}

export async function approvePo(
  id: string,
  entityCode: string,
  byUserId: string,
): Promise<PurchaseOrderRecord | null> {
  const list = readPos(entityCode);
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  const cur = list[idx];
  if (cur.status !== 'draft' && cur.status !== 'pending_approval') return null;
  const now = new Date().toISOString();
  const updated: PurchaseOrderRecord = {
    ...cur,
    status: 'approved',
    approved_by_user_id: byUserId,
    approved_at: now,
    updated_at: now,
  };
  list[idx] = updated;
  writePos(entityCode, list);
  await appendAuditEntry({
    entityCode,
    entityId: cur.entity_id,
    voucherId: cur.id,
    voucherKind: 'vendor_quotation',
    action: 'po_approved',
    actorUserId: byUserId,
    payload: { po_no: cur.po_no },
  });
  return updated;
}

export async function sendPoToVendor(
  id: string,
  entityCode: string,
  byUserId: string,
): Promise<PurchaseOrderRecord | null> {
  // [JWT] POST /api/vendors/:id/po-notification (whatsapp/email · stub Phase 1)
  return transitionPoStatus(id, 'sent_to_vendor', entityCode, byUserId);
}

export async function recordPoFollowup(
  poId: string,
  followup: PoFollowup,
  entityCode: string,
  byUserId: string,
): Promise<PurchaseOrderRecord | null> {
  const list = readPos(entityCode);
  const idx = list.findIndex((p) => p.id === poId);
  if (idx < 0) return null;
  const cur = list[idx];
  const updated: PurchaseOrderRecord = {
    ...cur,
    followups: [...cur.followups, followup],
    updated_at: new Date().toISOString(),
  };
  list[idx] = updated;
  writePos(entityCode, list);
  await appendAuditEntry({
    entityCode,
    entityId: cur.entity_id,
    voucherId: cur.id,
    voucherKind: 'vendor_quotation',
    action: 'po_followup',
    actorUserId: byUserId,
    payload: { po_no: cur.po_no, channel: followup.channel, outcome: followup.outcome },
  });
  return updated;
}

export async function updatePoLineReceivedQty(
  poId: string,
  lineId: string,
  qtyDelta: number,
  entityCode: string,
): Promise<PurchaseOrderRecord | null> {
  const list = readPos(entityCode);
  const idx = list.findIndex((p) => p.id === poId);
  if (idx < 0) return null;
  const cur = list[idx];
  const lines = cur.lines.map((l) =>
    l.id === lineId ? { ...l, qty_received: dAdd(l.qty_received, qtyDelta) } : l,
  );
  const allFull = lines.every((l) => l.qty_received >= l.qty);
  const someReceived = lines.some((l) => l.qty_received > 0);
  let nextStatus: PoStatus = cur.status;
  if (allFull && cur.status !== 'closed' && cur.status !== 'cancelled') nextStatus = 'fully_received';
  else if (someReceived && (cur.status === 'sent_to_vendor' || cur.status === 'approved')) nextStatus = 'partially_received';
  const updated: PurchaseOrderRecord = {
    ...cur,
    lines,
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };
  list[idx] = updated;
  writePos(entityCode, list);
  return updated;
}

export function computePoOverdue(po: PurchaseOrderRecord): boolean {
  if (po.status === 'fully_received' || po.status === 'closed' || po.status === 'cancelled') return false;
  return new Date(po.expected_delivery_date).getTime() < Date.now();
}

export function listOverduePos(entityCode: string): PurchaseOrderRecord[] {
  return readPos(entityCode).filter(computePoOverdue);
}

export function computePoOverdueDays(po: PurchaseOrderRecord): number {
  const ms = Date.now() - new Date(po.expected_delivery_date).getTime();
  return ms > 0 ? Math.floor(ms / 86400000) : 0;
}
