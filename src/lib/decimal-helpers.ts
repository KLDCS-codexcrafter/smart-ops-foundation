/**
 * @file     decimal-helpers.ts
 * @purpose  Decimal-safe arithmetic utilities for Operix engine and report code.
 *           Centralizes rounding semantics (RBI banker's rounding · ROUND_HALF_UP)
 *           and Decimal arithmetic so all consumers produce identical results.
 *           Used by sam-engine, commission-engine, Z2b voucher posting paths,
 *           Z2c report display formatting.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Z2-prep-helpers
 * @iso      Maintainability (HIGH+ helpers in one auditable location)
 *           Reliability (HIGH+ identical rounding semantics across engines)
 *           Functional Suitability (preserved · pure refactor)
 * @whom     sam-engine.ts · commission-engine.ts · Z2b src/lib files · Z2c report files
 * @depends  decimal.js@10.4.3 (installed Z2a)
 *
 * D-142 LOCKED: signatures use `number → number` so callers don't import Decimal.
 * Decimal arithmetic happens internally · output is JS Number for storage compat.
 *
 * @standard RBI banker's rounding (ROUND_HALF_UP) for paisa precision.
 *           This matches govt audit standards for trial balance rounding.
 */
import Decimal from 'decimal.js';

/**
 * Decimal-safe addition. Handles null/undefined inputs as 0.
 * Replaces `a + b` for monetary calculations.
 */
export const dAdd = (a: number, b: number): number =>
  new Decimal(a ?? 0).plus(new Decimal(b ?? 0)).toNumber();
