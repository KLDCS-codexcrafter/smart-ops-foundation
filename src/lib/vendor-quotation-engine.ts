/**
 * vendor-quotation-engine.ts — Vendor quotation capture + comparison
 * Sprint T-Phase-1.2.6f-a
 * [JWT] POST /api/procure360/quotations
 */
import {
  vendorQuotationsKey,
  type VendorQuotation,
  type VendorQuotationLine,
  type VendorQuotationStatus,
  type QuotationSubmissionSource,
} from '@/types/vendor-quotation';
import { appendAuditEntry } from './audit-trail-hash-chain';
import { publishProcurementPulse } from './procurement-pulse-stub';

const newId = (p: string): string =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function readQ(entityCode: string): VendorQuotation[] {
  try {
    const raw = localStorage.getItem(vendorQuotationsKey(entityCode));
    return raw ? (JSON.parse(raw) as VendorQuotation[]) : [];
  } catch {
    return [];
  }
}

function writeQ(entityCode: string, list: VendorQuotation[]): void {
  try {
    localStorage.setItem(vendorQuotationsKey(entityCode), JSON.stringify(list));
  } catch {
    /* quota silent */
  }
}

export function listQuotations(entityCode: string): VendorQuotation[] {
  return readQ(entityCode);
}

export function getQuotationsByRfq(rfqId: string, entityCode: string): VendorQuotation[] {
  return readQ(entityCode).filter((q) => q.parent_rfq_id === rfqId);
}

export function getQuotationsByEnquiry(enquiryId: string, entityCode: string): VendorQuotation[] {
  return readQ(entityCode).filter((q) => q.parent_enquiry_id === enquiryId);
}

function nextQuotationNo(existing: VendorQuotation[]): string {
  const ym = new Date().toISOString().slice(0, 7).replace('-', '');
  return `VQ/${ym}/${String(existing.length + 1).padStart(4, '0')}`;
}

export interface SubmitQuotationInput {
  parent_rfq_id: string;
  parent_enquiry_id: string;
  entity_id: string;
  vendor_id: string;
  vendor_name: string;
  lines: Omit<VendorQuotationLine, 'id' | 'line_no' | 'amount_after_tax'>[];
  payment_terms: string;
  payment_terms_days: number;
  delivery_terms: string;
  validity_days: number;
  vendor_gstin?: string | null;
  vendor_msme_status?: 'micro' | 'small' | 'medium' | 'none' | null;
  tds_section?: string | null;
  rcm_applicable?: boolean;
  source: QuotationSubmissionSource;
  submitted_by: string;
}

function lineAmount(l: { qty_quoted: number; rate: number; discount_percent: number; tax_percent: number }): number {
  const gross = l.qty_quoted * l.rate;
  const afterDisc = gross * (1 - l.discount_percent / 100);
  return Math.round((afterDisc * (1 + l.tax_percent / 100)) * 100) / 100;
}

export function submitQuotation(input: SubmitQuotationInput, entityCode: string): VendorQuotation {
  const list = readQ(entityCode);
  const now = new Date().toISOString();
  const lines: VendorQuotationLine[] = input.lines.map((l, idx) => ({
    ...l,
    id: newId('vql'),
    line_no: idx + 1,
    amount_after_tax: lineAmount(l),
  }));
  const totalValue = lines.reduce((s, l) => s + l.qty_quoted * l.rate, 0);
  const totalAfterTax = lines.reduce((s, l) => s + l.amount_after_tax, 0);
  const totalTax = Math.round((totalAfterTax - totalValue) * 100) / 100;

  const q: VendorQuotation = {
    id: newId('vq'),
    quotation_no: nextQuotationNo(list),
    parent_rfq_id: input.parent_rfq_id,
    parent_enquiry_id: input.parent_enquiry_id,
    entity_id: input.entity_id,
    vendor_id: input.vendor_id,
    vendor_name: input.vendor_name,
    lines,
    total_value: Math.round(totalValue * 100) / 100,
    total_tax: totalTax,
    total_after_tax: Math.round(totalAfterTax * 100) / 100,
    payment_terms: input.payment_terms,
    payment_terms_days: input.payment_terms_days,
    delivery_terms: input.delivery_terms,
    validity_days: input.validity_days,
    validity_until: new Date(Date.now() + input.validity_days * 86400000).toISOString().slice(0, 10),
    vendor_gstin: input.vendor_gstin ?? null,
    vendor_msme_status: input.vendor_msme_status ?? null,
    tds_section: input.tds_section ?? null,
    rcm_applicable: input.rcm_applicable ?? false,
    source: input.source,
    submitted_at: now,
    submitted_by: input.submitted_by,
    is_awarded: false,
    award_at: null,
    award_remarks: null,
    status: 'submitted',
    created_at: now,
    updated_at: now,
  };
  writeQ(entityCode, [q, ...list]);
  return q;
}

export function transitionQuotation(
  id: string,
  status: VendorQuotationStatus,
  entityCode: string,
): VendorQuotation | null {
  const list = readQ(entityCode);
  const idx = list.findIndex((q) => q.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], status, updated_at: new Date().toISOString() };
  writeQ(entityCode, list);
  return list[idx];
}

export function awardQuotation(
  id: string,
  remarks: string,
  entityCode: string,
): VendorQuotation | null {
  const list = readQ(entityCode);
  const idx = list.findIndex((q) => q.id === id);
  if (idx < 0) return null;
  list[idx] = {
    ...list[idx],
    is_awarded: true,
    award_at: new Date().toISOString(),
    award_remarks: remarks,
    status: 'awarded',
    updated_at: new Date().toISOString(),
  };
  writeQ(entityCode, list);
  return list[idx];
}

export interface ComparisonCell {
  vendor_id: string;
  vendor_name: string;
  rate: number;
  amount_after_tax: number;
  delivery_days: number;
  is_supplied: boolean;
}

export interface ComparisonRow {
  enquiry_line_id: string;
  cells: ComparisonCell[];
  best_price_vendor_id: string | null;
}

export function compareQuotations(enquiryId: string, entityCode: string): ComparisonRow[] {
  const quotations = getQuotationsByEnquiry(enquiryId, entityCode);
  const lineMap = new Map<string, ComparisonRow>();
  for (const q of quotations) {
    for (const l of q.lines) {
      let row = lineMap.get(l.enquiry_line_id);
      if (!row) {
        row = { enquiry_line_id: l.enquiry_line_id, cells: [], best_price_vendor_id: null };
        lineMap.set(l.enquiry_line_id, row);
      }
      row.cells.push({
        vendor_id: q.vendor_id,
        vendor_name: q.vendor_name,
        rate: l.rate,
        amount_after_tax: l.amount_after_tax,
        delivery_days: l.delivery_days,
        is_supplied: l.is_supplied,
      });
    }
  }
  const rows = Array.from(lineMap.values());
  for (const r of rows) {
    const supplied = r.cells.filter((c) => c.is_supplied);
    if (supplied.length > 0) {
      const best = supplied.reduce((a, b) => (a.rate <= b.rate ? a : b));
      r.best_price_vendor_id = best.vendor_id;
    }
  }
  return rows;
}

export function validateQuotationCompliance(q: VendorQuotation): {
  ok: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  if (!q.vendor_gstin) warnings.push('Vendor GSTIN missing');
  if (!q.vendor_msme_status) warnings.push('MSME status not declared');
  if (q.rcm_applicable && !q.tds_section) warnings.push('RCM applicable but TDS section missing');
  return { ok: warnings.length === 0, warnings };
}
