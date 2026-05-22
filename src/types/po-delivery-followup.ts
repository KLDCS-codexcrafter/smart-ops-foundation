/**
 * @file        src/types/po-delivery-followup.ts
 * @purpose     D-NEW-GB · Post-PO Late Delivery Follow-Up SIBLING type · 19th SIBLING application
 * @sprint      T-Phase-2.B-Procure360-Phase2-Polish-Part-B · Block G · founder Q4 May 22 vision
 * @decisions   Q-LOCK-9(a) · Day -7/+1/+7/+14 cascade · FR-19 SIBLING
 * @discipline  FR-22 canonical · FR-26 entity-scoped persistence
 */

export type PoDeliveryFollowupStage =
  | 'pre_delivery'
  | 'delivery_due'
  | 'late_day_1'
  | 'late_day_7'
  | 'late_day_14'
  | 'received'
  | 'cancelled';

export interface PoDeliveryFollowupStageNote {
  stage: PoDeliveryFollowupStage;
  at: string;
  note?: string;
}

export interface PoDeliveryFollowupCascade {
  id: string;
  po_id: string;
  po_number: string;
  vendor_id: string;
  vendor_name: string;
  entity_id: string;

  // Cadence per founder Q4 ratification (Day -7 / +1 / +7 / +14)
  expected_delivery_date: string;
  day_minus_7_check_due: string;
  day_plus_1_late_due: string;
  day_plus_7_escalation_due: string;
  day_plus_14_cancel_option_due: string;

  current_stage: PoDeliveryFollowupStage;
  stage_history: PoDeliveryFollowupStageNote[];

  goods_received_at?: string | null;
  cancelled_at?: string | null;
  vendor_scoring_delta_applied?: boolean;
  vendor_scoring_delta_value?: number;

  created_at: string;
  updated_at: string;
}

export const poDeliveryFollowupCascadesKey = (entityCode: string): string =>
  `erp_${entityCode}_po_delivery_followup_cascades`;
