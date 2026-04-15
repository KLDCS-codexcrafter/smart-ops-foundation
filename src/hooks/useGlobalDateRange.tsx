/**
 * useGlobalDateRange.ts — Global date range context
 * Mirrors Tally's 'period' concept: one selection, all pages follow.
 * FY starts April (India standard). 13 presets. Persisted to localStorage.
 * Comparison mode: state stored, UI slot reserved for Phase 2 (reports).
 */
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfQuarter, endOfQuarter,
  subDays, subWeeks, subMonths, subQuarters,
  differenceInDays, format,
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
const FY_START_MONTH = parseInt(localStorage.getItem('erp_fy_start_month') ?? '3', 10);
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

function crossesFYBoundary(range: DateRange): boolean {
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

const STORAGE_KEY = 'erp-date-range';

function loadStored(): { preset: DatePreset; selectedFY: string } {
  try {
    // [JWT] GET /api/entity/storage/:key
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) { const p = JSON.parse(s); return { preset: p.preset ?? 'cur_fy', selectedFY: p.selectedFY ?? '' }; }
  } catch {}
  return { preset: 'cur_fy', selectedFY: '' };
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

const Ctx = createContext<GlobalDateRangeState | null>(null);

export function GlobalDateRangeProvider({ children }: { children: ReactNode }) {
  const stored = loadStored();
  const [preset, setPresetState] = useState<DatePreset>(stored.preset);
  const [customRange, setCustom] = useState<DateRange | null>(null);
  const [comparison, setComparison] = useState<ComparisonMode>('none');
  const availableFYs = useMemo(() => getAvailableFYs(), []);
  const [selectedFY, setSelectedFYState] = useState<string>(stored.selectedFY || availableFYs[0] || '');

  const range = useMemo(() => {
    if (preset === 'custom' && customRange) return customRange;
    return getPresetRange(preset);
  }, [preset, customRange]);

  const durationDays = useMemo(() => differenceInDays(range.to, range.from) + 1, [range]);
  const fyLabel = useMemo(() => getFYLabel(range.from), [range]);
  const crossesFY = useMemo(() => crossesFYBoundary(range), [range]);
  const isFuture = useMemo(() => range.to > new Date(), [range]);

  function save(p: DatePreset, fy: string) {
    // [JWT] POST /api/entity/storage/:key
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset: p, selectedFY: fy }));
  }

  const setPreset = useCallback((p: DatePreset) => {
    setPresetState(p); save(p, selectedFY);
  }, [selectedFY]);

  const setCustomRange = useCallback((from: Date, to: Date) => {
    setCustom({ from, to }); setPresetState('custom'); save('custom', selectedFY);
  }, [selectedFY]);

  const setSelectedFY = useCallback((fy: string) => {
    setSelectedFYState(fy);
    // Parse FY label e.g. 'FY 25-26' → set range to that FY
    const m = fy.match(/FY (\d{2})-(\d{2})/);
    if (m) {
      const sy = 2000 + parseInt(m[1]);
      setCustom({ from: new Date(sy, FY_START_MONTH, 1), to: new Date(sy + 1, FY_START_MONTH, 0) });
      setPresetState('custom');
      save('custom', fy);
    }
  }, []);

  const value: GlobalDateRangeState = {
    range, preset, durationDays, fyLabel, crossesFY, isFuture,
    availableFYs, selectedFY, comparison,
    setPreset, setCustomRange, setSelectedFY, setComparison,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGlobalDateRange(): GlobalDateRangeState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGlobalDateRange must be inside GlobalDateRangeProvider');
  return ctx;
}
