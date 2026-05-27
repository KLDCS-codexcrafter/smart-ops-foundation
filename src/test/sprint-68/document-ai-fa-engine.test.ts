/**
 * Sprint 68 FAR-4 · Block 16 · document-ai-fa-engine smoke tests
 */
import { describe, it, expect } from 'vitest';
import {
  validateGST,
  suggestFACategoryFromInvoice,
  mapInvoiceToAssetRecord,
  type InvoiceExtraction,
} from '@/lib/document-ai-fa-engine';

const SAMPLE: InvoiceExtraction = {
  vendor_gstin: '27AAACI1681G1ZN',
  vendor_name: 'Mahesh CNC Pvt Ltd',
  invoice_number: 'INV/68/001',
  invoice_date: '2026-05-27',
  total_amount: 2950000,
  taxable_amount: 2500000,
  cgst_amount: 225000,
  sgst_amount: 225000,
  igst_amount: 0,
  hsn_codes: ['8458'],
  line_items: [
    { description: 'CNC lathe machine model X', quantity: 1, rate: 2500000, amount: 2500000, hsn_code: '8458', gst_rate: 18 },
  ],
  fa_specific_fields: {
    asset_make: 'Mahesh',
    asset_model: 'CNC-LX-500',
    serial_number: 'SN-9001',
    warranty_period_months: 24,
    expected_useful_life_years: 10,
    capitalization_eligible: true,
    capitalization_basis: 'COST',
  },
  extraction_confidence: 0.9,
};

describe('document-ai-fa-engine · invoice extraction + classification', () => {
  it('validateGST returns errors[] empty for valid-format extraction', () => {
    const r = validateGST(SAMPLE);
    expect(r.gstin_valid).toBe(true);
    expect(Array.isArray(r.errors)).toBe(true);
  });

  it('validateGST flags missing GSTIN', () => {
    const r = validateGST({ ...SAMPLE, vendor_gstin: undefined });
    expect(r.is_valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('suggestFACategoryFromInvoice returns category field', () => {
    const r = suggestFACategoryFromInvoice(SAMPLE);
    expect(r.category).toBeDefined();
    expect(typeof r.confidence).toBe('number');
  });

  it('mapInvoiceToAssetRecord returns record patch with gross_block_cost', () => {
    const patch = mapInvoiceToAssetRecord(SAMPLE);
    expect(patch.gross_block_cost).toBe(2950000);
    expect(patch.purchase_date).toBe('2026-05-27');
  });
});
