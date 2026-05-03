/**
 * @file        vendor-portal.ts
 * @sprint      T-Phase-1.2.6f-b-1 · Block A.1
 * @purpose     Vendor Portal session + activity types · separate scope from internal ERP auth.
 *              Hybrid pattern per D-265: logistic-portal type shape + distributor-auth scope-query.
 * @decisions   D-255 (token-only first quote · credentials after) · D-272 · D-273
 * @disciplines SD-15 (Multi-Entity 6-point) · D-249 (VendorMaster zero-touch via sibling)
 * @[JWT]       GET/POST /api/vendor/portal/auth/*
 */

export const VENDOR_SESSION_KEY = 'erp_vendor_portal_session';
export const VENDOR_TOKEN_KEY = 'erp_vendor_portal_token';

export interface VendorPortalSession {
  vendor_id: string;             // FK → Party.id where party_type='vendor' or 'both'
  party_code: string;            // display
  party_name: string;
  entity_code: string;           // multi-entity per FR-50
  token: string;                 // mock JWT (Phase 1)
  issued_at: string;
  expires_at: string;
  must_change_password: boolean; // D-255 · true on first session · false after credentials set
  is_token_only: boolean;        // D-255 · true = token URL access · false = credentials login
}

export type VendorActivityKind =
  | 'token_landing'
  | 'login'
  | 'logout'
  | 'password_set'
  | 'password_change'
  | 'rfq_view'
  | 'quotation_submit'
  | 'quotation_draft_save'
  | 'profile_view'
  | 'commlog_view';

export interface VendorActivity {
  id: string;
  vendor_id: string;
  entity_code: string;
  kind: VendorActivityKind;
  ref_type?: 'rfq' | 'quotation' | 'profile' | 'commlog';
  ref_id?: string;
  ref_label?: string;
  notes?: string;
  at: string;
  ip?: string;
}

export const vendorActivityKey = (e: string): string => `erp_vendor_activity_${e}`;

/** Per-vendor password key. D-273 prefix. */
export const vendorPasswordKey = (entityCode: string, vendorId: string): string =>
  `erp_vendor_portal_password_${entityCode}_${vendorId}`;

/** Default credentials per D-275. */
export const DEFAULT_TEMP_PASSWORD = 'Welcome@123';
export const PASSWORD_MIN_LENGTH = 8;
export const SESSION_HOURS = 8;
