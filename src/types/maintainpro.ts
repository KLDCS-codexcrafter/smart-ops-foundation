/**
 * @file        src/types/maintainpro.ts
 * @purpose     MaintainPro Foundation types · 6 masters (Equipment 35 fields · Spare Parts replica · Calibration TDL 9 fields · Fire Safety TDL 5 fields × 6 types · PM Schedule Template 4-axis · Maintenance Vendor CC replica) · ProjX deep integration (linked_project_id) · cross-card hookpoints · Path B own entity · FR-73.1 absolute
 * @who         Maintenance Manager · Technician · Safety Officer · QC Inspector · Plant Head
 * @when        2026-05-12
 * @sprint      T-Phase-1.A.16a · Block A
 * @iso         ISO 55000 · ISO 9001:2015 §7.1.5 · Indian Factory Act §38A
 * @whom        Audit Owner
 * @decisions   D-NEW-CW Path B 6th consumer · D-NEW-DA Asset Genealogy POSSIBLE 24th · D-194 Phase 1 localStorage · FR-50 Multi-Entity · FR-42 TDL · FR-54 SSOT
 * @disciplines FR-1 · FR-12 CC SSOT · FR-13 replica render · FR-22 type · FR-30 · FR-42 · FR-54 · FR-58 · FR-73.1
 * @reuses      CardId 'maintainpro' · CC VendorMaster (filtered vendor_type='service_provider' per FR-54 SSOT discipline) · InventoryHub stockitems (filtered stock_group='Maintenance Spares')
 * @[JWT]       Phase 2 backend: /api/maintainpro/equipment · /api/maintainpro/calibration · /api/maintainpro/firesafety · /api/maintainpro/pm-templates
 */

// ============================================================================
// MASTER 1 · EQUIPMENT (~35 fields · TDL 8 + 27 industry-standard · ProjX deep)
// ============================================================================

export type EquipmentClass = 'machine' | 'meter' | 'tool' | 'vehicle' | 'asset';

export type EquipmentCategory =
  | 'electrical'
  | 'mechanical'
  | 'pneumatic'
  | 'hydraulic'
  | 'instrumentation'
  | 'utilities'
  | 'production'
  | 'material_handling'
  | 'safety'
  | 'other';

export type EquipmentOperationalStatus =
  | 'running'
  | 'idle'
  | 'under_maintenance'
  | 'breakdown'
  | 'decommissioned';

export type EquipmentMeterUnit = 'hours' | 'cycles' | 'units' | 'km' | null;

export interface Equipment {
  // Identity
  id: string;
  entity_id: string;
  equipment_code: string;
  equipment_name: string;
  equipment_class: EquipmentClass;
  category: EquipmentCategory;

  // Identification (TDL inheritance)
  make: string;
  model: string;
  year_of_mfg: number;
  serial_no: string;

  // Location (TDL inheritance + extension)
  location: string;
  floor: string;
  range_or_capacity: string;
  current_location: string;

  // Cross-card hookpoints (Q-LOCK-7 ProjX deep wiring)
  linked_site_id: string | null;
  linked_project_id: string | null;
  linked_drawing_id: string | null;
  linked_bom_id: string | null;
  custodian_user_id: string | null;
  parent_equipment_id: string | null; // OOB-M11 genealogy

  // Financial (FR-39 §C)
  purchase_cost: number;
  installation_date: string;
  warranty_start: string;
  warranty_end: string;
  amc_vendor_id: string | null;
  amc_contract_start: string | null;
  amc_contract_end: string | null;
  amc_contract_value: number | null;

  // Operational state
  operational_status: EquipmentOperationalStatus;
  meter_reading: number | null;
  meter_unit: EquipmentMeterUnit;
  meter_last_updated: string | null;

  // Maintenance metadata (denormalized)
  pm_schedule_template_id: string | null;
  last_breakdown_date: string | null;
  last_pm_date: string | null;
  next_pm_due_date: string | null;
  breakdown_count_12m: number;
  uptime_pct_12m: number;
  total_breakdown_minutes_12m: number;

  // Calibration linkage
  calibration_instrument_id: string | null;

  // ESG (OOB-M12)
  kw_rating: number | null;

  // Standard
  status: 'active' | 'inactive';
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const equipmentKey = (entityCode: string): string =>
  `erp_maintainpro_equipment_${entityCode}`;

// ============================================================================
// MASTER 2 · SPARE PARTS (replica view of InventoryHub · FR-13)
// ============================================================================

export interface SparePartView {
  stockitem_id: string;
  stockitem_code: string;
  stockitem_name: string;
  stock_group: string; // MUST be 'Maintenance Spares' filter
  uom: string;
  reorder_level: number;
  reorder_qty: number;
  current_stock: number;
  avg_consumption_per_month: number;
  primary_equipment_ids: string[];
  total_issued_12m: number;
  last_issued_date: string | null;
}

// ============================================================================
// MASTER 3 · CALIBRATION INSTRUMENTS (TDL EXACT 9 fields · FR-42)
// ============================================================================

export type CalibrationStatus = 'active' | 'overdue' | 'quarantined' | 'decommissioned';
export type CalibrationFrequencyUnit = 'days' | 'months' | 'years';

export interface CalibrationInstrument {
  id: string;
  entity_id: string;
  instrument_code: string;

  // TDL EXACT 9 fields
  test_equipment: string;
  calibrated_from: string;
  range: string;
  least_count: string;
  accuracy: string;
  calibration_frequency: string;
  method: string;
  calibrated_on: string;
  due_date: string;

  // Operix extensions
  status: CalibrationStatus;
  linked_equipment_id: string | null;
  certificate_url: string | null;
  next_calibration_vendor_id: string | null;

  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const calibrationInstrumentKey = (entityCode: string): string =>
  `erp_maintainpro_calibration_${entityCode}`;

// ============================================================================
// MASTER 4 · FIRE SAFETY (TDL 5 fields × 6 types · Indian Factory Act §38A)
// ============================================================================

export type FireSafetyType =
  | 'fire_extinguisher'
  | 'fire_hydrant'
  | 'smoke_detector'
  | 'emergency_light'
  | 'first_aid_box'
  | 'eye_wash_station';

export type FireSafetyStatus = 'active' | 'expired' | 'quarantined' | 'decommissioned';

export interface FireSafetyEquipment {
  id: string;
  entity_id: string;
  equipment_code: string;
  type: FireSafetyType;

  // TDL inheritance (5 fields)
  location: string;
  floor: string;
  capacity: string;
  installation_date: string;
  expiry_date: string;

  // Operix extensions (OOB-M6 cascade)
  status: FireSafetyStatus;
  refilling_vendor_id: string | null;
  last_inspection_date: string | null;
  next_inspection_date: string | null;
  linked_site_id: string | null;

  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const fireSafetyEquipmentKey = (entityCode: string): string =>
  `erp_maintainpro_firesafety_${entityCode}`;

// ============================================================================
// MASTER 5 · PM SCHEDULE TEMPLATE (OOB-M10 4-axis)
// ============================================================================

export type PMTriggerAxis = 'calendar' | 'meter' | 'usage' | 'season';

export interface PMScheduleTemplateAxis {
  axis: PMTriggerAxis;
  calendar_interval_value?: number;
  calendar_interval_unit?: CalibrationFrequencyUnit;
  meter_interval_value?: number;
  meter_unit?: EquipmentMeterUnit;
  usage_threshold?: number;
  season_multipliers?: { monsoon?: number; summer?: number; winter?: number };
}

export interface PMScheduleTemplateActivity {
  activity_code: string;
  description: string;
  estimated_minutes: number;
  required_spare_ids: string[];
  required_skills: string[];
}

export interface PMScheduleTemplate {
  id: string;
  entity_id: string;
  template_code: string;
  template_name: string;
  description: string;
  applies_to_categories: EquipmentCategory[];
  axes: PMScheduleTemplateAxis[];
  activities: PMScheduleTemplateActivity[];
  status: 'active' | 'inactive';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const pmScheduleTemplateKey = (entityCode: string): string =>
  `erp_maintainpro_pm_template_${entityCode}`;

// ============================================================================
// MASTER 6 · MAINTENANCE VENDOR (CC VendorMaster replica · FR-54 SSOT)
// vendor_type='service_provider' filter per founder May 12 directive
// ============================================================================

export interface MaintenanceVendorView {
  vendor_id: string;
  vendor_code: string;
  vendor_name: string;
  vendor_type: 'service_provider';
  ledger_group: 'sundry_creditor';
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  is_active: boolean;
  total_amc_jobs_completed: number;
  avg_response_time_hours: number;
  on_time_completion_pct: number;
  last_engaged_date: string | null;
}

// ============================================================================
// === A.16b · 9 TRANSACTIONS · APPENDED ===
// (Master types above ABSOLUTE preserved · NOT modified)
// ============================================================================

// --- TRANSACTION 1 · BREAKDOWN REPORT ---
export interface BreakdownReport {
  id: string;
  entity_id: string;
  breakdown_no: string;
  equipment_id: string;
  reported_by_user_id: string;
  originating_department_id: string;
  occurred_at: string;
  reported_at: string;
  resolved_at: string | null;
  downtime_minutes: number;
  nature_of_complaint: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  similar_breakdowns_last_12m_count: number;
  similar_breakdowns_pattern_detected: string | null;
  is_equipment_in_warranty: boolean;
  warranty_claim_recommended: boolean;
  warranty_contact: string | null;
  corrective_action: string;
  attended_by_user_id: string | null;
  remarks: string;
  triggered_work_order_id: string | null;
  project_id: string | null;
  status: 'open' | 'work_order_created' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
}
export const breakdownReportKey = (entityCode: string): string =>
  `erp_maintainpro_breakdown_${entityCode}`;

// --- TRANSACTION 2 · WORK ORDER ---
export type WorkOrderType = 'breakdown' | 'pm_scheduled' | 'pm_overdue' | 'inspection' | 'safety';
export type WorkOrderStatus = 'draft' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';

export interface WorkOrder {
  id: string;
  entity_id: string;
  wo_no: string;
  wo_type: WorkOrderType;
  source_breakdown_id: string | null;
  source_pm_schedule_id: string | null;
  equipment_id: string;
  assigned_to_user_id: string | null;
  assigned_at: string | null;
  estimated_minutes: number;
  actual_minutes: number | null;
  status: WorkOrderStatus;
  started_at: string | null;
  paused_at: string | null;
  resumed_at: string | null;
  completed_at: string | null;
  activities_planned: Array<{ activity_code: string; description: string; estimated_minutes: number; completed: boolean }>;
  parts_used: Array<{ spare_id: string; qty: number; issue_id: string | null }>;
  completion_notes: string;
  followup_required: boolean;
  project_id: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}
export const workOrderKey = (entityCode: string): string =>
  `erp_maintainpro_work_order_${entityCode}`;

// --- TRANSACTION 3 · PM TICK-OFF ---
export interface PMTickoff {
  id: string;
  entity_id: string;
  pm_no: string;
  pm_schedule_template_id: string;
  equipment_id: string;
  scheduled_date: string;
  actual_completion_date: string;
  performed_by_user_id: string;
  duration_minutes: number;
  activities_completed: Array<{ activity_code: string; description: string; completed: boolean; notes: string; issues_found: boolean; issue_details: string }>;
  parts_used: Array<{ spare_id: string; qty: number }>;
  next_due_date: string | null;
  status: 'in_progress' | 'completed' | 'aborted';
  project_id: string | null;
  created_at: string;
  updated_at: string;
}
export const pmTickoffKey = (entityCode: string): string =>
  `erp_maintainpro_pm_tickoff_${entityCode}`;

// --- TRANSACTION 4 · SPARES ISSUE ---
export interface SparesIssue {
  id: string;
  entity_id: string;
  issue_no: string;
  spare_id: string;
  qty: number;
  consuming_equipment_id: string;
  consuming_work_order_id: string | null;
  consuming_breakdown_id: string | null;
  issued_to_user_id: string;
  current_velocity: number;
  historical_median_velocity: number;
  velocity_spike_detected: boolean;
  reorder_alert_emitted: boolean;
  unit_cost: number;
  total_cost: number;
  fincore_voucher_id: string | null;
  project_id: string | null;
  issued_at: string;
  created_at: string;
}
export const sparesIssueKey = (entityCode: string): string =>
  `erp_maintainpro_spares_issue_${entityCode}`;

// --- TRANSACTION 5 · EQUIPMENT MOVEMENT ---
export interface EquipmentMovement {
  id: string;
  entity_id: string;
  movement_no: string;
  equipment_id: string;
  source_location: string;
  source_site_id: string | null;
  destination_location: string;
  destination_site_id: string | null;
  movement_reason: 'deploy_to_site' | 'return_to_base' | 'inter_site_transfer' | 'decommission' | 'maintenance_workshop';
  movement_date: string;
  transport_vehicle: string;
  transport_cost: number;
  authorized_by_user_id: string;
  project_id: string | null;
  created_at: string;
}
export const equipmentMovementKey = (entityCode: string): string =>
  `erp_maintainpro_movement_${entityCode}`;

// --- TRANSACTION 6 · CALIBRATION CERTIFICATE ---
export interface CalibrationCertificate {
  id: string;
  entity_id: string;
  certificate_no: string;
  instrument_id: string;
  calibrated_on: string;
  next_due_date: string;
  calibrated_by_vendor_id: string | null;
  calibrated_by_user_id: string | null;
  pre_calibration_drift: string;
  post_calibration_accuracy: string;
  certificate_url: string | null;
  is_pass: boolean;
  cost: number;
  fincore_voucher_id: string | null;
  project_id: string | null;
  created_at: string;
}
export const calibrationCertificateKey = (entityCode: string): string =>
  `erp_maintainpro_cal_cert_${entityCode}`;

// --- TRANSACTION 7 · AMC OUT-TO-VENDOR ---
export type AMCOutStatus = 'sent' | 'in_progress_at_vendor' | 'returned' | 'cancelled';
export type AMCOutStockState = 'maintenance_inventory' | 'wip_at_vendor';

export interface AMCOutToVendor {
  id: string;
  entity_id: string;
  rma_no: string;
  equipment_id: string;
  parts_sent: Array<{ spare_id: string | null; serial_no: string; description: string; qty: number }>;
  vendor_id: string;
  vendor_rma_no: string | null;
  sent_date: string;
  expected_return_date: string;
  actual_return_date: string | null;
  status: AMCOutStatus;
  stock_state: AMCOutStockState;
  reminder_50pct_sent: boolean;
  reminder_75pct_sent: boolean;
  reminder_overdue_sent: boolean;
  estimated_cost: number;
  actual_cost: number | null;
  is_under_warranty: boolean;
  fincore_voucher_id: string | null;
  project_id: string | null;
  triggered_by_work_order_id: string | null;
  originating_department_id: 'maintenance';
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}
export const amcOutToVendorKey = (entityCode: string): string =>
  `erp_maintainpro_amc_out_${entityCode}`;

// --- TRANSACTION 8 · INTERNAL MAINTENANCE TICKET (FULL SLA) ---
export type TicketCategory = 'electrical' | 'mechanical' | 'pneumatic' | 'hydraulic' | 'safety' | 'calibration' | 'housekeeping';
export type TicketSeverity = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed' | 'reopened';
export type EscalationLevel = 0 | 1 | 2 | 3;

export interface InternalMaintenanceTicket {
  id: string;
  entity_id: string;
  ticket_no: string;
  originating_department_id: string;
  originating_user_id: string;
  receiving_department_id: 'maintenance';
  equipment_id: string | null;
  category: TicketCategory;
  symptom: string;
  photo_urls: string[];
  severity: TicketSeverity;
  sla_ack_hours: number;
  sla_resolution_hours: number;
  status: TicketStatus;
  acknowledged_at: string | null;
  acknowledged_by_user_id: string | null;
  in_progress_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  reopened_count: number;
  is_ack_breached: boolean;
  is_resolution_breached: boolean;
  escalation_level: EscalationLevel;
  escalation_log: Array<{ level: 1 | 2 | 3; escalated_at: string; escalated_to_user_id: string }>;
  converted_to_work_order_id: string | null;
  resolution_notes: string;
  resolved_by_user_id: string | null;
  parts_used: Array<{ spare_id: string; qty: number }>;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}
export const internalTicketKey = (entityCode: string): string =>
  `erp_maintainpro_internal_ticket_${entityCode}`;

// SLA MATRIX · 7 categories × 4 severities = 28 cells (FR-39 §B Audit Immutability)
export const SLA_MATRIX: Record<TicketCategory, Record<TicketSeverity, { ack_hours: number; resolution_hours: number }>> = {
  electrical:    { critical: { ack_hours: 1, resolution_hours: 4 },  high: { ack_hours: 2, resolution_hours: 8 },  medium: { ack_hours: 4, resolution_hours: 24 }, low: { ack_hours: 8, resolution_hours: 72 } },
  mechanical:    { critical: { ack_hours: 2, resolution_hours: 4 },  high: { ack_hours: 4, resolution_hours: 8 },  medium: { ack_hours: 8, resolution_hours: 24 }, low: { ack_hours: 24, resolution_hours: 72 } },
  pneumatic:     { critical: { ack_hours: 2, resolution_hours: 8 },  high: { ack_hours: 4, resolution_hours: 12 }, medium: { ack_hours: 8, resolution_hours: 48 }, low: { ack_hours: 24, resolution_hours: 72 } },
  hydraulic:     { critical: { ack_hours: 2, resolution_hours: 8 },  high: { ack_hours: 4, resolution_hours: 12 }, medium: { ack_hours: 8, resolution_hours: 48 }, low: { ack_hours: 24, resolution_hours: 72 } },
  safety:        { critical: { ack_hours: 1, resolution_hours: 2 },  high: { ack_hours: 2, resolution_hours: 4 },  medium: { ack_hours: 4, resolution_hours: 12 }, low: { ack_hours: 8, resolution_hours: 24 } },
  calibration:   { critical: { ack_hours: 4, resolution_hours: 24 }, high: { ack_hours: 8, resolution_hours: 48 }, medium: { ack_hours: 24, resolution_hours: 72 }, low: { ack_hours: 48, resolution_hours: 168 } },
  housekeeping:  { critical: { ack_hours: 8, resolution_hours: 24 }, high: { ack_hours: 24, resolution_hours: 48 }, medium: { ack_hours: 48, resolution_hours: 72 }, low: { ack_hours: 72, resolution_hours: 168 } },
};

// --- TRANSACTION 9 · ASSET CAPITALIZATION ---
export interface AssetCapitalization {
  id: string;
  entity_id: string;
  capitalization_no: string;
  equipment_id: string;
  triggered_by_handoff_id: string | null;
  purchase_cost: number;
  depreciation_method: 'straight_line' | 'wdv' | 'units_of_production';
  useful_life_years: number;
  salvage_value: number;
  fincore_voucher_id: string | null;
  project_id: string | null;
  capitalized_at: string;
  capitalized_by_user_id: string;
  created_at: string;
}
export const assetCapitalizationKey = (entityCode: string): string =>
  `erp_maintainpro_asset_cap_${entityCode}`;
