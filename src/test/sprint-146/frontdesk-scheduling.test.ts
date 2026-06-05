/**
 * @file   src/test/sprint-146/frontdesk-scheduling.test.ts
 * @sprint Sprint 146 · T-FrontDesk-A6F.2 · Meeting Rooms + Executive Desk · §N tests
 * @target ≥32 it() — room capacity · status compute · booking conflict discipline
 *         (overlap throws · touching boundaries pass · cancelled ignored) · capacity
 *         warn-not-throw · day/week grid · visitor link · executive conflict ·
 *         room hold + cross-link · reminder spawn (tag + due) · cancel cascade ·
 *         day view composition · audit · registers (S145 SHA · S146 last · sibling 215).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRoom, updateRoom, listRooms, computeRoomStatus,
  createBooking, cancelBooking, completeBooking, listBookings, linkBookingToVisitor,
  buildDayGrid, buildWeekGrid,
  listExecutives, createExecAppointment, cancelExecAppointment,
  buildExecutiveDayView, findRoomConflict, findExecConflict,
  getSchedulingStats,
} from '@/lib/frontdesk-scheduling-engine';
import { createPlannedVisitor } from '@/lib/frontdesk-engine';
import { listTasks } from '@/lib/taskflow-engine';
import { readAuditTrail } from "@/lib/audit-trail-engine";
import { EMPLOYEES_KEY, type Employee } from '@/types/employee';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const E = 'ACME';
const CTX = { entityId: E, userId: 'u-recep' };

function clear(): void { localStorage.clear(); }

function seedExecutives(): { ceo: Employee; clerk: Employee } {
  const base: Omit<Employee, 'designation' | 'displayName' | 'id' | 'empCode'> = {
    salutation: 'Mr', firstName: '', middleName: '', lastName: '',
    profilePhoto: null, dob: '1980-01-01', gender: 'male', maritalStatus: 'single',
    personalEmail: 'x@y.com', personalMobile: '9000000000', altPhone: null,
    nationality: 'Indian', bloodGroup: null, religion: null, caste: null,
    presentAddress: { line1: '', line2: '', city: '', state: '', pincode: '', country: 'India' },
    permanentAddress: { line1: '', line2: '', city: '', state: '', pincode: '', country: 'India' },
    sameAsPresent: true,
    workEmail: 'w@y.com', workMobile: '9111111111', extension: null,
    employmentType: 'permanent', doj: '2020-01-01', confirmationDate: '2020-07-01',
    noticePeriodDays: 30, lastWorkingDay: null, retirementDate: null,
    factoryId: 'F1', factoryName: 'HQ', branchId: 'F1', branchName: 'HQ',
    departmentId: 'D1', departmentName: 'Admin',
    gradeId: '', gradeName: '',
    reportingManagerId: null, reportingManagerName: null,
    location: 'HQ', shiftId: null, shiftName: null,
    aadhaarMasked: null, panMasked: null,
    panNumber: null, aadhaarNumber: null, passportNumber: null, drivingLicense: null,
    voterId: null, uanNumber: null, esicNumber: null,
    bankAccountNumber: null, bankIFSC: null, bankName: null, bankBranch: null,
    pfNumber: null, ptApplicable: false, tdsRegime: 'old', tdsExemption: null,
    salaryStructureId: null, salaryStructureName: null, ctcAnnual: 0,
    payHeadOverrides: [], salaryRevisions: [], familyMembers: [], equipmentIssued: [],
    licPolicies: [], loans: [], previousEmployers: [], documents: [],
    nomineeName: null, nomineeRelation: null, nomineePAN: null,
    emergencyContactName: null, emergencyContactRelation: null, emergencyContactPhone: null,
    skills: [], certifications: [], languages: [],
    status: 'active', exitReason: null, rehireEligible: true,
    notes: null, tags: [],
  } as unknown as Omit<Employee, 'designation' | 'displayName' | 'id' | 'empCode'>;
  const ceo: Employee = { ...(base as object), id: 'emp-ceo', empCode: 'EMP-000001', firstName: 'Asha', lastName: 'Rao', displayName: 'Asha Rao', designation: 'CEO', created_at: '2020-01-01', updated_at: '2020-01-01' } as Employee;
  const clerk: Employee = { ...(base as object), id: 'emp-clerk', empCode: 'EMP-000002', firstName: 'Babu', lastName: 'M', displayName: 'Babu M', designation: 'Clerk', created_at: '2020-01-01', updated_at: '2020-01-01' } as Employee;
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify([ceo, clerk]));
  return { ceo, clerk };
}

const T = (hhmm: string): string => `2026-06-10T${hhmm}:00.000+05:30`;

describe('S146 · Meeting Rooms + Executive Desk', () => {
  beforeEach(clear);

  // ── Rooms ────────────────────────────────────────────────────────
  describe('rooms', () => {
    it('createRoom throws when capacity <= 0', () => {
      expect(() => createRoom(E, { name: 'R1', floor: '1', capacity: 0 }, CTX)).toThrow(/capacity/i);
      expect(() => createRoom(E, { name: 'R1', floor: '1', capacity: -3 }, CTX)).toThrow(/capacity/i);
    });

    it('createRoom persists and listRooms returns it', () => {
      const r = createRoom(E, { name: 'Board', floor: '3', capacity: 12, amenities: ['Projector'] }, CTX);
      expect(r.id).toBeTruthy();
      expect(listRooms(E)).toHaveLength(1);
    });

    it('updateRoom rejects capacity <= 0', () => {
      const r = createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      expect(() => updateRoom(E, r.id, { capacity: 0 })).toThrow(/capacity/i);
    });

    it('listRooms({activeOnly}) filters inactive', () => {
      const r = createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      updateRoom(E, r.id, { isActive: false });
      expect(listRooms(E, { activeOnly: true })).toHaveLength(0);
      expect(listRooms(E)).toHaveLength(1);
    });
  });

  // ── Status computation ───────────────────────────────────────────
  describe('computeRoomStatus', () => {
    it('returns "available" when no bookings', () => {
      const r = createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      expect(computeRoomStatus(E, r.id, T('10:00'))).toBe('available');
    });

    it('returns "in_use" when injected now falls inside a booking', () => {
      const r = createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      createBooking(E, { roomId: r.id, title: 'X', organizerEmployeeId: 'u1', organizerName: 'U', startAt: T('09:00'), endAt: T('11:00') }, CTX);
      expect(computeRoomStatus(E, r.id, T('10:00'))).toBe('in_use');
    });

    it('returns "reserved" when next booking is later same day', () => {
      const r = createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      createBooking(E, { roomId: r.id, title: 'X', organizerEmployeeId: 'u1', organizerName: 'U', startAt: T('14:00'), endAt: T('15:00') }, CTX);
      expect(computeRoomStatus(E, r.id, T('10:00'))).toBe('reserved');
    });

    it('ignores cancelled bookings', () => {
      const r = createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      const { booking } = createBooking(E, { roomId: r.id, title: 'X', organizerEmployeeId: 'u1', organizerName: 'U', startAt: T('14:00'), endAt: T('15:00') }, CTX);
      cancelBooking(E, booking.id);
      expect(computeRoomStatus(E, r.id, T('10:00'))).toBe('available');
    });
  });

  // ── Bookings ─────────────────────────────────────────────────────
  describe('bookings', () => {
    it('throws when endAt <= startAt', () => {
      const r = createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      expect(() => createBooking(E, { roomId: r.id, title: 'X', organizerEmployeeId: 'u1', organizerName: 'U', startAt: T('11:00'), endAt: T('11:00') }, CTX)).toThrow(/endAt/);
      expect(() => createBooking(E, { roomId: r.id, title: 'X', organizerEmployeeId: 'u1', organizerName: 'U', startAt: T('11:00'), endAt: T('10:00') }, CTX)).toThrow(/endAt/);
    });

    it('CONFLICT: overlapping booking on same room throws', () => {
      const r = createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      createBooking(E, { roomId: r.id, title: 'A1', organizerEmployeeId: 'u1', organizerName: 'U', startAt: T('10:00'), endAt: T('11:00') }, CTX);
      expect(() => createBooking(E, { roomId: r.id, title: 'A2', organizerEmployeeId: 'u2', organizerName: 'V', startAt: T('10:30'), endAt: T('11:30') }, CTX)).toThrow(/conflict/i);
    });

    it('TOUCHING boundaries (endA===startB) is NOT a conflict', () => {
      const r = createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      createBooking(E, { roomId: r.id, title: 'A1', organizerEmployeeId: 'u1', organizerName: 'U', startAt: T('10:00'), endAt: T('11:00') }, CTX);
      expect(() => createBooking(E, { roomId: r.id, title: 'A2', organizerEmployeeId: 'u2', organizerName: 'V', startAt: T('11:00'), endAt: T('12:00') }, CTX)).not.toThrow();
    });

    it('cancelled bookings are ignored for conflict detection', () => {
      const r = createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      const { booking } = createBooking(E, { roomId: r.id, title: 'A1', organizerEmployeeId: 'u1', organizerName: 'U', startAt: T('10:00'), endAt: T('11:00') }, CTX);
      cancelBooking(E, booking.id);
      expect(() => createBooking(E, { roomId: r.id, title: 'A2', organizerEmployeeId: 'u2', organizerName: 'V', startAt: T('10:30'), endAt: T('11:30') }, CTX)).not.toThrow();
    });

    it('different rooms in the same slot are fine', () => {
      const r1 = createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      const r2 = createRoom(E, { name: 'B', floor: '1', capacity: 5 }, CTX);
      createBooking(E, { roomId: r1.id, title: 'X', organizerEmployeeId: 'u1', organizerName: 'U', startAt: T('10:00'), endAt: T('11:00') }, CTX);
      expect(() => createBooking(E, { roomId: r2.id, title: 'Y', organizerEmployeeId: 'u2', organizerName: 'V', startAt: T('10:00'), endAt: T('11:00') }, CTX)).not.toThrow();
    });

    it('capacity overflow returns a warning · does NOT throw', () => {
      const r = createRoom(E, { name: 'A', floor: '1', capacity: 4 }, CTX);
      const res = createBooking(E, { roomId: r.id, title: 'X', organizerEmployeeId: 'u1', organizerName: 'U', startAt: T('10:00'), endAt: T('11:00'), attendeeCount: 10 }, CTX);
      expect(res.warning).toMatch(/capacity/i);
      expect(res.booking.status).toBe('booked');
    });

    it('findRoomConflict surfaces the clashing booking', () => {
      const r = createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      const { booking } = createBooking(E, { roomId: r.id, title: 'A1', organizerEmployeeId: 'u1', organizerName: 'U', startAt: T('10:00'), endAt: T('11:00') }, CTX);
      const clash = findRoomConflict(E, r.id, T('10:30'), T('11:30'));
      expect(clash?.id).toBe(booking.id);
    });

    it('completeBooking marks status completed · rejects on cancelled', () => {
      const r = createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      const { booking: b1 } = createBooking(E, { roomId: r.id, title: 'X', organizerEmployeeId: 'u1', organizerName: 'U', startAt: T('10:00'), endAt: T('11:00') }, CTX);
      completeBooking(E, b1.id);
      expect(listBookings(E)[0].status).toBe('completed');
      const { booking: b2 } = createBooking(E, { roomId: r.id, title: 'Y', organizerEmployeeId: 'u1', organizerName: 'U', startAt: T('12:00'), endAt: T('13:00') }, CTX);
      cancelBooking(E, b2.id);
      expect(() => completeBooking(E, b2.id)).toThrow();
    });

    it('linkBookingToVisitor throws when visitor missing', () => {
      const r = createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      const { booking } = createBooking(E, { roomId: r.id, title: 'X', organizerEmployeeId: 'u1', organizerName: 'U', startAt: T('10:00'), endAt: T('11:00') }, CTX);
      expect(() => linkBookingToVisitor(E, booking.id, 'ghost')).toThrow();
    });

    it('linkBookingToVisitor succeeds with valid visitor', () => {
      const r = createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      const v = createPlannedVisitor(E, 'u-recep', {
        name: 'Vee', purpose: 'General Visit', hostEmployeeId: 'emp-ceo', hostName: 'Asha',
        plannedAt: T('10:00'),
      });
      const { booking } = createBooking(E, { roomId: r.id, title: 'X', organizerEmployeeId: 'u1', organizerName: 'U', startAt: T('10:00'), endAt: T('11:00') }, CTX);
      const linked = linkBookingToVisitor(E, booking.id, v.id);
      expect(linked.visitorId).toBe(v.id);
    });
  });

  // ── Grids ────────────────────────────────────────────────────────
  describe('grids', () => {
    it('buildDayGrid returns one row per active room with 24 hourly slots', () => {
      createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      createRoom(E, { name: 'B', floor: '1', capacity: 5 }, CTX);
      const g = buildDayGrid(E, T('10:00'));
      expect(g.rows).toHaveLength(2);
      expect(g.rows[0].slots).toHaveLength(24);
    });

    it('buildWeekGrid returns 7 days', () => {
      createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      const wg = buildWeekGrid(E, T('00:00'));
      expect(wg.days).toHaveLength(7);
    });
  });

  // ── Executives ───────────────────────────────────────────────────
  describe('executives', () => {
    it('listExecutives filters by designation regex (CEO yes · Clerk no)', () => {
      seedExecutives();
      const execs = listExecutives(E);
      expect(execs.map((e) => e.id)).toEqual(['emp-ceo']);
    });

    it('createExecAppointment throws on empty title / executive', () => {
      seedExecutives();
      expect(() => createExecAppointment(E, { executiveEmployeeId: 'emp-ceo', executiveName: 'Asha', title: '', startAt: T('10:00'), endAt: T('11:00') }, CTX)).toThrow();
    });

    it('CONFLICT: overlapping appointments for the same executive throw', () => {
      seedExecutives();
      createExecAppointment(E, { executiveEmployeeId: 'emp-ceo', executiveName: 'Asha', title: 'A1', startAt: T('10:00'), endAt: T('11:00') }, CTX);
      expect(() => createExecAppointment(E, { executiveEmployeeId: 'emp-ceo', executiveName: 'Asha', title: 'A2', startAt: T('10:30'), endAt: T('11:30') }, CTX)).toThrow(/conflict/i);
    });

    it('cancelled appointments do not block new ones', () => {
      seedExecutives();
      const { appointment } = createExecAppointment(E, { executiveEmployeeId: 'emp-ceo', executiveName: 'Asha', title: 'A1', startAt: T('10:00'), endAt: T('11:00') }, CTX);
      cancelExecAppointment(E, appointment.id);
      expect(() => createExecAppointment(E, { executiveEmployeeId: 'emp-ceo', executiveName: 'Asha', title: 'A2', startAt: T('10:30'), endAt: T('11:30') }, CTX)).not.toThrow();
    });

    it('findExecConflict identifies the clashing appointment', () => {
      seedExecutives();
      const { appointment } = createExecAppointment(E, { executiveEmployeeId: 'emp-ceo', executiveName: 'Asha', title: 'A1', startAt: T('10:00'), endAt: T('11:00') }, CTX);
      const clash = findExecConflict(E, 'emp-ceo', T('10:30'), T('11:30'));
      expect(clash?.id).toBe(appointment.id);
    });

    it('room hold creates booking · cross-links execAppointmentId · propagates conflicts', () => {
      seedExecutives();
      const r = createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      const res = createExecAppointment(E, {
        executiveEmployeeId: 'emp-ceo', executiveName: 'Asha', title: 'Pitch',
        startAt: T('10:00'), endAt: T('11:00'), withRoomId: r.id,
      }, CTX);
      expect(res.booking?.id).toBeTruthy();
      expect(res.booking?.execAppointmentId).toBe(res.appointment.id);
      expect(res.appointment.roomBookingId).toBe(res.booking?.id);
      // booking conflict propagates on second hold of same room/slot for a different exec
      expect(() => createExecAppointment(E, {
        executiveEmployeeId: 'emp-other', executiveName: 'X', title: 'Other',
        startAt: T('10:30'), endAt: T('11:30'), withRoomId: r.id,
      }, CTX)).toThrow(/conflict/i);
    });

    it('reminder spawn: task created with tag exec-reminder: · assignee=executive · due math', () => {
      seedExecutives();
      const res = createExecAppointment(E, {
        executiveEmployeeId: 'emp-ceo', executiveName: 'Asha', title: 'Pitch',
        startAt: T('10:00'), endAt: T('11:00'), withReminderMinutesBefore: 15,
      }, CTX);
      expect(res.reminderTaskId).toBeTruthy();
      const tasks = listTasks(E);
      const t = tasks.find((x) => x.id === res.reminderTaskId);
      expect(t).toBeDefined();
      expect(t!.tags).toContain(`exec-reminder:${res.appointment.id}`);
      expect(t!.assigneeId).toBe('emp-ceo');
      const due = new Date(t!.dueDate!).getTime();
      const start = new Date(T('10:00')).getTime();
      expect(start - due).toBe(15 * 60_000);
    });

    it('reminder task is pending acknowledgment initially', () => {
      seedExecutives();
      const res = createExecAppointment(E, {
        executiveEmployeeId: 'emp-ceo', executiveName: 'Asha', title: 'X',
        startAt: T('10:00'), endAt: T('11:00'), withReminderMinutesBefore: 5,
      }, CTX);
      const t = listTasks(E).find((x) => x.id === res.reminderTaskId);
      expect(t!.acknowledgedAt).toBeNull();
    });

    it('cancelExecAppointment cascades to linked booking · keeps reminder task', () => {
      seedExecutives();
      const r = createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      const res = createExecAppointment(E, {
        executiveEmployeeId: 'emp-ceo', executiveName: 'Asha', title: 'Pitch',
        startAt: T('10:00'), endAt: T('11:00'), withRoomId: r.id, withReminderMinutesBefore: 5,
      }, CTX);
      cancelExecAppointment(E, res.appointment.id);
      expect(listBookings(E)[0].status).toBe('cancelled');
      // reminder task survives
      expect(listTasks(E).find((t) => t.id === res.reminderTaskId)).toBeDefined();
    });
  });

  // ── Day View composition ────────────────────────────────────────
  describe('buildExecutiveDayView', () => {
    it('composes appointments + expected visitors (host-filtered) + room bookings + reminder tasks', () => {
      seedExecutives();
      const r = createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      const res = createExecAppointment(E, {
        executiveEmployeeId: 'emp-ceo', executiveName: 'Asha', title: 'Pitch',
        startAt: T('10:00'), endAt: T('11:00'), withRoomId: r.id, withReminderMinutesBefore: 10,
      }, CTX);
      // visitor hosted by CEO that day → expected
      createPlannedVisitor(E, 'u-recep', { name: 'Vee', purpose: 'General Visit', hostEmployeeId: 'emp-ceo', hostName: 'Asha', plannedAt: T('09:30') });
      // visitor hosted by clerk → must NOT appear in CEO day view
      createPlannedVisitor(E, 'u-recep', { name: 'Other', purpose: 'General Visit', hostEmployeeId: 'emp-clerk', hostName: 'Babu', plannedAt: T('09:30') });

      const view = buildExecutiveDayView(E, 'emp-ceo', T('10:00'));
      expect(view.appointments.map((a) => a.id)).toContain(res.appointment.id);
      expect(view.expectedVisitors.map((v) => v.name)).toEqual(['Vee']);
      expect(view.roomBookings).toHaveLength(1);
      expect(view.reminderTasks[0].acknowledged).toBe(false);
      expect(view.reminderTasks[0].taskId).toBe(res.reminderTaskId);
    });
  });

  // ── Stats / audit ───────────────────────────────────────────────
  describe('stats and audit', () => {
    it('getSchedulingStats counts today bookings and execs-with-appointments', () => {
      seedExecutives();
      const r = createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      createBooking(E, { roomId: r.id, title: 'X', organizerEmployeeId: 'u1', organizerName: 'U', startAt: T('10:00'), endAt: T('11:00') }, CTX);
      createExecAppointment(E, { executiveEmployeeId: 'emp-ceo', executiveName: 'Asha', title: 'A', startAt: T('12:00'), endAt: T('13:00') }, CTX);
      const s = getSchedulingStats(E, T('12:00'));
      expect(s.bookingsToday).toBe(1);
      expect(s.executivesWithAppointments).toBe(1);
    });

    it('mutations emit frontdesk_event audit entries', () => {
      const r = createRoom(E, { name: 'A', floor: '1', capacity: 5 }, CTX);
      createBooking(E, { roomId: r.id, title: 'X', organizerEmployeeId: 'u1', organizerName: 'U', startAt: T('10:00'), endAt: T('11:00') }, CTX);
      const trail = readAuditTrail(E);
      const fd = trail.filter((t) => t.entity_type === "frontdesk_event");
      expect(fd.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── Registers ────────────────────────────────────────────────────
  describe('registers', () => {
    it('S145 sprint-history headSha backfilled to de6e6e61', () => {
      const s145 = SPRINTS.find((s) => s.sprintNumber === 145);
      expect(s145?.headSha).toBe('de6e6e61');
    });

    it('S146 is the most recent sprint entry', () => {
      const last = SPRINTS[SPRINTS.length - 1];
      expect(last.sprintNumber).toBe(146);
      expect(last.code).toBe('T-FrontDesk-A6F.2');
      expect(last.newSiblings).toContain('frontdesk-scheduling-engine');
    });

    it('sibling-register contains frontdesk-scheduling-engine (215th entry)', () => {
      const ids = SIBLINGS.map((s) => s.id);
      expect(ids).toContain('frontdesk-scheduling-engine');
      expect(SIBLINGS.length).toBe(215);
    });

    it('NO S147 entry exists', () => {
      expect(SPRINTS.find((s) => s.sprintNumber === 147)).toBeUndefined();
    });
  });

  // ── S146.T1 · ROLE_DEFAULT_CARDS visibility fix ──────────────────
  describe('S146.T1 · role-default visibility', () => {
    it('hr-role profile resolves frontdesk as allowed', async () => {
      const { ROLE_DEFAULT_CARDS } = await import('@/types/card-entitlement');
      const { canAccessCard } = await import('@/lib/card-entitlement-engine');
      expect(ROLE_DEFAULT_CARDS.hr).toContain('frontdesk');
      const profile = {
        user_id: 'u1', tenant_id: E, role: 'hr' as const,
        explicit_allow: [], explicit_deny: [], updated_at: new Date().toISOString(),
      };
      const tenant = [{
        tenant_id: E, card_id: 'frontdesk' as const, status: 'active' as const,
        plan_tier: 'growth' as const, effective_from: new Date().toISOString(),
        effective_until: null, trial_days_remaining: null, feature_flags: [],
        notes: '', created_at: '', updated_at: '',
      }];
      expect(canAccessCard('frontdesk', profile, tenant).allowed).toBe(true);
    });

    it('filterSidebarByMatrix on frontdeskSidebarItems with operations-role profile returns non-empty list', async () => {
      const { filterSidebarByMatrix } = await import('@/shell/utils/filterSidebarByMatrix');
      const { frontdeskSidebarItems } = await import('@/apps/erp/configs/frontdesk-sidebar-config');
      const profile = {
        user_id: 'u1', tenant_id: E, role: 'operations' as const,
        explicit_allow: [], explicit_deny: [], updated_at: new Date().toISOString(),
      };
      const tenant = [{
        tenant_id: E, card_id: 'frontdesk' as const, status: 'active' as const,
        plan_tier: 'growth' as const, effective_from: new Date().toISOString(),
        effective_until: null, trial_days_remaining: null, feature_flags: [],
        notes: '', created_at: '', updated_at: '',
      }];
      const filtered = filterSidebarByMatrix(frontdeskSidebarItems, profile, tenant);
      expect(filtered.length).toBeGreaterThan(0);
    });

    it('sales-role profile resolves taskflow as allowed', async () => {
      const { ROLE_DEFAULT_CARDS } = await import('@/types/card-entitlement');
      expect(ROLE_DEFAULT_CARDS.sales).toContain('taskflow');
      expect(ROLE_DEFAULT_CARDS.finance).toContain('taskflow');
      expect(ROLE_DEFAULT_CARDS.operations).toContain('taskflow');
      expect(ROLE_DEFAULT_CARDS.hr).toContain('taskflow');
    });
  });

  // ── S146.T1 · STANDING ASSERTION (institutional/meta) ────────────
  describe('S146.T1 · standing assertion · active card visibility', () => {
    it('every active applications.ts card is either in CardId union+a role default OR in ADMIN_ONLY_CARDS', async () => {
      const { applications } = await import('@/components/operix-core/applications');
      const { ROLE_DEFAULT_CARDS, ADMIN_ONLY_CARDS } = await import('@/types/card-entitlement');
      const allRoleCards = new Set<string>();
      for (const cards of Object.values(ROLE_DEFAULT_CARDS)) {
        for (const c of cards) allRoleCards.add(c);
      }
      const adminOnly = new Set<string>(ADMIN_ONLY_CARDS);
      const activeCards = applications.filter((a) => a.status === 'active').map((a) => a.id);
      const orphans = activeCards.filter((id) => !allRoleCards.has(id) && !adminOnly.has(id));
      expect(orphans).toEqual([]);
    });
  });
});
