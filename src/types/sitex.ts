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

// ============================================================================
// A.15a · Imprest extended types (Q-LOCK-2a · Path B own entity)
// ============================================================================

export interface ImprestTransaction {
  id: string;
  imprest_id: string;
  site_id: string;
  txn_type: 'replenishment' | 'payment' | 'reconciliation' | 'closeout_return';
  amount: number;
  currency: string;
  fx_rate: number;
  fx_date: string;
  reference: string;
  payee_name: string | null;
  notes: string;
  posted_by: string;
  posted_at: string;
  reverses_txn_id: string | null;
}

export interface ImprestReplenishmentRequest {
  id: string;
  imprest_id: string;
  site_id: string;
  amount_requested: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'transferred';
  requested_by: string;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  bd_ledger_voucher_id: string | null;
}

export const imprestTransactionsKey = (entityCode: string): string =>
  `erp_sitex_imprest_txns_${entityCode}`;

export const imprestReplenishmentsKey = (entityCode: string): string =>
  `erp_sitex_imprest_replenishments_${entityCode}`;

// ============================================================================
// A.15a · RA Bill extended types (Q-LOCK-4a · Path B own entity)
// ============================================================================

export interface RABillLineItem {
  id: string;
  ra_bill_id: string;
  description: string;
  uom: 'nos' | 'sqm' | 'cum' | 'mt' | 'kg' | 'rmt' | 'hr' | 'day' | 'ls';
  quantity_this_period: number;
  rate_per_unit: number;
  amount: number;
  cumulative_quantity: number;
  cumulative_amount: number;
  notes: string;
}

export interface RABillApprovalHistory {
  id: string;
  ra_bill_id: string;
  action: 'submitted' | 'approved' | 'rejected' | 'paid';
  action_by: string;
  action_at: string;
  comments: string;
}

export const raBillLinesKey = (entityCode: string): string =>
  `erp_sitex_ra_bill_lines_${entityCode}`;

export const raBillApprovalsKey = (entityCode: string): string =>
  `erp_sitex_ra_bill_approvals_${entityCode}`;

// ============================================================================
// A.15a · DPR + Snag + LookAhead types (Q-LOCK-6a Master Plan §6.3 + OOB #2/#10/#19)
// ============================================================================

export interface DPR {
  id: string;
  site_id: string;
  entity_id: string;
  report_date: string;
  prepared_by: string;
  work_completed: string;
  manpower_count: number;
  equipment_count: number;
  material_consumed: { item_id: string; qty: number; uom: string }[];
  weather: 'sunny' | 'rainy' | 'cloudy' | 'extreme';
  delays: string;
  geo_validated: boolean;
  geo_lat: number;
  geo_lng: number;
  geo_distance_from_site_m: number;
  geo_accuracy_m: number;
  photo_url: string | null;
  created_at: string;
}

export interface Snag {
  id: string;
  site_id: string;
  entity_id: string;
  raised_by: string;
  raised_at: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'workmanship' | 'safety' | 'material' | 'design' | 'other';
  description: string;
  location_on_site: string;
  photo_url: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'escalated_to_ncr';
  ncr_id: string | null;
  resolved_at: string | null;
}

export interface LookAheadEntry {
  id: string;
  site_id: string;
  entry_date: string;
  planned_activities: string[];
  required_manpower: number;
  required_materials: { item_id: string; qty: number }[];
  weather_forecast: 'sunny' | 'rainy' | 'cloudy' | 'extreme';
  weather_impact_risk: 'low' | 'medium' | 'high';
  notes: string;
}

export const dprsKey = (entityCode: string): string => `erp_sitex_dprs_${entityCode}`;
export const snagsKey = (entityCode: string): string => `erp_sitex_snags_${entityCode}`;
export const lookAheadKey = (entityCode: string): string => `erp_sitex_lookahead_${entityCode}`;

// ============================================================================
// A.15a · Bridge event payloads (Q-LOCK-15a · 3 closeout bridges + Snag-to-NCR OOB #10)
// ============================================================================

export interface CommissioningHandoffEvent {
  type: 'sitex.commissioning.handoff';
  site_id: string;
  entity_id: string;
  customer_id: string | null;
  commissioning_report_doc_id: string | null;
  amc_start_date: string;
  amc_duration_months: number;
  timestamp: string;
}

export interface MaintainProHandoffEvent {
  type: 'sitex.maintainpro.handoff';
  site_id: string;
  entity_id: string;
  equipment_list: { description: string; serial_no: string; capitalized_value: number }[];
  timestamp: string;
}

export interface AssetCapitalizationEvent {
  type: 'sitex.asset.capitalization';
  site_id: string;
  entity_id: string;
  total_capitalized_value: number;
  cwip_voucher_id: string | null;
  fixed_asset_voucher_id: string | null;
  timestamp: string;
}

export interface SnagRaisedEvent {
  type: 'sitex.snag.raised.severe';
  snag_id: string;
  site_id: string;
  entity_id: string;
  severity: 'medium' | 'high' | 'critical';
  category: Snag['category'];
  description: string;
  timestamp: string;
}

// ============================================================================
// A.15b · Mobile capture types (DPR · SafetyIncident · MaterialIssue)
// ============================================================================

export interface DPR {
  id: string;
  site_id: string;
  entity_id: string;
  report_date: string;
  work_completed: string;
  manpower_count: number;
  equipment_used: string;
  material_consumed: string;
  weather: 'sunny' | 'rainy' | 'cloudy' | 'extreme';
  delays: string;
  photo_url: string | null;
  photo_geo_lat: number | null;
  photo_geo_lng: number | null;
  geo_fence_passed: boolean;
  created_by: string;
  created_at: string;
}

export interface SafetyIncident {
  id: string;
  site_id: string;
  entity_id: string;
  incident_type: 'near_miss' | 'minor_injury' | 'medical_treatment' | 'lost_time' | 'fatal' | 'property_damage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location_on_site: string;
  photo_url: string | null;
  reported_by: string;
  occurred_at: string;
  ncr_id: string | null;
  created_at: string;
}

export interface SiteMaterialIssue {
  id: string;
  site_id: string;
  entity_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  issued_to: string;
  purpose: string;
  photo_url: string | null;
  issued_by: string;
  issued_at: string;
  created_at: string;
}

export const sitexDprsKey = (entityCode: string): string => `erp_sitex_dpr_captures_${entityCode}`;
export const sitexSafetyIncidentsKey = (entityCode: string): string => `erp_sitex_safety_incidents_${entityCode}`;
export const sitexMaterialIssuesKey = (entityCode: string): string => `erp_sitex_material_issues_${entityCode}`;

export interface SafetyIncidentEscalationEvent {
  type: 'sitex.safety.incident.escalate';
  incident_id: string;
  site_id: string;
  entity_id: string;
  severity: 'high' | 'critical';
  incident_type: SafetyIncident['incident_type'];
  reported_by: string;
  occurred_at: string;
  timestamp: string;
}
