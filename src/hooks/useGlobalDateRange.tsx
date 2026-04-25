/**
 * useGlobalDateRange.tsx — Global date range context
 * Mirrors Tally's 'period' concept: one selection, all pages follow.
 * FY starts April (India standard). 13 presets. Persisted to localStorage.
 * Comparison mode: state stored, UI slot reserved for Phase 2 (reports).
 *
 * Types/constants/helpers live in `useGlobalDateRange.types.ts` (D-139 split
 * for HMR fast-refresh). Re-exported below for backward-compat.
 */
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { differenceInDays } from 'date-fns';
import {
  FY_START_MONTH,
  getAvailableFYs,
  getFYLabel,
  getPresetRange,
  crossesFYBoundary,
  type DatePreset,
  type ComparisonMode,
  type DateRange,
  type GlobalDateRangeState,
} from './useGlobalDateRange.types';

const STORAGE_KEY = 'erp-date-range';

function loadStored(): { preset: DatePreset; selectedFY: string } {
  try {
    // [JWT] GET /api/entity/storage/:key
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) { const p = JSON.parse(s); return { preset: p.preset ?? 'cur_fy', selectedFY: p.selectedFY ?? '' }; }
  } catch { /* ignore */ }
  return { preset: 'cur_fy', selectedFY: '' };
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
