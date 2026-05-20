/**
 * @file        src/types/transfer-pricing.ts
 * @purpose     Transfer Pricing register + ALP 5-method · v7 Gap #6
 * @sprint      T-Phase-1.EX-9-Compliance-Suite
 * @decisions   EX-9-Q6=b FOUNDATION
 * @disciplines FR-30 · FR-50 · FR-26 entity-scoped
 */

export type ALPMethod = 'CUP' | 'RPM' | 'CPM' | 'PSM' | 'TNMM';

export const ALP_METHOD_DESCRIPTIONS: Record<ALPMethod, string> = {
  CUP: 'Comparable Uncontrolled Price · most direct · requires identical transaction',
  RPM: 'Resale Price Method · for distributors · gross margin benchmark',
  CPM: 'Cost Plus Method · for manufacturers · cost markup benchmark',
  PSM: 'Profit Split Method · for integrated · split combined profit',
  TNMM: 'Transactional Net Margin Method · most commonly used · net margin benchmark',
};

export type TPDocStatus = 'in_preparation' | 'master_file_done' | 'local_file_done' | 'cbcr_filed' | 'form_3ceb_filed' | 'assessed' | 'appealed';

export interface AssociatedEnterprise {
  id: string;
  ae_name: string;
  ae_country_code: string;
  relationship_type: 'parent' | 'subsidiary' | 'sister' | 'common_control' | 'other';
  shareholding_pct: number;
  is_specified_domestic: boolean;
}

export interface TPDocumentation {
  id: string;
  doc_ref: string;
  entity_id: string;
  status: TPDocStatus;
  fy: string;
  total_international_transactions_inr: number;
  is_above_threshold: boolean;
  associated_enterprises: AssociatedEnterprise[];
  alp_method_primary: ALPMethod;
  alp_method_rationale: string;
  benchmarking_study_ref: string | null;
  master_file_filed_at: string | null;
  local_file_filed_at: string | null;
  cbcr_filed_at: string | null;
  form_3ceb_filed_at: string | null;
  form_3ceb_deadline: string;
  ca_name: string;
  ca_membership_no: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const tpDocumentationKey = (entityCode: string): string => `erp_${entityCode}_tp_documentation`;
