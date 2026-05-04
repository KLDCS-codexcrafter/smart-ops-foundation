/**
 * @file        qa-spec.ts
 * @sprint      T-Phase-1.2.6f-d-2-card5-5-pre-1 · Block B · D-322 + D-331
 * @purpose     QA Specification types · per-item parameter checklist.
 * @decisions   D-322 (QaSpec + QaSpecParameter)
 *              D-331 (4 parameter types incl. master_lookup matches Tally "Table" input)
 * @[JWT]       GET/POST /api/qa/specs
 */

/** Parameter input types · D-331 includes master_lookup (Tally "Table" parity). */
export type QaSpecParameterType = 'numeric' | 'text' | 'boolean' | 'master_lookup';

export interface QaSpecParameter {
  id: string;
  sl_no: number;
  name: string;                    // e.g. "Tensile Strength"
  parameter_type: QaSpecParameterType;
  unit: string | null;             // e.g. "MPa", null for boolean
  /** Numeric: min allowed. */
  min_value: number | null;
  /** Numeric: max allowed. */
  max_value: number | null;
  /** Text: expected/regex. Boolean: 'true'|'false'. */
  expected_text: string | null;
  /** D-331 master_lookup: which master to query (e.g. 'colour', 'grade'). */
  lookup_master: string | null;
  is_critical: boolean;
  test_method: string | null;
}

export interface QaSpec {
  id: string;
  code: string;                    // e.g. "SPEC-RM-PHYSICAL"
  name: string;                    // e.g. "Raw Material Physical Properties"
  item_id: string | null;          // null = generic spec template
  item_name: string | null;
  parameters: QaSpecParameter[];
  status: 'draft' | 'active' | 'archived';
  notes: string;
  entity_id: string;
  created_at: string;
  updated_at: string;
}

export const qaSpecKey = (entityCode: string): string =>
  `erp_qa_specs_${entityCode}`;
