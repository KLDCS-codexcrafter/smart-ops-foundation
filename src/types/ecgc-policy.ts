/**
 * @file        src/types/ecgc-policy.ts
 * @purpose     ECGC policy register + claim shell · Moat #6 FOUNDATION
 * @sprint      T-Phase-1.EX-7c-ExportRealisation-eBRC-FEMA
 * @decisions   EX-7c-Q5=b FOUNDATION only · full claim Phase 2
 */

export type ECGCPolicyStatus = 'active' | 'expired' | 'cancelled';
export type ECGCClaimStatus = 'not_filed' | 'filed' | 'under_review' | 'approved' | 'rejected' | 'paid';

export interface ECGCPolicy {
  id: string;
  policy_no: string;
  entity_id: string;
  status: ECGCPolicyStatus;
  policy_type: 'standard_shipment' | 'specific_buyer' | 'comprehensive_risk' | 'small_exporter';
  insured_amount_inr: number;
  premium_paid_inr: number;
  validity_from: string;
  validity_to: string;
  covered_countries: string[];
  notes: string;
}

export interface ECGCClaim {
  id: string;
  claim_no: string;
  related_policy_id: string;
  related_realisation_id: string;
  status: ECGCClaimStatus;
  claim_amount_inr: number;
  claim_filed_date: string | null;
  claim_paid_date: string | null;
  claim_paid_amount_inr: number;
  notes: string;
}

export const ecgcPolicyKey = (entityCode: string): string => `erp_${entityCode}_ecgc_policies`;
export const ecgcClaimKey = (entityCode: string): string => `erp_${entityCode}_ecgc_claims`;
