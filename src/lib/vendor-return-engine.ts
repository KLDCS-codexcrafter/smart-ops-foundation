/**
 * @file        vendor-return-engine.ts
 * @sprint      T-Phase-1.2.6f-d-2-card6-6-pre-2 · Block E · D-364
 * @purpose     Vendor Return (RTV) CRUD + auto-DN + Debit Note voucher post.
 *              Sibling pattern · matches inward-receipt-engine 6-pre-1 shape.
 * @decisions   D-127 (lives in src/lib/, not finecore touched)
 *              · D-128 (uses existing 'Debit Note' base_voucher_type · zero schema mods)
 *              · D-194 (vendorReturnsKey reserved in 6-pre-1)
 *              · D-309 (sibling discipline · qa-closure-resolver delegates voucher post here)
 *              · D-349 (closure of Card #5 5-pre-3 deferral)
 * @reuses      types/vendor-return · finecore-engine.{generateDocNo,postVoucher}
 *              · audit-trail-hash-chain
 * [JWT] POST /api/logistic/vendor-returns · POST /api/logistic/vendor-returns/:id/post-dn
 */

import type {
  VendorReturn,
  VendorReturnLine,
  VendorReturnReason,
  VendorReturnStatus,
} from '@/types/vendor-return';
import { vendorReturnsKey } from '@/types/vendor-return';
import type { Voucher, VoucherLedgerLine } from '@/types/voucher';
import { generateDocNo, postVoucher } from '@/lib/finecore-engine';
import { appendAuditEntry } from '@/lib/audit-trail-hash-chain';

// ─── Types ──────────────────────────────────────────────────────────

export interface CreateVendorReturnLineInput {
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  return_qty: number;
  unit_rate: number;
  batch_no?: string | null;
  heat_no?: string | null;
  reason: VendorReturnReason;
  reason_notes?: string;
  source_grn_id?: string | null;
  source_grn_no?: string | null;
  source_inspection_id?: string | null;
}

export interface CreateVendorReturnInput {
  entity_id: string;
  vendor_id: string;
  vendor_name: string;
  vendor_gstin?: string | null;
  source_grn_id?: string | null;
  source_grn_no?: string | null;
  source_po_id?: string | null;
  source_po_no?: string | null;
  vehicle_no?: string | null;
  lr_no?: string | null;
  transporter_name?: string | null;
  primary_reason: VendorReturnReason;
  reason_notes?: string;
  lines: CreateVendorReturnLineInput[];
  narration?: string;
  source?: 'manual' | 'auto_qa';
}

export interface CreateAutoDebitNoteInput {
  entity_id: string;
  vendor_id: string;
  vendor_name: string;
  source_inspection_id: string;
  source_inspection_no: string;
  source_grn_id?: string | null;
  source_grn_no?: string | null;
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  qty_failed: number;
  unit_rate?: number;
  batch_no?: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function read(e: string): VendorReturn[] {
  // [JWT] GET /api/logistic/vendor-returns
  try {
    const raw = localStorage.getItem(vendorReturnsKey(e));
    return raw ? (JSON.parse(raw) as VendorReturn[]) : [];
  } catch { return []; }
}

function write(e: string, list: VendorReturn[]): void {
  // [JWT] POST /api/logistic/vendor-returns
  localStorage.setItem(vendorReturnsKey(e), JSON.stringify(list));
}

function buildLine(input: CreateVendorReturnLineInput): VendorReturnLine {
  const lineTotal = Math.round(input.return_qty * input.unit_rate * 100) / 100;
  return {
    id: newId('vrl'),
    item_id: input.item_id,
    item_code: input.item_code,
    item_name: input.item_name,
    uom: input.uom,
    return_qty: input.return_qty,
    unit_rate: input.unit_rate,
    line_total: lineTotal,
    batch_no: input.batch_no ?? null,
    heat_no: input.heat_no ?? null,
    reason: input.reason,
    reason_notes: input.reason_notes ?? '',
    source_grn_id: input.source_grn_id ?? null,
    source_grn_no: input.source_grn_no ?? null,
    source_inspection_id: input.source_inspection_id ?? null,
  };
}

// ─── Public · CRUD ──────────────────────────────────────────────────

export async function createVendorReturn(
  input: CreateVendorReturnInput,
  entityCode: string,
  byUserId: string,
): Promise<VendorReturn> {
  if (!input.lines.length) throw new Error('Vendor return requires at least one line');

  const now = new Date().toISOString();
  const lines = input.lines.map(buildLine);
  const totalQty = lines.reduce((s, l) => s + l.return_qty, 0);
  const totalValue = lines.reduce((s, l) => s + l.line_total, 0);

  const rtv: VendorReturn = {
    id: newId('vr'),
    entity_id: input.entity_id,
    return_no: generateDocNo('RTV', entityCode),
    status: 'draft',
    vendor_id: input.vendor_id,
    vendor_name: input.vendor_name,
    vendor_gstin: input.vendor_gstin ?? null,
    source_grn_id: input.source_grn_id ?? null,
    source_grn_no: input.source_grn_no ?? null,
    source_po_id: input.source_po_id ?? null,
    source_po_no: input.source_po_no ?? null,
    return_date: now.slice(0, 10),
    vehicle_no: input.vehicle_no ?? null,
    lr_no: input.lr_no ?? null,
    transporter_name: input.transporter_name ?? null,
    primary_reason: input.primary_reason,
    reason_notes: input.reason_notes ?? '',
    lines,
    total_qty: totalQty,
    total_value: totalValue,
    debit_note_id: null,
    debit_note_no: null,
    vendor_acknowledgement_no: null,
    vendor_acknowledgement_date: null,
    narration: input.narration ?? '',
    effective_date: now.slice(0, 10),
    created_by: byUserId,
    updated_by: byUserId,
    cancel_reason: null,
    reference_no: null,
    voucher_hash: null,
    created_at: now,
    updated_at: now,
    closed_at: null,
    cancelled_at: null,
  };

  const list = read(entityCode);
  list.push(rtv);
  write(entityCode, list);

  await appendAuditEntry({
    entityCode, entityId: entityCode,
    voucherId: rtv.id,
    voucherKind: 'vendor_quotation',
    action: input.source === 'auto_qa' ? 'vendor_return_auto_created' : 'vendor_return_created',
    actorUserId: byUserId,
    payload: {
      return_no: rtv.return_no, vendor_id: rtv.vendor_id,
      total_qty: totalQty, total_value: totalValue,
      source: input.source ?? 'manual',
    },
  });

  return rtv;
}

/**
 * Auto-Debit-Note draft creation triggered from qa-closure-resolver (D-366 · D-349 closure).
 * Creates a draft RTV · does NOT post the voucher (operator reviews + clicks Post DN).
 */
export async function createAutoDebitNote(
  input: CreateAutoDebitNoteInput,
  entityCode: string,
): Promise<VendorReturn> {
  return createVendorReturn(
    {
      entity_id: input.entity_id,
      vendor_id: input.vendor_id,
      vendor_name: input.vendor_name,
      source_grn_id: input.source_grn_id ?? null,
      source_grn_no: input.source_grn_no ?? null,
      primary_reason: 'qa_rejected',
      reason_notes: `Auto-DN from QA inspection ${input.source_inspection_no} (rejected qty ${input.qty_failed})`,
      narration: `Auto Debit Note · QA rejection · inspection ${input.source_inspection_no}`,
      source: 'auto_qa',
      lines: [{
        item_id: input.item_id,
        item_code: input.item_code,
        item_name: input.item_name,
        uom: input.uom,
        return_qty: input.qty_failed,
        unit_rate: input.unit_rate ?? 0,
        batch_no: input.batch_no ?? null,
        reason: 'qa_rejected',
        reason_notes: `Inspection ${input.source_inspection_no}`,
        source_grn_id: input.source_grn_id ?? null,
        source_grn_no: input.source_grn_no ?? null,
        source_inspection_id: input.source_inspection_id,
      }],
    },
    entityCode,
    'system',
  );
}

/**
 * Post the Debit Note voucher via finecore postVoucher API.
 * Uses existing 'Debit Note' base_voucher_type — D-128 schema BYTE-IDENTICAL.
 */
export async function postDebitNote(
  rtvId: string,
  entityCode: string,
  byUserId: string,
): Promise<{ ok: boolean; reason?: string; voucher_id?: string; voucher_no?: string }> {
  const list = read(entityCode);
  const idx = list.findIndex(r => r.id === rtvId);
  if (idx < 0) return { ok: false, reason: 'Vendor return not found' };
  const rtv = list[idx];
  if (rtv.debit_note_id) return { ok: false, reason: 'Debit Note already posted' };
  if (rtv.status === 'cancelled' || rtv.status === 'closed') {
    return { ok: false, reason: `Cannot post DN from status: ${rtv.status}` };
  }

  const now = new Date().toISOString();
  // Single ledger line debit · party-side · for visibility · GL detail expanded by accounts later
  const ledgerLines: VoucherLedgerLine[] = [{
    id: newId('vll'),
    ledger_id: rtv.vendor_id,
    ledger_name: rtv.vendor_name,
    type: 'debit',
    amount: rtv.total_value,
    bill_allocations: [],
  }];

  const voucher: Voucher = {
    id: newId('vch'),
    voucher_no: '',
    voucher_type_id: 'vt-debit-note',
    voucher_type_name: 'Debit Note',
    base_voucher_type: 'Debit Note',
    entity_id: entityCode,
    date: now.slice(0, 10),
    party_id: rtv.vendor_id,
    party_name: rtv.vendor_name,
    party_gstin: rtv.vendor_gstin ?? undefined,
    ledger_lines: ledgerLines,
    inventory_lines: [],
    tax_lines: [],
    gross_amount: rtv.total_value,
    total_discount: 0,
    total_taxable: rtv.total_value,
    total_cgst: 0, total_sgst: 0, total_igst: 0, total_cess: 0, total_tax: 0,
    round_off: 0,
    net_amount: rtv.total_value,
    tds_applicable: false,
    narration: rtv.narration || `Debit Note for vendor return ${rtv.return_no}`,
    terms_conditions: '',
    payment_enforcement: '',
    payment_instrument: '',
    ref_no: rtv.return_no,
    status: 'draft',
    created_by: byUserId,
    created_at: now,
    updated_at: now,
  };

  try {
    postVoucher(voucher, entityCode);
  } catch (e) {
    return { ok: false, reason: `postVoucher failed: ${String(e)}` };
  }

  list[idx] = {
    ...rtv,
    debit_note_id: voucher.id,
    debit_note_no: voucher.voucher_no || voucher.id,
    status: 'approved',
    updated_at: now,
    updated_by: byUserId,
  };
  write(entityCode, list);

  await appendAuditEntry({
    entityCode, entityId: entityCode,
    voucherId: rtv.id,
    voucherKind: 'vendor_quotation',
    action: 'vendor_return_dn_posted',
    actorUserId: byUserId,
    payload: { return_no: rtv.return_no, voucher_id: voucher.id, amount: rtv.total_value },
  });

  return { ok: true, voucher_id: voucher.id, voucher_no: voucher.voucher_no || voucher.id };
}

// ─── Queries ────────────────────────────────────────────────────────

export function listVendorReturns(entityCode: string): VendorReturn[] {
  return read(entityCode).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getVendorReturn(id: string, entityCode: string): VendorReturn | null {
  return read(entityCode).find(r => r.id === id) ?? null;
}

export function listPendingVendorReturns(entityCode: string): VendorReturn[] {
  const pending: VendorReturnStatus[] = ['draft', 'approved'];
  return listVendorReturns(entityCode).filter(r => pending.includes(r.status));
}
