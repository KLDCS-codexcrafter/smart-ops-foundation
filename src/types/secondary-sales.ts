/**
 * secondary-sales.ts — Distributor sell-through to sub-dealers/retailers
 * Sprint 7. Primary sale = your sale TO distributor (FineCore Sales Invoice).
 * Secondary sale = distributor's sale FROM their stock to the next tier.
 * No accounting impact — informs forecasting, scheme payouts, trade promo.
 * [JWT] GET/POST /api/salesx/secondary-sales
 * [JWT] POST /api/external/secondary-sales (distributor-app integration stub)
 */

export type EndCustomerType = 'sub_dealer' | 'retailer' | 'end_consumer' | 'institution';

export interface SecondarySalesLine {
  id: string;
  item_code: string;
  item_name: string;
  qty: number;
  uom: string;
  rate: number;
  amount: number;
}

export interface SecondarySales {
  id: string;
  entity_id: string;
  secondary_code: string;            // SEC/YY-YY/NNNN
  sale_date: string;                 // ISO date

  // Who
  distributor_id: string;            // CustomerMaster party code
  distributor_name: string;
  end_customer_type: EndCustomerType;
  end_customer_name: string | null;
  end_customer_code: string | null;

  lines: SecondarySalesLine[];
  total_amount: number;

  // Source of data
  capture_mode: 'manual' | 'api' | 'csv_import';
  api_request_id: string | null;

  notes: string | null;

  created_at: string;
  updated_at: string;
}

export const secondarySalesKey = (e: string) => `erp_secondary_sales_${e}`;

export const END_CUSTOMER_LABELS: Record<EndCustomerType, string> = {
  sub_dealer: 'Sub-dealer',
  retailer: 'Retailer',
  end_consumer: 'End Consumer',
  institution: 'Institution',
};
