/**
 * @file        src/types/ebrc-edpms.ts
 * @purpose     EBRC + EDPMSDeclaration · v7 Compliance Gap #2 (distinct from FIRC)
 * @sprint      T-Phase-1.EX-7c-ExportRealisation-eBRC-FEMA
 * @decisions   EX-7c-Q2=a 3 distinct types
 */

export type EBRCStatus = 'pending' | 'issued' | 'utilised' | 'cancelled';

export const EBRC_VALID_TRANSITIONS: Record<EBRCStatus, EBRCStatus[]> = {
  pending: ['issued', 'cancelled'],
  issued: ['utilised', 'cancelled'],
  utilised: [],
  cancelled: [],
};

export interface EBRC {
  id: string;
  ebrc_no: string;
  entity_id: string;
  status: EBRCStatus;

  related_realisation_id: string;
  related_shipping_bill_no: string;
  related_export_po_no: string;
  ad_bank_name: string;
  ad_bank_branch: string;

  full_value_foreign: number;
  full_value_inr: number;
  issuance_date: string;

  drawback_claim_used: boolean;
  rodtep_claim_used: boolean;

  notes: string;
  created_at: string;
  updated_at: string;
}

export type EDPMSState = 'open' | 'caution' | 'closed' | 'extended';

export interface EDPMSDeclaration {
  id: string;
  edpms_ref_no: string;
  entity_id: string;
  state: EDPMSState;

  related_shipping_bill_no: string;
  related_realisation_id: string;

  rbi_reported_date: string;
  rbi_realised_date: string | null;
  rbi_caution_reason: string | null;
  rbi_extension_granted_to: string | null;

  notes: string;
  created_at: string;
  updated_at: string;
}

export const ebrcKey = (entityCode: string): string => `erp_${entityCode}_ebrcs`;
export const edpmsKey = (entityCode: string): string => `erp_${entityCode}_edpms`;
