/**
 * @file        src/lib/comply360-caro-extended-engine.ts
 * @sibling     NEW @ Sprint 77a · Comply360 Main Arc 1.9 · Pass A
 * @realizes    CARO 2020 Extended (paragraph 3 sub-clauses ii through xxi)
 *              · complements caro-2020-engine.ts (which owns 3(i) only · §Y FROZEN)
 * @approach    Pure computation · reads caro-2020-engine 3(i) result + greenfield
 *              localStorage observations for the remaining clauses. NEVER modifies caro-2020.
 * @reads-from  caro-2020-engine.ts (assessCAROParagraph3i · 0-DIFF · §Y ABSOLUTE FROZEN)
 * [JWT] Phase 5: GET /api/comply360/caro-extended/:entity · POST /api/comply360/caro/observation
 */
import { assessCAROParagraph3i } from './caro-2020-engine';

export type CAROExtendedClause =
  | 'ii_inventory_verification'
  | 'iii_loans_advances'
  | 'iv_section_185_186'
  | 'v_deposits'
  | 'vi_cost_records'
  | 'vii_statutory_dues'
  | 'viii_undisclosed_income'
  | 'ix_default_borrowings'
  | 'x_money_raised_ipo'
  | 'xi_fraud_reported'
  | 'xii_nidhi'
  | 'xiii_related_party_165'
  | 'xiv_internal_audit'
  | 'xv_non_cash_transactions'
  | 'xvi_nbfc_registration'
  | 'xvii_cash_losses'
  | 'xviii_auditor_resignation'
  | 'xix_material_uncertainty'
  | 'xx_csr_unspent'
  | 'xxi_consolidated_qualifications';

export interface CAROExtendedObservation {
  id: string;
  entity_code: string;
  fy_start: string;
  fy_end: string;
  clause: CAROExtendedClause;
  qualified: boolean;
  observation_text: string;
  recorded_at: string;
}

export interface CAROExtendedClauseResult {
  clause: CAROExtendedClause;
  qualified: boolean;
  observation_count: number;
  primary_observation: string | null;
}

export interface CAROExtendedReport {
  entity_code: string;
  fy_start: string;
  fy_end: string;
  paragraph_3i_pass: boolean;
  paragraph_3i_failing_subrules: string[];
  extended_clauses: CAROExtendedClauseResult[];
  total_qualifications: number;
  clean_opinion: boolean;
  generated_at: string;
}

const ALL_CLAUSES: CAROExtendedClause[] = [
  'ii_inventory_verification', 'iii_loans_advances', 'iv_section_185_186',
  'v_deposits', 'vi_cost_records', 'vii_statutory_dues', 'viii_undisclosed_income',
  'ix_default_borrowings', 'x_money_raised_ipo', 'xi_fraud_reported',
  'xii_nidhi', 'xiii_related_party_165', 'xiv_internal_audit',
  'xv_non_cash_transactions', 'xvi_nbfc_registration', 'xvii_cash_losses',
  'xviii_auditor_resignation', 'xix_material_uncertainty', 'xx_csr_unspent',
  'xxi_consolidated_qualifications',
];

export const caroExtendedKey = (entityCode: string, fyStart: string): string =>
  `erp_caro_extended_${entityCode}_${fyStart}`;

export function loadCAROExtendedObservations(
  entityCode: string,
  fyStart: string,
): CAROExtendedObservation[] {
  try {
    const raw = localStorage.getItem(caroExtendedKey(entityCode, fyStart));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as CAROExtendedObservation[]) : [];
  } catch {
    return [];
  }
}

export function recordCAROObservation(
  entityCode: string,
  fyStart: string,
  obs: Omit<CAROExtendedObservation, 'id' | 'entity_code' | 'recorded_at' | 'fy_start'>,
): CAROExtendedObservation {
  const list = loadCAROExtendedObservations(entityCode, fyStart);
  const next: CAROExtendedObservation = {
    id: `CARO-${entityCode}-${fyStart}-${Date.now()}`,
    entity_code: entityCode,
    fy_start: fyStart,
    recorded_at: new Date().toISOString(),
    ...obs,
  };
  localStorage.setItem(caroExtendedKey(entityCode, fyStart), JSON.stringify([...list, next]));
  return next;
}

export function summarizeClause(
  observations: CAROExtendedObservation[],
  clause: CAROExtendedClause,
): CAROExtendedClauseResult {
  const scoped = observations.filter((o) => o.clause === clause);
  const qualified = scoped.some((o) => o.qualified);
  return {
    clause,
    qualified,
    observation_count: scoped.length,
    primary_observation: scoped.length > 0 ? scoped[0].observation_text : null,
  };
}

export function buildCAROExtendedReport(
  entityCode: string,
  fyStart: string,
  fyEnd: string,
): CAROExtendedReport {
  // Read-only pull from caro-2020-engine (§Y ABSOLUTE FROZEN)
  const para3i = assessCAROParagraph3i(entityCode, fyStart, fyEnd);
  const para3iFailing = para3i.subRules.filter((r) => !r.pass).map((r) => r.id);

  const observations = loadCAROExtendedObservations(entityCode, fyStart);
  const extended = ALL_CLAUSES.map((c) => summarizeClause(observations, c));

  const totalQualifications = (para3i.overallPass ? 0 : para3iFailing.length)
    + extended.filter((c) => c.qualified).length;

  return {
    entity_code: entityCode,
    fy_start: fyStart,
    fy_end: fyEnd,
    paragraph_3i_pass: para3i.overallPass,
    paragraph_3i_failing_subrules: para3iFailing,
    extended_clauses: extended,
    total_qualifications: totalQualifications,
    clean_opinion: totalQualifications === 0,
    generated_at: new Date().toISOString(),
  };
}

export function listQualifiedClauses(report: CAROExtendedReport): CAROExtendedClause[] {
  return report.extended_clauses.filter((c) => c.qualified).map((c) => c.clause);
}
