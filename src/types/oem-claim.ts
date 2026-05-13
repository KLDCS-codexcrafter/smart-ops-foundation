/**
 * @file        src/types/oem-claim.ts
 * @purpose     OEMClaimPacket canonical · 5-state lifecycle · v7 §11 OOB-26 (Money Left On Table)
 * @sprint      T-Phase-1.C.1d · Block A.1
 * @decisions   D-NEW-DJ FR-75 5th consumer · Procure360 OEM Claim Recovery
 * @iso         Functional Suitability + Reliability + Maintainability
 * @disciplines FR-30 · FR-39 audit · FR-50 entity-scoped · FR-21 paise integer
 * @reuses      AuditEntry from @/types/servicedesk
 */
import type { AuditEntry } from '@/types/servicedesk';

export type OEMClaimStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'paid';

export interface OEMClaimPacket {
  id: string;
  claim_no: string;
  entity_id: string;
  branch_id: string;
  ticket_id: string;
  oem_name: string;
  spare_id: string;
  spare_name: string;
  qty: number;
  unit_cost_paise: number;
  total_claim_value_paise: number;
  warranty_period_status: 'in_warranty' | 'expired' | 'borderline';
  status: OEMClaimStatus;
  oem_claim_no: string;
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  paid_amount_paise: number;
  rejection_reason: string;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  audit_trail: AuditEntry[];
}

export const oemClaimKey = (e: string): string => `servicedesk_v1_oem_claim_${e}`;
