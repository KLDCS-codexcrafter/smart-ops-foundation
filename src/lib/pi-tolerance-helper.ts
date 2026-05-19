/**
 * @file        src/lib/pi-tolerance-helper.ts
 * @purpose     Sprint B.1 · PI (Purchase Invoice) variance tolerance resolver for admin review
 *              gates · canonical 2% / ₹500 defaults mirroring bill-passing-engine internal
 *              constants (DEFAULT_TOLERANCE_PCT = 2 · DEFAULT_TOLERANCE_AMOUNT = 500) ·
 *              Phase 2: read from tenant master configured via cc-compliance-settings
 * @who         VendorInvoiceAdminReview · B.2 dashboard variance display · future PI consumers
 * @when        2026-05-19 (Sprint B.1)
 * @sprint      T-Phase-1.B-1-P2P-Workflow-Closure
 * @iso         ISO 25010 Maintainability · Functional Suitability (correctness)
 * @whom        Audit Owner
 * @decisions   D-NEW-EQ PI tolerance helper · CONSUME ONLY pattern · explicit mirror of
 *              bill-passing-engine internal DEFAULT_TOLERANCE_PCT / DEFAULT_TOLERANCE_AMOUNT ·
 *              Phase 2 promotes both readers to shared tenant-master source ·
 *              Originated from D-NEW-DX 7th sprint catch (freight-match resolveTolerance
 *              semantic mismatch · domain-semantic verification level)
 * @disciplines FR-67 (Three Greps · zero duplicates · mirror documented to prevent divergence) ·
 *              FR-9 (no package.json) · FR-30 (header)
 * @reuses      None (intentionally · explicit constant mirror per institutional discipline)
 * @[JWT]       Phase 2: GET /api/tenant/:code/pi-tolerance · cc-compliance-settings master
 */

/**
 * INSTITUTIONAL NOTE · these constants INTENTIONALLY MIRROR the file-scoped values in
 * src/lib/bill-passing-engine.ts (DEFAULT_TOLERANCE_PCT = 2 · DEFAULT_TOLERANCE_AMOUNT = 500).
 *
 * When Phase 2 promotes PI tolerance to a tenant master:
 *   1. Add fields to cc-compliance-settings master
 *   2. Update resolveInvoiceTolerance() here to read from master
 *   3. Refactor bill-passing-engine to call this helper (or a shared source)
 *
 * If you change these values · ALSO update bill-passing-engine.ts · or extract both to a
 * shared constants module. The mirror is explicit · not accidental.
 */
const PI_DEFAULT_TOLERANCE_PCT = 2;
const PI_DEFAULT_TOLERANCE_AMOUNT = 500;

export interface InvoiceTolerance {
  pct: number;
  amount: number;
  source: 'default' | 'tenant' | 'category';
}

export function resolveInvoiceTolerance(
  entityCode: string,
  _category?: string,
): InvoiceTolerance {
  void entityCode;   // Phase 2 reads tenant master keyed by entityCode
  void _category;    // Phase 2 supports per-category override
  return {
    pct: PI_DEFAULT_TOLERANCE_PCT,
    amount: PI_DEFAULT_TOLERANCE_AMOUNT,
    source: 'default',
  };
}

/**
 * Classify PI variance · B.1-local classification distinct from freight MatchStatus ·
 * 3-tier: within (≤ tolerance) · variance (≤ 2× tolerance · review needed) ·
 * breach (> 2× tolerance · approve blocked).
 */
export type PiVarianceClassification = 'within' | 'variance' | 'breach';

export function classifyPiVariance(
  variancePct: number,
  tolerancePct: number,
): PiVarianceClassification {
  if (variancePct <= tolerancePct) return 'within';
  if (variancePct <= tolerancePct * 2) return 'variance';
  return 'breach';
}
