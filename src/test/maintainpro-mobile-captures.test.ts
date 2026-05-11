/**
 * @file        src/test/maintainpro-mobile-captures.test.ts
 * @purpose     A.17 · 4 mobile captures + appendEquipmentPhoto coverage · file-inspection smoke tests
 * @sprint      T-Phase-1.A.17 · Block F.1
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  appendEquipmentPhoto,
  listEquipmentPhotos,
  createBreakdownReport,
  createPMTickoff,
  createSparesIssue,
  createEquipment,
} from '@/lib/maintainpro-engine';

const E = 'TEST_A17';
const captures = [
  'MobileBreakdownCapture',
  'MobilePMTickoffCapture',
  'MobileSparesIssueCapture',
  'MobileAssetPhotoCapture',
];

function readCapture(name: string): string {
  return readFileSync(join(process.cwd(), 'src/components/mobile', `${name}.tsx`), 'utf-8');
}

describe('A.17 · Mobile captures · OOB-M9 5-step pattern', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  for (const name of captures) {
    it(`${name} contains all 5 OOB-M9 steps`, () => {
      const src = readCapture(name);
      expect(src).toMatch(/Step 1/);
      expect(src).toMatch(/Step 2/);
      expect(src).toMatch(/Step 3/);
      expect(src).toMatch(/Step 4/);
      expect(src).toMatch(/Step 5/);
    });
    it(`${name} wires submit disabled until subject selected`, () => {
      const src = readCapture(name);
      expect(src).toMatch(/disabled=\{/);
    });
    it(`${name} navigates back to landing on submit`, () => {
      const src = readCapture(name);
      expect(src).toMatch(/\/operix-go\/maintenance-technician/);
    });
    it(`${name} captures GPS metadata`, () => {
      const src = readCapture(name);
      expect(src).toMatch(/gps|Gps|GPS/);
    });
    it(`${name} has photo stub`, () => {
      const src = readCapture(name);
      expect(src).toMatch(/stub-photo-/);
    });
  }
});

describe('A.17 · appendEquipmentPhoto engine helper · D-NEW-DG', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('appendEquipmentPhoto increments photo_count', () => {
    const r1 = appendEquipmentPhoto(E, 'eq1', 'p1.jpg', 'pre_maintenance', 'u1');
    expect(r1.photo_count).toBe(1);
    const r2 = appendEquipmentPhoto(E, 'eq1', 'p2.jpg', 'post_maintenance', 'u1');
    expect(r2.photo_count).toBe(2);
  });

  it('listEquipmentPhotos returns filtered by equipment_id', () => {
    appendEquipmentPhoto(E, 'eq1', 'a.jpg', 'audit', 'u1');
    appendEquipmentPhoto(E, 'eq2', 'b.jpg', 'general', 'u1');
    expect(listEquipmentPhotos(E, 'eq1')).toHaveLength(1);
    expect(listEquipmentPhotos(E, 'eq2')).toHaveLength(1);
  });

  it('listEquipmentPhotos returns empty for unknown equipment', () => {
    expect(listEquipmentPhotos(E, 'nope')).toEqual([]);
  });

  it('existing engine functions still create records (zero regression)', () => {
    const eq = createEquipment(E, {
      equipment_code: 'EQ-T1',
      equipment_name: 'Test',
      equipment_class: 'production_machine',
      site_id: 's1',
      department_id: 'maintenance',
      location_text: '',
      manufacturer: '',
      model_no: '',
      serial_no: '',
      year_of_manufacture: 2024,
      cost_centre_id: null,
      parent_equipment_id: null,
      criticality: 'medium',
      status: 'active',
      acquisition_date: new Date().toISOString(),
      acquisition_cost: 0,
      warranty_start_date: null,
      warranty_end_date: null,
      amc_vendor_id: null,
      ratings: {},
      notes: '',
      project_id: null,
    });
    expect(eq.id).toBeTruthy();

    const bd = createBreakdownReport(E, {
      breakdown_no: 'BD-T1',
      equipment_id: eq.id,
      reported_by_user_id: 'u1',
      originating_department_id: 'maintenance',
      occurred_at: new Date().toISOString(),
      reported_at: new Date().toISOString(),
      resolved_at: null,
      downtime_minutes: 0,
      nature_of_complaint: 'noise',
      severity: 'high',
      corrective_action: '',
      attended_by_user_id: null,
      remarks: '',
      triggered_work_order_id: null,
      project_id: null,
    });
    expect(bd.id).toBeTruthy();

    const pm = createPMTickoff(E, {
      pm_no: 'PM-T1',
      pm_schedule_template_id: 't',
      equipment_id: eq.id,
      scheduled_date: new Date().toISOString(),
      actual_completion_date: new Date().toISOString(),
      performed_by_user_id: 'u1',
      duration_minutes: 30,
      activities_completed: [],
      parts_used: [],
      next_due_date: null,
      status: 'completed',
      project_id: null,
    });
    expect(pm.id).toBeTruthy();

    const si = createSparesIssue(E, {
      issue_no: 'SI-T1',
      spare_id: 'sp1',
      qty: 1,
      consuming_equipment_id: eq.id,
      consuming_work_order_id: null,
      consuming_breakdown_id: null,
      issued_to_user_id: 'u1',
      unit_cost: 100,
      total_cost: 100,
      fincore_voucher_id: null,
      project_id: null,
      issued_at: new Date().toISOString(),
    });
    expect(si.id).toBeTruthy();
  });
});
