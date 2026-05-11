/**
 * @file        src/test/maintainpro-roundtrips.test.ts
 * @sprint      T-Phase-1.A.16b.T1 · Block T1.2 · supplementary coverage
 * @purpose     Round-trip + entity scoping sanity for MaintainPro engine
 * @disciplines FR-22 · FR-30
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEquipment, listEquipment,
  createWorkOrder, listWorkOrders, updateWorkOrderStatus,
  createPMTickoff, listPMTickoffs,
  createSparesIssue, listSparesIssues,
  createEquipmentMovement, listEquipmentMovements,
  createCalibrationCertificate, listCalibrationCertificates,
  createAMCOutToVendor, listAMCOutToVendor,
  createAssetCapitalization, listAssetCapitalizations,
  createInternalTicket, listInternalTickets, transitionTicketStatus,
  createBreakdownReport, listBreakdownReports,
  createCalibrationInstrument, listCalibrationInstruments,
  createFireSafetyEquipment, listFireSafetyEquipment,
  createPMScheduleTemplate, listPMScheduleTemplates,
} from '@/lib/maintainpro-engine';
import type { Equipment } from '@/types/maintainpro';

const E1 = 'RT1';
const E2 = 'RT2';

beforeEach(() => { localStorage.clear(); });

const baseEq = (overrides: Partial<Equipment> = {}): Omit<Equipment,
  'id' | 'entity_id' | 'created_at' | 'updated_at' | 'is_active' | 'status'> => ({
  equipment_code: 'EQ-RT', equipment_name: 'RT Pump', equipment_class: 'machine',
  category: 'mechanical', make: 'X', model: 'Y', year_of_mfg: 2024,
  serial_no: 'SN', location: 'L', floor: 'GF', range_or_capacity: '',
  current_location: 'L', linked_site_id: null, linked_project_id: null,
  linked_drawing_id: null, linked_bom_id: null, custodian_user_id: null,
  parent_equipment_id: null, purchase_cost: 100000,
  installation_date: '2026-01-01', warranty_start: '2026-01-01',
  warranty_end: '2030-01-01', amc_vendor_id: null,
  amc_contract_start: null, amc_contract_end: null, amc_contract_value: null,
  operational_status: 'running', meter_reading: 0, meter_unit: 'hours',
  meter_last_updated: null, pm_schedule_template_id: null,
  last_breakdown_date: null, last_pm_date: null, next_pm_due_date: null,
  breakdown_count_12m: 0, uptime_pct_12m: 100, total_breakdown_minutes_12m: 0,
  calibration_instrument_id: null, kw_rating: 50, description: '',
  ...overrides,
});

describe('MaintainPro round-trips · entity scoping', () => {
  it('Equipment is scoped to entity (E1 isolated from E2)', () => {
    createEquipment(E1, baseEq({ equipment_code: 'EQ-E1' }));
    createEquipment(E2, baseEq({ equipment_code: 'EQ-E2' }));
    expect(listEquipment(E1)).toHaveLength(1);
    expect(listEquipment(E2)).toHaveLength(1);
    expect(listEquipment(E1)[0].equipment_code).toBe('EQ-E1');
  });

  it('WorkOrder round-trip + status persistence', () => {
    const eq = createEquipment(E1, baseEq({ equipment_code: 'EQ-WO' }));
    const wo = createWorkOrder(E1, {
      wo_no: 'WO/RT', wo_type: 'breakdown', source_breakdown_id: null, source_pm_schedule_id: null,
      equipment_id: eq.id, assigned_to_user_id: null, assigned_at: null,
      estimated_minutes: 60, actual_minutes: null, status: 'draft',
      started_at: null, paused_at: null, resumed_at: null, completed_at: null,
      activities_planned: [], parts_used: [], completion_notes: '',
      followup_required: false, project_id: null, created_by_user_id: 'u1',
    });
    updateWorkOrderStatus(E1, wo.id, 'completed');
    const found = listWorkOrders(E1).find(w => w.id === wo.id);
    expect(found?.status).toBe('completed');
    expect(found?.completed_at).toBeTruthy();
  });

  it('PMTickoff persists across reads', () => {
    const eq = createEquipment(E1, baseEq({ equipment_code: 'EQ-PMRT' }));
    createPMTickoff(E1, {
      pm_no: 'PM/RT', pm_schedule_template_id: 't1', equipment_id: eq.id,
      scheduled_date: '2026-01-01', actual_completion_date: '2026-01-01',
      performed_by_user_id: 'u1', duration_minutes: 30, activities_completed: [],
      parts_used: [], next_due_date: null, status: 'completed', project_id: null,
    });
    expect(listPMTickoffs(E1)).toHaveLength(1);
  });

  it('SparesIssue persists with computed velocity fields', () => {
    const eq = createEquipment(E1, baseEq({ equipment_code: 'EQ-SIRT' }));
    const si = createSparesIssue(E1, {
      issue_no: 'SI/RT', spare_id: 'sp', qty: 2, consuming_equipment_id: eq.id,
      consuming_work_order_id: null, consuming_breakdown_id: null, issued_to_user_id: 'u1',
      unit_cost: 10, total_cost: 20, fincore_voucher_id: null, project_id: null,
      issued_at: new Date().toISOString(),
    });
    expect(si.historical_median_velocity).toBeGreaterThanOrEqual(0);
    expect(listSparesIssues(E1)).toHaveLength(1);
  });

  it('EquipmentMovement entity scoping', () => {
    const eq = createEquipment(E1, baseEq({ equipment_code: 'EQ-EMRT' }));
    createEquipmentMovement(E1, {
      movement_no: 'EM/RT', equipment_id: eq.id, source_location: 'A',
      source_site_id: null, destination_location: 'B', destination_site_id: null,
      movement_reason: 'inter_site_transfer', movement_date: '2026-01-01',
      transport_vehicle: '', transport_cost: 0, authorized_by_user_id: 'u1', project_id: null,
    });
    expect(listEquipmentMovements(E1)).toHaveLength(1);
    expect(listEquipmentMovements(E2)).toHaveLength(0);
  });

  it('CalibrationCertificate round-trip', () => {
    createCalibrationCertificate(E1, {
      certificate_no: 'C/RT', instrument_id: 'i1', calibrated_on: '2026-01-01',
      next_due_date: '2027-01-01', calibrated_by_vendor_id: null, calibrated_by_user_id: 'u1',
      pre_calibration_drift: '', post_calibration_accuracy: '',
      certificate_url: null, is_pass: true, cost: 100, fincore_voucher_id: null, project_id: null,
    });
    expect(listCalibrationCertificates(E1)).toHaveLength(1);
  });

  it('AMCOutToVendor reminder flags initialise false', () => {
    const eq = createEquipment(E1, baseEq({ equipment_code: 'EQ-AMCRT' }));
    const amc = createAMCOutToVendor(E1, {
      rma_no: 'RMA/RT', equipment_id: eq.id, parts_sent: [], vendor_id: 'v1',
      vendor_rma_no: null, sent_date: '2026-01-01',
      expected_return_date: '2026-02-01', actual_return_date: null,
      status: 'sent', stock_state: 'wip_at_vendor',
      estimated_cost: 100, actual_cost: null, is_under_warranty: false,
      fincore_voucher_id: null, project_id: null, triggered_by_work_order_id: null,
      originating_department_id: 'maintenance', created_by_user_id: 'u1',
    });
    expect(amc.reminder_50pct_sent).toBe(false);
    expect(amc.reminder_75pct_sent).toBe(false);
    expect(amc.reminder_overdue_sent).toBe(false);
    expect(listAMCOutToVendor(E1)).toHaveLength(1);
  });

  it('AssetCapitalization stores depreciation method', () => {
    const eq = createEquipment(E1, baseEq({ equipment_code: 'EQ-ACRT' }));
    const cap = createAssetCapitalization(E1, {
      capitalization_no: 'AC/RT', equipment_id: eq.id, triggered_by_handoff_id: 'h',
      purchase_cost: 50000, depreciation_method: 'wdv', useful_life_years: 5,
      salvage_value: 2500, fincore_voucher_id: null, project_id: null,
      capitalized_at: '2026-01-01', capitalized_by_user_id: 'u1',
    });
    expect(cap.depreciation_method).toBe('wdv');
    expect(listAssetCapitalizations(E1)).toHaveLength(1);
  });

  it('InternalTicket status transitions persist', () => {
    const t = createInternalTicket(E1, {
      ticket_no: 'TKT/RT', originating_department_id: 'production',
      originating_user_id: 'u1', equipment_id: null, category: 'electrical',
      symptom: 'short', photo_urls: [], severity: 'high', status: 'open',
      acknowledged_at: null, acknowledged_by_user_id: null,
      in_progress_at: null, resolved_at: null, closed_at: null,
      converted_to_work_order_id: null, resolution_notes: '',
      resolved_by_user_id: null, parts_used: [], project_id: null,
    });
    transitionTicketStatus(E1, t.id, 'acknowledged', 'u2');
    const found = listInternalTickets(E1).find(x => x.id === t.id);
    expect(found?.acknowledged_at).toBeTruthy();
    expect(found?.acknowledged_by_user_id).toBe('u2');
  });

  it('BreakdownReport persists status open', () => {
    const eq = createEquipment(E1, baseEq({ equipment_code: 'EQ-BDRT' }));
    const bd = createBreakdownReport(E1, {
      breakdown_no: 'BD/RT', equipment_id: eq.id, reported_by_user_id: 'u1',
      originating_department_id: 'production', occurred_at: new Date().toISOString(),
      reported_at: new Date().toISOString(), resolved_at: null, downtime_minutes: 0,
      nature_of_complaint: 'noise', severity: 'medium',
      corrective_action: '', attended_by_user_id: null, remarks: '',
      triggered_work_order_id: null, project_id: null,
    });
    expect(bd.status).toBe('open');
    expect(listBreakdownReports(E1)).toHaveLength(1);
  });

  it('CalibrationInstrument round-trip', () => {
    createCalibrationInstrument(E1, {
      instrument_code: 'CAL-RT', test_equipment: 'PG', calibrated_from: '',
      range: '0-100', least_count: '0.1', accuracy: '±1%',
      calibration_frequency: '12 months', method: 'ISO',
      calibrated_on: '2026-01-01', due_date: '2027-01-01',
      linked_equipment_id: null, certificate_url: null,
      next_calibration_vendor_id: null, description: '',
    });
    expect(listCalibrationInstruments(E1)).toHaveLength(1);
  });

  it('FireSafetyEquipment round-trip', () => {
    createFireSafetyEquipment(E1, {
      equipment_code: 'FS-RT', type: 'fire_extinguisher', location: 'L',
      floor: 'GF', capacity: '6kg', installation_date: '2026-01-01',
      expiry_date: '2030-01-01', refilling_vendor_id: null,
      last_inspection_date: null, next_inspection_date: null,
      linked_site_id: null, description: '',
    });
    expect(listFireSafetyEquipment(E1)).toHaveLength(1);
  });

  it('PMScheduleTemplate round-trip with calendar axis', () => {
    const tpl = createPMScheduleTemplate(E1, {
      template_code: 'PMT-RT', template_name: 'RT', description: '',
      applies_to_categories: ['mechanical'],
      axes: [{ axis: 'calendar', calendar_interval_value: 30, calendar_interval_unit: 'days' }],
      activities: [],
    });
    expect(tpl.id).toBeTruthy();
    expect(listPMScheduleTemplates(E1)).toHaveLength(1);
  });

  it('Multiple WorkOrders persist in order of creation', () => {
    const eq = createEquipment(E1, baseEq({ equipment_code: 'EQ-MWO' }));
    const base = {
      wo_type: 'breakdown' as const, source_breakdown_id: null, source_pm_schedule_id: null,
      equipment_id: eq.id, assigned_to_user_id: null, assigned_at: null,
      estimated_minutes: 30, actual_minutes: null, status: 'draft' as const,
      started_at: null, paused_at: null, resumed_at: null, completed_at: null,
      activities_planned: [], parts_used: [], completion_notes: '',
      followup_required: false, project_id: null, created_by_user_id: 'u1',
    };
    createWorkOrder(E1, { wo_no: 'WO/1', ...base });
    createWorkOrder(E1, { wo_no: 'WO/2', ...base });
    createWorkOrder(E1, { wo_no: 'WO/3', ...base });
    const list = listWorkOrders(E1);
    expect(list).toHaveLength(3);
    expect(list[0].wo_no).toBe('WO/1');
    expect(list[2].wo_no).toBe('WO/3');
  });

  it('Empty list returns [] for unknown entity', () => {
    expect(listEquipment('NEVER')).toEqual([]);
    expect(listWorkOrders('NEVER')).toEqual([]);
    expect(listInternalTickets('NEVER')).toEqual([]);
  });
});
