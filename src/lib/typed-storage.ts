/**
 * @file     typed-storage.ts
 * @purpose  Type-safe wrappers around JSON.parse + localStorage to eliminate
 *           the ~120 `any` casts at storage boundaries
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Z1b
 * @iso      Compatibility (HIGH+ external-system contract change tolerance)
 *           Reliability (HIGH+ schema mismatches fail loudly)
 *           Maintainability (HIGH+ single mechanism replaces 120 casts)
 * @whom     Engineering team · all module engines that read localStorage
 * @depends  zod (verified present in package.json @ ^3.25.76)
 * @consumers Every engine that reads/writes localStorage
 */

import { z } from 'zod';

/**
 * Parse JSON string with runtime schema validation.
 * Returns T on success, null on parse-or-schema failure.
 * Logs parse failures to console.warn for diagnostics.
 *
 * @example
 *   const ledgers = parseJsonAs(raw, z.array(LedgerEntrySchema));
 *   if (!ledgers) return [];
 */
export function parseJsonAs<T>(raw: string | null, schema: z.ZodType<T>): T | null {
  if (raw == null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      // [JWT] surface schema mismatch for ops diagnostics
      console.warn('[typed-storage] schema mismatch', { issues: result.error.issues });
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}

/**
 * Read a typed value from localStorage with schema validation.
 * [JWT] localStorage.getItem — replace with REST GET in Phase 2
 */
export function readStorageAs<T>(key: string, schema: z.ZodType<T>): T | null {
  return parseJsonAs(localStorage.getItem(key), schema);
}

/**
 * Read a typed value from localStorage, returning fallback on miss/failure.
 * [JWT] localStorage.getItem — replace with REST GET in Phase 2
 */
export function readStorageOr<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  return readStorageAs(key, schema) ?? fallback;
}

/**
 * Type-guard escape hatch for callers that don't yet have a Zod schema.
 * Returns parsed unknown — caller must narrow before use.
 * Prefer parseJsonAs with a schema where possible.
 */
export function parseJsonOrNull(raw: string | null): unknown {
  if (raw == null) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
