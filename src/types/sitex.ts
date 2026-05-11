/**
 * @file        src/types/sitex.ts
 * @purpose     SiteX canonical types · Site Master + lifecycle state machine + linkage slots · Path B own entity (NOT FR-73 consumer)
 * @who         Site Manager · Site Engineer · Project Manager · Finance (CAPEX mode) · Operations Lead
 * @when        2026-05-11
 * @sprint      T-Phase-1.A.14 SiteX Foundation · Block A.1 · NEW canonical · FOUNDATION sprint
 * @iso         ISO 9001:2015 §8.1 · ISO 45001:2018 · ISO 25010 Maintainability
 * @whom        Audit Owner
 * @decisions   D-NEW-CU POSSIBLE (Site=Branch lifecycle · 18th canonical) · D-NEW-CT 17th canonical · D-194 localStorage
 * @disciplines FR-1 · FR-19 · FR-22 · FR-24 · FR-30 · FR-44 · FR-50 · FR-51 · FR-58 · FR-67 · FR-73.1 absolute
 * @reuses      CardId from @/types/card-entitlement
 * @[JWT]       GET /api/sitex/sites/:id · POST /api/sitex/sites · PATCH /api/sitex/sites/:id/transition · GET /api/sitex/sites/:id/branch-status
 */

import type { CardId } from './card-entitlement';

// Re-export CardId so consumers can import from a single sibling if needed (zero-cost type-only re-export)
export type { CardId };

// ============================================================================
// SiteMode · 3 architectural modes
// ============================================================================

export type SiteMode = 'install_commission' | 'construction' | 'capex_internal';

// ============================================================================
// SiteStatus · 5-state machine (Q-LOCK-3a)
// ============================================================================

export type SiteStatus = 'planned' | 'mobilizing' | 'active' | 'demobilizing' | 'closed';

// ============================================================================
// SiteMaster · Path B own entity
// ============================================================================

export interface SiteMaster {
  id: string;
  entity_id: string;
  branch_id: string;
  site_code: string;
  site_name: string;

  site_mode: SiteMode;
  site_type: 'turnkey' | 'epc' | 'erection' | 'service_call' | 'capex_expansion' | 'capex_renovation';

  status: SiteStatus;
  mobilization_date: string | null;
  mobilization_actual: string | null;
  planned_demobilization: string | null;
  actual_demobilization: string | null;

  project_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  source_quotation_id: string | null;
  source_so_id: string | null;

  location: SiteLocation;

  site_manager_id: string;
  safety_officer_id: string | null;
  qc_in_charge_id: string | null;

  contract_value: number;
  approved_budget: number;
  imprest_limit: number;
  billed_to_date: number;
  cost_to_date: number;
  margin_pct: number;

  linked_drawing_ids: string[];
  linked_boq_id: string | null;

  originating_department_id: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SiteLocation
// ============================================================================

export interface SiteLocation {
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  district: string | null;
  pincode: string;
  geo_lat: number;
  geo_lng: number;
  geo_radius_meters: number;
}

// ============================================================================
// SiteTransition state machine helper (Q-LOCK-3a)
// ============================================================================

export interface SiteTransitionResult {
  allowed: boolean;
  to_state: SiteStatus;
  reason: string | null;
  missing_prerequisites: string[];
}

// ============================================================================
// BOQ stub (Q-LOCK-7a scaffold)
// ============================================================================

export interface BOQ {
  id: string;
  site_id: string;
  entity_id: string;
  boq_no: string;
  total_value: number;
  line_count: number;
  status: 'draft' | 'approved' | 'measuring' | 'final_measured' | 'closed';
  created_at: string;
}

// ============================================================================
// RA Bill stub (Q-LOCK-6.B DEFERRED to A.15)
// ============================================================================

export interface SiteRABill {
  id: string;
  site_id: string;
  vendor_id: string;
  bill_no: string;
  period_from: string;
  period_to: string;
  total_value: number;
  status: 'draft' | 'submitted' | 'approved' | 'paid';
  created_at: string;
}

// ============================================================================
// SiteImprest stub (Q-LOCK-5a)
// ============================================================================

export interface SiteImprest {
  id: string;
  site_id: string;
  branch_id: string;
  current_balance: number;
  imprest_limit: number;
  last_replenishment_date: string | null;
  created_at: string;
}

// ============================================================================
// Bridge event payloads
// ============================================================================

export interface SiteMobilizedEvent {
  type: 'site.mobilized';
  site_id: string;
  entity_id: string;
  site_code: string;
  site_name: string;
  site_mode: SiteMode;
  mobilization_actual: string;
  location: SiteLocation;
  timestamp: string;
}

// ============================================================================
// Storage keys (D-194 entity-prefixed)
// ============================================================================

export const siteMastersKey = (entityCode: string): string =>
  `erp_sitex_sites_${entityCode}`;

export const siteBoqsKey = (entityCode: string): string =>
  `erp_sitex_boqs_${entityCode}`;

export const siteRaBillsKey = (entityCode: string): string =>
  `erp_sitex_ra_bills_${entityCode}`;

export const siteImprestsKey = (entityCode: string): string =>
  `erp_sitex_imprests_${entityCode}`;
