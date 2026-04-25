/**
 * @file     GlobalDateRangeContext.ts
 * @purpose  React context + consumer hook for GlobalDateRangeProvider, extracted
 *           from useGlobalDateRange.tsx so the component file only exports
 *           components (react-refresh/only-export-components).
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Cleanup-1c-a
 * @iso      Maintainability (HIGH+ component file scope cleaned)
 *           Performance (HIGH+ HMR fast-refresh works correctly)
 * @whom     useGlobalDateRange.tsx · ERPDatePicker · ERPHeader · all date-range consumers
 * @depends  react · ./useGlobalDateRange.types
 */
import { createContext, useContext } from 'react';
import type { GlobalDateRangeState } from './useGlobalDateRange.types';

export const GlobalDateRangeContext = createContext<GlobalDateRangeState | null>(null);

export function useGlobalDateRange(): GlobalDateRangeState {
  const ctx = useContext(GlobalDateRangeContext);
  if (!ctx) throw new Error('useGlobalDateRange must be inside GlobalDateRangeProvider');
  return ctx;
}
