/**
 * @file        src/types/enquiry-followup.ts
 * @purpose     D-NEW-GA · Post-Enquiry Vendor Quotation Follow-Up SIBLING type · 18th SIBLING application
 * @sprint      T-Phase-2.B-Procure360-Phase2-Polish-Part-B · Block F · founder Q3 May 22 vision
 * @decisions   Q-LOCK-8(a) FR-19 SIBLING · TallyWARM 3-cascade precedent · 3-5-7 day pattern
 * @discipline  FR-22 canonical · FR-26 entity-scoped persistence
 */

export type EnquiryFollowupStage =
  | 'initial'
  | 'reminder_1'
  | 'reminder_2'
  | 'escalation'
  | 'closed';

export type EnquiryFollowupResult =
  | 'pending'
  | 'vendor_responded'
  | 'vendor_unresponsive'
  | 'alternate_triggered';

export interface EnquiryFollowupStageNote {
  stage: EnquiryFollowupStage;
  at: string;
  note?: string;
}

export interface EnquiryFollowupCascade {
  id: string;
  enquiry_id: string;
  vendor_id: string;
  vendor_name: string;
  entity_id: string;

  // Cadence per founder Q3 ratification (3-5-7 day TallyWARM pattern)
  enquiry_sent_at: string;
  day_3_reminder_due: string;
  day_5_reminder_due: string;
  day_7_escalation_due: string;

  // Stage progression
  current_stage: EnquiryFollowupStage;
  stage_history: EnquiryFollowupStageNote[];

  // Outcome
  result: EnquiryFollowupResult;
  vendor_responded_at?: string | null;
  alternate_vendor_triggered_at?: string | null;
  alternate_vendor_id?: string | null;

  created_at: string;
  updated_at: string;
}

export const enquiryFollowupCascadesKey = (entityCode: string): string =>
  `erp_${entityCode}_enquiry_followup_cascades`;
