/**
 * @file        src/test/maintainpro-engine.test.ts
 * @sprint      T-Phase-1.A.16a · Block I
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEquipment,
  listEquipment,
  getEquipmentById,
  updateEquipment,
  getEquipmentDescendants,
  isEquipmentInWarranty,
  createCalibrationInstrument,
  getCalibrationStatusComputed,
  createFireSafetyEquipment,
  getFireSafetyStatusComputed,
  createPMScheduleTemplate,
  computeNextPMDueDate,
  computeEquipmentEnergyConsumption,
} from '@/lib/maintainpro-engine';
import type { Equipment } from '@/types/maintainpro';

const E = 'TESTMP';

const baseEquipment = (overrides: Partial<Equipment> = {}): Omit<
  Equipment,
  'id' | 'entity_id' | 'created_at' | 'updated_at' | 'is_active' | 'status'
> => ({
  equipment_code: 'EQ/26-27/0001',
  equipment_name: 'Test Blower',
  equipment_class: 'machine',
  category: 'mechanical',
  make: 'Atlas',
  model: 'GA250',
  year_of_mfg: 2024,
  serial_no: 'SN-1',
  location: 'Plant 1',
  floor: 'GF',
  range_or_capacity: '250 HP',
  current_location: 'Plant 1',
  linked_site_id: null,
  linked_project_id: 'prj_sinha_ntpc_install',
  linked_drawing_id: null,
  linked_bom_id: null,
  custodian_user_id: null,
  parent_equipment_id: null,
  purchase_cost: 4500000,
  installation_date: '2026-03-15',
  warranty_start: '2026-03-15',
  warranty_end: '2099-03-14',
  amc_vendor_id: null,
  amc_contract_start: null,
  amc_contract_end: null,
  amc_contract_value: null,
  operational_status: 'running',
  meter_reading: 1000,
  meter_unit: 'hours',
  meter_last_updated: null,
  pm_schedule_template_id: null,
  last_breakdown_date: null,
  last_pm_date: null,
  next_pm_due_date: null,
  breakdown_count_12m: 0,
  uptime_pct_12m: 100,
  total_breakdown_minutes_12m: 0,
  calibration_instrument_id: null,
  kw_rating: 186.5,
  description: '',
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
});

describe('maintainpro-engine · Equipment', () => {
  it('createEquipment + listEquipment round-trip', () => {
    const created = createEquipment(E, baseEquipment());
    expect(created.id).toBeTruthy();
    expect(listEquipment(E)).toHaveLength(1);
  });

  it('getEquipmentById returns the right asset', () => {
    const created = createEquipment(E, baseEquipment());
    expect(getEquipmentById(E, created.id)?.equipment_code).toBe('EQ/26-27/0001');
  });

  it('updateEquipment patches fields', () => {
    const created = createEquipment(E, baseEquipment());
    const updated = updateEquipment(E, created.id, { operational_status: 'breakdown' });
    expect(updated?.operational_status).toBe('breakdown');
  });

  it('getEquipmentDescendants traverses parent_equipment_id (OOB-M11)', () => {
    const parent = createEquipment(E, baseEquipment({ equipment_code: 'EQ-P' }));
    createEquipment(E, baseEquipment({ equipment_code: 'EQ-C1', parent_equipment_id: parent.id }));
    createEquipment(E, baseEquipment({ equipment_code: 'EQ-C2', parent_equipment_id: parent.id }));
    expect(getEquipmentDescendants(E, parent.id)).toHaveLength(2);
  });

  it('isEquipmentInWarranty returns true within warranty (OOB-M8)', () => {
    const eq = createEquipment(E, baseEquipment());
    expect(isEquipmentInWarranty(eq)).toBe(true);
  });
});

describe('maintainpro-engine · Calibration (OOB-M5)', () => {
  it('auto-quarantines when due_date is in the past', () => {
    const past = '2020-01-01';
    const c = createCalibrationInstrument(E, {
      instrument_code: 'CAL-1',
      test_equipment: 'PG-1',
      calibrated_from: '',
      range: '0-200',
      least_count: '0.01',
      accuracy: '±0.5%',
      calibration_frequency: '12 months',
      method: 'ISO 17025',
      calibrated_on: '2019-01-01',
      due_date: past,
      linked_equipment_id: null,
      certificate_url: null,
      next_calibration_vendor_id: null,
      description: '',
    });
    expect(getCalibrationStatusComputed(c)).toBe('quarantined');
  });
});

describe('maintainpro-engine · Fire Safety (OOB-M6)', () => {
  it('marks expired when expiry_date in past', () => {
    const fs = createFireSafetyEquipment(E, {
      equipment_code: 'FS-1',
      type: 'fire_extinguisher',
      location: 'Plant',
      floor: 'GF',
      capacity: '6kg',
      installation_date: '2020-01-01',
      expiry_date: '2020-12-31',
      refilling_vendor_id: null,
      last_inspection_date: null,
      next_inspection_date: null,
      linked_site_id: null,
      description: '',
    });
    expect(getFireSafetyStatusComputed(fs)).toBe('expired');
  });
});

describe('maintainpro-engine · PM Schedule (OOB-M10)', () => {
  it('computeNextPMDueDate respects calendar axis', () => {
    const tpl = createPMScheduleTemplate(E, {
      template_code: 'PMT-1',
      template_name: 'Compressor 90-day',
      description: '',
      applies_to_categories: ['mechanical'],
      axes: [{ axis: 'calendar', calendar_interval_value: 90, calendar_interval_unit: 'days' }],
      activities: [],
    });
    const eq = createEquipment(E, baseEquipment({ last_pm_date: '2026-01-01' }));
    const next = computeNextPMDueDate(tpl, eq, '2026-01-01');
    expect(next).toBe('2026-04-01');
  });
});

describe('maintainpro-engine · ESG (OOB-M12)', () => {
  it('computes kwh and CO2', () => {
    const eq = createEquipment(E, baseEquipment({ kw_rating: 100 }));
    const result = computeEquipmentEnergyConsumption(eq, 200);
    expect(result?.kwh_per_month).toBe(20000);
    expect(result?.co2_kg_per_month).toBeCloseTo(20000 * 0.82, 1);
  });
});

// ============================================================================
// === A.16b · TRANSACTION TESTS APPENDED ===
// ============================================================================

import {
  createBreakdownReport, listBreakdownReports,
  createWorkOrder, updateWorkOrderStatus, listWorkOrders,
  createPMTickoff, listPMTickoffs,
  createSparesIssue, listSparesIssues,
  createEquipmentMovement, listEquipmentMovements,
  createCalibrationCertificate, listCalibrationCertificates,
  createAMCOutToVendor, listAMCOutToVendor, getAMCRemindersDue,
  createAssetCapitalization, listAssetCapitalizations,
} from '@/lib/maintainpro-engine';

describe('maintainpro-engine · BreakdownReport (OOB-M1 + OOB-M8)', () => {
  it('creates breakdown with pattern detection placeholder', () => {
    const eq = createEquipment(E, baseEquipment({ equipment_code: 'EQ-BD-1', warranty_end: '2099-01-01' }));
    const bd = createBreakdownReport(E, {
      breakdown_no: 'BD/01', equipment_id: eq.id, reported_by_user_id: 'u1',
      originating_department_id: 'production', occurred_at: new Date().toISOString(),
      reported_at: new Date().toISOString(), resolved_at: null, downtime_minutes: 0,
      nature_of_complaint: 'motor noise', severity: 'high',
      corrective_action: '', attended_by_user_id: null, remarks: '',
      triggered_work_order_id: null, project_id: null,
    });
    expect(bd.id).toBeTruthy();
    expect(bd.is_equipment_in_warranty).toBe(true);
    expect(bd.warranty_claim_recommended).toBe(true);
    expect(listBreakdownReports(E)).toHaveLength(1);
  });
});

describe('maintainpro-engine · WorkOrder', () => {
  it('creates and transitions WO status', () => {
    const eq = createEquipment(E, baseEquipment({ equipment_code: 'EQ-WO-1' }));
    const wo = createWorkOrder(E, {
      wo_no: 'WO/01', wo_type: 'breakdown', source_breakdown_id: null, source_pm_schedule_id: null,
      equipment_id: eq.id, assigned_to_user_id: null, assigned_at: null,
      estimated_minutes: 60, actual_minutes: null, status: 'draft',
      started_at: null, paused_at: null, resumed_at: null, completed_at: null,
      activities_planned: [], parts_used: [], completion_notes: '',
      followup_required: false, project_id: null, created_by_user_id: 'u1',
    });
    const upd = updateWorkOrderStatus(E, wo.id, 'in_progress');
    expect(upd?.status).toBe('in_progress');
    expect(upd?.started_at).toBeTruthy();
    expect(listWorkOrders(E)).toHaveLength(1);
  });
});

describe('maintainpro-engine · PMTickoff', () => {
  it('creates PM tickoff', () => {
    const eq = createEquipment(E, baseEquipment({ equipment_code: 'EQ-PM-1' }));
    const pm = createPMTickoff(E, {
      pm_no: 'PM/01', pm_schedule_template_id: 'tpl1', equipment_id: eq.id,
      scheduled_date: '2026-01-01', actual_completion_date: '2026-01-01',
      performed_by_user_id: 'u1', duration_minutes: 30, activities_completed: [],
      parts_used: [], next_due_date: null, status: 'completed', project_id: null,
    });
    expect(pm.id).toBeTruthy();
    expect(listPMTickoffs(E)).toHaveLength(1);
  });
});

describe('maintainpro-engine · SparesIssue (OOB-M7)', () => {
  it('creates spares issue with velocity check', () => {
    const eq = createEquipment(E, baseEquipment({ equipment_code: 'EQ-SI-1' }));
    const si = createSparesIssue(E, {
      issue_no: 'SI/01', spare_id: 'spare1', qty: 5, consuming_equipment_id: eq.id,
      consuming_work_order_id: null, consuming_breakdown_id: null, issued_to_user_id: 'u1',
      unit_cost: 100, total_cost: 500, fincore_voucher_id: null, project_id: null,
      issued_at: new Date().toISOString(),
    });
    expect(si.current_velocity).toBeGreaterThanOrEqual(0);
    expect(listSparesIssues(E)).toHaveLength(1);
  });
});

describe('maintainpro-engine · EquipmentMovement + CalibrationCertificate', () => {
  it('creates movement', () => {
    const eq = createEquipment(E, baseEquipment({ equipment_code: 'EQ-EM-1' }));
    createEquipmentMovement(E, {
      movement_no: 'EM/01', equipment_id: eq.id, source_location: 'P1',
      source_site_id: null, destination_location: 'P2', destination_site_id: null,
      movement_reason: 'inter_site_transfer', movement_date: '2026-01-01',
      transport_vehicle: '', transport_cost: 0, authorized_by_user_id: 'u1', project_id: null,
    });
    expect(listEquipmentMovements(E)).toHaveLength(1);
  });
  it('creates calibration certificate', () => {
    createCalibrationCertificate(E, {
      certificate_no: 'CERT/01', instrument_id: 'inst1', calibrated_on: '2026-01-01',
      next_due_date: '2027-01-01', calibrated_by_vendor_id: null, calibrated_by_user_id: 'u1',
      pre_calibration_drift: '±0.5', post_calibration_accuracy: '±0.1',
      certificate_url: null, is_pass: true, cost: 2500, fincore_voucher_id: null, project_id: null,
    });
    expect(listCalibrationCertificates(E)).toHaveLength(1);
  });
});

describe('maintainpro-engine · AMCOutToVendor (OOB-M2)', () => {
  it('creates AMC with reminder flags initialized', () => {
    const eq = createEquipment(E, baseEquipment({ equipment_code: 'EQ-AMC-1' }));
    const amc = createAMCOutToVendor(E, {
      rma_no: 'RMA/01', equipment_id: eq.id, parts_sent: [], vendor_id: 'v1',
      vendor_rma_no: null, sent_date: new Date().toISOString().slice(0, 10),
      expected_return_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      actual_return_date: null, status: 'sent', stock_state: 'wip_at_vendor',
      estimated_cost: 1000, actual_cost: null, is_under_warranty: false,
      fincore_voucher_id: null, project_id: null, triggered_by_work_order_id: null,
      originating_department_id: 'maintenance', created_by_user_id: 'u1',
    });
    expect(amc.reminder_50pct_sent).toBe(false);
    expect(amc.reminder_overdue_sent).toBe(false);
    const r = getAMCRemindersDue(E);
    expect(Array.isArray(r.fifty_pct)).toBe(true);
    expect(listAMCOutToVendor(E)).toHaveLength(1);
  });
});

describe('maintainpro-engine · AssetCapitalization', () => {
  it('creates asset cap', () => {
    const eq = createEquipment(E, baseEquipment({ equipment_code: 'EQ-AC-1' }));
    const cap = createAssetCapitalization(E, {
      capitalization_no: 'AC/01', equipment_id: eq.id, triggered_by_handoff_id: 'h1',
      purchase_cost: 1000000, depreciation_method: 'straight_line', useful_life_years: 10,
      salvage_value: 50000, fincore_voucher_id: null, project_id: null,
      capitalized_at: '2026-01-01', capitalized_by_user_id: 'u1',
    });
    expect(cap.id).toBeTruthy();
    expect(listAssetCapitalizations(E)).toHaveLength(1);
  });
});
