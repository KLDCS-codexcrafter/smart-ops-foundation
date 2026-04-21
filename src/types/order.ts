/**
 * order.ts — Order data model for Purchase Orders & Sales Orders
 * Orders are pure commitment documents — zero GL, zero stock, zero GST impact.
 * [JWT] Replace with GET/POST /api/orders
 */
import type { ItemAllocation, VoucherDispatchDetails } from './voucher';

export type OrderDispatchDetails = VoucherDispatchDetails;

export interface OrderLine {
  id: string;
  item_id: string; item_code: string; item_name: string;
  hsn_sac_code: string;
  qty: number; uom: string;
  rate: number; // agreed price per unit
  discount_percent: number;
  taxable_value: number; // qty x rate x (1 - disc/100)
  gst_rate: number; // indicative only — no posting
  delivery_date?: string; // per-line expected delivery
  pending_qty: number; // qty - fulfilled_qty
  fulfilled_qty: number; // incremented on each DN/GRN/Invoice
  status: 'open' | 'partial' | 'closed' | 'preclosed';

  /** NEW (Sprint T10-pre.0) — Multi-godown / batch / serial allocations
      captured via <ItemAllocationDialog>. Required from this sprint forward. */
  allocations?: ItemAllocation[];

  /** NEW (Sprint T10-pre.0) — Parametric Hub values captured at entry time. */
  parameter_values?: Record<string, string>;
}

export interface Order {
  id: string;
  order_no: string; // e.g. PO/25-26/0001 or SO/25-26/0001
  base_voucher_type: 'Sales Order' | 'Purchase Order';
  entity_id: string; date: string;
  valid_till?: string; // order lapses if today > valid_till
  party_id: string; party_name: string; party_gstin?: string;
  place_of_supply?: string; is_inter_state?: boolean;
  ref_no?: string; // SO: customer PO ref. PO: indent/RFQ ref
  ref_date?: string;
  effective_date?: string;
  dispatch_details?: OrderDispatchDetails;
  lines: OrderLine[];
  gross_amount: number; total_tax: number; net_amount: number;
  narration: string; terms_conditions: string;
  status: 'open' | 'partial' | 'closed' | 'preclosed' | 'cancelled';
  preclose_reason?: string;
  cancel_reason?: string;
  created_at: string; updated_at: string;
}

export const ordersKey = (e: string) => 'erp_orders_' + e;
