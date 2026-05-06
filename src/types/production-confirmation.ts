/**
 * @file     production-confirmation.ts
 * @sprint   T-Phase-1.3-3a-pre-2 · Block D · D-531
 * @purpose  Production Confirmation — confirms actual output from a Production Order.
 *           Single-output for 3a-pre-2; multi-output deferred to 3a-pre-2.5.
 * @[JWT]    erp_production_confirmations_<entityCode>
 */

export type ProductionConfirmationStatus = 'draft' | 'confirmed' | 'cancelled';

export interface ProductionConfirmationStatusEvent {
  id: string;
  from_status: ProductionConfirmationStatus | null;
  to_status: ProductionConfirmationStatus;
  changed_by_id: string;
  changed_by_name: string;
  changed_at: string;
  note: string;
}

export interface ProductionConfirmationLine {
  id: string;
  line_no: number;
  output_index: number;

  output_item_id: string;
  output_item_code: string;
  output_item_name: string;

  planned_qty: number;
  actual_qty: number;
  uom: string;

  destination_godown_id: string;
  destination_godown_name: string;

  batch_no: string | null;
  serial_nos: string[];
  heat_no: string | null;

  qc_required: boolean;
  qc_scenario: string | null;
  routed_to_quarantine: boolean;

  yield_pct: number;
  qty_variance: number;

  remarks: string;
}

export interface ProductionConfirmation {
  id: string;
  entity_id: string;
  doc_no: string;

  status: ProductionConfirmationStatus;
  confirmation_date: string;

  production_order_id: string;
  production_order_no: string;

  department_id: string;
  department_name: string;
  confirmed_by_user_id: string;
  confirmed_by_name: string;

  lines: ProductionConfirmationLine[];

  total_actual_qty: number;
  total_planned_qty: number;
  overall_yield_pct: number;

  marks_po_complete: boolean;

  status_history: ProductionConfirmationStatusEvent[];

  notes: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  // 🆕 D-615 · Card 3b 3b-pre-1 · Q44=a back-reference to QaInspection (additive)
  linked_test_report_ids: string[];
}

// [JWT] GET/PUT /api/production/confirmations?entityCode=...
export const productionConfirmationsKey = (entityCode: string): string =>
  `erp_production_confirmations_${entityCode}`;
