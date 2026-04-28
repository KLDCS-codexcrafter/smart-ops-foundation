/**
 * visit-log.ts — Salesman visit log
 * Sprint 7. APPEND-ONLY. Each check-in = one immutable row.
 * Supervisor-approved corrections are a future sprint.
 * [JWT] GET/POST /api/salesx/visit-logs (POST only; no PUT)
 */

export type VisitOutcome =
  | 'order_captured'
  | 'follow_up_scheduled'
  | 'sample_given'
  | 'customer_not_available'
  | 'shop_closed'
  | 'no_requirement'
  | 'complaint_registered'
  | 'other';

export type VisitPurpose =
  | 'regular_visit' | 'new_enquiry' | 'follow_up'
  | 'collection' | 'complaint_resolution' | 'product_demo' | 'scheme_briefing';

export interface GeoPoint {
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
}

export interface VisitLog {
  id: string;
  entity_id: string;

  // Who / where / when
  salesman_id: string;
  salesman_name: string;
  customer_id: string;
  customer_name: string;
  beat_id: string | null;

  // Timestamps + location
  check_in_time: string;            // ISO
  check_in_geo: GeoPoint;
  check_out_time: string | null;
  check_out_geo: GeoPoint | null;

  // Distance check result
  customer_geo: GeoPoint | null;
  distance_from_customer_meters: number | null;
  within_radius: boolean;

  // Outcome
  purpose: VisitPurpose;
  outcome: VisitOutcome;
  notes: string;

  // Follow-up
  order_captured_value: number;     // INR, 0 if none
  order_voucher_id: string | null;
  next_visit_date: string | null;

  // Attachments
  photo_urls: string[];
  // Customer signature (data URL of canvas, captured at check-out)
  signature_data_url: string | null;
  signature_captured_at: string | null;

  created_at: string;
  // NO updated_at — append-only
}

export const visitLogsKey = (e: string) => `erp_visit_logs_${e}`;

export const VISIT_OUTCOME_LABELS: Record<VisitOutcome, string> = {
  order_captured: 'Order Captured',
  follow_up_scheduled: 'Follow-up Scheduled',
  sample_given: 'Sample Given',
  customer_not_available: 'Customer Not Available',
  shop_closed: 'Shop Closed',
  no_requirement: 'No Requirement',
  complaint_registered: 'Complaint Registered',
  other: 'Other',
};

export const VISIT_PURPOSE_LABELS: Record<VisitPurpose, string> = {
  regular_visit: 'Regular Visit',
  new_enquiry: 'New Enquiry',
  follow_up: 'Follow-up',
  collection: 'Collection',
  complaint_resolution: 'Complaint Resolution',
  product_demo: 'Product Demo',
  scheme_briefing: 'Scheme Briefing',
};

/** Default radius threshold (metres). Overridable via SAM config later. */
export const DEFAULT_CHECK_IN_RADIUS_METERS = 500;
