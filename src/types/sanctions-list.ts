/**
 * @file        src/types/sanctions-list.ts
 * @purpose     4-source sanctions list (OFAC + UN + EU + RBI) · v7 Gap #8
 * @sprint      T-Phase-1.EX-9-Compliance-Suite
 * @decisions   EX-9-Q8=a 4-source comprehensive
 * @disciplines FR-30 · FR-50 · FR-26 entity-scoped
 */

export type SanctionsSource = 'OFAC_SDN' | 'UN_Consolidated' | 'EU_CFSP' | 'RBI_EXIM_NegativeList';
export type SanctionsEntityType = 'individual' | 'organization' | 'vessel' | 'aircraft' | 'country';
export type SanctionsHitType = 'exact_match' | 'fuzzy_match' | 'false_positive_marked';

export interface SanctionsListEntry {
  id: string;
  source: SanctionsSource;
  entity_type: SanctionsEntityType;
  primary_name: string;
  aliases: string[];
  country_code: string | null;
  sanction_program: string;
  listed_date: string;
  list_url: string;
  notes: string;
}

export interface SanctionsScreeningResult {
  id: string;
  entity_id: string;
  screened_party_type: 'foreign_customer' | 'foreign_vendor' | 'beneficiary_bank' | 'other';
  screened_party_id: string;
  screened_party_name: string;
  screened_at: string;
  total_hits: number;
  hit_classification: SanctionsHitType | null;
  hits: { source: SanctionsSource; entry_id: string; matched_name: string; match_score: number }[];
  approver_override_user: string | null;
  approver_override_reason: string | null;
  is_cleared: boolean;
}

export const sanctionsListKey = (entityCode: string): string => `erp_${entityCode}_sanctions_list`;
export const sanctionsScreeningKey = (entityCode: string): string => `erp_${entityCode}_sanctions_screenings`;
