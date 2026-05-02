/**
 * @file     non-finecore-voucher-type-registry.ts — Sibling voucher type registry
 * @sprint   T-Phase-1.2.6e-tally-1 · Q1-b · schema + registry only (UI in 2.7-b)
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
}

/** Default registry · seeded on first load if no entity-specific config exists. */
export const DEFAULT_NON_FINECORE_VOUCHER_TYPES: NonFineCoreVoucherType[] = [
  // Inventory In
  { id: 'vt-grn-domestic', family: 'inventory_in', display_name: 'GRN Domestic', prefix: 'GRN', is_default: true, is_active: true, approval_threshold_value: 500000, approval_role: 'stores_manager' },
  { id: 'vt-grn-import', family: 'inventory_in', display_name: 'GRN Import', prefix: 'GRN', is_default: false, is_active: true, default_terms: 'CIF/CFR terms apply · BOE reference required.', approval_threshold_value: 1000000, approval_role: 'finance_head' },
  { id: 'vt-grn-subcontract', family: 'inventory_in', display_name: 'GRN Subcontract', prefix: 'GRN', is_default: false, is_active: true },

  // Inventory Out
  { id: 'vt-min-standard', family: 'inventory_out', display_name: 'Material Issue Note', prefix: 'MIN', is_default: true, is_active: true },
  { id: 'vt-ce-standard', family: 'inventory_out', display_name: 'Consumption Entry', prefix: 'CE', is_default: false, is_active: true },
  { id: 'vt-rtv-standard', family: 'inventory_out', display_name: 'Return to Vendor', prefix: 'RTV', is_default: false, is_active: true, approval_threshold_value: 200000, approval_role: 'stores_manager' },

  // Inventory Adjust
  { id: 'vt-cc-standard', family: 'inventory_adjust', display_name: 'Cycle Count', prefix: 'CC', is_default: true, is_active: true, approval_threshold_value: 100000, approval_role: 'stores_manager' },

  // Sales side
  { id: 'vt-quotation-standard', family: 'sales_quote', display_name: 'Quotation Standard', prefix: 'QT', is_default: true, is_active: true, default_payment_terms: 'Net 30 days from invoice date' },
  { id: 'vt-quotation-export', family: 'sales_quote', display_name: 'Quotation Export', prefix: 'QT', is_default: false, is_active: true, default_terms: 'FOB/CIF terms · LC at sight required.', default_payment_terms: 'LC at sight' },
  { id: 'vt-srm-standard', family: 'sales_request', display_name: 'Supply Request Memo', prefix: 'SRM', is_default: true, is_active: true },
  { id: 'vt-im-standard', family: 'sales_invoice_memo', display_name: 'Invoice Memo', prefix: 'IM', is_default: true, is_active: true },
  { id: 'vt-sec-standard', family: 'sales_secondary', display_name: 'Secondary Sales', prefix: 'SEC', is_default: true, is_active: true },
  { id: 'vt-som-refundable', family: 'sales_sample', display_name: 'Sample Outward (Refundable)', prefix: 'SOM', is_default: true, is_active: true },
  { id: 'vt-som-non-refundable', family: 'sales_sample', display_name: 'Sample Outward (Non-Refundable · Marketing)', prefix: 'SOM', is_default: false, is_active: true },
  { id: 'vt-dom-standard', family: 'sales_demo', display_name: 'Demo Outward', prefix: 'DOM', is_default: true, is_active: true, approval_threshold_value: 500000, approval_role: 'sales_head' },

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
