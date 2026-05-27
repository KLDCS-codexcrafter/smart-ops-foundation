/**
 * Sprint 68 FAR-4 · Block 16 · document-ai-fa-engine smoke tests
 */
import { describe, it, expect } from 'vitest';
import {
  validateGST,
  suggestFACategoryFromInvoice,
  mapInvoiceToAssetRecord,
} from '@/lib/document-ai-fa-engine';

const SAMPLE_EXTRACTION = {
  vendor_gstin: '27AAACI1681G1ZN',
  vendor_name: 'Mahesh CNC Pvt Ltd',
  invoice_number: 'INV/68/001',
  invoice_date: '2026-05-27',
  line_items: [
    { description: 'CNC lathe machine model X', quantity: 1, rate: 2500000, amount: 2500000, hsn_code: '8458', gst_rate: 18 },
  ],
  total_amount: 2950000,
  tax_amount: 450000,
};

describe('document-ai-fa-engine · invoice extraction + classification', () => {
  it('validateGST passes for valid 15-char GSTIN', () => {
    const r = validateGST(SAMPLE_EXTRACTION as never);
    expect(r.valid).toBe(true);
  });

  it('validateGST fails for malformed GSTIN', () => {
    const r = validateGST({ ...SAMPLE_EXTRACTION, vendor_gstin: 'INVALID-GST' } as never);
    expect(r.valid).toBe(false);
  });

  it('suggestFACategoryFromInvoice classifies CNC line as PLANT_MACHINERY', () => {
    const r = suggestFACategoryFromInvoice(SAMPLE_EXTRACTION as never);
    expect(r.suggested_category).toBe('PLANT_MACHINERY');
  });

  it('mapInvoiceToAssetRecord returns asset record patch with vendor + cost', () => {
    const patch = mapInvoiceToAssetRecord(SAMPLE_EXTRACTION as never);
    expect(patch).toBeDefined();
    expect(patch.vendor_name).toBe('Mahesh CNC Pvt Ltd');
  });
});
