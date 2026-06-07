/**
 * @file        src/lib/dept-context-resolver-engine.ts
 * @sprint      T-P87-DeptId-Bridge-Retrofit · Wave-1 close · sole NEW SIBLING
 * @realizes    P2BB Sub-Arc 9 (L4) · FR-50/FR-51 multi-dept discipline · FR-57
 *              bridge-engine pattern · honest department-context resolution for
 *              cross-card bridge payloads.
 * @honesty     [JWT] Phase-8 Wave-2: dept_id resolved from authenticated user
 *              identity (P2BB-Auth); until then resolution is record-derived
 *              or undefined. NEVER fabricate a department. NEVER default-stamp.
 *              No fallback literals. No 'dept-default'. No guessing.
 * @forbidden   localStorage writes · department master mutation · any default
 *              department constant.
 *
 * Exports:
 *  - resolveDeptFromRecord(record)             — inspect a source record for
 *                                                a genuine dept field, else undefined
 *  - resolveDeptFromContext({sourceRecord, explicit}) — explicit > record > undefined
 *  - DEPT_RESOLUTION_NOTE                      — Wave-2 seam doc string
 */

export const DEPT_RESOLUTION_NOTE =
  'dept_id is record-derived at Wave-1 and becomes auth-derived at P2BB-Auth (Wave-2). ' +
  'Never fabricated, never default-stamped.';

const CANDIDATE_KEYS = ['dept_id', 'department_id', 'deptId', 'departmentId'] as const;

function isNonEmptyDeptString(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const t = v.trim();
  if (t.length === 0) return false;
  // Reject all-known historical fallback literals — banned by AC3.
  if (t === 'dept-default' || t === 'default' || t === 'unknown') return false;
  return true;
}

/** Inspects a source record for a genuine department field.
 *  Returns undefined when absent. Never invents a value.
 */
export function resolveDeptFromRecord(record: unknown): string | undefined {
  if (record === null || record === undefined) return undefined;
  if (typeof record !== 'object') return undefined;
  const rec = record as Record<string, unknown>;

  for (const k of CANDIDATE_KEYS) {
    const v = rec[k];
    if (isNonEmptyDeptString(v)) return v.trim();
  }

  // `department` as a real reference (string id), NOT a label object.
  const dept = rec['department'];
  if (isNonEmptyDeptString(dept)) return dept.trim();

  return undefined;
}

/** Explicit wins, else record-derived, else undefined.
 *  Caller decides whether to thread the result as optional (`dept_id?`) or
 *  coerce to '' for a legacy required field (disclose the coercion in §L).
 */
export function resolveDeptFromContext(opts: {
  sourceRecord?: unknown;
  explicit?: string;
}): string | undefined {
  if (opts.explicit && isNonEmptyDeptString(opts.explicit)) {
    return opts.explicit.trim();
  }
  if (opts.sourceRecord !== undefined) {
    return resolveDeptFromRecord(opts.sourceRecord);
  }
  return undefined;
}
