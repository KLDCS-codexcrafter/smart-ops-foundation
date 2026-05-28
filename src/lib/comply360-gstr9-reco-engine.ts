/**
 * @file        src/lib/comply360-gstr9-reco-engine.ts
 * @purpose     Comply360 GSTR-9C reconciliation engine · books-vs-GSTR9 variance flags + certification
 * @sprint      Sprint 74a · T-Phase-5.A.1.6-PASS-A · Block 4 · Q19 Annual Returns
 * @decisions   D-S69-1 (100% native) · DP-S74-1 (GSTR-9C as tax-gst tab) · DP-S74-2 (extend builder in place)
 * @iso         Reliability · Auditability · Maintainability
 * @disciplines FR-19 SIBLING · FR-43 unit tests · FR-91 honest disclosure · Lesson 23 cross-prompt contract
 * @reads-from  src/lib/comply360-gstr-builder-engine.ts (BooksAnnualTotals · AuditorCertification · GSTR9CPayload)
 *              src/lib/gst-portal-service.ts (GSTR9Payload shape)
 * [JWT] Replace local computations with POST /api/comply360/gstr9c/reconcile
 */
import type { GSTR9Payload } from './gst-portal-service';
import type {
  BooksAnnualTotals,
  AuditorCertification,
  GSTR9CPayload,
} from './comply360-gstr-builder-engine';

// ── Public types ─────────────────────────────────────────────────────

export type GSTR9CVarianceSeverity = 'pass' | 'warn' | 'fail';

export interface GSTR9CVariance {
  bucket: 'turnover' | 'tax' | 'itc';
  per_gstr9: number;
  per_books: number;
  delta: number;
  abs_delta: number;
  severity: GSTR9CVarianceSeverity;
  message: string;
}

export interface GSTR9CReco {
  gstin: string;
  fy: string;
  variances: GSTR9CVariance[];
  overall: GSTR9CVarianceSeverity;
  generated_at: string;
  /** Echoes the auditor pack so consumers don't have to recombine. */
  certification?: AuditorCertification;
}

// ── Thresholds (CBIC tolerances · single source of truth) ───────────

/** ₹1 rounding tolerance below which a variance is treated as pass. */
export const RECO_PASS_THRESHOLD = 1;
/** ₹100,000 (1L) above which a variance escalates from warn → fail. */
export const RECO_FAIL_THRESHOLD = 100_000;

// ── Public API ───────────────────────────────────────────────────────

/**
 * Compute the 3-bucket reconciliation variances (turnover · tax · ITC).
 * Pure helper · zero side effects.
 */
export function computeReconVariances(
  gstr9: GSTR9Payload,
  books: BooksAnnualTotals,
): GSTR9CVariance[] {
  const turnover9 = gstr9.tbl4.pt4A.txval + gstr9.tbl5.pt5A.txval;
  const tax9 =
    gstr9.tbl9.tax_pay.iamt + gstr9.tbl9.tax_pay.camt +
    gstr9.tbl9.tax_pay.samt + gstr9.tbl9.tax_pay.csamt;
  const itc9 =
    gstr9.tbl6.pt6A.iamt + gstr9.tbl6.pt6A.camt +
    gstr9.tbl6.pt6A.samt + gstr9.tbl6.pt6A.csamt;

  const buckets: Array<Omit<GSTR9CVariance, 'severity' | 'message' | 'abs_delta'>> = [
    { bucket: 'turnover', per_gstr9: turnover9, per_books: books.turnover_per_books, delta: books.turnover_per_books - turnover9 },
    { bucket: 'tax', per_gstr9: tax9, per_books: books.tax_per_books, delta: books.tax_per_books - tax9 },
    { bucket: 'itc', per_gstr9: itc9, per_books: books.itc_per_books, delta: books.itc_per_books - itc9 },
  ];

  return buckets.map((b) => {
    const abs = Math.abs(b.delta);
    let severity: GSTR9CVarianceSeverity = 'pass';
    if (abs > RECO_FAIL_THRESHOLD) severity = 'fail';
    else if (abs > RECO_PASS_THRESHOLD) severity = 'warn';
    const sign = b.delta >= 0 ? '+' : '-';
    return {
      ...b,
      abs_delta: abs,
      severity,
      message: severity === 'pass'
        ? `${b.bucket} matches within rounding tolerance`
        : `${b.bucket} diverges by ${sign}₹${abs.toFixed(2)} (${severity})`,
    };
  });
}

/**
 * Full reconciliation pass: variances + overall worst-severity verdict.
 */
export function reconcileGSTR9C(
  gstr9: GSTR9Payload,
  books: BooksAnnualTotals,
  auditor?: AuditorCertification,
): GSTR9CReco {
  const variances = computeReconVariances(gstr9, books);
  const overall: GSTR9CVarianceSeverity = variances.some((v) => v.severity === 'fail')
    ? 'fail'
    : variances.some((v) => v.severity === 'warn')
      ? 'warn'
      : 'pass';
  return {
    gstin: gstr9.gstin,
    fy: gstr9.fy,
    variances,
    overall,
    generated_at: new Date().toISOString(),
    certification: auditor,
  };
}

/**
 * Build the Part-B certification block embedded in a GSTR-9C filing.
 * Used by the surface after the auditor confirms the reconciliation.
 */
export function buildGSTR9CCertification(
  reco: GSTR9CReco,
  auditor: AuditorCertification,
): Pick<GSTR9CPayload, 'gstin' | 'fy' | 'pt5_certification'> & { overall: GSTR9CVarianceSeverity } {
  return {
    gstin: reco.gstin,
    fy: reco.fy,
    pt5_certification: auditor,
    overall: reco.overall,
  };
}

/** Convenience: count failing buckets across a reco run. */
export function countFailingBuckets(reco: GSTR9CReco): number {
  return reco.variances.filter((v) => v.severity === 'fail').length;
}
