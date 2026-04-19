/**
 * sample-kit.ts — Try-before-you-buy sample kits
 * Out-of-box idea #5. Tenant ships a curated bundle; customer has
 * 30 days to return. After 30 days, auto-invoice. Tracks conversion.
 * [JWT] POST /api/customer/sample-kits/request
 */

export type SampleKitStatus =
  | 'requested'      // customer requested
  | 'approved'       // tenant approved — to be shipped
  | 'shipped'        // in transit
  | 'delivered'      // customer received
  | 'returned'       // customer returned within 30d
  | 'converted'      // customer kept — auto-invoiced
  | 'cancelled';     // rejected or cancelled

export interface SampleKitTemplate {
  id: string;
  entity_id: string;
  code: string;
  name: string;                    // 'Essentials Kit', 'Premium Tasting Kit'
  description: string;
  item_ids: string[];              // curated SKUs
  total_value_paise: number;       // value if converted
  max_kits_per_customer: number;
  min_clv_tier?: 'standard' | 'growth' | 'vip';   // eligibility gate
  active: boolean;
}

export interface SampleKitRequest {
  id: string;
  entity_id: string;
  customer_id: string;
  customer_name: string;
  template_id: string;
  template_name: string;
  status: SampleKitStatus;
  requested_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  return_deadline: string | null;  // delivered_at + 30 days
  closed_at: string | null;        // returned or converted
  invoice_id: string | null;       // if converted
  converted_value_paise: number;
  notes: string;
}

export const CONVERSION_WINDOW_DAYS = 30;

export const sampleKitTemplatesKey = (e: string) => `erp_sample_kit_templates_${e}`;
export const sampleKitRequestsKey  = (e: string) => `erp_sample_kit_requests_${e}`;
