/**
 * @file     invoice-print-engine.ts
 * @purpose  Build print payload for Tax Invoice · 3-copy (Original / Duplicate / Triplicate) · GST + IRN/QR + UPI.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Sprint 9 · Last updated Apr-2026 (T10-pre.2b.3b-B1 — resolved_toggles added)
 * @sprint   Sprint 9 (original), T10-pre.2b.3b-B1 (config param + resolved_toggles)
 * @iso      Maintainability (HIGH) · Functional Suitability (HIGH) · Reliability (HIGH backward-compat) · Compatibility (HIGH — purely additive)
 * @whom     Customer (recipient) · Transporter · Supplier (us)
 * @depends  Voucher · EntityGSTConfig · IRNRecord · print-config.ts · print-config-storage.ts
 * @consumers InvoicePrint.tsx panel (2b.3b-B2 wires toggle-gating)
 */

import type { Voucher } from '@/types/voucher';
import type { EntityGSTConfig } from '@/types/entity-gst';
import type { IRNRecord } from '@/types/irn';
import type { PrintConfig, PrintToggles } from '@/types/print-config';
import { DEFAULT_PRINT_CONFIG } from '@/types/print-config';
import { resolveToggles } from '@/lib/print-config-storage';

export interface InvoicePrintContext {
  voucher: Voucher;
  irn: IRNRecord | null;
  supplierGst: EntityGSTConfig;
  customerName: string;
  customerGstin: string | null;
  customerAddress: string;
  customerStateCode: string;
  paymentUpiUri: string | null;
}

export interface InvoicePrintLine {
  sl_no: number;
  item_code: string;
  item_description: string;
  hsn_sac: string;
  qty: number;
  uom: string;
  rate: number;
  amount: number;
  discount: number;
  taxable_value: number;
  cgst_rate: number; cgst_amount: number;
  sgst_rate: number; sgst_amount: number;
  igst_rate: number; igst_amount: number;
}

export interface InvoicePrintHsnSummary {
  hsn_sac: string;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface InvoicePrintPayload {
  title: 'TAX INVOICE' | 'BILL OF SUPPLY' | 'CREDIT NOTE' | 'DEBIT NOTE';
  is_original: boolean;
  copy_label: string;

  supplier_name: string;
  supplier_gstin: string;
  supplier_address: string;
  supplier_state: string;
  supplier_pan: string;

  voucher_no: string;
  voucher_date: string;
  place_of_supply: string;
  reverse_charge: 'Yes' | 'No';
  transportation_mode: string | null;
  vehicle_number: string | null;
  transporter: string | null;

  bill_to_name: string;
  bill_to_gstin: string | null;
  bill_to_address: string;
  bill_to_state: string;
  ship_to_name: string;
  ship_to_address: string;
  ship_to_state: string;

  lines: InvoicePrintLine[];

  total_taxable: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  round_off: number;
  grand_total: number;
  amount_in_words: string;

  hsn_summary: InvoicePrintHsnSummary[];

  irn: string | null;
  irn_ack_no: string | null;
  irn_ack_date: string | null;
  signed_qr_url: string | null;
  ewb_no: string | null;
  ewb_valid_until: string | null;

  payment_qr_url: string | null;
  payment_upi_vpa: string | null;

  bank_name: string;
  bank_account_no: string;
  bank_ifsc: string;
  bank_branch: string;
  terms: string;
  authorised_signatory: string;

  /** Resolved print toggles for renderer use. Populated by engine from optional PrintConfig; falls back to DEFAULT_TOGGLES when config absent. */
  resolved_toggles: PrintToggles;
}

const COPY_LABELS: Record<'original' | 'duplicate' | 'triplicate', string> = {
  original: 'ORIGINAL FOR RECIPIENT',
  duplicate: 'DUPLICATE FOR TRANSPORTER',
  triplicate: 'TRIPLICATE FOR SUPPLIER',
};

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return `${TENS[t]}${u ? ' ' + ONES[u] : ''}`;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(`${ONES[h]} Hundred`);
  if (r > 0) parts.push(twoDigits(r));
  return parts.join(' ');
}

/**
 * Indian number-to-words: 125050 -> "Rupees One Lakh Twenty Five Thousand Fifty Only"
 */
export function amountInWordsIN(amount: number): string {
  if (!Number.isFinite(amount)) return 'Rupees Zero Only';
  const isNeg = amount < 0;
  const abs = Math.abs(amount);
  const rupees = Math.floor(abs);
  const paise = Math.round((abs - rupees) * 100);

  if (rupees === 0 && paise === 0) return 'Rupees Zero Only';

  const parts: string[] = [];
  let n = rupees;
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const hundred = n;

  if (crore > 0) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh > 0) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred > 0) parts.push(threeDigits(hundred));

  let out = `Rupees ${parts.join(' ').trim()}`;
  if (paise > 0) out += ` and ${twoDigits(paise)} Paise`;
  out += ' Only';
  if (isNeg) out = `Minus ${out}`;
  return out;
}

/** Build a QR image URL via api.qrserver.com fallback. */
export function buildQRImageUrl(data: string, sizePx: number = 160): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${sizePx}x${sizePx}&data=${encodeURIComponent(data)}`;
}

export function buildInvoicePrintPayload(
  ctx: InvoicePrintContext,
  copyType: 'original' | 'duplicate' | 'triplicate' = 'original',
  config?: PrintConfig,
): InvoicePrintPayload {
  const v = ctx.voucher;
  const lines: InvoicePrintLine[] = (v.inventory_lines ?? []).map((l, i) => ({
    sl_no: i + 1,
    item_code: l.item_code,
    item_description: l.item_name,
    hsn_sac: l.hsn_sac_code || '',
    qty: l.qty,
    uom: l.uom || '',
    rate: l.rate,
    amount: l.qty * l.rate,
    discount: l.discount_amount,
    taxable_value: l.taxable_value,
    cgst_rate: l.cgst_rate,
    cgst_amount: l.cgst_amount,
    sgst_rate: l.sgst_rate,
    sgst_amount: l.sgst_amount,
    igst_rate: l.igst_rate,
    igst_amount: l.igst_amount,
  }));

  // HSN summary
  const hsnMap = new Map<string, InvoicePrintHsnSummary>();
  for (const l of lines) {
    const ex = hsnMap.get(l.hsn_sac) ?? {
      hsn_sac: l.hsn_sac, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0,
    };
    ex.taxable += l.taxable_value;
    ex.cgst += l.cgst_amount;
    ex.sgst += l.sgst_amount;
    ex.igst += l.igst_amount;
    ex.total += l.taxable_value + l.cgst_amount + l.sgst_amount + l.igst_amount;
    hsnMap.set(l.hsn_sac, ex);
  }

  const signedQrUrl = ctx.irn?.signed_qr_code
    ? buildQRImageUrl(ctx.irn.signed_qr_code, 160)
    : null;
  const paymentQrUrl = ctx.paymentUpiUri ? buildQRImageUrl(ctx.paymentUpiUri, 160) : null;

  // [Convergent] Resolve toggles via single source: DEFAULT_TOGGLES + per-voucher overrides.
  // Config absent → DEFAULT_TOGGLES for this voucher type (100% backward compat).
  const resolved_toggles = resolveToggles(config ?? DEFAULT_PRINT_CONFIG, 'invoice');

  return {
    title: 'TAX INVOICE',
    is_original: copyType === 'original',
    copy_label: COPY_LABELS[copyType],

    supplier_name: ctx.supplierGst.legal_name || ctx.supplierGst.trade_name || 'Supplier',
    supplier_gstin: ctx.supplierGst.gstin,
    supplier_address: [ctx.supplierGst.address_line_1, ctx.supplierGst.address_line_2, ctx.supplierGst.city, ctx.supplierGst.pincode]
      .filter(Boolean).join(', '),
    supplier_state: ctx.supplierGst.state_code,
    supplier_pan: ctx.supplierGst.pan,

    voucher_no: v.voucher_no,
    voucher_date: v.date,
    place_of_supply: v.place_of_supply ?? ctx.customerStateCode,
    reverse_charge: 'No',
    transportation_mode: v.transporter ? 'Road' : null,
    vehicle_number: v.vehicle_no ?? null,
    transporter: v.transporter ?? null,

    bill_to_name: ctx.customerName,
    bill_to_gstin: ctx.customerGstin,
    bill_to_address: ctx.customerAddress,
    bill_to_state: ctx.customerStateCode,
    ship_to_name: ctx.customerName,
    ship_to_address: ctx.customerAddress,
    ship_to_state: ctx.customerStateCode,

    lines,

    total_taxable: v.total_taxable,
    total_cgst: v.total_cgst,
    total_sgst: v.total_sgst,
    total_igst: v.total_igst,
    round_off: v.round_off,
    grand_total: v.net_amount,
    amount_in_words: amountInWordsIN(v.net_amount),

    hsn_summary: Array.from(hsnMap.values()),

    irn: ctx.irn?.irn ?? null,
    irn_ack_no: ctx.irn?.ack_no ?? null,
    irn_ack_date: ctx.irn?.ack_date ?? null,
    signed_qr_url: signedQrUrl,
    ewb_no: v.ewb_no ?? null,
    ewb_valid_until: v.ewb_valid_until ?? null,

    payment_qr_url: paymentQrUrl,
    payment_upi_vpa: ctx.supplierGst.upi_vpa || null,

    bank_name: ctx.supplierGst.bank_name,
    bank_account_no: ctx.supplierGst.bank_account_no,
    bank_ifsc: ctx.supplierGst.bank_ifsc,
    bank_branch: ctx.supplierGst.bank_branch,
    terms: 'Goods once sold cannot be returned. Subject to local jurisdiction.',
    authorised_signatory: ctx.supplierGst.legal_name || 'Authorised Signatory',
  };
}
