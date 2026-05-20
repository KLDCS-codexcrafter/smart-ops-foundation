/**
 * @file        src/types/supplier-declaration.ts
 * @purpose     CAROTAR Form II supplier RoO declaration · Rules of Origin verification
 * @sprint      T-Phase-1.EX-9-Compliance-Suite
 * @decisions   EX-9-Q2=a CAROTAR FULL · v7 Gap #11
 * @disciplines FR-30 · FR-50 · FR-58 · FR-26 entity-scoped · FR-80 exhaustive
 */

export type RoOClassification = 'wholly_obtained' | 'cth_change' | 'value_add' | 'specific_process' | 'not_originating';

export type SupplierDeclarationStatus = 'draft' | 'submitted_by_supplier' | 'verified_by_importer' | 'submitted_to_customs' | 'queried' | 'accepted' | 'rejected';

export const SD_VALID_TRANSITIONS: Record<SupplierDeclarationStatus, SupplierDeclarationStatus[]> = {
  draft: ['submitted_by_supplier'],
  submitted_by_supplier: ['verified_by_importer', 'rejected'],
  verified_by_importer: ['submitted_to_customs', 'rejected'],
  submitted_to_customs: ['accepted', 'queried', 'rejected'],
  queried: ['accepted', 'rejected'],
  accepted: [],
  rejected: [],
};

export interface SupplierDeclaration {
  id: string;
  declaration_no: string;
  entity_id: string;
  status: SupplierDeclarationStatus;
  related_foreign_vendor_id: string;
  related_cth: string;
  origin_country_code: string;
  roo_classification: RoOClassification;
  value_add_percentage: number | null;
  cth_change_basis: string | null;
  specific_process_description: string | null;
  fta_treaty_code: string;
  customs_query_text: string | null;
  customs_response_deadline: string | null;
  declaration_date: string;
  submitted_to_customs_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const supplierDeclarationKey = (entityCode: string): string =>
  `erp_${entityCode}_supplier_declarations`;
