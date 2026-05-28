/**
 * @file        src/lib/comply360-einvoice-aggregator-engine.ts
 * @purpose     Comply360 E-Invoice aggregator · cross-card eligible-voucher collection,
 *              batch IRP payload build, validation; thin wrapper over the FR-19
 *              `irn-engine` boundary (0-DIFF) for Pass A engine consumption by Pass B UI.
 * @sprint      Sprint 73a · T-Phase-5.A.1.5-PASS-A · Block 3 · DP-S73-2
 * @iso         Reliability · Maintainability · Auditability
 * @disciplines FR-19 SIBLING · FR-43 unit tests · FR-79 audit stamping · FR-91 honest disclosure
 * @reads-from  src/lib/irn-engine.ts (buildIRNPayload · validateIRNPayload · generateIRN · 0-DIFF) ·
 *              localStorage `erp_group_vouchers_<entityCode>` (cross-card voucher stream)
 * @lesson-23   Engine return shapes are grepped by Block 7 tests before assertion.
 */
import type { Voucher } from '@/types/voucher';
import type { IRNRecord } from '@/types/irn';
import {
  buildIRNPayload,
  validateIRNPayload,
  generateIRN,
  type IRPPayload,
  type IRPCredentials,
} from './irn-engine';

// ── Public Types ─────────────────────────────────────────────────────

export interface EInvoiceBatchFilter {
  entity_code: string;
  fy: string;                      // e.g. 'FY25-26'
  return_period?: string;          // 'MM-YYYY' optional
  voucher_types?: string[];        // restrict to Sales Invoice / CRN / DBN etc.
  min_invoice_value?: number;      // ₹50,000 (IRN turnover gate handled upstream)
  include_already_generated?: boolean;
}

export interface EInvoiceEligibleVoucher {
  voucher_id: string;
  voucher_no: string;
  voucher_date: string;
  voucher_type: string;
  customer_gstin: string;
  customer_name: string;
  total_invoice_value: number;
  already_has_irn: boolean;
  raw: Voucher;
}

export interface EInvoiceBatchItem {
  voucher_id: string;
  voucher_no: string;
  payload: IRPPayload;
  errors: string[];
  status: 'valid' | 'invalid';
}

export interface EInvoiceBatch {
  entity_code: string;
  fy: string;
  return_period: string | null;
  total_count: number;
  valid_count: number;
  invalid_count: number;
  items: EInvoiceBatchItem[];
}

export interface EInvoiceBatchValidation {
  ok: boolean;
  total: number;
  valid: number;
  invalid: number;
  invalid_voucher_nos: string[];
}

// ── READS_FROM contract (Lesson 23) ──────────────────────────────────

export const READS_FROM = {
  irnEngine: 'src/lib/irn-engine.ts',
  voucherStream: 'localStorage:erp_group_vouchers_<entityCode>',
} as const;

// ── Internal helpers ─────────────────────────────────────────────────

interface RawSeller {
  gstin?: string;
  legal_name?: string;
  address?: string;
  city?: string;
  pincode?: string;
  state_code?: string;
}

interface RawVoucherLike {
  id?: string;
  voucher_no?: string;
  date?: string;
  voucher_type_name?: string;
  customer_gstin?: string;
  customer_name?: string;
  customer_address?: string;
  customer_city?: string;
  customer_pincode?: string;
  customer_state_code?: string;
  supplier?: RawSeller;
  net_amount?: number;
  irn?: string | null;
  status?: string;
  [key: string]: unknown;
}

function loadVouchers(entityCode: string): RawVoucherLike[] {
  // [JWT] GET /api/accounting/vouchers?entity=<entityCode>&einvoice_eligible=1
  try {
    const raw = localStorage.getItem(`erp_group_vouchers_${entityCode}`);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RawVoucherLike[]) : [];
  } catch {
    return [];
  }
}

function inPeriod(voucherDate: string | undefined, period: string | undefined): boolean {
  if (!period) return true;
  if (!voucherDate || voucherDate.length < 10) return false;
  const mm = voucherDate.slice(5, 7);
  const yyyy = voucherDate.slice(0, 4);
  return `${mm}-${yyyy}` === period;
}

function defaultSeller(): Required<RawSeller> {
  return {
    gstin: '27AAAAA0000A1Z5',
    legal_name: 'Default Seller Pvt Ltd',
    address: 'NA',
    city: 'NA',
    pincode: '000000',
    state_code: '27',
  };
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Collect vouchers eligible for IRN generation under the given filter.
 * Eligibility = posted · voucher_type allowed · period match · value ≥ min · has customer GSTIN.
 */
export function collectEligibleVouchers(filter: EInvoiceBatchFilter): EInvoiceEligibleVoucher[] {
  const vouchers = loadVouchers(filter.entity_code);
  const allowedTypes = filter.voucher_types && filter.voucher_types.length > 0
    ? new Set(filter.voucher_types.map((t) => t.toLowerCase()))
    : null;
  const minVal = filter.min_invoice_value ?? 0;
  const out: EInvoiceEligibleVoucher[] = [];

  for (const v of vouchers) {
    if (v.status && v.status !== 'posted') continue;
    const vDate = v.date ?? '';
    if (!inPeriod(vDate, filter.return_period)) continue;
    const vType = (v.voucher_type_name ?? '').toLowerCase();
    if (allowedTypes && !allowedTypes.has(vType)) continue;
    const gstin = v.customer_gstin ?? '';
    if (!gstin) continue;
    const totalVal = v.net_amount ?? 0;
    if (totalVal < minVal) continue;
    const hasIrn = Boolean(v.irn);
    if (hasIrn && !filter.include_already_generated) continue;

    out.push({
      voucher_id: v.id ?? v.voucher_no ?? '',
      voucher_no: v.voucher_no ?? '',
      voucher_date: vDate,
      voucher_type: v.voucher_type_name ?? '',
      customer_gstin: gstin,
      customer_name: v.customer_name ?? '',
      total_invoice_value: totalVal,
      already_has_irn: hasIrn,
      raw: v as unknown as Voucher,
    });
  }
  return out;
}

/**
 * Build an IRP payload batch for cross-card consumption by Pass B surfaces.
 * Each item carries its own payload + validation errors so the UI can show
 * per-row remediation without re-walking the engine.
 */
export function buildEInvoiceBatch(filter: EInvoiceBatchFilter): EInvoiceBatch {
  const eligible = collectEligibleVouchers(filter);
  const seller = defaultSeller();
  const items: EInvoiceBatchItem[] = eligible.map((e) => {
    const raw = e.raw as RawVoucherLike;
    const payload = buildIRNPayload(
      e.raw,
      seller.gstin,
      seller.legal_name,
      seller.address,
      seller.city,
      seller.pincode,
      seller.state_code,
      e.customer_gstin,
      e.customer_name || 'NA',
      raw.customer_address ?? 'NA',
      raw.customer_city ?? 'NA',
      raw.customer_pincode ?? '000000',
      raw.customer_state_code ?? '27',
    );
    const errors = validateIRNPayload(payload);
    return {
      voucher_id: e.voucher_id,
      voucher_no: e.voucher_no,
      payload,
      errors,
      status: errors.length === 0 ? 'valid' : 'invalid',
    };
  });
  const validCount = items.filter((i) => i.status === 'valid').length;
  return {
    entity_code: filter.entity_code,
    fy: filter.fy,
    return_period: filter.return_period ?? null,
    total_count: items.length,
    valid_count: validCount,
    invalid_count: items.length - validCount,
    items,
  };
}

/** Roll up a batch into a single ok/invalid summary for UI badges and gate checks. */
export function validateBatch(batch: EInvoiceBatch): EInvoiceBatchValidation {
  const invalids = batch.items.filter((i) => i.status === 'invalid');
  return {
    ok: invalids.length === 0,
    total: batch.total_count,
    valid: batch.valid_count,
    invalid: batch.invalid_count,
    invalid_voucher_nos: invalids.map((i) => i.voucher_no),
  };
}

/**
 * Drive `generateIRN` once per valid item in the batch and return the resulting
 * `IRNRecord` list. Invalid items are skipped (their errors stay in the batch).
 *
 * [JWT] In production this fans out to the GSP bridge with batch semantics.
 */
export async function generateBatchIRN(
  batch: EInvoiceBatch,
  creds: IRPCredentials,
  entityCode: string,
): Promise<IRNRecord[]> {
  const out: IRNRecord[] = [];
  for (const item of batch.items) {
    if (item.status !== 'valid') continue;
    // Find the original voucher in the eligible set for fields the payload doesn't carry.
    const eligible = collectEligibleVouchers({
      entity_code: entityCode,
      fy: batch.fy,
      return_period: batch.return_period ?? undefined,
      include_already_generated: true,
    }).find((e) => e.voucher_id === item.voucher_id);
    if (!eligible) continue;
    const rec = await generateIRN(item.payload, creds, eligible.raw, entityCode);
    out.push(rec);
  }
  return out;
}
