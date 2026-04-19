/**
 * customer-order.ts — Customer-side cart + order types
 * Distinct from distributor-order.ts (different fields, simpler schema).
 * Consumed by Customer Hub cart, orders, and Sprint 13c reports.
 * [JWT] POST /api/customer/orders
 */

import type { AppliedScheme } from './scheme';

export type CustomerOrderStatus =
  | 'draft' | 'placed' | 'confirmed' | 'packed' | 'shipped' | 'delivered'
  | 'cancelled' | 'returned';

export interface CustomerCartLine {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  qty: number;
  unit_price_paise: number;
  line_total_paise: number;
  note?: string;
}

export interface CustomerCart {
  id: string;                       // = customer_id (one cart per customer)
  customer_id: string;
  entity_code: string;
  lines: CustomerCartLine[];
  subtotal_paise: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerOrder {
  id: string;
  order_no: string;                 // display code ORD/2026/0001
  customer_id: string;
  customer_name: string;
  entity_code: string;
  status: CustomerOrderStatus;
  lines: CustomerCartLine[];
  subtotal_paise: number;
  applied_schemes: AppliedScheme[];
  scheme_discount_paise: number;
  loyalty_points_redeemed: number;  // 0 or positive
  loyalty_discount_paise: number;   // points * rate
  net_payable_paise: number;
  loyalty_points_earned: number;    // earned from this order
  placed_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export const customerCartKey         = (e: string) => `erp_customer_carts_${e}`;
export const customerOrdersKey       = (e: string) => `erp_customer_orders_${e}`;

/** For cart abandonment watcher — tracks last activity per customer cart. */
export const customerCartActivityKey = (e: string) => `erp_customer_cart_activity_${e}`;
