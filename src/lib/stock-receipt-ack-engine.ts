/**
 * stock-receipt-ack-engine.ts — Card #7 Store Hub FOUNDATION
 * Sprint T-Phase-1.2.6f-d-2-card7-7-pre-1 · Block C · D-378
 *
 * Stock Receipt Acknowledgment CRUD + Stock Journal voucher posting.
 * CONSUMES Card #6 inward-receipt-engine.listInwardReceipts READ-ONLY.
 *
 * D-127 boundary: lives in src/lib/ (NOT finecore).
 * D-128 boundary: posts via finecore postVoucher using existing 'Stock Journal'
 * base_voucher_type — voucher schema NOT modified.
 * D-309 sibling discipline: Receipt Ack workflow lives in Card #7 — does NOT
 * modify any Card #6 audited engine.
 * D-228 UTH stamping.
 *
 * [JWT] POST /api/store/stock-receipt-acks · PATCH .../post
 */

import type {
  StockReceiptAck,
  StockReceiptAckLine,
  StockReceiptAckStatus,
} from '@/types/stock-receipt-ack';
import { stockReceiptAcksKey } from '@/types/stock-receipt-ack';
import type { InwardReceipt } from '@/types/inward-receipt';
import type { Voucher, VoucherInventoryLine } from '@/types/voucher';
import { generateDocNo, postVoucher } from '@/lib/finecore-engine';
import { listInwardReceipts } from '@/lib/inward-receipt-engine';
import { appendAuditEntry } from '@/lib/audit-trail-hash-chain';

// ============================================================
// PUBLIC TYPES
// ============================================================

export interface CreateReceiptAckLineInput {
  inward_line_id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  qty_inward: number;
  qty_acknowledged: number;
  source_godown_id: string;
  source_godown_name: string;
  dest_godown_id: string;
  dest_godown_name: string;
  batch_no?: string | null;
  remarks?: string;
}

export interface CreateReceiptAckInput {
  entity_id: string;
  inward_receipt_id: string;
  inward_receipt_no: string;
  vendor_id?: string | null;
  vendor_name: string;
  acknowledged_by_id: string;
  acknowledged_by_name: string;
  lines: CreateReceiptAckLineInput[];
  narration?: string;
  reference_no?: string | null;
}

// ============================================================
// HELPERS
// ============================================================

function newId(prefix: string): string {
  return (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildLine(input: CreateReceiptAckLineInput): StockReceiptAckLine {
  return {
    id: newId('sral'),
    inward_line_id: input.inward_line_id,
    item_id: input.item_id,
    item_code: input.item_code,
    item_name: input.item_name,
    uom: input.uom,
    qty_inward: input.qty_inward,
    qty_acknowledged: input.qty_acknowledged,
    variance: input.qty_acknowledged - input.qty_inward,
    source_godown_id: input.source_godown_id,
    source_godown_name: input.source_godown_name,
    dest_godown_id: input.dest_godown_id,
    dest_godown_name: input.dest_godown_name,
    batch_no: input.batch_no ?? null,
    remarks: input.remarks ?? '',
  };
}

// ============================================================
// PUBLIC FUNCTIONS · CRUD
// ============================================================

export async function createReceiptAck(
  input: CreateReceiptAckInput,
  entityCode: string,
  byUserId: string,
): Promise<StockReceiptAck> {
  if (!input.lines.length) throw new Error('Receipt ack requires at least one line');

  const now = new Date().toISOString();
  const lines = input.lines.map(buildLine);
  const total_variance = lines.reduce((s, l) => s + Math.abs(l.variance), 0);

  const ack: StockReceiptAck = {
    id: newId('sra'),
    entity_id: input.entity_id,
    ack_no: generateDocNo('SRA', entityCode),
    status: 'draft',
    ack_date: now.slice(0, 10),
    inward_receipt_id: input.inward_receipt_id,
    inward_receipt_no: input.inward_receipt_no,
    vendor_id: input.vendor_id ?? null,
    vendor_name: input.vendor_name,
    acknowledged_by_id: input.acknowledged_by_id,
    acknowledged_by_name: input.acknowledged_by_name,
    lines,
    total_variance,
    voucher_id: null,
    voucher_no: null,
    posted_at: null,
    narration: input.narration ?? '',
    effective_date: now.slice(0, 10),
    created_by: byUserId,
    updated_by: byUserId,
    cancel_reason: null,
    reference_no: input.reference_no ?? null,
    voucher_hash: null,
    created_at: now,
    updated_at: now,
    cancelled_at: null,
  };

  const list = read(entityCode);
  list.push(ack);
  write(entityCode, list);

  await appendAuditEntry({
    entityCode,
    entityId: entityCode,
    voucherId: ack.id,
    voucherKind: 'vendor_quotation',
    action: 'stock_receipt_ack_created',
    actorUserId: byUserId,
    payload: {
      ack_no: ack.ack_no,
      inward_receipt_no: ack.inward_receipt_no,
      total_variance,
    },
  });

  return ack;
}

/**
 * Build a Stock Journal voucher: Receiving godown OUT → Stores godown IN.
 */
function buildReceiptAckVoucher(ack: StockReceiptAck, entityCode: string): Voucher {
  const inventory_lines: VoucherInventoryLine[] = [];
  for (const l of ack.lines) {
    // OUT from receiving godown
    inventory_lines.push({
      id: newId('vil'),
      item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
      hsn_sac_code: '',
      godown_id: l.source_godown_id, godown_name: l.source_godown_name,
      qty: -Math.abs(l.qty_acknowledged),
      uom: l.uom, rate: 0,
      discount_percent: 0, discount_amount: 0, taxable_value: 0,
      gst_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0,
      cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0,
      total: 0, gst_type: 'non_gst', gst_source: 'none',
    });
    // IN to stores godown
    inventory_lines.push({
      id: newId('vil'),
      item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
      hsn_sac_code: '',
      godown_id: l.dest_godown_id, godown_name: l.dest_godown_name,
      qty: Math.abs(l.qty_acknowledged),
      uom: l.uom, rate: 0,
      discount_percent: 0, discount_amount: 0, taxable_value: 0,
      gst_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0,
      cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0,
      total: 0, gst_type: 'non_gst', gst_source: 'none',
    });
  }

  return {
    id: newId('vch'),
    voucher_no: '',
    voucher_type_id: 'vt-stock-journal',
    voucher_type_name: 'Stock Journal',
    base_voucher_type: 'Stock Journal',
    entity_id: entityCode,
    date: ack.ack_date,
    purpose: `Receipt Ack · ${ack.inward_receipt_no}`,
    ledger_lines: [],
    inventory_lines,
    tax_lines: [],
    gross_amount: 0, total_discount: 0, total_taxable: 0,
    total_cgst: 0, total_sgst: 0, total_igst: 0, total_cess: 0,
    total_tax: 0, round_off: 0, net_amount: 0,
    tds_applicable: false,
    narration: `Receipt Ack ${ack.ack_no} ← IR ${ack.inward_receipt_no} (${ack.vendor_name})`,
    terms_conditions: '',
    payment_enforcement: '',
    payment_instrument: '',
    status: 'draft',
    created_by: ack.created_by ?? 'system',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function postReceiptAck(
  id: string,
  entityCode: string,
  byUserId: string,
): Promise<StockReceiptAck | null> {
  const list = read(entityCode);
  const idx = list.findIndex(s => s.id === id);
  if (idx < 0) return null;
  const cur = list[idx];
  if (cur.status !== 'draft') {
    throw new Error(`Cannot post receipt ack from status: ${cur.status}`);
  }

  const voucher = buildReceiptAckVoucher(cur, entityCode);
  postVoucher(voucher, entityCode);

  const now = new Date().toISOString();
  const updated: StockReceiptAck = {
    ...cur,
    status: 'acknowledged',
    voucher_id: voucher.id,
    voucher_no: voucher.voucher_no,
    posted_at: now,
    updated_at: now,
    updated_by: byUserId,
  };
  list[idx] = updated;
  write(entityCode, list);

  await appendAuditEntry({
    entityCode,
    entityId: entityCode,
    voucherId: updated.id,
    voucherKind: 'vendor_quotation',
    action: 'stock_receipt_ack_posted',
    actorUserId: byUserId,
    payload: {
      ack_no: updated.ack_no,
      voucher_id: voucher.id,
      inward_receipt_no: updated.inward_receipt_no,
    },
  });

  return updated;
}

// ============================================================
// QUERIES
// ============================================================

export function listReceiptAcks(entityCode: string): StockReceiptAck[] {
  return read(entityCode).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getReceiptAck(id: string, entityCode: string): StockReceiptAck | null {
  return read(entityCode).find(s => s.id === id) ?? null;
}

/**
 * Cross-card consumer (D-378): returns Card #6 Inward Receipts that are
 * status='released' AND not yet covered by a (non-cancelled) Stock Receipt Ack.
 * READ-ONLY consumption of inward-receipt-engine.
 */
export function listReleasedReceiptsAwaitingStock(entityCode: string): InwardReceipt[] {
  const acks = read(entityCode);
  const acknowledgedIrIds = new Set(
    acks
      .filter(a => a.status !== 'cancelled')
      .map(a => a.inward_receipt_id),
  );
  return listInwardReceipts(entityCode).filter(
    ir => ir.status === 'released' && !acknowledgedIrIds.has(ir.id),
  );
}

export function countPendingReceiptAcks(entityCode: string): number {
  return listReleasedReceiptsAwaitingStock(entityCode).length;
}

// ============================================================
// PRIVATE HELPERS
// ============================================================

function read(e: string): StockReceiptAck[] {
  // [JWT] GET /api/store/stock-receipt-acks?entityCode=...
  try {
    const raw = localStorage.getItem(stockReceiptAcksKey(e));
    return raw ? (JSON.parse(raw) as StockReceiptAck[]) : [];
  } catch { return []; }
}

function write(e: string, list: StockReceiptAck[]): void {
  // [JWT] POST /api/store/stock-receipt-acks
  localStorage.setItem(stockReceiptAcksKey(e), JSON.stringify(list));
}

export type { StockReceiptAckStatus };
