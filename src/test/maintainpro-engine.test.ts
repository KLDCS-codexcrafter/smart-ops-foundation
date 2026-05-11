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
