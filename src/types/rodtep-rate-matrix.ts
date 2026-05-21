/**
 * @file        src/types/rodtep-rate-matrix.ts
 * @purpose     RoDTEP rate matrix · CTH × Country lookup
 * @sprint      T-Phase-1.EX-10-DGFT-Scrip-VendorScorecard-HSNReclass-D-NEW-FF
 * @decisions   EX-10-Q2=a · separate type for institutional CTH × Country matrix
 */

export interface RoDTEPRateMatrixEntry {
  id: string;
  cth_code: string;
  destination_country_code: string | null;
  rate_pct: number;
  rate_cap_inr_per_unit: number | null;
  effective_from: string;
  effective_to: string | null;
  notification_no: string;
  notes: string;
}

export const rodtepRateMatrixKey = (entityCode: string): string =>
  `erp_${entityCode}_rodtep_rate_matrix`;
