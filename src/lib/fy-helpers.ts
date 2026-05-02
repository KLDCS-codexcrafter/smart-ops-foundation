/**
 * @file     fy-helpers.ts — Indian Financial Year date helpers
 * @sprint   T-Phase-1.2.6d-hdr-fix · split from TaxPeriodGateBanner
 * @purpose  Pure date utilities for FY (Apr→Mar) and quarter computation.
 *           Extracted to satisfy react-refresh/only-export-components on the
 *           TaxPeriodGateBanner component file.
 *
 * @consumers
 *   - TaxPeriodGateBanner (UI display)
 *   - duplicate-reference-check.ts (Q7-b · FY scoping for reference collision)
 */

/** Indian FY label for a given date (April → March). E.g. '2026-05-02' → 'FY 2026-27'. */
export function fyForDate(dateISO: string): string {
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return 'FY ----';
  const m = d.getMonth();
  const y = d.getFullYear();
  if (m >= 3) return `FY ${y}-${String(y + 1).slice(2)}`;
  return `FY ${y - 1}-${String(y).slice(2)}`;
}

/** Quarter label for a given date. Q1 = Apr-Jun, Q2 = Jul-Sep, Q3 = Oct-Dec, Q4 = Jan-Mar. */
export function quarterForDate(dateISO: string): string {
  const m = new Date(dateISO).getMonth();
  if (m >= 3 && m <= 5) return 'Q1';
  if (m >= 6 && m <= 8) return 'Q2';
  if (m >= 9 && m <= 11) return 'Q3';
  return 'Q4';
}
