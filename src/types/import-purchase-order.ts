/**
 * @file        src/types/import-purchase-order.ts
 * @purpose     Import Purchase Order · sibling to Procure360 PO (D-127 ZERO TOUCH) · consumes EX-1 IEC + EX-2 CTH/FTA + Foreign Vendor
 * @sprint      T-Phase-1.EX-3-ImportPO-ForeignVendor-DualRate
 * @decisions   EX-3-Q1=b sibling · EX-3-Q4=a RateLadder · EX-3-Q5=b 15CA/15CB seed · EX-3-Q8=a FK to EX-1+EX-2 masters
 * @disciplines FR-30 · FR-50 · FR-26
 */
import type { IncotermType } from './foreign-customer';
import type { FTAAgreement } from './fta-preference';
import type { VoucherRateEntry } from './rate-ladder';

export type ImportPOStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent_to_vendor'
  | 'in_transit'
  | 'goods_arrived'
  | 'boe_filed'
  | 'closed'
  | 'cancelled';

export interface ImportPOLine {
  id: string;
  line_no: number;
  item_id: string;
  item_name: string;
  qty: number;
  uom: string;
  rate_foreign_currency: number;
  basic_value_foreign: number;
  cth_code: string;
  country_of_origin: string;
  fta_agreement: FTAAgreement | null;
  estimated_bcd_rate: number;
  estimated_igst_rate: number;
  notes: string;
}

export interface Form15CASeed {
  requires_form_15ca: boolean;
  form_15ca_ref: string | null;
  form_15cb_ref: string | null;
  form_15ca_filed_at: string | null;
}

export interface ImportPurchaseOrder {
  id: string;
  po_number: string;
  entity_id: string;
  status: ImportPOStatus;
  po_date: string;
  expected_delivery: string;

  iec_id: string;
  foreign_vendor_id: string;

  currency_code: string;
  booking_rate: number;
  customs_valuation_rate_estimate: number | null;
  rate_ladder: VoucherRateEntry[];

  incoterm: IncotermType;
  load_port_code: string;
  discharge_port_code: string;

  form_15ca_seed: Form15CASeed;
  rms_declaration_id: string | null;

  lines: ImportPOLine[];
  total_basic_value_foreign: number;
  estimated_landed_inr: number;

  created_at: string;
  updated_at: string;
  created_by: string;
}

export const importPOKey = (entityCode: string): string =>
  `erp_${entityCode}_import_purchase_orders`;
