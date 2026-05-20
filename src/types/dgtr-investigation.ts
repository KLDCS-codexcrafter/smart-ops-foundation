/**
 * @file        src/types/dgtr-investigation.ts
 * @purpose     DGTR · anti-dumping + safeguard + CVD register
 * @sprint      T-Phase-1.EX-9-Compliance-Suite
 * @decisions   EX-9-Q9=b FOUNDATION
 * @disciplines FR-30 · FR-50 · FR-26 entity-scoped
 */

export type DGTRCaseType = 'anti_dumping' | 'safeguard' | 'countervailing_duty';
export type DGTRCaseStatus = 'initiated' | 'preliminary_finding' | 'final_finding' | 'duty_imposed' | 'expired' | 'terminated';

export interface DGTRInvestigation {
  id: string;
  case_no: string;
  case_type: DGTRCaseType;
  status: DGTRCaseStatus;
  product_cth: string;
  product_description: string;
  exporting_country_code: string;
  exporting_country_name: string;
  petitioner: string;
  initiation_date: string;
  preliminary_finding_date: string | null;
  final_finding_date: string | null;
  duty_imposed_pct: number;
  duty_valid_from: string | null;
  duty_valid_to: string | null;
  total_investigated_imports_inr: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const dgtrInvestigationKey = (entityCode: string): string => `erp_${entityCode}_dgtr_investigations`;
