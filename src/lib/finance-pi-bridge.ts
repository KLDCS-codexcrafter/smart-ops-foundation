/**
 * @file        finance-pi-bridge.ts
 * @sprint      T-Phase-1.2.6f-c-2 · Block C · per D-287
 * @purpose     Bridge from Bill Passing approval to FinCore PI auto-draft.
 *              Computes GST/TDS/RCM · constructs PI draft · stores to FinCore PI inbox.
 *              FinCore reviews and posts (D-259 hybrid).
 * @decisions   D-287 (FCPI auto-draft on approval) · D-259 (FinCore PI booking hybrid) ·
 *              D-127 (PurchaseOrder.tsx ZERO TOUCH) · D-128 (voucher schemas ZERO TOUCH · we WRITE drafts only)
 *              · D-194 localStorage canonical
 * @reuses      bill-passing-engine · finecore-engine.generateDocNo · audit-trail-hash-chain · decimal-helpers
 * @[JWT]       POST /api/finecore/pi/auto-draft
 */

import type { BillPassingRecord, BillPassingLine } from '@/types/bill-passing';
import { getBillPassing, setFcpiLink } from './bill-passing-engine';
import { generateDocNo } from './finecore-engine';
import { appendAuditEntry } from './audit-trail-hash-chain';
import { dMul, dAdd, round2 } from './decimal-helpers';

// ---------------- Types ----------------

export type FcpiDraftStatus = 'draft' | 'reviewed_by_finecore' | 'posted' | 'rejected_by_finecore';

export interface FcpiDraftLine {
  id: string;
  source_bill_line_id: string;
  item_id: string;
  item_name: string;
  qty: number;
  rate: number;
  basic_value: number;
  tax_pct: number;
  cgst: number;
  sgst: number;
  igst: number;
  line_total: number;
}

export interface FcpiDraftRecord {
  id: string;
  pi_no: string; // PI/YYYY-MM/####
  source_bill_id: string;
  source_bill_no: string;
  source_po_id: string;
  source_po_no: string;

  entity_id: string;
  vendor_id: string;
  vendor_name: string;
  vendor_gstin: string;
  vendor_state: string;
  entity_state: string;

  bill_date: string;
  pi_draft_date: string;

  lines: FcpiDraftLine[];

  // GST
  place_of_supply: string;
  is_inter_state: boolean;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;

  basic_total: number;
  tax_total: number;
  gross_total: number;

  // TDS
  tds_section: string;
  tds_rate: number;
  tds_threshold: number;
  tds_applicable: boolean;
  tds_amount: number;

  // RCM
  is_rcm_applicable: boolean;
  rcm_amount: number;

  // Net
  net_payable: number;

  status: FcpiDraftStatus;

  created_at: string;
  updated_at: string;
}

export const fcpiDraftKey = (entityCode: string): string =>
  `erp_fcpi_drafts_${entityCode}`;

// ---------------- Storage ----------------

function read(entityCode: string): FcpiDraftRecord[] {
  try {
    // [JWT] GET /api/finecore/pi/drafts?entityCode=...
    const raw = localStorage.getItem(fcpiDraftKey(entityCode));
    return raw ? (JSON.parse(raw) as FcpiDraftRecord[]) : [];
  } catch {
    return [];
  }
}

function write(entityCode: string, list: FcpiDraftRecord[]): void {
  try {
    // [JWT] POST /api/finecore/pi/drafts
    localStorage.setItem(fcpiDraftKey(entityCode), JSON.stringify(list));
  } catch {
    /* quota silent */
  }
}

const newId = (p: string): string =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ---------------- Compute helpers ----------------

const TDS_194Q_RATE = 0.1; // 0.1%
// Annual aggregate threshold (₹50L) reserved for 3-c-3 YTD enrichment.
// const TDS_194Q_THRESHOLD = 5000000;
const TDS_194Q_TXN_THRESHOLD = 50000; // ₹50K transaction skip (simplified)

export interface GstBreakdown {
  is_inter_state: boolean;
  place_of_supply: string;
  cgst: number;
  sgst: number;
  igst: number;
  basic: number;
  tax: number;
  gross: number;
}

/**
 * GSTIN format: NN AAAAA NNNN A N Z N (15 chars) · first 2 digits = state code
 */
function gstinState(gstin: string): string {
  return gstin && gstin.length >= 2 ? gstin.slice(0, 2) : '';
}

export function computeGstBreakdown(
  lines: BillPassingLine[],
  vendorGstin: string,
  entityGstin: string,
): GstBreakdown {
  const vendorState = gstinState(vendorGstin);
  const entityState = gstinState(entityGstin);
  const is_inter_state = vendorState !== '' && entityState !== '' && vendorState !== entityState;
  const place_of_supply = entityState || 'UNKNOWN';

  let basic = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  for (const l of lines) {
    const lineTax = round2(dMul(l.invoice_value, l.invoice_tax_pct) / 100);
    basic = dAdd(basic, l.invoice_value);
    if (is_inter_state) {
      igst = dAdd(igst, lineTax);
    } else {
      const half = round2(lineTax / 2);
      cgst = dAdd(cgst, half);
      sgst = dAdd(sgst, half);
    }
  }

  const tax = round2(dAdd(dAdd(cgst, sgst), igst));
  const gross = round2(dAdd(basic, tax));

  return {
    is_inter_state,
    place_of_supply,
    cgst: round2(cgst),
    sgst: round2(sgst),
    igst: round2(igst),
    basic: round2(basic),
    tax,
    gross,
  };
}

export interface TdsBreakdown {
  applicable: boolean;
  section: string;
  rate: number;
  threshold: number;
  amount: number;
}

export function computeTds(
  invoiceTotal: number,
  section: string = '194Q',
  rate: number = TDS_194Q_RATE,
  threshold: number = TDS_194Q_TXN_THRESHOLD,
): TdsBreakdown {
  if (invoiceTotal < threshold) {
    return { applicable: false, section, rate, threshold, amount: 0 };
  }
  return {
    applicable: true,
    section,
    rate,
    threshold,
    amount: round2(dMul(invoiceTotal, rate) / 100),
  };
}

export interface RcmBreakdown {
  is_rcm_applicable: boolean;
  rcm_amount: number;
}

export function computeRcm(
  bill: BillPassingRecord,
): RcmBreakdown {
  // 3-c-2 placeholder · RCM detection deferred to 3-c-3 enrichment
  // Simple heuristic: if vendor_gstin is empty (unregistered), RCM at gross tax
  // This engine is read-only on bill · no vendor lookup here · default false
  void bill;
  return { is_rcm_applicable: false, rcm_amount: 0 };
}

// ---------------- Public reads ----------------

export function listFcpiDrafts(entityCode: string): FcpiDraftRecord[] {
  return read(entityCode);
}

export function getFcpiDraft(id: string, entityCode: string): FcpiDraftRecord | null {
  return read(entityCode).find((d) => d.id === id) ?? null;
}

export function listFcpiDraftsForBill(billId: string, entityCode: string): FcpiDraftRecord[] {
  return read(entityCode).filter((d) => d.source_bill_id === billId);
}

export function listFcpiDraftsForPo(poId: string, entityCode: string): FcpiDraftRecord[] {
  return read(entityCode).filter((d) => d.source_po_id === poId);
}

// ---------------- Auto-draft ----------------

export interface DraftPiOptions {
  vendor_gstin?: string;
  vendor_state?: string;
  entity_gstin?: string;
  entity_state?: string;
}

export async function draftPiFromBill(
  billId: string,
  entityCode: string,
  byUserId: string,
  options: DraftPiOptions = {},
): Promise<FcpiDraftRecord | null> {
  const bill = getBillPassing(billId, entityCode);
  if (!bill) throw new Error(`Bill not found: ${billId}`);
  if (bill.status !== 'approved_for_fcpi') {
    throw new Error(`Bill not approved for FCPI: ${bill.status}`);
  }

  const vendorGstin = options.vendor_gstin ?? '';
  const entityGstin = options.entity_gstin ?? '';

  const gst = computeGstBreakdown(bill.lines, vendorGstin, entityGstin);

  // Build draft lines
  const draftLines: FcpiDraftLine[] = bill.lines.map((l) => {
    const lineTax = round2(dMul(l.invoice_value, l.invoice_tax_pct) / 100);
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    if (gst.is_inter_state) {
      igst = lineTax;
    } else {
      const half = round2(lineTax / 2);
      cgst = half;
      sgst = half;
    }
    return {
      id: newId('fcpil'),
      source_bill_line_id: l.id,
      item_id: l.item_id,
      item_name: l.item_name,
      qty: l.invoice_qty,
      rate: l.invoice_rate,
      basic_value: l.invoice_value,
      tax_pct: l.invoice_tax_pct,
      cgst,
      sgst,
      igst,
      line_total: round2(dAdd(l.invoice_value, lineTax)),
    };
  });

  const tds = computeTds(gst.gross);
  const rcm = computeRcm(bill);
  const net_payable = round2(gst.gross - tds.amount);

  const now = new Date().toISOString();
  const draft: FcpiDraftRecord = {
    id: newId('fcpi'),
    pi_no: generateDocNo('PO', entityCode).replace(/^PO\//, 'PI/'),
    source_bill_id: bill.id,
    source_bill_no: bill.bill_no,
    source_po_id: bill.po_id,
    source_po_no: bill.po_no,
    entity_id: bill.entity_id,
    vendor_id: bill.vendor_id,
    vendor_name: bill.vendor_name,
    vendor_gstin: vendorGstin,
    vendor_state: options.vendor_state ?? gstinState(vendorGstin),
    entity_state: options.entity_state ?? gstinState(entityGstin),
    bill_date: bill.bill_date,
    pi_draft_date: now.slice(0, 10),
    lines: draftLines,
    place_of_supply: gst.place_of_supply,
    is_inter_state: gst.is_inter_state,
    cgst_total: gst.cgst,
    sgst_total: gst.sgst,
    igst_total: gst.igst,
    basic_total: gst.basic,
    tax_total: gst.tax,
    gross_total: gst.gross,
    tds_section: tds.section,
    tds_rate: tds.rate,
    tds_threshold: tds.threshold,
    tds_applicable: tds.applicable,
    tds_amount: tds.amount,
    is_rcm_applicable: rcm.is_rcm_applicable,
    rcm_amount: rcm.rcm_amount,
    net_payable,
    status: 'draft',
    created_at: now,
    updated_at: now,
  };

  const list = read(entityCode);
  list.push(draft);
  write(entityCode, list);

  // Update bill with FCPI link · transitions bill to 'fcpi_drafted'
  setFcpiLink(bill.id, draft.id, entityCode);

  await appendAuditEntry({
    entityCode,
    entityId: bill.entity_id,
    voucherId: draft.id,
    voucherKind: 'vendor_quotation',
    action: 'fcpi_draft_created',
    actorUserId: byUserId,
    payload: {
      pi_no: draft.pi_no,
      source_bill_no: bill.bill_no,
      net_payable,
      gst: { cgst: gst.cgst, sgst: gst.sgst, igst: gst.igst, is_inter_state: gst.is_inter_state },
      tds: { section: tds.section, amount: tds.amount },
    },
  });

  return draft;
}

// ---------------- Status transition (FinCore-side review) ----------------

export async function transitionFcpiStatus(
  id: string,
  newStatus: FcpiDraftStatus,
  entityCode: string,
  byUserId: string,
): Promise<FcpiDraftRecord | null> {
  const list = read(entityCode);
  const idx = list.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  const cur = list[idx];
  list[idx] = { ...cur, status: newStatus, updated_at: new Date().toISOString() };
  write(entityCode, list);

  await appendAuditEntry({
    entityCode,
    entityId: cur.entity_id,
    voucherId: cur.id,
    voucherKind: 'vendor_quotation',
    action: `fcpi_${newStatus}`,
    actorUserId: byUserId,
    payload: { pi_no: cur.pi_no, from: cur.status, to: newStatus },
  });

  return list[idx];
}

// 3-c-3 ENRICHES with rate-contract validation · CC masters wiring (D-289 narration · T&C)
// 3-c-2 produces functional auto-draft · 3-c-3 polishes
