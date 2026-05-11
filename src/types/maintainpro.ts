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
