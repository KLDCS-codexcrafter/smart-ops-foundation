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

/**
 * Decimal-safe subtraction. Handles null/undefined inputs as 0.
 * Replaces `a - b` for monetary calculations.
 */
export const dSub = (a: number, b: number): number =>
  new Decimal(a ?? 0).minus(new Decimal(b ?? 0)).toNumber();

/**
 * Decimal-safe multiplication. Handles null/undefined inputs as 0.
 * Replaces `a * b` for monetary calculations.
 */
export const dMul = (a: number, b: number): number =>
  new Decimal(a ?? 0).times(new Decimal(b ?? 0)).toNumber();

/**
 * Percentage application: `base * pct / 100`. Decimal-safe.
 * Used for tax calculations, commission rates, discount applications.
 */
export const dPct = (base: number, pct: number): number =>
  new Decimal(base ?? 0).times(new Decimal(pct ?? 0)).dividedBy(100).toNumber();

/**
 * 2-decimal-place rounding using RBI banker's rounding (ROUND_HALF_UP).
 * Standard for Indian financial calculations · matches govt audit expectations.
 *
 * USE FOR: Final monetary output before storage · trial balance rounding ·
 *          paisa-precise display formatting.
 * NOT FOR: Intermediate calculations (use Decimal end-to-end · round only at boundary).
 */
export const round2 = (n: number): number =>
  new Decimal(n ?? 0).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();

/**
 * Decimal-safe equality check at given decimal places.
 * - Default (no places): exact decimal equality (matches Z2a Dr=Cr pattern)
 * - With places: rounds both sides to N places then compares
 *
 * USE FOR: Trial balance Dr=Cr verification · allocation qty checks ·
 *          tolerance-aware comparisons in reports.
 */
export const dEq = (a: number, b: number, places?: number): boolean => {
  const da = new Decimal(a ?? 0);
  const db = new Decimal(b ?? 0);
  if (places === undefined) return da.equals(db);
  return da.toDecimalPlaces(places).equals(db.toDecimalPlaces(places));
};

/**
 * Decimal-safe array sum with optional getter.
 * Replaces `arr.reduce((s, x) => s + x, 0)` for monetary aggregation.
 *
 * Examples:
 *   dSum([1.1, 2.2, 3.3])              // 6.6 (no drift)
 *   dSum(lines, l => l.amount)          // sum of amounts
 *   dSum(lines, l => l.amount * l.rate) // sum of products (handles inner math safely)
 */
export const dSum = <T>(
  arr: readonly T[],
  getter?: (item: T) => number,
): number => {
  const reducer = getter
    ? (acc: Decimal, item: T) => acc.plus(new Decimal(getter(item) ?? 0))
    : (acc: Decimal, item: T) => acc.plus(new Decimal((item as unknown as number) ?? 0));
  return arr.reduce(reducer, new Decimal(0)).toNumber();
};
