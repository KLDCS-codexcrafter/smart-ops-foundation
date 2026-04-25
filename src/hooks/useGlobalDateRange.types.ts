/**
 * @file     useGlobalDateRange.types.ts
 * @purpose  Types, constants, and helper functions extracted from
 *           useGlobalDateRange.tsx to satisfy react-refresh/only-export-components.
 *           Component file (useGlobalDateRange.tsx) only exports the Provider
 *           and the consumer hook.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Cleanup-1c-a
 * @iso      Maintainability (HIGH+ component file scope cleaned)
 *           Performance (HIGH+ HMR fast-refresh works correctly)
 * @whom     useGlobalDateRange.tsx · components that import these helpers
 * @depends  date-fns
 */
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfQuarter, endOfQuarter,
  subDays, subWeeks, subMonths, subQuarters,
  format,
} from 'date-fns';

export type DatePreset =
  | 'today' | 'yesterday' | 'this_week' | 'last_week'
  | 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter'
  | 'last_7_days' | 'last_30_days' | 'last_90_days'
  | 'cur_fy' | 'pre_fy' | 'custom';

export type ComparisonMode = 'none' | 'previous_period' | 'previous_year' | 'same_period_last_fy';

export interface DateRange { from: Date; to: Date; }

export const PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Today', yesterday: 'Yesterday',
  this_week: 'This Week', last_week: 'Last Week',
  this_month: 'This Month', last_month: 'Last Month',
  this_quarter: 'This Quarter', last_quarter: 'Last Quarter',
  last_7_days: 'Last 7 Days', last_30_days: 'Last 30 Days',
  last_90_days: 'Last 90 Days',
  cur_fy: 'Current FY', pre_fy: 'Previous FY',
  custom: 'Custom',
};

// April = month index 3 (Indian FY)
// [JWT] GET /api/entity/storage/:key
export const FY_START_MONTH = parseInt(localStorage.getItem('erp_fy_start_month') ?? '3', 10);
const COMPANY_START_YEAR = 2020;

function getFYDates(offset = 0): DateRange {
  const now = new Date();
  const m = now.getMonth();
  let sy = m >= FY_START_MONTH ? now.getFullYear() : now.getFullYear() - 1;
  sy += offset;
  return {
    from: new Date(sy, FY_START_MONTH, 1),
    to: new Date(sy + 1, FY_START_MONTH, 0),
  };
}

export function getFYLabel(date?: Date): string {
  const d = date ?? new Date();
  const m = d.getMonth();
  const y = d.getFullYear();
  const sy = m >= FY_START_MONTH ? y : y - 1;
  return `FY ${String(sy).slice(2)}-${String(sy + 1).slice(2)}`;
}

export function getAvailableFYs(): string[] {
  const now = new Date();
  const cur = now.getMonth() >= FY_START_MONTH ? now.getFullYear() : now.getFullYear() - 1;
  const fys: string[] = [];
  for (let y = cur; y >= COMPANY_START_YEAR; y--) {
    fys.push(`FY ${String(y).slice(2)}-${String(y + 1).slice(2)}`);
  }
  return fys;
}

export function getPresetRange(preset: DatePreset): DateRange {
  const now = new Date();
  switch (preset) {
    case 'today': return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': { const y = subDays(now, 1); return { from: startOfDay(y), to: endOfDay(y) }; }
    case 'this_week': return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'last_week': { const lw = subWeeks(now, 1); return { from: startOfWeek(lw, { weekStartsOn: 1 }), to: endOfWeek(lw, { weekStartsOn: 1 }) }; }
    case 'this_month': return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'last_month': { const lm = subMonths(now, 1); return { from: startOfMonth(lm), to: endOfMonth(lm) }; }
    case 'this_quarter': return { from: startOfQuarter(now), to: endOfQuarter(now) };
    case 'last_quarter': { const lq = subQuarters(now, 1); return { from: startOfQuarter(lq), to: endOfQuarter(lq) }; }
    case 'last_7_days': return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case 'last_30_days': return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case 'last_90_days': return { from: startOfDay(subDays(now, 89)), to: endOfDay(now) };
    case 'cur_fy': return getFYDates(0);
    case 'pre_fy': return getFYDates(-1);
    default: return { from: startOfDay(now), to: endOfDay(now) };
  }
}

export function crossesFYBoundary(range: DateRange): boolean {
  const fromFY = range.from.getMonth() >= FY_START_MONTH ? range.from.getFullYear() : range.from.getFullYear() - 1;
  const toFY = range.to.getMonth() >= FY_START_MONTH ? range.to.getFullYear() : range.to.getFullYear() - 1;
  return fromFY !== toFY;
}

// Format date Indian style: 06 Apr 2026
export function formatIndianDate(d: Date): string {
  return format(d, 'dd MMM yyyy');
}

// Indian number format: 1,00,000
export function formatIndianNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

// Format paise to rupees: ₹1,00,000.00
export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(rupees);
}

export interface GlobalDateRangeState {
  range: DateRange;
  preset: DatePreset;
  durationDays: number;
  fyLabel: string;
  crossesFY: boolean;
  isFuture: boolean;
  availableFYs: string[];
  selectedFY: string;
  // Phase 2 slots (state stored, UI not yet built)
  comparison: ComparisonMode;
  // Setters
  setPreset: (p: DatePreset) => void;
  setCustomRange: (from: Date, to: Date) => void;
  setSelectedFY: (fy: string) => void;
  setComparison: (m: ComparisonMode) => void; // Phase 2
}
