/**
 * @file        src/types/bill-of-entry-dgtr-override.ts
 * @purpose     D-NEW-FD · SIBLING type · DGTR impact augmentation for BoE lines
 * @sprint      T-Phase-2.B-1-EximX-LightDNEWs
 * @decisions   Q-LOCK-5(a) 6th SIBLING · 1st post-D-NEW-FF · BoELine + BillOfEntry STAY 0-DIFF
 * @discipline  ADDITIVE type · does NOT redefine BoELine · purely augmentative
 */
import type { DGTRCaseType } from '@/types/dgtr-investigation';

export interface DGTRDutyImpact {
  case_no: string;
  case_type: DGTRCaseType;
  duty_imposed_pct: number;
  duty_valid_from: string;
  duty_valid_to: string;
  additional_duty_inr: number;
  applies_to_cth: string;
  applies_to_country: string;
  applied_at: string;
}

export interface BoELineDGTRImpact {
  related_boe_id: string;
  related_boe_line_id: string;
  line_no: number;
  impacts: DGTRDutyImpact[];
  total_additional_duty_inr: number;
  is_active: boolean;
  notes: string;
}

export const boeLineDGTRImpactKey = (entityCode: string): string =>
  `erp_${entityCode}_eximx_boe_line_dgtr_impact`;
