/**
 * @file        src/types/commercial-invoice.ts
 * @purpose     Commercial Invoice · sibling type · 5th sibling pattern application (D-127 + D-283 + D-284 + EX-3 ImportPO + EX-4 MLGIT preserved)
 * @who         Import operators · BoE planners · finance reconciliation
 * @when        Phase 1.EX-5 · LARGEST EximX sprint · 6-Part Allocation drilldown · consumed by EX-6 BoE
 * @sprint      T-Phase-1.EX-5-CommercialInvoice-6PartAllocation-CIFWaterfall
 * @iso         Functional Suitability · Maintainability (ISO 25010)
 * @decisions   EX-5-Q1=b sibling · EX-5-Q2=a embedded allocation · EX-5-Q4=a CICustomeVal editable · EX-5-Q5=a Rule 10 visible
 * @disciplines FR-30 · FR-50 · FR-58 · FR-26 entity-scoped localStorage
 */
import type { CIItemAllocation } from './ci-item-allocation';

export type CIStatus =
  | 'draft'
  | 'received_from_vendor'
  | 'sent_to_cha'
  | 'boe_filed'
  | 'reconciled'
  | 'closed'
  | 'cancelled';

export interface CILine {
  id: string;
  line_no: number;
  related_import_po_line_id: string;
  item_id: string;
  item_name: string;
  hsn_code: string;
  cth_code: string;
  country_of_origin: string;
  qty: number;
  uom: string;
  rate_foreign_currency: number;
  fob_value_foreign: number;
  fob_value_inr: number;
  gross_weight_kgs: number;
  volume_cbm: number;
  allocation: CIItemAllocation;
  notes: string;
}

export interface CommercialInvoice {
  id: string;
  ci_number: string;
  entity_id: string;
  status: CIStatus;
  ci_date: string;
  vendor_invoice_no: string;

  related_import_po_id: string;
  related_import_po_no: string;
  related_mlgit_id: string | null;
  related_mlgit_no: string | null;
  foreign_vendor_id: string;

  currency_code: string;
  booking_rate: number;
  customs_exchange_rate: number;
  customs_valuation_rate_at_boe: number | null;

  vessel_or_flight_id: string;
  bill_of_lading_no: string;
  port_of_loading: string;
  port_of_discharge: string;

  total_voucher_insurance_inr: number;
  total_voucher_freight_inr: number;
  total_voucher_exworks_inr: number;
  total_voucher_packing_inr: number;

  lines: CILine[];

  total_fob_value_foreign: number;
  total_fob_value_inr: number;
  total_cif_value_inr: number;
  total_actual_cif_inr: number;
  total_landed_value_inr: number;

  fta_claimed: boolean;
  rule_10_loadings_present: boolean;

  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export const commercialInvoiceKey = (entityCode: string): string =>
  `erp_${entityCode}_commercial_invoices`;

export const CI_VALID_TRANSITIONS: Record<CIStatus, CIStatus[]> = {
  draft: ['received_from_vendor', 'cancelled'],
  received_from_vendor: ['sent_to_cha', 'cancelled'],
  sent_to_cha: ['boe_filed', 'cancelled'],
  boe_filed: ['reconciled'],
  reconciled: ['closed'],
  closed: [],
  cancelled: [],
};
