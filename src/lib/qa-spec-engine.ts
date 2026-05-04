/**
 * @file        qa-spec-engine.ts
 * @sprint      T-Phase-1.2.6f-d-2-card5-5-pre-1 · Block C · D-325 + D-331
 * @purpose     QA Spec CRUD + parameter interpretation (4 input types).
 * @decisions   D-325 (5-function API) · D-331 (4 parameter types incl. master_lookup)
 * @[JWT]       GET/POST /api/qa/specs
 */
import type { QaSpec, QaSpecParameter, QaSpecParameterType } from '@/types/qa-spec';
import { qaSpecKey } from '@/types/qa-spec';

const newId = (): string =>
  `qs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function read(entityCode: string): QaSpec[] {
  try {
    // [JWT] GET /api/qa/specs?entityCode=...
    const raw = localStorage.getItem(qaSpecKey(entityCode));
    return raw ? (JSON.parse(raw) as QaSpec[]) : [];
  } catch { return []; }
}

function write(entityCode: string, list: QaSpec[]): void {
  try {
    // [JWT] POST /api/qa/specs
    localStorage.setItem(qaSpecKey(entityCode), JSON.stringify(list));
  } catch { /* quota silent */ }
}

export function listQaSpecs(entityCode: string): QaSpec[] {
  return read(entityCode);
}

export function getQaSpec(id: string, entityCode: string): QaSpec | null {
  return read(entityCode).find(s => s.id === id) ?? null;
}

export interface CreateQaSpecInput {
  code: string;
  name: string;
  item_id?: string | null;
  item_name?: string | null;
  parameters: Omit<QaSpecParameter, 'id' | 'sl_no'>[];
  notes?: string;
}

export function createQaSpec(input: CreateQaSpecInput, entityCode: string): QaSpec {
  const list = read(entityCode);
  const now = new Date().toISOString();
  const rec: QaSpec = {
    id: newId(),
    code: input.code,
    name: input.name,
    item_id: input.item_id ?? null,
    item_name: input.item_name ?? null,
    parameters: input.parameters.map((p, i) => ({
      ...p,
      id: `${newId()}-p${i}`,
      sl_no: i + 1,
    })),
    status: 'active',
    notes: input.notes ?? '',
    entity_id: entityCode,
    created_at: now,
    updated_at: now,
  };
  list.push(rec);
  write(entityCode, list);
  return rec;
}

export function archiveQaSpec(id: string, entityCode: string): QaSpec | null {
  const list = read(entityCode);
  const idx = list.findIndex(s => s.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], status: 'archived', updated_at: new Date().toISOString() };
  write(entityCode, list);
  return list[idx];
}

/** D-331 · Evaluate one captured value against parameter rules. */
export interface ParameterEvaluation {
  pass: boolean;
  reason: string;
}

export function interpretParameter(
  param: QaSpecParameter,
  capturedValue: string,
): ParameterEvaluation {
  const v = capturedValue.trim();
  if (!v) return { pass: false, reason: 'No value captured' };
  switch (param.parameter_type as QaSpecParameterType) {
    case 'numeric': {
      const n = Number(v);
      if (Number.isNaN(n)) return { pass: false, reason: 'Not a number' };
      if (param.min_value !== null && n < param.min_value) {
        return { pass: false, reason: `Below min ${param.min_value}` };
      }
      if (param.max_value !== null && n > param.max_value) {
        return { pass: false, reason: `Above max ${param.max_value}` };
      }
      return { pass: true, reason: 'Within range' };
    }
    case 'boolean': {
      const expected = (param.expected_text ?? 'true').toLowerCase();
      const actual = v.toLowerCase();
      return actual === expected
        ? { pass: true, reason: 'Match' }
        : { pass: false, reason: `Expected ${expected}` };
    }
    case 'text': {
      if (!param.expected_text) return { pass: true, reason: 'Free text captured' };
      return v === param.expected_text
        ? { pass: true, reason: 'Match' }
        : { pass: false, reason: `Expected "${param.expected_text}"` };
    }
    case 'master_lookup': {
      // D-331 · master_lookup delegates evaluation to existing master engines downstream.
      // For now: presence-check (non-empty value drawn from named master).
      if (!param.lookup_master) return { pass: false, reason: 'No lookup_master configured' };
      return { pass: true, reason: `Selected from ${param.lookup_master}` };
    }
    default:
      return { pass: false, reason: 'Unknown parameter type' };
  }
}
