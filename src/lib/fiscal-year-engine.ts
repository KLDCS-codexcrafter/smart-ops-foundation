/**
 * @file     fiscal-year-engine.ts
 * @purpose  CRUD + period-lock semantics for FY calendar master.
 *           Single source of truth for "is this period locked / is this FY closed".
 * @sprint   T-H1.5-C-S3
 * @finding  CC-015
 */

import type { FiscalYear, FiscalPeriod } from '@/types/fiscal-year';
import { fiscalYearStorageKey } from '@/types/fiscal-year';

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Build a fresh 12-period FY given a start year and start month (1-12). */
export function buildFiscalYear(startYear: number, startMonth: number): FiscalYear {
  const periods: FiscalPeriod[] = [];
  for (let i = 0; i < 12; i++) {
    const m = ((startMonth - 1 + i) % 12) + 1;
    const y = startYear + Math.floor((startMonth - 1 + i) / 12);
    const lastDay = new Date(y, m, 0).getDate();
    periods.push({
      periodNumber: i + 1,
      label: `${MONTH_LABELS[m - 1]} ${y}`,
      startDate: `${y}-${String(m).padStart(2, '0')}-01`,
      endDate: `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
      locked: false,
      lockedAt: null,
      lockedBy: null,
    });
  }
  const endYear = periods[periods.length - 1].endDate.slice(0, 4);
  return {
    id: `FY-${startYear}-${endYear.slice(2)}`,
    label: `${startYear}-${endYear.slice(2)}`,
    startDate: periods[0].startDate,
    endDate: periods[periods.length - 1].endDate,
    startMonth,
    periods,
    closed: false,
    closedAt: null,
  };
}

/** Read all FYs for entity. Empty array if none saved. */
export function readFiscalYears(entityCode: string): FiscalYear[] {
  try {
    // [JWT] GET /api/fiscal-years?entity=:entityCode
    const raw = localStorage.getItem(fiscalYearStorageKey(entityCode));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function writeFiscalYears(entityCode: string, years: FiscalYear[]): void {
  try {
    // [JWT] PUT /api/fiscal-years?entity=:entityCode
    localStorage.setItem(fiscalYearStorageKey(entityCode), JSON.stringify(years));
  } catch { /* ignore quota */ }
}

/**
 * Check whether a given ISO date falls inside a locked period or closed FY.
 * Returns null if the date is open for posting, or a reason string if blocked.
 */
export function isDateBlocked(entityCode: string, isoDate: string): string | null {
  const years = readFiscalYears(entityCode);
  for (const fy of years) {
    if (isoDate < fy.startDate || isoDate > fy.endDate) continue;
    if (fy.closed) return `FY ${fy.label} is closed (${fy.closedAt ?? ''}).`;
    const period = fy.periods.find(p => isoDate >= p.startDate && isoDate <= p.endDate);
    if (period?.locked) return `Period ${period.label} is locked (${period.lockedAt ?? ''}).`;
    return null;
  }
  return null; // date is outside any saved FY — not blocked
}
