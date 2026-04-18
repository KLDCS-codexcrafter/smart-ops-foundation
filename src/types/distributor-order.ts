/**
 * partner-order.ts — Distributor cart + order + payment intimation types.
 * Sprint 10. Cart is offline-first (IndexedDB), order persists to localStorage
 * once submitted (FineCore reads it as a Sales Order draft).
 */

export type DistributorOrderStatus =
  | 'draft'           // in cart, not yet submitted
  | 'submitted'       // sent to ERP, awaiting credit/inventory check
  | 'approved'        // ERP accountant approved
  | 'rejected'        // bounced (over credit / out of stock)
  | 'invoiced'        // SI created against this order
  | 'cancelled';      // distributor pulled it back before approval

/** A single line within the cart or order */
export interface DistributorOrderLine {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  qty: number;
  rate_paise: number;       // tier-priced at add-time; locked at submit
  discount_percent: number;
  taxable_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  total_paise: number;
  hsn_sac: string | null;
}

/**
 * DistributorCartState — IndexedDB-backed offline cart. ONE active cart per partner.
 * Auto-syncs to ERP on submit().
 */
export interface DistributorCartState {
  id: string;                // = partner_id (one cart per partner)
  partner_id: string;
  entity_code: string;
  lines: DistributorOrderLine[];
  notes: string;
  delivery_address: string;
  expected_delivery_date: string | null;
  updated_at: string;        // ISO; touched on every mutation
}

/**
 * DistributorOrder — submitted cart, persisted as `erp_distributor_orders_{entityCode}`.
 * ERP staff can approve/reject; SI is created on approval (Sprint 9 SalesInvoice).
 */
export interface DistributorOrder {
  id: string;
  order_no: string;             // PO/2026/00042 style
  partner_id: string;
  partner_code: string;
  partner_name: string;
  entity_code: string;
  status: DistributorOrderStatus;
  lines: DistributorOrderLine[];
  total_taxable_paise: number;
  total_tax_paise: number;
  grand_total_paise: number;
  notes: string;
  delivery_address: string;
  expected_delivery_date: string | null;
  rejection_reason: string | null;
  linked_invoice_id: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * DistributorPaymentIntimation — distributor self-records 'I paid X by RTGS UTR Y'.
 * NOT a posted Receipt. ERP accountant must verify bank and Convert.
 * Razorpay Capital / Kredx model.
 * Persisted as `erp_distributor_payment_intimations_{entityCode}`.
 */
export type IntimationStatus =
  | 'submitted'        // distributor created it
  | 'verifying'        // accountant marked under-review
  | 'converted'        // Receipt voucher created
  | 'rejected'         // not found in bank statement
  | 'duplicate';       // already converted from another intimation

export type IntimationMode = 'rtgs' | 'neft' | 'imps' | 'upi' | 'cheque' | 'cash' | 'other';

export interface DistributorPaymentIntimation {
  id: string;
  partner_id: string;
  partner_code: string;
  partner_name: string;
  entity_code: string;
  amount_paise: number;
  mode: IntimationMode;
  utr_no: string | null;
  cheque_no: string | null;
  bank_name: string | null;
  paid_on: string;             // ISO date
  reference_invoices: string[]; // voucher_ids being paid against
  notes: string;
  status: IntimationStatus;
  linked_receipt_id: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * BroadcastMessage — sales team composes once, fires to a partner audience.
 * Reuses Sprint 6A MAS WhatsApp + email infrastructure.
 * Persisted as `erp_distributor_broadcasts_{entityCode}`.
 */
export type BroadcastChannel = 'whatsapp' | 'email' | 'in_portal';
export type BroadcastAudience =
  | { kind: 'all_partners' }
  | { kind: 'tier'; tier: 'gold' | 'silver' | 'bronze' }
  | { kind: 'territory'; territory_id: string }
  | { kind: 'partner_ids'; ids: string[] };

export interface BroadcastMessage {
  id: string;
  entity_code: string;
  title: string;
  body: string;
  channels: BroadcastChannel[];
  audience: BroadcastAudience;
  scheduled_for: string | null;     // null = send now
  sent_at: string | null;
  recipient_count: number;
  delivered_count: number;
  read_count: number;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  composed_by: string;
  created_at: string;
  updated_at: string;
}

// ── Storage keys ──
export const distributorOrdersKey = (e: string) => `erp_distributor_orders_${e}`;
export const distributorIntimationsKey = (e: string) => `erp_distributor_payment_intimations_${e}`;
export const distributorBroadcastsKey = (e: string) => `erp_distributor_broadcasts_${e}`;

// ── IndexedDB constants (cart store) ──
export const CART_IDB_DB = 'operix_distributor_cart';
export const CART_IDB_STORE = 'carts';
export const CART_IDB_VERSION = 1;
