/**
 * @file     material-issue-note.ts
 * @sprint   T-Phase-1.3-3a-pre-2 · Block B · D-529
 * @purpose  Material Issue Note (Production) — issues RM/components from source
 *           godown to WIP godown against a released Production Order.
 * @[JWT]    erp_material_issue_notes_<entityCode>
 */
import type { ApprovalEvent } from '@/types/material-indent';

export type MaterialIssueStatus = 'draft' | 'issued' | 'cancelled';

export interface MaterialIssueLine {
  id: string;
  line_no: number;
  production_order_line_id: string;
  item_id: string;
  item_code: string;
  item_name: string;

  required_qty: number;
  issued_qty: number;
  uom: string;

  source_godown_id: string;
  source_godown_name: string;
  destination_godown_id: string;
  destination_godown_name: string;

  reservation_id: string | null;

  batch_no: string | null;
  serial_nos: string[];
  heat_no: string | null;

  unit_rate: number;
  line_value: number;

  remarks: string;
}

export interface MaterialIssueStatusEvent {
  id: string;
  from_status: MaterialIssueStatus | null;
  to_status: MaterialIssueStatus;
  changed_by_id: string;
  changed_by_name: string;
  changed_at: string;
  note: string;
}

export interface MaterialIssueNote {
  id: string;
  entity_id: string;
  doc_no: string;

  status: MaterialIssueStatus;
  issue_date: string;

  production_order_id: string;
  production_order_no: string;

  department_id: string;
  department_name: string;
  issued_by_user_id: string;
  issued_by_name: string;

  lines: MaterialIssueLine[];

  total_qty: number;
  total_value: number;

  approval_history: ApprovalEvent[];
  status_history: MaterialIssueStatusEvent[];

  notes: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  // 🆕 D-615 · Card 3b 3b-pre-1 · QC hookpoints (Q44=a + Q47=c · ADDITIVE)
  qc_required: boolean;
  qc_scenario: string | null;
  linked_test_report_ids: string[];
  routed_to_quarantine: boolean;
}

// [JWT] GET/PUT /api/production/material-issues?entityCode=...
export const materialIssueNotesKey = (entityCode: string): string =>
  `erp_material_issue_notes_${entityCode}`;
