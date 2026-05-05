/**
 * dispatch-receipt.ts — Card #6 Inward Logistic FOUNDATION
 * Sprint T-Phase-1.2.6f-d-2-card6-6-pre-1 · Block A
 *
 * Dispatch receipt records confirmation that an outbound shipment was
 * received by the customer/destination. Pairs with FT-DISPATCH-001 +
 * FT-DISPATCH-004 closure.
 *
 * D-128: Dispatch receipt is NOT a voucher; closes the dispatch loop.
 *
 * [JWT] GET/POST/PATCH /api/logistic/dispatch-receipts
 */

export type DispatchReceiptStatus =
  | 'draft'
  | 'in_transit'
  | 'delivered'
  | 'partial'
  | 'returned'
  | 'cancelled';

export interface DispatchReceiptLine {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  dispatched_qty: number;
  delivered_qty: number;
  returned_qty: number;
  damage_qty: number;
  remarks: string;
}

export interface DispatchReceipt {
  id: string;
  entity_id: string;
  receipt_no: string; // DR/YY-YY/NNNN
  status: DispatchReceiptStatus;

  // Source linkage
  dispatch_memo_id: string | null;
  dispatch_memo_no: string | null;
  invoice_id: string | null;
  invoice_no: string | null;

  // Customer + transport
  customer_id: string;
  customer_name: string;
  destination: string;
  vehicle_no: string | null;
  lr_no: string | null;
  transporter_id: string | null;
  transporter_name: string | null;

  // Receipt details
  delivery_date: string;
  delivery_time: string;
  pod_received: boolean;
  pod_id: string | null;
  receiver_name: string;
  receiver_mobile: string;
  receiver_signature: string | null;

  // Lines
  lines: DispatchReceiptLine[];

  // Summary
  total_dispatched: number;
  total_delivered: number;
  total_returned: number;
  total_damage: number;

  // Narration
  narration: string;

  // D-228 UTH
  effective_date?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  cancel_reason?: string | null;
  reference_no?: string | null;
  voucher_hash?: string | null;

  created_at: string;
  updated_at: string;
  closed_at: string | null;
  cancelled_at: string | null;
}

export const dispatchReceiptsKey = (entityCode: string) => `erp_dispatch_receipts_${entityCode}`;

export const DISPATCH_RECEIPT_STATUS_LABELS: Record<DispatchReceiptStatus, string> = {
  draft: 'Draft',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  partial: 'Partial Delivery',
  returned: 'Returned',
  cancelled: 'Cancelled',
};

export const DISPATCH_RECEIPT_STATUS_COLORS: Record<DispatchReceiptStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  in_transit: 'bg-primary/10 text-primary',
  delivered: 'bg-success/10 text-success',
  partial: 'bg-warning/10 text-warning',
  returned: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
};
