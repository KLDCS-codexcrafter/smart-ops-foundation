/**
 * @file        src/lib/document-ai-fa-engine.ts
 * @sibling     NEW @ Sprint 68 FAR-4 · 48th SIBLING
 * @realizes    Document AI substrate for MOAT-48 (AI classification feeder)
 * @approach    Q-LOCK-4 B · rule-based extraction · FA-specific invoice fields + GST validation
 * @upgrade     Phase 5 may swap PDF text extraction to ML/OCR pipeline
 * [JWT] Phase 5: POST /api/document-ai/extract (real PDF/OCR backend)
 */
import type { AssetUnitRecord } from '@/types/fixed-asset';
import { classifyFA, type FACategory } from './ai-fa-classification-engine';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  hsn_code?: string;
  gst_rate?: number;
}

export interface FASpecificFields {
  asset_make?: string;
  asset_model?: string;
  serial_number?: string;
  warranty_period_months?: number;
  expected_useful_life_years?: number;
  capitalization_eligible: boolean;       // per Ind AS 16 + Schedule II
  capitalization_basis: 'COST' | 'REVALUATION' | 'FAIR_VALUE';
}

export interface InvoiceExtraction {
  vendor_name?: string;
  vendor_gstin?: string;
  invoice_number?: string;
  invoice_date?: string;
  total_amount?: number;
  taxable_amount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  hsn_codes?: string[];
  line_items: InvoiceLineItem[];
  fa_specific_fields: FASpecificFields;
  extraction_confidence: number;
}

export interface GSTValidationResult {
  is_valid: boolean;
  gstin_valid: boolean;
  gstin_checksum_passes: boolean;
  hsn_codes_valid: boolean;
  tax_rate_consistent: boolean;
  warnings: string[];
  errors: string[];
}

// GSTIN format: 2-digit state + 10-char PAN + 1 entity + 'Z' + 1 checksum
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const HSN_REGEX = /^[0-9]{4,8}$/;

function decodeText(buffer: ArrayBuffer | Uint8Array): string {
  try {
    const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    return new TextDecoder('utf-8', { fatal: false }).decode(u8);
  } catch {
    return '';
  }
}

function pickMatch(text: string, regex: RegExp): string | undefined {
  const m = text.match(regex);
  return m ? m[1] ?? m[0] : undefined;
}

/**
 * Extract invoice data from a PDF buffer using rule-based pattern matching.
 * Phase 5 capstone may swap to ML/OCR pipeline.
 */
export async function extractInvoice(
  pdf_buffer: ArrayBuffer | Uint8Array,
): Promise<InvoiceExtraction> {
  const text = decodeText(pdf_buffer);
  const vendor_gstin = pickMatch(text, /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/);
  const invoice_number = pickMatch(text, /(?:invoice\s*(?:no\.?|#|number)\s*[:\-]?\s*)([A-Z0-9\/\-]+)/i);
  const invoice_date = pickMatch(text, /(\d{4}-\d{2}-\d{2})/);
  const total_amount_raw = pickMatch(text, /(?:total|grand\s*total)\s*[:\-]?\s*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  const total_amount = total_amount_raw ? Number(total_amount_raw.replace(/,/g, '')) : undefined;

  const hsnSet = new Set<string>();
  for (const m of text.matchAll(/\bHSN\s*[:\-]?\s*([0-9]{4,8})\b/gi)) hsnSet.add(m[1]);

  const fa_specific_fields: FASpecificFields = {
    asset_make: pickMatch(text, /(?:make|brand)\s*[:\-]\s*([A-Za-z0-9 \-]+)/i)?.trim(),
    asset_model: pickMatch(text, /(?:model)\s*[:\-]\s*([A-Za-z0-9 \-]+)/i)?.trim(),
    serial_number: pickMatch(text, /(?:s\/n|serial(?:\s*no)?)\s*[:\-]\s*([A-Za-z0-9\-]+)/i)?.trim(),
    warranty_period_months: ((): number | undefined => {
      const m = text.match(/warranty[^0-9]{0,15}([0-9]{1,3})\s*(year|yr|month|mo)/i);
      if (!m) return undefined;
      const n = Number(m[1]);
      return /year|yr/i.test(m[2]) ? n * 12 : n;
    })(),
    expected_useful_life_years: undefined,
    capitalization_eligible: total_amount === undefined ? false : total_amount >= 5000, // crude threshold
    capitalization_basis: 'COST',
  };

  const confidenceSignals = [vendor_gstin, invoice_number, invoice_date, total_amount, hsnSet.size > 0].filter(Boolean).length;
  const extraction_confidence = Number((confidenceSignals / 5).toFixed(2));

  return {
    vendor_gstin,
    invoice_number,
    invoice_date,
    total_amount,
    taxable_amount: total_amount,
    hsn_codes: Array.from(hsnSet),
    line_items: [],
    fa_specific_fields,
    extraction_confidence,
  };
}

function gstinChecksumPasses(gstin: string): boolean {
  if (!GSTIN_REGEX.test(gstin)) return false;
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = charset.indexOf(gstin[i]);
    if (v < 0) return false;
    const factor = i % 2 === 0 ? 1 : 2;
    const prod = v * factor;
    sum += Math.floor(prod / charset.length) + (prod % charset.length);
  }
  const checkCode = (charset.length - (sum % charset.length)) % charset.length;
  return charset[checkCode] === gstin[14];
}

export function validateGST(extraction: InvoiceExtraction): GSTValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const gstin = extraction.vendor_gstin ?? '';
  const gstin_valid = !!gstin && GSTIN_REGEX.test(gstin);
  const gstin_checksum_passes = gstin_valid && gstinChecksumPasses(gstin);
  if (!gstin) errors.push('Vendor GSTIN missing.');
  else if (!gstin_valid) errors.push('Vendor GSTIN format invalid.');
  else if (!gstin_checksum_passes) errors.push('Vendor GSTIN checksum failed.');

  const hsnCodes = extraction.hsn_codes ?? [];
  const hsn_codes_valid = hsnCodes.length === 0 ? true : hsnCodes.every((c) => HSN_REGEX.test(c));
  if (!hsn_codes_valid) errors.push('One or more HSN codes are malformed.');
  if (hsnCodes.length === 0) warnings.push('No HSN codes detected on invoice.');

  // Tax-rate consistency: CGST + SGST ≈ IGST equivalent (intra vs inter-state)
  const cgst = extraction.cgst_amount ?? 0;
  const sgst = extraction.sgst_amount ?? 0;
  const igst = extraction.igst_amount ?? 0;
  const tax_rate_consistent = !(cgst > 0 && igst > 0);
  if (!tax_rate_consistent) errors.push('Both CGST/SGST and IGST present — invoice cannot be both intra- and inter-state.');
  if (cgst > 0 && Math.abs(cgst - sgst) > 0.5) warnings.push('CGST and SGST amounts differ — usually they match for intra-state supplies.');

  return {
    is_valid: errors.length === 0,
    gstin_valid,
    gstin_checksum_passes,
    hsn_codes_valid,
    tax_rate_consistent,
    warnings,
    errors,
  };
}

export function suggestFACategoryFromInvoice(
  extraction: InvoiceExtraction,
): { category: FACategory; confidence: number; rationale: string } {
  const lineDescs = extraction.line_items.map((li) => li.description);
  const seed = [extraction.fa_specific_fields.asset_make, extraction.fa_specific_fields.asset_model].filter(Boolean).join(' ');
  const result = classifyFA(seed, lineDescs);
  const rationale = result.matched_keywords.length
    ? `Matched keywords: ${result.matched_keywords.join(', ')}`
    : 'No keyword matches — classified as UNCLASSIFIED.';
  return { category: result.suggested_category, confidence: result.confidence, rationale };
}

export function mapInvoiceToAssetRecord(
  extraction: InvoiceExtraction,
): Partial<AssetUnitRecord> {
  const fa = extraction.fa_specific_fields;
  const result: Partial<AssetUnitRecord> = {
    gross_block_cost: extraction.total_amount ?? 0,
    purchase_date: extraction.invoice_date ?? new Date().toISOString().slice(0, 10),
  };
  if (fa.capitalization_eligible) {
    const suggestion = suggestFACategoryFromInvoice(extraction);
    result.ai_classification_suggestion = suggestion.category;
    result.ai_classification_confidence = suggestion.confidence;
  }
  return result;
}
