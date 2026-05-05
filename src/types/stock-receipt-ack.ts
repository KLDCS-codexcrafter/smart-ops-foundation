/**
 * stock-receipt-ack.ts — Card #7 Store Hub FOUNDATION
 * Sprint T-Phase-1.2.6f-d-2-card7-7-pre-1 · Block A · D-376
 *
 * Stock Receipt Acknowledgment records Stores' confirmation that a Card #6
 * Inward Receipt (status='released') has been physically received into the
 * Stores godown. Posts a Stock Journal voucher (Receiving godown → Stores godown).
 *
 * Cross-card linkage: inward_receipt_id field references Card #6 InwardReceipt.
 * Card #6 inward-receipt-engine is consumed READ-ONLY (D-378).
 *
 * D-228 UTH stamping fields included.
 *
 * [JWT] GET/POST/PATCH /api/store/stock-receipt-acks
 */

export type StockReceiptAckStatus = 'draft' | 'acknowledged' | 'cancelled';

export interface StockReceiptAckLine {
  id: string;
  inward_line_id: string;            // links to InwardReceiptLine.id
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  qty_inward: number;                // qty per IR (released_qty)
  qty_acknowledged: number;          // physically received into Stores
  variance: number;                  // qty_acknowledged - qty_inward
  source_godown_id: string;          // Receiving godown (from IR)
  source_godown_name: string;
  dest_godown_id: string;            // Stores godown
  dest_godown_name: string;
  batch_no: string | null;
  remarks: string;
}

export interface StockReceiptAck {
  id: string;
  entity_id: string;
  ack_no: string;                    // SRA/YY-YY/NNNN

  status: StockReceiptAckStatus;
  ack_date: string;

  // Cross-card linkage to Card #6 IR
  inward_receipt_id: string;
  inward_receipt_no: string;
  vendor_id: string | null;
  vendor_name: string;

  // Acknowledger
  acknowledged_by_id: string;
  acknowledged_by_name: string;

  lines: StockReceiptAckLine[];

  total_variance: number;            // sum of |variance|

  // Posting linkage
  voucher_id: string | null;
  voucher_no: string | null;
  posted_at: string | null;

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
  cancelled_at: string | null;
}

export const stockReceiptAcksKey = (entityCode: string) => `erp_stock_receipt_acks_${entityCode}`;

export const STOCK_ACK_STATUS_LABELS: Record<StockReceiptAckStatus, string> = {
  draft: 'Draft',
  acknowledged: 'Acknowledged',
  cancelled: 'Cancelled',
};

export const STOCK_ACK_STATUS_COLORS: Record<StockReceiptAckStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  acknowledged: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
};
