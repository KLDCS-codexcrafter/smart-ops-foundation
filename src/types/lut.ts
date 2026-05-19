/**
 * @file        src/types/lut.ts
 * @purpose     Letter of Undertaking (LUT) entity with 7-state workflow · Moat #4
 * @sprint      T-Phase-1.EX-1-EximX-Foundation
 * @decisions   EX-1-Q3=c workflow-only · Moat #4 LUT-as-Workflow · v10 FINAL
 */

export type LUTStatus =
  | 'draft'
  | 'filed'
  | 'acknowledged'
  | 'active'
  | 'expiring'
  | 'renewal-due'
  | 'expired';

export interface LUTTransition {
  from_status: LUTStatus;
  to_status: LUTStatus;
  transitioned_at: string;
  transitioned_by: string;
  notes?: string;
}

export interface LUT {
  id: string;
  entity_id: string;
  lut_number: string;
  fiscal_year: string;
  validity_from: string;
  validity_to: string;
  bond_amount?: number;
  acceptance_date?: string;
  apr_due_date: string;
  authority: string;

  status: LUTStatus;
  workflow_history: LUTTransition[];

  created_at: string;
  updated_at: string;
  notes?: string;
}

export const LUT_LOCALSTORAGE_KEY = (entityId: string): string => `erp_${entityId}_lut`;
export const LUT_TYPE_VERSION = '1.0.0';

export const LUT_VALID_TRANSITIONS: Record<LUTStatus, LUTStatus[]> = {
  draft: ['filed'],
  filed: ['acknowledged', 'draft'],
  acknowledged: ['active'],
  active: ['expiring', 'expired'],
  expiring: ['renewal-due', 'expired'],
  'renewal-due': ['expired'],
  expired: [],
};
