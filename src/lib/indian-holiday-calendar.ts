/**
 * @file        src/lib/indian-holiday-calendar.ts
 * @purpose     Indian holiday calendar utility · consumed by demand-forecast-engine for seasonality adjustment
 * @sprint      T-Phase-3.PROD-4 · PASS 1 · ST2 · supporting utility (NOT a SIBLING)
 * @disciplines NOT FR-19 SIBLING · institutional utility · static reference data
 * @reuses      types/forecast.ts (HolidayEntry interface)
 */

import type { HolidayEntry } from '@/types/forecast';

export const INDIAN_HOLIDAYS_2025_2027: HolidayEntry[] = [
  // 2025 National
  { date: '2025-01-26', name: 'Republic Day', scope: 'national', demand_multiplier: 1.0 },
  { date: '2025-03-14', name: 'Holi', scope: 'national', demand_multiplier: 1.3,
    category_overrides: { 'FMCG-snacks': 1.6, 'FMCG-sweets': 1.8 } },
  { date: '2025-03-31', name: 'Eid-ul-Fitr', scope: 'national', demand_multiplier: 1.4 },
  { date: '2025-04-18', name: 'Good Friday', scope: 'national', demand_multiplier: 1.0 },
  { date: '2025-08-15', name: 'Independence Day', scope: 'national', demand_multiplier: 1.0 },
  { date: '2025-08-27', name: 'Ganesh Chaturthi', scope: 'national', demand_multiplier: 1.3 },
  { date: '2025-10-02', name: 'Gandhi Jayanti', scope: 'national', demand_multiplier: 1.0 },
  { date: '2025-10-20', name: 'Diwali (Lakshmi Puja)', scope: 'national', demand_multiplier: 1.8,
    category_overrides: { 'FMCG-sweets': 2.4, 'FMCG-snacks': 1.9, 'Electronics-consumer': 1.6, 'Apparel': 1.5 } },
  { date: '2025-12-25', name: 'Christmas', scope: 'national', demand_multiplier: 1.2 },

  // 2026 National
  { date: '2026-01-26', name: 'Republic Day', scope: 'national', demand_multiplier: 1.0 },
  { date: '2026-03-04', name: 'Holi', scope: 'national', demand_multiplier: 1.3,
    category_overrides: { 'FMCG-snacks': 1.6, 'FMCG-sweets': 1.8 } },
  { date: '2026-03-20', name: 'Eid-ul-Fitr', scope: 'national', demand_multiplier: 1.4 },
  { date: '2026-04-03', name: 'Good Friday', scope: 'national', demand_multiplier: 1.0 },
  { date: '2026-08-15', name: 'Independence Day', scope: 'national', demand_multiplier: 1.0 },
  { date: '2026-09-15', name: 'Ganesh Chaturthi', scope: 'national', demand_multiplier: 1.3 },
  { date: '2026-10-02', name: 'Gandhi Jayanti', scope: 'national', demand_multiplier: 1.0 },
  { date: '2026-11-08', name: 'Diwali (Lakshmi Puja)', scope: 'national', demand_multiplier: 1.8,
    category_overrides: { 'FMCG-sweets': 2.4, 'FMCG-snacks': 1.9, 'Electronics-consumer': 1.6, 'Apparel': 1.5 } },
  { date: '2026-12-25', name: 'Christmas', scope: 'national', demand_multiplier: 1.2 },

  // 2027 National (forward)
  { date: '2027-01-26', name: 'Republic Day', scope: 'national', demand_multiplier: 1.0 },
  { date: '2027-03-22', name: 'Holi', scope: 'national', demand_multiplier: 1.3,
    category_overrides: { 'FMCG-snacks': 1.6, 'FMCG-sweets': 1.8 } },
  { date: '2027-03-10', name: 'Eid-ul-Fitr', scope: 'national', demand_multiplier: 1.4 },
  { date: '2027-08-15', name: 'Independence Day', scope: 'national', demand_multiplier: 1.0 },
  { date: '2027-10-28', name: 'Diwali (Lakshmi Puja)', scope: 'national', demand_multiplier: 1.8,
    category_overrides: { 'FMCG-sweets': 2.4, 'FMCG-snacks': 1.9, 'Electronics-consumer': 1.6, 'Apparel': 1.5 } },
  { date: '2027-12-25', name: 'Christmas', scope: 'national', demand_multiplier: 1.2 },
];

/**
 * Returns holidays falling within the given date range (inclusive both ends).
 */
export function getHolidaysInRange(startDate: string, endDate: string): HolidayEntry[] {
  return INDIAN_HOLIDAYS_2025_2027.filter(h => h.date >= startDate && h.date <= endDate);
}

/**
 * Returns the demand multiplier for a specific date. Returns 1.0 if no holiday.
 * If `itemCategory` is provided and the holiday has a category override, that takes precedence.
 */
export function getDemandMultiplier(date: string, itemCategory?: string): number {
  const holiday = INDIAN_HOLIDAYS_2025_2027.find(h => h.date === date);
  if (!holiday) return 1.0;
  if (itemCategory && holiday.category_overrides?.[itemCategory]) {
    return holiday.category_overrides[itemCategory];
  }
  return holiday.demand_multiplier;
}

/**
 * Returns true if the given date falls on any holiday in the calendar.
 */
export function isHoliday(date: string): boolean {
  return INDIAN_HOLIDAYS_2025_2027.some(h => h.date === date);
}
