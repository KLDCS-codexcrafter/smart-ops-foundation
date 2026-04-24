/**
 * @file     fiscal-year.ts
 * @purpose  Fiscal Year calendar master with per-period lock flag.
 *           Extends the existing FY base (fyStartMonth on Parent Company)
 *           with a 12-period breakdown and close-after-lock semantics.
 * @sprint   T-H1.5-C-S3
 * @finding  CC-015
 */

export interface FiscalPeriod {
  /** 1-12, sequential. Period 1 = FY start month, Period 12 = FY end month. */
  periodNumber: number;
  /** Human-readable (e.g. "Apr 2024"). */
  label: string;
  /** ISO date string — inclusive first day of period. */
  startDate: string;
  /** ISO date string — inclusive last day of period. */
  endDate: string;
  /** When true, voucher creation in this period is blocked. */
  locked: boolean;
  /** ISO timestamp when locked. Null if never locked. */
  lockedAt: string | null;
  /** User ID that locked the period. Null if never locked. */
  lockedBy: string | null;
}

export interface FiscalYear {
  /** Format: "FY-YYYY-YY" e.g. "FY-2024-25". Stable ID. */
  id: string;
  /** Short label e.g. "2024-25". */
  label: string;
  /** ISO date — first day of FY. */
  startDate: string;
  /** ISO date — last day of FY. */
  endDate: string;
  /** Month index 1-12 when FY starts (e.g. 4 = April for India). */
  startMonth: number;
  /** 12 periods, ordered period 1 → 12. */
  periods: FiscalPeriod[];
  /** When true, ENTIRE FY is closed. No voucher CRUD. */
  closed: boolean;
  /** ISO timestamp when FY closed. */
  closedAt: string | null;
}

export const fiscalYearStorageKey = (entityCode: string) =>
  `erp_fiscal_years_${entityCode}`;
