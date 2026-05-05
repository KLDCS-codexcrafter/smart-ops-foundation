/**
 * stock-issue-engine.ts — Card #7 Store Hub FOUNDATION
 * Sprint T-Phase-1.2.6f-d-2-card7-7-pre-1 · Block B · D-377
 *
 * Stock Issue CRUD + Stock Journal voucher posting.
 * Pure engine · no React · sibling discipline (mirrors inward-receipt-engine.ts shape).
 *
 * D-127 boundary: lives in src/lib/ (NOT finecore).
 * D-128 boundary: posts via finecore postVoucher API using existing 'Stock Journal'
 * base_voucher_type — voucher schema NOT modified (74-sprint streak preserved).
 * D-228 UTH stamping.
 *
 * [JWT] POST /api/store/stock-issues · PATCH /api/store/stock-issues/:id/post
 */

import type { StockIssue, StockIssueLine, StockIssueStatus } from '@/types/stock-issue';
import { stockIssuesKey } from '@/types/stock-issue';
import type { Voucher, VoucherInventoryLine } from '@/types/voucher';
import { generateDocNo, postVoucher } from '@/lib/finecore-engine';
import { appendAuditEntry } from '@/lib/audit-trail-hash-chain';

// ============================================================
// PUBLIC TYPES
// ============================================================

export interface CreateStockIssueLineInput {
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  qty: number;
  rate: number;
  source_godown_id: string;
  source_godown_name: string;
  batch_no?: string | null;
  remarks?: string;
}

export interface CreateStockIssueInput {
  entity_id: string;
  department_id?: string | null;
  department_name: string;
  recipient_id?: string | null;
  recipient_name: string;
  purpose: string;
  lines: CreateStockIssueLineInput[];
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

function buildLine(input: CreateStockIssueLineInput): StockIssueLine {
  return {
    id: newId('sil'),
    item_id: input.item_id,
    item_code: input.item_code,
    item_name: input.item_name,
    uom: input.uom,
    qty: input.qty,
    rate: input.rate,
    value: input.qty * input.rate,
    source_godown_id: input.source_godown_id,
    source_godown_name: input.source_godown_name,
    batch_no: input.batch_no ?? null,
    remarks: input.remarks ?? '',
  };
}

// ============================================================
// PUBLIC FUNCTIONS · CRUD
// ============================================================

export async function createStockIssue(
  input: CreateStockIssueInput,
  entityCode: string,
  byUserId: string,
): Promise<StockIssue> {
  if (!input.lines.length) throw new Error('Stock issue requires at least one line');

  const now = new Date().toISOString();
  const lines = input.lines.map(buildLine);
  const total_value = lines.reduce((s, l) => s + l.value, 0);

  const si: StockIssue = {
    id: newId('si'),
    entity_id: input.entity_id,
    issue_no: generateDocNo('SI', entityCode),
    status: 'draft',
    issue_date: now.slice(0, 10),
    department_id: input.department_id ?? null,
    department_name: input.department_name,
    recipient_id: input.recipient_id ?? null,
    recipient_name: input.recipient_name,
    purpose: input.purpose,
    lines,
    total_value,
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
  list.push(si);
  write(entityCode, list);

  await appendAuditEntry({
    entityCode,
    entityId: entityCode,
    voucherId: si.id,
    voucherKind: 'vendor_quotation',
    action: 'stock_issue_created',
    actorUserId: byUserId,
    payload: {
      issue_no: si.issue_no,
      department: si.department_name,
      total_value: si.total_value,
      total_lines: lines.length,
    },
  });

  return si;
}

/**
 * Build a Stock Journal voucher for a stock issue (consumption side only).
 * Negative qty per line = stock OUT from source godown.
 */
function buildStockIssueVoucher(si: StockIssue, entityCode: string): Voucher {
  const inventory_lines: VoucherInventoryLine[] = si.lines.map(l => ({
    id: newId('vil'),
    item_id: l.item_id,
    item_code: l.item_code,
    item_name: l.item_name,
    hsn_sac_code: '',
    godown_id: l.source_godown_id,
    godown_name: l.source_godown_name,
    qty: -Math.abs(l.qty),
    uom: l.uom,
    rate: l.rate,
    discount_percent: 0,
    discount_amount: 0,
    taxable_value: l.value,
    gst_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0,
    cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0,
    total: l.value,
    gst_type: 'non_gst',
    gst_source: 'none',
  }));

  return {
    id: newId('vch'),
    voucher_no: '',
    voucher_type_id: 'vt-stock-journal',
    voucher_type_name: 'Stock Journal',
    base_voucher_type: 'Stock Journal',
    entity_id: entityCode,
    date: si.issue_date,
    purpose: `Stock Issue · ${si.purpose}`,
    department_id: si.department_id ?? undefined,
    department_name: si.department_name,
    ledger_lines: [],
    inventory_lines,
    tax_lines: [],
    gross_amount: 0, total_discount: 0, total_taxable: 0,
    total_cgst: 0, total_sgst: 0, total_igst: 0, total_cess: 0,
    total_tax: 0, round_off: 0, net_amount: 0,
    tds_applicable: false,
    narration: `Stock Issue ${si.issue_no} → ${si.department_name} (${si.recipient_name})`,
    terms_conditions: '',
    payment_enforcement: '',
    payment_instrument: '',
    status: 'draft',
    created_by: si.created_by ?? 'system',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function postStockIssue(
  id: string,
  entityCode: string,
  byUserId: string,
): Promise<StockIssue | null> {
  const list = read(entityCode);
  const idx = list.findIndex(s => s.id === id);
  if (idx < 0) return null;
  const cur = list[idx];
  if (cur.status !== 'draft') {
    throw new Error(`Cannot post stock issue from status: ${cur.status}`);
  }

  const voucher = buildStockIssueVoucher(cur, entityCode);
  postVoucher(voucher, entityCode);

  const now = new Date().toISOString();
  const updated: StockIssue = {
    ...cur,
    status: 'issued',
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
    action: 'stock_issue_posted',
    actorUserId: byUserId,
    payload: {
      issue_no: updated.issue_no,
      voucher_id: voucher.id,
      total_value: updated.total_value,
    },
  });

  return updated;
}

// ============================================================
// QUERIES
// ============================================================

export function listStockIssues(entityCode: string): StockIssue[] {
  return read(entityCode).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getStockIssue(id: string, entityCode: string): StockIssue | null {
  return read(entityCode).find(s => s.id === id) ?? null;
}

export function listOpenStockIssues(entityCode: string): StockIssue[] {
  return listStockIssues(entityCode).filter(s => s.status === 'draft');
}

// ============================================================
// PRIVATE HELPERS
// ============================================================

function read(e: string): StockIssue[] {
  // [JWT] GET /api/store/stock-issues?entityCode=...
  try {
    const raw = localStorage.getItem(stockIssuesKey(e));
    return raw ? (JSON.parse(raw) as StockIssue[]) : [];
  } catch { return []; }
}

function write(e: string, list: StockIssue[]): void {
  // [JWT] POST /api/store/stock-issues
  localStorage.setItem(stockIssuesKey(e), JSON.stringify(list));
}

export type { StockIssueStatus };
