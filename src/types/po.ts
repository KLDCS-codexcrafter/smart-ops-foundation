/**
 * @file        po.ts
 * @sprint      T-Phase-1.2.6f-c-1 · Block A · per D-283 PO management sibling
 * @purpose     Procure360 PO workflow types · sibling of FineCore PurchaseOrder voucher (D-127 ZERO TOUCH).
 * @decisions   D-283 (sibling pattern) · D-127 (voucher form ZERO TOUCH) · D-194 (localStorage)
 * @disciplines FR-22 Type Discipline · FR-50 Multi-entity 6-point
 * @[JWT]       GET /api/procure360/purchase-orders?entityCode=...
 */

export type PoStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent_to_vendor'
  | 'partially_received'
  | 'fully_received'
  | 'closed'
  | 'cancelled';

export interface PurchaseOrderLine {
  id: string;
  line_no: number;
  item_id: string;
  item_name: string;
  qty: number;
  uom: string;
  rate: number;
  basic_value: number;
  tax_pct: number;
  tax_value: number;
  amount_after_tax: number;
  qty_received: number;
  // Sprint T-Phase-1.2.6f-d-1 · Block E · D-291 Parametric Hub backfill (optional · backward-compat)
  parameter_values?: Record<string, string>;
  // Sprint T-Phase-1.2.6f-d-1 · Block F · D-297 PO auto-resolve from Rate Contract (optional)
  auto_resolved?: boolean;
  rate_contract_id?: string | null;
}

export interface PoFollowup {
  id: string;
  po_id: string;
  channel: 'call' | 'email' | 'whatsapp' | 'visit';
  outcome: 'committed' | 'partial' | 'no_response' | 'declined' | 'delayed';
  notes: string;
  next_action_due: string | null;
  created_by_user_id: string;
  created_at: string;
}

export interface PurchaseOrderRecord {
  id: string;
  po_no: string;
  po_date: string;

  // Multi-entity (FR-50)
  entity_id: string;
  branch_id: string | null;
  division_id: string | null;
  department_id: string | null;
  cost_center_id: string | null;

  // Genesis
  source_quotation_id: string;
  source_enquiry_id: string;
  vendor_id: string;
  vendor_name: string;

  lines: PurchaseOrderLine[];

  total_basic_value: number;
  total_tax_value: number;
  total_after_tax: number;

  expected_delivery_date: string;
  delivery_address: string;

  approved_by_user_id: string | null;
  approved_at: string | null;

  status: PoStatus;
  followups: PoFollowup[];

  notes: string;
  created_at: string;
  updated_at: string;
}

export const purchaseOrdersKey = (entityCode: string): string =>
  `erp_purchase_orders_${entityCode}`;
