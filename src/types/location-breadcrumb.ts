/**
 * location-breadcrumb.ts — Per-minute GPS log for live tracking
 * Sprint T-Phase-1.1.1l-c · APPEND-ONLY · No PUT
 * [JWT] GET /api/salesx/location-breadcrumbs?entityCode={e}&userId={u}&from={iso}
 * [JWT] POST /api/salesx/location-breadcrumbs
 */

export interface LocationBreadcrumb {
  id: string;
  entity_id: string;
  user_id: string;
  user_name: string;
  user_role: 'salesman' | 'telecaller' | 'supervisor' | 'sales_manager';
  captured_at: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  battery_pct: number | null;
  is_charging: boolean | null;
  online: boolean;
  created_at: string;
}

export const locationBreadcrumbsKey = (e: string) => `erp_location_breadcrumbs_${e}`;

export const MAX_BREADCRUMBS_PER_USER_DAY = 600;
export const DEFAULT_CAPTURE_INTERVAL_SECS = 60;
export const HALT_RADIUS_METERS = 50;
export const HALT_MIN_CONSECUTIVE = 3;
export const LOW_BATTERY_PCT = 15;
export const OFFLINE_TOO_LONG_MINUTES = 10;
