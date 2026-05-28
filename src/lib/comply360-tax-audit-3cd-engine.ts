/**
 * @file        src/lib/comply360-tax-audit-3cd-engine.ts
 * @purpose     Comply360 Tax Audit Pack · Form 3CA / 3CB / 3CD builder (Section 44AB)
 * @sprint      Sprint 74a · T-Phase-5.A.1.6-PASS-A · Block 5 · Q19 Tax Audit
 * @decisions   D-S69-1 (100% native) · DP-S74-3 (3CD reads caro-2020 · FR-19 · 0-DIFF)
 * @iso         Reliability · Auditability · Maintainability
 * @disciplines FR-19 SIBLING · FR-43 unit tests · FR-86 §Y (caro-2020 frozen read-source) · FR-91 honest disclosure
 * @reads-from  src/lib/caro-2020-engine.ts (generateCARODisclosureReport · §Y FROZEN · 0-DIFF)
 *              src/types/statutory-pack.ts (CAROAssessmentResult)
 * [JWT] Replace local 3CD assembly with POST /api/comply360/tax-audit/3cd/build
 */
import { generateCARODisclosureReport } from './caro-2020-engine';
import type { CAROAssessmentResult } from '@/types/statutory-pack';

// ── Public types ─────────────────────────────────────────────────────

export type AuditFormType = '3CA' | '3CB' | '3CD';

/**
 * READS_FROM marker · used by tests and FR-19 boundary linters to confirm
 * the 3CD engine consumes caro-2020 as a read-only source.
 */
export const READS_FROM = ['caro-2020-engine'] as const;

export interface AuditorMeta {
  auditor_name: string;
  membership_no: string;
  firm_name: string;
  audit_date: string;        // ISO yyyy-mm-dd
  ca_certificate_no?: string;
}

export interface EntityMeta {
  entity_code: string;
  pan: string;
  legal_name: string;
  fy_start: string;          // ISO yyyy-mm-dd
  fy_end: string;            // ISO yyyy-mm-dd
}

export interface Form3CA {
  form: '3CA';
  entity: EntityMeta;
  auditor: AuditorMeta;
  /** Reference to statutory audit report under another law (Companies Act). */
  statutory_audit_ref: string;
  observations: string[];
}

export interface Form3CB {
  form: '3CB';
  entity: EntityMeta;
  auditor: AuditorMeta;
  /** Used when no statutory audit applies (e.g. firms, proprietorships). */
  qualifications: string[];
  observations: string[];
}

export interface ClauseResult {
  clause: string;            // e.g. '18', '21(b)', '44'
  label: string;
  status: 'reported' | 'not_applicable' | 'qualified';
  value?: string | number;
  note?: string;
}

export interface Form3CD {
  form: '3CD';
  entity: EntityMeta;
  auditor: AuditorMeta;
  clauses: ClauseResult[];
  /** Clause-44 cross-link to CARO 2020 paragraph 3(i) — read-only from frozen engine. */
  caro_disclosure: CAROAssessmentResult;
  generated_at: string;
}

// ── Internal: clause builders ────────────────────────────────────────

function buildStandardClauses(entity: EntityMeta): ClauseResult[] {
  return [
    { clause: '8', label: 'Nature of business or profession', status: 'reported', value: 'Manufacturing' },
    { clause: '9', label: 'Books of account maintained', status: 'reported', value: 'Tally + Operix ERP' },
    { clause: '11', label: 'Method of accounting', status: 'reported', value: 'Mercantile' },
    { clause: '13', label: 'Method of valuation of closing stock', status: 'reported', value: 'Weighted Avg' },
    { clause: '14', label: 'ICDS compliance', status: 'reported' },
    { clause: '17', label: 'Transfer of land/building below stamp value', status: 'not_applicable' },
    { clause: '18', label: 'Depreciation u/s 32 (block-wise particulars)', status: 'reported', note: `FY ${entity.fy_start} → ${entity.fy_end}` },
    { clause: '21(a)', label: 'Personal/capital expenditure disallowable', status: 'not_applicable' },
    { clause: '21(b)', label: 'Amounts inadmissible u/s 40(a)', status: 'reported' },
    { clause: '22', label: 'MSME-disallowance u/s 23 (delayed payments >45d)', status: 'reported' },
    { clause: '26', label: 'Section 43B cash-basis allowance', status: 'reported' },
    { clause: '27(a)', label: 'CENVAT/ITC opening, availed, utilised, closing', status: 'reported' },
    { clause: '31', label: 'Loans accepted/repaid > ₹20,000 in cash', status: 'reported' },
    { clause: '34(a)', label: 'TDS/TCS compliance', status: 'reported' },
    { clause: '34(b)', label: 'TDS/TCS return filed within due date', status: 'reported' },
    { clause: '42', label: 'Form 61/61A/61B furnished', status: 'reported' },
  ];
}

/** Clause 44 reads CARO 3(i) findings · cross-references asset particulars. */
function buildClause44(caro: CAROAssessmentResult): ClauseResult {
  const failed = caro.subRules.filter((r) => !r.pass);
  return {
    clause: '44',
    label: 'Break-up of total expenditure (GST registered vs unregistered)',
    status: failed.length === 0 ? 'reported' : 'qualified',
    note: failed.length === 0
      ? `CARO 3(i) clean · ${caro.subRules.length} sub-rules passed`
      : `CARO 3(i) flagged ${failed.length} sub-rule(s): ${failed.map((f) => f.id).join(', ')}`,
  };
}

// ── Public: builders ─────────────────────────────────────────────────

/**
 * Form 3CA · used when entity is already subject to statutory audit under another law.
 */
export function build3CA(
  entity: EntityMeta,
  auditor: AuditorMeta,
  statutoryAuditRef: string,
  observations: string[] = [],
): Form3CA {
  return {
    form: '3CA',
    entity,
    auditor,
    statutory_audit_ref: statutoryAuditRef,
    observations,
  };
}

/**
 * Form 3CB · used when no statutory audit applies (firms, proprietorships).
 */
export function build3CB(
  entity: EntityMeta,
  auditor: AuditorMeta,
  qualifications: string[] = [],
  observations: string[] = [],
): Form3CB {
  return {
    form: '3CB',
    entity,
    auditor,
    qualifications,
    observations,
  };
}

/**
 * Form 3CD · 44-clause particulars. READS caro-2020 generateCARODisclosureReport
 * for Clause-44-related disclosures (§Y FROZEN · 0-DIFF · FR-19 boundary).
 */
export function build3CD(
  entity: EntityMeta,
  auditor: AuditorMeta,
): Form3CD {
  // FR-19 boundary read · caro-2020-engine MUST stay 0-DIFF.
  const caro = generateCARODisclosureReport(entity.entity_code, entity.fy_start, entity.fy_end);
  const clauses = [...buildStandardClauses(entity), buildClause44(caro)];
  return {
    form: '3CD',
    entity,
    auditor,
    clauses,
    caro_disclosure: caro,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Aggregate audit pack · returns whichever forms the engagement requires.
 */
export interface TaxAuditPack {
  entity_code: string;
  fy_start: string;
  fy_end: string;
  forms: Array<Form3CA | Form3CB | Form3CD>;
  generated_at: string;
}

export function buildAuditPack(
  entity: EntityMeta,
  auditor: AuditorMeta,
  opts: { statutoryAuditRef?: string; useForm3CB?: boolean } = {},
): TaxAuditPack {
  const forms: Array<Form3CA | Form3CB | Form3CD> = [];
  if (opts.useForm3CB) {
    forms.push(build3CB(entity, auditor));
  } else {
    forms.push(build3CA(entity, auditor, opts.statutoryAuditRef ?? 'Companies Act 2013 · §143'));
  }
  forms.push(build3CD(entity, auditor));
  return {
    entity_code: entity.entity_code,
    fy_start: entity.fy_start,
    fy_end: entity.fy_end,
    forms,
    generated_at: new Date().toISOString(),
  };
}

/** Helper · counts qualified/failed clauses in a 3CD form. */
export function countQualifiedClauses(form: Form3CD): number {
  return form.clauses.filter((c) => c.status === 'qualified').length;
}
