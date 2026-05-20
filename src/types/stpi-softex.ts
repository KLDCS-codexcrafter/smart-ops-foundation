/**
 * @file        src/types/stpi-softex.ts
 * @purpose     STPI Softex FULL · Form A/B + Positive NFE · v7 Gap #11 closure
 * @sprint      T-Phase-1.EX-9-Compliance-Suite
 * @decisions   EX-9-Q4=a FULL · export-realisation.ts STAYS 0-DIFF · consumes is_stpi_export seed
 * @disciplines FR-30 · FR-50 · FR-26 entity-scoped · FR-80 exhaustive
 */

export type SoftexFormType = 'Form_A' | 'Form_B';

export const SOFTEX_FORM_DESCRIPTIONS: Record<SoftexFormType, string> = {
  Form_A: 'Software export through data communication links · pure services',
  Form_B: 'Software export on physical media · classified separately',
};

export type SoftexStatus = 'draft' | 'submitted_to_stpi' | 'certified_by_stpi' | 'filed_with_rbi' | 'acknowledged' | 'rejected';

export const SOFTEX_VALID_TRANSITIONS: Record<SoftexStatus, SoftexStatus[]> = {
  draft: ['submitted_to_stpi'],
  submitted_to_stpi: ['certified_by_stpi', 'rejected'],
  certified_by_stpi: ['filed_with_rbi'],
  filed_with_rbi: ['acknowledged', 'rejected'],
  acknowledged: [],
  rejected: [],
};

export interface SoftexForm {
  id: string;
  softex_form_no: string;
  entity_id: string;
  status: SoftexStatus;
  form_type: SoftexFormType;
  related_realisation_id: string;
  stpi_unit_id: string;
  stpi_unit_name: string;
  export_value_foreign: number;
  export_value_inr: number;
  currency_code: string;
  invoice_no: string;
  invoice_date: string;
  filing_deadline_date: string;
  days_remaining: number;
  is_overdue: boolean;
  total_inflows_inr: number;
  total_outflows_inr: number;
  positive_nfe_inr: number;
  is_positive_nfe: boolean;
  stpi_certified_at: string | null;
  rbi_filed_at: string | null;
  rbi_acknowledgment_ref: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface STPIUnit {
  id: string;
  unit_code: string;
  unit_name: string;
  location: string;
  registration_date: string;
  annual_export_target_inr: number;
  validity_to: string;
  is_active: boolean;
}

export const softexFormKey = (entityCode: string): string => `erp_${entityCode}_softex_forms`;
export const stpiUnitKey = (entityCode: string): string => `erp_${entityCode}_stpi_units`;
