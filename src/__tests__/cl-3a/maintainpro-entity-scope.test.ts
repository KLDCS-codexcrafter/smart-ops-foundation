/**
 * @file        src/__tests__/cl-3a/maintainpro-entity-scope.test.ts
 * @sprint      T-CL3a-Maintainpro-HookSweep
 * @purpose     Behavioural proof — seed two entities X (OPRX) + Y (SMRT) and
 *              assert that the engine reads consumed by the converted pages
 *              return ONLY the requested entity's rows (entity-correct reads).
 *              Reactivity is enforced upstream by useEntityCode()+useMemo deps;
 *              this test guards the underlying scoping the UI now consumes.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEquipment,
  listEquipment,
  createWorkOrder,
  listWorkOrders,
  createPMTickoff,
  listPMTickoffs,
} from '@/lib/maintainpro-engine';

const X = 'OPRX';
const Y = 'SMRT';

function eqBase(code: string): Parameters<typeof createEquipment>[1] {
  return {
    equipment_code: code,
    equipment_name: code,
    equipment_class: 'machine',
    category: 'mechanical',
    make: 'Make', model: 'Model', year_of_mfg: 2025, serial_no: code,
    location: 'L', floor: 'F', range_or_capacity: '10', current_location: 'L',
    linked_site_id: null, linked_project_id: null, linked_drawing_id: null,
    linked_bom_id: null, fixed_asset_id: null, custodian_user_id: null,
    parent_equipment_id: null,
    purchase_cost: 100000, installation_date: '2026-01-01',
    warranty_start: '2026-01-01', warranty_end: '2027-01-01',
    amc_vendor_id: null, amc_contract_start: null, amc_contract_end: null,
    amc_contract_value: null,
    operational_status: 'running', meter_reading: null, meter_unit: null,
    meter_last_updated: null,
    pm_schedule_template_id: null, last_breakdown_date: null,
    last_pm_date: null, next_pm_due_date: null, breakdown_count_12m: 0,
    uptime_pct_12m: 100, total_breakdown_minutes_12m: 0,
    calibration_instrument_id: null, kw_rating: null,
    description: '',
  } as Parameters<typeof createEquipment>[1];
}

function woBase(equipment_id: string, wo_no: string): Parameters<typeof createWorkOrder>[1] {
  return {
    wo_no, wo_type: 'breakdown',
    source_breakdown_id: null, source_pm_schedule_id: null,
    equipment_id, assigned_to_user_id: 'u1', assigned_at: null,
    estimated_minutes: 60, actual_minutes: null,
    status: 'draft', started_at: null, paused_at: null, resumed_at: null,
    completed_at: null, activities_planned: [], parts_used: [],
    completion_notes: '', followup_required: false, project_id: null,
    created_by_user_id: 'u1',
  } as Parameters<typeof createWorkOrder>[1];
}

function pmBase(equipment_id: string, pm_no: string): Parameters<typeof createPMTickoff>[1] {
  return {
    pm_no, pm_schedule_template_id: 'tpl', equipment_id,
    scheduled_date: '2026-06-01', actual_completion_date: '2026-06-01',
    performed_by_user_id: 'u1', duration_minutes: 30,
    activities_completed: [], parts_used: [], next_due_date: null,
    status: 'completed', project_id: null,
  } as Parameters<typeof createPMTickoff>[1];
}

describe('CL-3a · MaintainPro entity-scoped reads (post hook sweep)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('listEquipment(X) returns only X equipment when both X+Y seeded', () => {
    createEquipment(X, eqBase('EQ-X-1'));
    createEquipment(X, eqBase('EQ-X-2'));
    createEquipment(Y, eqBase('EQ-Y-1'));

    const xs = listEquipment(X);
    const ys = listEquipment(Y);

    expect(xs).toHaveLength(2);
    expect(ys).toHaveLength(1);
    expect(xs.every(e => e.entity_id === X)).toBe(true);
    expect(ys.every(e => e.entity_id === Y)).toBe(true);
    expect(xs.find(e => e.equipment_code === 'EQ-Y-1')).toBeUndefined();
  });

  it('listWorkOrders(X) does not leak Y rows', () => {
    const eX = createEquipment(X, eqBase('EQ-X-WO'));
    const eY = createEquipment(Y, eqBase('EQ-Y-WO'));
    createWorkOrder(X, woBase(eX.id, 'WO-X-1'));
    createWorkOrder(Y, woBase(eY.id, 'WO-Y-1'));

    expect(listWorkOrders(X).map(w => w.wo_no)).toEqual(['WO-X-1']);
    expect(listWorkOrders(Y).map(w => w.wo_no)).toEqual(['WO-Y-1']);
  });

  it('listPMTickoffs(X) is isolated from Y', () => {
    const eX = createEquipment(X, eqBase('EQ-X-PM'));
    const eY = createEquipment(Y, eqBase('EQ-Y-PM'));
    createPMTickoff(X, pmBase(eX.id, 'PM-X-1'));
    createPMTickoff(Y, pmBase(eY.id, 'PM-Y-1'));

    expect(listPMTickoffs(X).map(t => t.pm_no)).toEqual(['PM-X-1']);
    expect(listPMTickoffs(Y).map(t => t.pm_no)).toEqual(['PM-Y-1']);
  });
});
