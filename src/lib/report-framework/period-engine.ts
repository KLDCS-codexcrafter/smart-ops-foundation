/**
 * @file        period-engine.ts
 * @purpose     Pure Indian-FY-aware date math for report periods.
 *              ZERO React, ZERO hooks, ZERO side-effects beyond date arithmetic.
 *              GlobalDateRangeContext will adopt this in RPT-1b/4 — not touched now.
 * @sprint      RPT-1a · Reporting Framework Foundation
 * @decisions   D-RPT-2 (period engine is pure · the hook wraps · not the other way)
 * @[JWT]       N/A — pure functions
 */

export type PeriodPreset = 'today' | 'mtd' | 'qtd' | 'ytd' | 'custom';

export interface DateRange {
  /** ISO YYYY-MM-DD */
  from: string;
  /** ISO YYYY-MM-DD */
  to: string;
}

function toISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function utcDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d));
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return utcDate(y, m - 1, d);
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function addDays(d: Date, n: number): Date {
  return utcDate(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n);
}

/** Indian FY starts 1-Apr. Returns the FY-start year for `ref`. */
function indianFYStartYear(ref: Date): number {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth(); // 0=Jan, 3=Apr
  return m >= 3 ? y : y - 1;
}

/** Indian FY quarter start month (0-indexed): Q1=Apr, Q2=Jul, Q3=Oct, Q4=Jan. */
function indianQuarterStart(ref: Date): { year: number; month: number } {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  if (m >= 3 && m <= 5)  return { year: y, month: 3 };
  if (m >= 6 && m <= 8)  return { year: y, month: 6 };
  if (m >= 9 && m <= 11) return { year: y, month: 9 };
  return { year: y, month: 0 }; // Jan-Mar = Q4
}

export function resolvePeriod(
  preset: PeriodPreset,
  ref: Date = new Date(),
  custom?: DateRange,
): DateRange {
  const refUTC = utcDate(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate());

  switch (preset) {
    case 'today':
      return { from: toISO(refUTC), to: toISO(refUTC) };

    case 'mtd': {
      const from = utcDate(refUTC.getUTCFullYear(), refUTC.getUTCMonth(), 1);
      return { from: toISO(from), to: toISO(refUTC) };
    }

    case 'qtd': {
      const q = indianQuarterStart(refUTC);
      const from = utcDate(q.year, q.month, 1);
      return { from: toISO(from), to: toISO(refUTC) };
    }

    case 'ytd': {
      const fyStart = indianFYStartYear(refUTC);
      const from = utcDate(fyStart, 3, 1);
      return { from: toISO(from), to: toISO(refUTC) };
    }

    case 'custom':
      if (!custom) throw new Error('resolvePeriod: custom preset requires a DateRange');
      return { from: custom.from, to: custom.to };
  }
}

export function priorPeriod(range: DateRange): DateRange {
  const from = parseISO(range.from);
  const to = parseISO(range.to);
  const len = daysBetween(from, to);
  const newTo = addDays(from, -1);
  const newFrom = addDays(newTo, -len);
  return { from: toISO(newFrom), to: toISO(newTo) };
}

export function lastYear(range: DateRange): DateRange {
  const from = parseISO(range.from);
  const to = parseISO(range.to);
  const newFrom = utcDate(from.getUTCFullYear() - 1, from.getUTCMonth(), from.getUTCDate());
  const newTo = utcDate(to.getUTCFullYear() - 1, to.getUTCMonth(), to.getUTCDate());
  return { from: toISO(newFrom), to: toISO(newTo) };
}
