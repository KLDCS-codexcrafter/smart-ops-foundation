/**
 * @file        src/types/foreign-customer-export-extension.ts
 * @purpose     Sibling extension type · 5 NEW export-readiness fields · foreign-customer.ts STRUCTURE 0-diff
 * @sprint      T-Phase-1.EX-7a-ExportPO-ForeignCustomer-DocPack
 * @decisions   EX-7a-Q4=a Foreign Customer full CRUD + 5 new fields · Q5=a foreign-customer.ts 0-diff
 *              Sibling-type pattern (same as rms-lane-engine.ts in EX-6) preserves base interface.
 */

export type KYCDocumentKind =
  | 'passport_copy'
  | 'utility_bill'
  | 'trade_license'
  | 'tax_certificate'
  | 'board_resolution';

export interface KYCDocument {
  kind: KYCDocumentKind;
  reference: string;
  verified: boolean;
  verified_at: string | null;
}

/** 5 export-readiness fields layered on top of base ForeignCustomer (foreign_customer_id FK) */
export interface ForeignCustomerExportExtension {
  foreign_customer_id: string;
  entity_id: string;
  swift_code: string;
  bank_account_iban: string;
  kyc_documents_pack: KYCDocument[];
  tax_residency_certificate: {
    reference: string;
    issued_country: string;
    valid_through: string;
  } | null;
  country_specific_doc_rules_ref: 'standard' | 'uae_legalized' | 'eu_eur1' | 'asean_form_ai' | 'cepa_preferential' | 'gsp_form_a';
  created_at: string;
  updated_at: string;
}

export const foreignCustomerExportExtensionKey = (entityCode: string): string =>
  `erp_${entityCode}_foreign_customer_export_extensions`;
