/**
 * @file        qa-acceptance-criteria.ts
 * @sprint      T-Phase-1.2.6f-d-2-card5-5-pre-1 · Block B · D-323
 * @purpose     IS 2500 AQL acceptance criteria types · governs sample-based pass/fail.
 * @decisions   D-323 (IS 2500 AQL levels: critical/major/minor)
 * @[JWT]       GET/POST /api/qa/acceptance-criteria
 */

export type AqlSeverity = 'critical' | 'major' | 'minor';

export interface AqlLevel {
  severity: AqlSeverity;
  /** AQL value (e.g. 0.65, 1.0, 2.5 — IS 2500 standard ladder). */
  aql: number;
  /** Sample size (Lot Size → derived via IS 2500 Table 1, captured here). */
  sample_size: number;
  /** Acceptance number (max defects to PASS). */
  accept: number;
  /** Rejection number (min defects to FAIL). */
  reject: number;
}

export interface QaAcceptanceCriteria {
  id: string;
  code: string;            // e.g. "AQL-IS2500-NORMAL-II"
  name: string;            // e.g. "IS 2500 — Normal Inspection Level II"
  standard: string;        // e.g. "IS 2500 (Part 1) : 2000"
  inspection_level: 'I' | 'II' | 'III' | 'S-1' | 'S-2' | 'S-3' | 'S-4';
  levels: AqlLevel[];      // critical + major + minor
  notes: string;
  entity_id: string;
  created_at: string;
  updated_at: string;
}

export const qaAcceptanceCriteriaKey = (entityCode: string): string =>
  `erp_qa_acceptance_criteria_${entityCode}`;
