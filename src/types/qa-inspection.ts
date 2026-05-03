/**
 * @file        qa-inspection.ts
 * @sprint      T-Phase-1.2.6f-c-2 · Block D · per D-286 4-way upgrade gate
 * @purpose     QA inspection types · 4-way Match upgrade for items requiring inspection
 */

export type QaInspectionStatus =
  | 'pending' | 'in_progress' | 'passed' | 'failed' | 'partial_pass' | 'cancelled';

export interface QaInspectionLine {
  id: string;
  bill_line_id: string;
  item_id: string;
  item_name: string;
  qty_inspected: number;
  qty_passed: number;
  qty_failed: number;
  failure_reason: string | null;
  inspection_parameters: Record<string, string>;
}

export interface QaInspectionRecord {
  id: string;
  qa_no: string;
  bill_id: string;
  bill_no: string;
  git_id: string | null;
  po_id: string;
  po_no: string;
  entity_id: string;
  branch_id: string | null;
  inspector_user_id: string;
  inspection_date: string;
  inspection_location: string;
  lines: QaInspectionLine[];
  status: QaInspectionStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const qaInspectionKey = (entityCode: string): string =>
  `erp_qa_inspections_${entityCode}`;
