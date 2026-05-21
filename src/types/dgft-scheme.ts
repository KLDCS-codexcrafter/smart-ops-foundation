/**
 * @file        src/types/dgft-scheme.ts
 * @purpose     DGFT 5-scheme master · RoDTEP + Drawback + SEIS + MEIS + EPCG · Moat #20 PRIMARY
 * @sprint      T-Phase-1.EX-10-DGFT-Scrip-VendorScorecard-HSNReclass-D-NEW-FF
 * @decisions   EX-10-Q2=a FOUNDATION
 */

export type DGFTSchemeKind = 'RoDTEP' | 'Drawback' | 'SEIS' | 'MEIS' | 'EPCG';

export const DGFT_SCHEME_DESCRIPTIONS: Record<DGFTSchemeKind, string> = {
  RoDTEP: 'Remission of Duties and Taxes on Exported Products · post-export reimbursement of embedded taxes',
  Drawback: 'Duty Drawback · refund of Customs/Excise on inputs used in exports · All-Industry Rate or Brand Rate',
  SEIS: 'Service Exports from India Scheme · for service exporters · category-based reward',
  MEIS: 'Merchandise Exports from India Scheme · legacy scheme · phase-out window',
  EPCG: 'Export Promotion Capital Goods · 0% BCD on capital imports against 6× export obligation',
};

export type EPCGObligationStatus = 'active' | 'fulfilled' | 'under_extension' | 'breached' | 'closed';

export interface DGFTScheme {
  id: string;
  scheme_kind: DGFTSchemeKind;
  cth_code: string;
  destination_country_code: string | null;
  rate_percentage: number;
  rate_unit: 'pct_of_fob' | 'pct_of_assessable' | 'pct_of_input_duty' | 'absolute_inr_per_unit';
  effective_from: string;
  effective_to: string | null;
  notification_no: string;
  notes: string;
}

export interface EPCGLicense {
  id: string;
  license_no: string;
  entity_id: string;
  status: EPCGObligationStatus;
  import_value_inr: number;
  bcd_saved_inr: number;
  export_obligation_inr: number;
  export_obligation_period_years: number;
  export_obligation_start_date: string;
  export_obligation_end_date: string;
  exports_fulfilled_inr: number;
  exports_remaining_inr: number;
  fulfillment_pct: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const dgftSchemeKey = (entityCode: string): string => `erp_${entityCode}_dgft_schemes`;
export const epcgLicenseKey = (entityCode: string): string => `erp_${entityCode}_epcg_licenses`;
