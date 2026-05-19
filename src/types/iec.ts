/**
 * @file        src/types/iec.ts
 * @purpose     Importer-Exporter Code (IEC) entity · 18 fields per ICEGATE registration form
 * @sprint      T-Phase-1.EX-1-EximX-Foundation
 * @decisions   v10 FINAL Q15=b · EX-1-Q2=b full lifecycle · Q9=YES TDL field mirror
 * @disciplines FR-30 · FR-50 · FR-58
 */

export type IECStatus = 'active' | 'suspended' | 'cancelled' | 'expired';
export type IECType = 'proprietor' | 'partnership' | 'company' | 'huf' | 'trust' | 'society' | 'llp';

export interface IECBranch {
  branch_id: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  pincode: string;
  is_head_office: boolean;
}

export interface IEC {
  id: string;
  entity_id: string;
  iec_number: string;
  issue_date: string;
  validity: string;
  status: IECStatus;

  legal_name: string;
  pan: string;
  iec_type: IECType;
  date_of_incorporation?: string;

  registered_address: string;
  city: string;
  state: string;
  pincode: string;
  branches: IECBranch[];

  ad_code: string;
  bank_name: string;
  bank_branch: string;
  bank_account_number: string;

  primary_activities: string[];
  goods_categories: string[];

  created_at: string;
  updated_at: string;
  last_kyc_date?: string;
  notes?: string;
}

export const IEC_LOCALSTORAGE_KEY = (entityId: string): string => `erp_${entityId}_iec`;
export const IEC_TYPE_VERSION = '1.0.0';
