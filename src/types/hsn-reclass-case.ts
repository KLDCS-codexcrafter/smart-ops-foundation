/**
 * @file        src/types/hsn-reclass-case.ts
 * @purpose     HSN/CTH Reclass dispute workflow · 5-state · consumes cth-history-engine READ-ONLY
 * @sprint      T-Phase-1.EX-10-DGFT-Scrip-VendorScorecard-HSNReclass-D-NEW-FF
 * @decisions   EX-10-Q5=b FOUNDATION
 */

export type HSNReclassStatus =
  | 'disputed'
  | 'customs_objection_received'
  | 'response_filed'
  | 'decision_pending'
  | 'resolved';

export const HSN_RECLASS_VALID_TRANSITIONS: Record<HSNReclassStatus, HSNReclassStatus[]> = {
  disputed: ['customs_objection_received'],
  customs_objection_received: ['response_filed'],
  response_filed: ['decision_pending'],
  decision_pending: ['resolved'],
  resolved: [],
};

export type HSNReclassOutcome = 'pending' | 'accepted_original' | 'accepted_proposed' | 'compromised' | 'appealed';

export interface HSNReclassCase {
  id: string;
  case_no: string;
  entity_id: string;
  status: HSNReclassStatus;
  outcome: HSNReclassOutcome;
  related_boe_id: string;
  related_boe_no: string;
  related_boe_line_id: string | null;
  original_cth: string;
  proposed_cth: string;
  customs_zone: string;
  original_bcd_pct: number;
  proposed_bcd_pct: number;
  duty_differential_inr: number;
  dispute_initiated_date: string;
  objection_received_date: string | null;
  response_filed_date: string | null;
  decision_date: string | null;
  resolved_date: string | null;
  appeal_filed: boolean;
  appeal_filed_date: string | null;
  appeal_authority: string | null;
  customs_grounds: string;
  importer_response: string;
  decision_summary: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const hsnReclassKey = (entityCode: string): string => `erp_${entityCode}_hsn_reclass_cases`;
