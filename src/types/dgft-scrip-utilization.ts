/**
 * @file        src/types/dgft-scrip-utilization.ts
 * @purpose     Scrip × BoE utilization linkage · audit trail for partial utilizations
 * @sprint      T-Phase-1.EX-10-DGFT-Scrip-VendorScorecard-HSNReclass-D-NEW-FF
 * @decisions   EX-10-Q3=a · supports scrip partial utilization across multiple BoEs
 */

export interface DGFTScripUtilization {
  id: string;
  utilization_no: string;
  entity_id: string;
  related_scrip_id: string;
  related_scrip_no: string;
  related_boe_id: string;
  related_boe_no: string;
  utilized_amount_inr: number;
  utilized_at: string;
  utilized_by_user: string;
  voucher_runtime_id: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const dgftScripUtilizationKey = (entityCode: string): string =>
  `erp_${entityCode}_dgft_scrip_utilizations`;
