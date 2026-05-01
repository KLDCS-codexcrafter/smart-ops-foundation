/**
 * sam-person.ts — SAM Person master data model
 * Covers: SalesMan, Agent, Broker, Receiver, Reference
 * [JWT] GET/POST/PUT/DELETE /api/salesx/sam/persons
 */

// D-224 (Sprint T-Phase-1.1.2-c): added 'project_manager' role
export type SAMPersonType = 'salesman' | 'agent' | 'broker' | 'receiver' | 'reference' | 'project_manager';

export const SAM_GROUP_CODE: Record<SAMPersonType, string> = {
  salesman:        'SLSM',
  agent:           'AGNT',
  broker:          'BRKR',
  receiver:        'RCVR',
  reference:       'REFR',
  project_manager: 'MGMT',
};

export type CommissionMethod = 'item_amount' | 'item_qty' | 'both' | 'slab_based' | 'net_margin';

export interface SAMCommissionRateRow {
  id: string;
  applicable_from: string;            // 'YYYY-MM-DD'
  item_pct?: number | null;           // % of invoice value
  item_amt_per_unit?: number | null;  // INR per unit
  service_pct?: number | null;        // % on service lines
  margin_pct?: number | null;         // % of gross margin
}

export interface SAMSlabRow {
  id: string;
  from_amount: number;
  to_amount: number | null;           // null = no ceiling (last slab)
  rate_pct: number;
}

export interface SAMPortfolioItem {
  stock_group_id: string;
  stock_group_name: string;
  commission_override_pct?: number | null;
}

export interface SAMHierarchyLevel {
  id: string;
  entity_id: string;
  level_number: number;
  level_name: string;
  level_code: string;
  reports_to_level?: number | null;
  created_at: string;
  updated_at: string;
}

export interface SAMPerson {
  id: string;
  entity_id: string;
  person_type: SAMPersonType;
  person_code: string;
  display_name: string;
  alias?: string | null;
  ledger_id: string;
  ledger_name: string;
  parent_group_code: string;
  hierarchy_level_id?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  employee_id?: string | null;
  employee_name?: string | null;
  tds_section?: '194H' | '194J' | 'not_applicable' | null;
  tds_deductible?: boolean;
  commission_rates: SAMCommissionRateRow[];
  commission_slabs: SAMSlabRow[];
  portfolio: SAMPortfolioItem[];
  primary_agent_id?: string | null;
  receiver_share_pct?: number | null;
  // ── SAM Mini-Sprint additions ──────────────────────────────────────
  /** Income/expense ledger debited when commission is booked (Tally: Commission ledger). */
  commission_expense_ledger_id?: string | null;
  /** Cached display name of commission_expense_ledger_id. */
  commission_expense_ledger_name?: string | null;
  /**
   * Tally TDL UDF: "Treat As Sales Man".
   * When true, this broker/agent also appears in the Company SalesMan
   * dropdown on transactions. Relevant for person_type === 'agent' | 'broker'.
   */
  treat_as_salesman?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const samPersonsKey = (e: string) => `erp_sam_persons_${e}`;
export const samHierarchyKey = (e: string) => `erp_sam_hierarchy_${e}`;

export function genPersonCode(type: SAMPersonType, existing: SAMPerson[]): string {
  const prefix = SAM_GROUP_CODE[type];
  const count = existing.filter(p => p.person_type === type).length + 1;
  return `${prefix}-${String(count).padStart(6, '0')}`;
}
