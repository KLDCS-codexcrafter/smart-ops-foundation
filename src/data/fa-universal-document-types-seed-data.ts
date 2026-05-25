/**
 * @file        src/data/fa-universal-document-types-seed-data.ts
 * @sprint      T-Phase-4.FAR-0 · Theme 1 · FAR-CAP-2
 */

export interface FADocumentType {
  id: string;
  name: string;
  description: string;
  required_for: string[];
}

export const FA_UNIVERSAL_DOCUMENT_TYPES: FADocumentType[] = [
  { id: 'doc-purchase-invoice', name: 'Purchase Invoice', description: 'Vendor invoice for FA purchase', required_for: ['capitalization'] },
  { id: 'doc-grn', name: 'GRN', description: 'Goods receipt note', required_for: ['capitalization'] },
  { id: 'doc-capitalization-voucher', name: 'Capitalization Voucher', description: 'Capitalization journal entry', required_for: ['put-to-use'] },
  { id: 'doc-transfer-note', name: 'Transfer Note', description: 'Asset transfer record', required_for: ['transfer'] },
  { id: 'doc-amc-contract', name: 'AMC Contract', description: 'Annual maintenance contract', required_for: ['maintenance'] },
  { id: 'doc-insurance-certificate', name: 'Insurance Certificate', description: 'Asset insurance proof', required_for: ['compliance'] },
  { id: 'doc-warranty-card', name: 'Warranty Card', description: 'Vendor warranty document', required_for: ['compliance'] },
  { id: 'doc-disposal-note', name: 'Disposal Note', description: 'Asset disposal record', required_for: ['disposal'] },
  { id: 'doc-component-replacement', name: 'Component Replacement Note', description: 'Major component swap record', required_for: ['maintenance'] },
  { id: 'doc-calibration-cert', name: 'Calibration Certificate', description: 'Calibration proof', required_for: ['compliance'] },
  { id: 'doc-audit-report', name: 'Audit Report', description: 'Physical verification audit', required_for: ['audit'] },
  { id: 'doc-insurance-renewal', name: 'Insurance Renewal', description: 'Renewed insurance policy', required_for: ['compliance'] },
];

export const faUniversalDocumentTypesKey = (entityCode: string): string =>
  `erp_fa_universal_document_types_${entityCode}`;

// [JWT] GET /api/fa/universal/document-types?entityCode=...
export function seedFAUniversalDocumentTypes(entityCode: string): void {
  const key = faUniversalDocumentTypesKey(entityCode);
  if (!localStorage.getItem(key)) {
    // [JWT] POST /api/fa/universal/document-types
    localStorage.setItem(key, JSON.stringify(FA_UNIVERSAL_DOCUMENT_TYPES));
  }
}
