/**
 * @file        src/types/customs-tariff-head.ts
 * @purpose     Customs Tariff Head (CTH) master · 8-digit ITC(HS) · parent-child with HSN 6-digit
 * @sprint      T-Phase-1.EX-2-CTH-Country-Date-Master
 * @decisions   EX-2-Q1=b FULL 8-digit · EX-2-Q2=c parent-child via chapter_heading FK
 * @disciplines FR-30 · FR-50 · FR-58
 */

export interface CustomsTariffHead {
  cth_code: string;
  chapter_heading: string;
  description: string;
  unit_of_measure: string;
  is_restricted: boolean;
  notification_ref: string;
  effective_from: string;
  effective_until: string | null;
  status: CTHStatus;
  created_at: string;
  updated_at: string;
  refresh_date: string;
  refresh_checksum: string;
}

export type CTHStatus = 'active' | 'superseded' | 'withdrawn';

export interface CTHRefreshEvent {
  refresh_date: string;
  source: 'DGFT' | 'CBIC' | 'manual';
  notification_ref: string;
  codes_changed: number;
  checksum: string;
}
