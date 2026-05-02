/**
 * @file     non-finecore-voucher-type-registry.ts — Sibling voucher type registry
 * @sprint   T-Phase-1.2.6e-tally-1 · Q1-b · schema + registry only (UI in 2.7-b)
 * @updated  T-Phase-2.7-b · OOB-3 · field_rules + 3 demo seed voucher types
 * @purpose  Non-FineCore voucher types for Tally-Prime header parity.
 *           Mirrors FineCore VoucherType structure but separate (sibling discipline).
 *
 *   D-128 SIBLING DISCIPLINE: this file is NOT voucher-type.ts (which is FineCore).
 *   Keep them parallel · do NOT cross-import.
 *
 *   [JWT] GET/PUT /api/voucher-types/non-finecore?entityCode=:entityCode
 */

export type NonFineCoreVoucherFamily =
  | 'inventory_in'
  | 'inventory_out'
  | 'inventory_adjust'
  | 'sales_quote'
  | 'sales_request'
  | 'sales_invoice_memo'
  | 'sales_secondary'
  | 'sales_sample'
  | 'sales_demo'
  | 'dispatch';

/** Sprint 2.7-b · OOB-3 field rule per voucher type.
 *  Driven from Voucher Class Master · enforced at form save (mandatory at posted state · soft warn on draft per Q2-c). */
export interface FieldRule {
  field_path: string;            // e.g., 'narration', 'reference_no', 'lr_no', 'vehicle_no'
  field_label: string;           // human-readable label for error message
  rule: 'mandatory' | 'optional' | 'forbidden';
  enforce_on: 'posted' | 'always' | 'draft';   // Q2-c · 'posted' is the lean
  /** Optional regex/length guard. */
  min_length?: number;
  pattern?: string;              // RegExp source string · validated separately
  custom_message?: string;       // override default error text
}

export interface NonFineCoreVoucherType {
  id: string;
  family: NonFineCoreVoucherFamily;
  display_name: string;
  prefix: string;
  is_default: boolean;
  default_terms?: string;
  default_payment_terms?: string;
  approval_threshold_value?: number;
  approval_role?: string;
  is_active: boolean;
  /** Sprint 2.7-b · per-voucher-type field validation rules (OOB-3). */
  field_rules?: FieldRule[];
}

/** Default registry · seeded on first load if no entity-specific config exists. */
export const DEFAULT_NON_FINECORE_VOUCHER_TYPES: NonFineCoreVoucherType[] = [
  // Inventory In
  {
    id: 'vt-grn-domestic', family: 'inventory_in', display_name: 'GRN Domestic', prefix: 'GRN',
    is_default: true, is_active: true,
    approval_threshold_value: 500000, approval_role: 'stores_manager',
    field_rules: [
      { field_path: 'invoice_no', field_label: 'Vendor Invoice No', rule: 'mandatory', enforce_on: 'posted', min_length: 1 },
      { field_path: 'reference_no', field_label: 'Reference No', rule: 'optional', enforce_on: 'posted' },
      { field_path: 'lr_no', field_label: 'LR No', rule: 'optional', enforce_on: 'posted' },
      { field_path: 'vehicle_no', field_label: 'Vehicle No', rule: 'optional', enforce_on: 'posted' },
    ],
  },
  {
    id: 'vt-grn-import', family: 'inventory_in', display_name: 'GRN Import', prefix: 'GRN',
    is_default: false, is_active: true,
    default_terms: 'CIF/CFR terms apply · BOE reference required.',
    approval_threshold_value: 1000000, approval_role: 'finance_head',
    field_rules: [
      { field_path: 'invoice_no', field_label: 'BOE Number', rule: 'mandatory', enforce_on: 'posted', min_length: 5, custom_message: 'Bill of Entry (BOE) reference required for import GRN' },
      { field_path: 'reference_no', field_label: 'Reference No', rule: 'mandatory', enforce_on: 'posted' },
    ],
  },
  { id: 'vt-grn-subcontract', family: 'inventory_in', display_name: 'GRN Subcontract', prefix: 'GRN', is_default: false, is_active: true },

  // Inventory Out
  { id: 'vt-min-standard', family: 'inventory_out', display_name: 'Material Issue Note', prefix: 'MIN', is_default: true, is_active: true },
  { id: 'vt-ce-standard', family: 'inventory_out', display_name: 'Consumption Entry', prefix: 'CE', is_default: false, is_active: true },
  { id: 'vt-rtv-standard', family: 'inventory_out', display_name: 'Return to Vendor', prefix: 'RTV', is_default: false, is_active: true, approval_threshold_value: 200000, approval_role: 'stores_manager' },
  // Sprint 2.7-b · demo seed (Q1-b progressive disclosure visible)
  { id: 'vt-min-job-issue', family: 'inventory_out', display_name: 'Material Issue (Job)', prefix: 'MIN', is_default: false, is_active: true },

  // Inventory Adjust
  { id: 'vt-cc-standard', family: 'inventory_adjust', display_name: 'Cycle Count', prefix: 'CC', is_default: true, is_active: true, approval_threshold_value: 100000, approval_role: 'stores_manager' },

  // Sales side
  { id: 'vt-quotation-standard', family: 'sales_quote', display_name: 'Quotation Standard', prefix: 'QT', is_default: true, is_active: true, default_payment_terms: 'Net 30 days from invoice date' },
  {
    id: 'vt-quotation-export', family: 'sales_quote', display_name: 'Quotation Export', prefix: 'QT',
    is_default: false, is_active: true,
    default_terms: 'FOB/CIF terms · LC at sight required.', default_payment_terms: 'LC at sight',
    field_rules: [
      { field_path: 'narration', field_label: 'Narration', rule: 'mandatory', enforce_on: 'posted', min_length: 10, custom_message: 'Export quote requires narration with shipping terms (FOB/CIF/Incoterms)' },
    ],
  },
  // Sprint 2.7-b · demo seed
  { id: 'vt-quotation-domestic-special', family: 'sales_quote', display_name: 'Quotation Domestic Special', prefix: 'QT', is_default: false, is_active: true, default_payment_terms: 'Net 7 days · 2% cash discount' },
  { id: 'vt-srm-standard', family: 'sales_request', display_name: 'Supply Request Memo', prefix: 'SRM', is_default: true, is_active: true },
  { id: 'vt-im-standard', family: 'sales_invoice_memo', display_name: 'Invoice Memo', prefix: 'IM', is_default: true, is_active: true },
  // Sprint 2.7-b · demo seed
  { id: 'vt-im-export', family: 'sales_invoice_memo', display_name: 'Invoice Memo Export', prefix: 'IM', is_default: false, is_active: true, default_terms: 'Export shipment · LUT applies' },
  { id: 'vt-sec-standard', family: 'sales_secondary', display_name: 'Secondary Sales', prefix: 'SEC', is_default: true, is_active: true },
  { id: 'vt-som-refundable', family: 'sales_sample', display_name: 'Sample Outward (Refundable)', prefix: 'SOM', is_default: true, is_active: true },
  { id: 'vt-som-non-refundable', family: 'sales_sample', display_name: 'Sample Outward (Non-Refundable · Marketing)', prefix: 'SOM', is_default: false, is_active: true },
  {
    id: 'vt-dom-standard', family: 'sales_demo', display_name: 'Demo Outward', prefix: 'DOM',
    is_default: true, is_active: true,
    approval_threshold_value: 500000, approval_role: 'sales_head',
    field_rules: [
      { field_path: 'recipient_name', field_label: 'Recipient', rule: 'mandatory', enforce_on: 'posted' },
      { field_path: 'demo_start_date', field_label: 'Demo Start Date', rule: 'mandatory', enforce_on: 'posted' },
      { field_path: 'period_days', field_label: 'Demo Period', rule: 'mandatory', enforce_on: 'posted' },
    ],
  },

  // Dispatch
  { id: 'vt-dm-standard', family: 'dispatch', display_name: 'Delivery Memo', prefix: 'DM', is_default: true, is_active: true },
  { id: 'vt-dm-export', family: 'dispatch', display_name: 'Delivery Memo Export', prefix: 'DM', is_default: false, is_active: true },
];

/** Storage key (per-entity custom voucher types · entities can extend defaults). */
export const nonFineCoreVoucherTypesKey = (entityCode: string): string =>
  `erp_non_fc_voucher_types_${entityCode}`;

/** Read configured voucher types for an entity · falls back to defaults. */
export function getNonFineCoreVoucherTypes(entityCode: string): NonFineCoreVoucherType[] {
  try {
    // [JWT] GET /api/voucher-types/non-finecore?entityCode=:entityCode
    const raw = localStorage.getItem(nonFineCoreVoucherTypesKey(entityCode));
    if (raw) return JSON.parse(raw) as NonFineCoreVoucherType[];
  } catch { /* fallthrough */ }
  return DEFAULT_NON_FINECORE_VOUCHER_TYPES;
}

/** Persist entity-specific voucher types (extends defaults). */
export function saveNonFineCoreVoucherTypes(entityCode: string, types: NonFineCoreVoucherType[]): void {
  try {
    // [JWT] PUT /api/voucher-types/non-finecore?entityCode=:entityCode
    localStorage.setItem(nonFineCoreVoucherTypesKey(entityCode), JSON.stringify(types));
  } catch { /* ignore quota errors */ }
}

/** Get all voucher types for a specific family. */
export function getVoucherTypesForFamily(
  entityCode: string,
  family: NonFineCoreVoucherFamily,
): NonFineCoreVoucherType[] {
  return getNonFineCoreVoucherTypes(entityCode)
    .filter(vt => vt.family === family && vt.is_active);
}

/** Get the default voucher type for a family · used by forms when user hasn't picked. */
export function getDefaultVoucherTypeForFamily(
  entityCode: string,
  family: NonFineCoreVoucherFamily,
): NonFineCoreVoucherType | null {
  return getVoucherTypesForFamily(entityCode, family).find(vt => vt.is_default) ?? null;
}

/** Lookup a voucher type by id. */
export function findVoucherTypeById(
  entityCode: string,
  id: string,
): NonFineCoreVoucherType | null {
  return getNonFineCoreVoucherTypes(entityCode).find(vt => vt.id === id) ?? null;
}
