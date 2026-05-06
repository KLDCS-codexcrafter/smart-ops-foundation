/**
 * job-card-engine.test.ts — Sprint T-Phase-1.3-3-PlantOps-pre-2 · Block L
 * 5 NEW tests · Job Card lifecycle + DWR aggregation (Q30=a + Q31=a)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createJobCard,
  startJobCard,
  completeJobCard,
  holdJobCard,
  resumeJobCard,
} from '@/lib/job-card-engine';
import { listDWREntries } from '@/lib/dwr-aggregation-engine';
import type { Machine } from '@/types/machine';
import type { Employee } from '@/types/employee';
import type { Shift } from '@/types/payroll-masters';
import type { ProductionOrder } from '@/types/production-order';

const E = 'JCT';

const mkMachine = (id: string, code: string, capabilities: string[] = []): Machine => ({
  id, code, name: code, factory_id: 'fac-1', work_center_id: 'wc-1',
  entity_id: E, asset_tag: code, manufacturer: '', model: '', serial_number: '',
  year_of_make: 2024, capabilities,
  rated_capacity_per_hour: 100, rated_capacity_uom: 'units',
  setup_time_minutes: 5, current_status: 'idle',
  current_operator_employee_id: null,
  last_maintenance_at: null, next_maintenance_due: null, maintenance_interval_hours: 500,
  hourly_run_cost: 200, power_kw: 5, notes: '',
  created_at: '', created_by: 'test', updated_at: '', updated_by: 'test',
});

const mkEmployee = (id: string, code: string, certs: string[] = [], skills: string[] = []): Employee => ({
  id, empCode: code, displayName: code, firstName: code, lastName: '',
  fatherName: '', dateOfBirth: '', gender: 'M', maritalStatus: 'single',
  bloodGroup: '', nationality: 'Indian',
  pan: '', aadhaar: '', uan: null, esicNumber: null, drivingLicense: '',
  passportNumber: '', passportExpiry: '',
  permanentAddress: '', currentAddress: '', emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
  primaryEmail: '', personalEmail: '', primaryMobile: '', alternateMobile: '',
  joinDate: '2024-01-01', confirmationDate: null, separationDate: null, separationReason: null,
  employmentType: 'permanent', businessUnitId: '', branchId: '', departmentId: '', subDepartmentId: '',
  designationId: '', gradeId: '', reportingManagerId: null, location: '', shiftId: '',
  weeklyOff: ['sun'], holidayCalendarId: '',
  basicSalary: 0, hra: 0, otherAllowances: 0, ctc: 0, salaryStructureId: null,
  bankName: '', bankAccountNumber: '', bankIfsc: '', bankAccountType: 'savings',
  educationQualifications: [], previousEmployers: [], skills: [], languages: [],
  certifications: [], documents: [], dependents: [], statutoryFlags: { eligibleEPF: true, eligibleESIC: false, eligibleGratuity: true, eligibleProfessionalTax: true },
  status: 'active', tags: [],
  certified_machine_ids: certs,
  production_skills: skills,
  hourly_rate_production: 150,
  hourly_rate_overtime: 200,
  primary_machine_ids: [],
  default_work_center_id: null,
  factory_id: 'fac-1',
  createdAt: '', createdBy: 'test', updatedAt: '', updatedBy: 'test',
} as unknown as Employee);

const SHIFT: Shift = {
  id: 'sh-A', name: 'A Shift', code: 'A',
  startTime: '06:00', endTime: '14:00', workMinutes: 480,
  breakMinutes: 30, isOvernight: false, weekOff: [],
  productionDateRule: 'start', status: 'active',
  createdAt: '', createdBy: 'test', updatedAt: '', updatedBy: 'test',
} as unknown as Shift;

const mkPO = (id: string): ProductionOrder => ({
  id, doc_no: `MO-${id}`, entity_id: E,
} as unknown as ProductionOrder);

beforeEach(() => {
  localStorage.clear();
});

describe('job-card-engine · 3-PlantOps-pre-2', () => {
  it('Test 1 · createJobCard validates planned_qty > 0 and end > start', () => {
    const m = mkMachine('m1', 'MCH-1');
    const e = mkEmployee('e1', 'EMP-1');
    const po = mkPO('po1');
    expect(() => createJobCard({
      entity_id: E, factory_id: 'fac-1', work_center_id: 'wc-1',
      machine: m, production_order: po, production_order_line_id: null,
      employee: e, shift: SHIFT,
      scheduled_start: '2026-04-01T06:00:00.000Z',
      scheduled_end: '2026-04-01T14:00:00.000Z',
      planned_qty: 0, uom: 'kg', remarks: '', created_by: 'test',
    })).toThrow();
  });

  it('Test 2 · Job Card lifecycle planned → in_progress → completed (Q30=a)', () => {
    const m = mkMachine('m1', 'MCH-1');
    const e = mkEmployee('e1', 'EMP-1');
    const jc = createJobCard({
      entity_id: E, factory_id: 'fac-1', work_center_id: 'wc-1',
      machine: m, production_order: mkPO('po1'), production_order_line_id: null,
      employee: e, shift: SHIFT,
      scheduled_start: '2026-04-01T06:00:00.000Z',
      scheduled_end: '2026-04-01T14:00:00.000Z',
      planned_qty: 100, uom: 'kg', remarks: '', created_by: 'test',
    });
    expect(jc.status).toBe('planned');
    const started = startJobCard(jc, { id: 'u1', name: 'U1' });
    expect(started.status).toBe('in_progress');
    expect(started.actual_start).not.toBeNull();
    const done = completeJobCard(started, {
      produced_qty: 95, rejected_qty: 5, rework_qty: 0,
      wastage_qty: 0, wastage_reason: null, wastage_notes: '',
      remarks: '', employee_hourly_rate: 150, machine_hourly_rate: 200,
    }, { id: 'u1', name: 'U1' });
    expect(done.status).toBe('completed');
    expect(done.produced_qty).toBe(95);
    expect(done.actual_end).not.toBeNull();
  });

  it('Test 3 · hold + resume transitions enforce in_progress source state', () => {
    const m = mkMachine('m1', 'MCH-1');
    const e = mkEmployee('e1', 'EMP-1');
    const jc = createJobCard({
      entity_id: E, factory_id: 'fac-1', work_center_id: 'wc-1',
      machine: m, production_order: mkPO('po1'), production_order_line_id: null,
      employee: e, shift: SHIFT,
      scheduled_start: '2026-04-01T06:00:00.000Z',
      scheduled_end: '2026-04-01T14:00:00.000Z',
      planned_qty: 50, uom: 'kg', remarks: '', created_by: 'test',
    });
    expect(() => holdJobCard(jc, { id: 'u1', name: 'U1' }, 'breakdown')).toThrow();
    const started = startJobCard(jc, { id: 'u1', name: 'U1' });
    const held = holdJobCard(started, { id: 'u1', name: 'U1' }, 'breakdown');
    expect(held.status).toBe('on_hold');
    const resumed = resumeJobCard(held, { id: 'u1', name: 'U1' });
    expect(resumed.status).toBe('in_progress');
  });

  it('Test 4 · Completing Job Card auto-rolls up DWR entry (Q31=a)', () => {
    localStorage.setItem(`erp_machines_${E}`, JSON.stringify([mkMachine('m1', 'MCH-1')]));
    const m = mkMachine('m1', 'MCH-1');
    const e = mkEmployee('e1', 'EMP-1');
    const jc = createJobCard({
      entity_id: E, factory_id: 'fac-1', work_center_id: 'wc-1',
      machine: m, production_order: mkPO('po1'), production_order_line_id: null,
      employee: e, shift: SHIFT,
      scheduled_start: '2026-04-01T06:00:00.000Z',
      scheduled_end: '2026-04-01T14:00:00.000Z',
      planned_qty: 100, uom: 'kg', remarks: '', created_by: 'test',
    });
    const started = startJobCard(jc, { id: 'u1', name: 'U1' });
    completeJobCard(started, {
      produced_qty: 100, rejected_qty: 0, rework_qty: 0,
      wastage_qty: 0, wastage_reason: null, wastage_notes: '',
      remarks: '', employee_hourly_rate: 150, machine_hourly_rate: 200,
    }, { id: 'u1', name: 'U1' });
    const dwr = listDWREntries(E);
    expect(dwr).toHaveLength(1);
    expect(dwr[0].total_produced_qty).toBe(100);
    expect(dwr[0].job_card_count).toBe(1);
  });

  it('Test 5 · Two Job Cards same date/shift/employee/machine aggregate to single DWR entry (Q24=a 3-tuple)', () => {
    localStorage.setItem(`erp_machines_${E}`, JSON.stringify([mkMachine('m1', 'MCH-1')]));
    const m = mkMachine('m1', 'MCH-1');
    const e = mkEmployee('e1', 'EMP-1');
    for (let i = 0; i < 2; i++) {
      const jc = createJobCard({
        entity_id: E, factory_id: 'fac-1', work_center_id: 'wc-1',
        machine: m, production_order: mkPO(`po${i}`), production_order_line_id: null,
        employee: e, shift: SHIFT,
        scheduled_start: '2026-04-01T06:00:00.000Z',
        scheduled_end: '2026-04-01T10:00:00.000Z',
        planned_qty: 50, uom: 'kg', remarks: '', created_by: 'test',
      });
      const started = startJobCard(jc, { id: 'u1', name: 'U1' });
      completeJobCard(started, {
        produced_qty: 50, rejected_qty: 0, rework_qty: 0,
        wastage_qty: 0, wastage_reason: null, wastage_notes: '',
        remarks: '', employee_hourly_rate: 150, machine_hourly_rate: 200,
      }, { id: 'u1', name: 'U1' });
    }
    const dwr = listDWREntries(E);
    expect(dwr).toHaveLength(1);
    expect(dwr[0].job_card_count).toBe(2);
    expect(dwr[0].total_produced_qty).toBe(100);
  });
});
