/**
 * @realizes    Meeting Rooms + Executive Desk · DP-FD-10 · conflict discipline ·
 *              TaskFlow-reminder reuse
 * @reads-from  frontdesk-engine · taskflow-engine.createTask (CALL ONLY) ·
 *              useEmployees-data (EMPLOYEES_KEY) · party-master (READ-ONLY) ·
 *              audit-trail-engine
 * @sprint      Sprint 146 · T-FrontDesk-A6F.2 · Pillar A.6-F · Block 3
 * @[JWT]       P2BB: role-gated executive calendars · external calendar sync.
 *
 * Scope wall: NEVER mutates taskflow-engine internals — only createTask /
 * acknowledgeTask / listTasks via public API. Dispatch gate types untouched.
 * §H 0-DIFF: approval-workflow · Comply360 · push-notification-bridge UNTOUCHED.
 *
 * Room status is COMPUTED from bookings on read — NEVER stored.
 * Touching boundaries (endA === startB) is NOT a conflict.
 * Capacity overflow returns a `warning` field — never throws.
 */
import { logAudit } from '@/lib/audit-trail-engine';
import { getVisitor, loadVisitors } from '@/lib/frontdesk-engine';
import { createTask, listTasks } from '@/lib/taskflow-engine';
import { EMPLOYEES_KEY, type Employee } from '@/types/employee';
import {
  fdBookingsKey,
  fdExecAppointmentsKey,
  fdRoomsKey,
  type ExecAppointment,
  type ExecAppointmentStatus,
  type ExecutiveDayView,
  type MeetingRoom,
  type RoomAmenity,
  type RoomBooking,
  type RoomComputedStatus,
} from '@/types/frontdesk';

// ─── storage helpers ─────────────────────────────────────────────────
function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function writeJSON(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}
function mkId(p: string): string {
  return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function nowISO(): string { return new Date().toISOString(); }

function audit(
  entityCode: string,
  action: 'create' | 'update' | 'cancel',
  recordId: string,
  recordLabel: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  reason: string,
): void {
  try {
    logAudit({
      entityCode, action, entityType: 'frontdesk_event',
      recordId, recordLabel, beforeState: before, afterState: after,
      reason, sourceModule: 'frontdesk',
    });
  } catch (e) {
    console.error('[frontdesk-scheduling audit]', e);
  }
}

// ─────────────────────────────────────────────────────────────────────
// ROOMS
// ─────────────────────────────────────────────────────────────────────
export interface RoomInput {
  name: string;
  floor: string;
  capacity: number;
  amenities?: RoomAmenity[];
  isActive?: boolean;
}

export function loadRooms(entityCode: string): MeetingRoom[] {
  return readJSON<MeetingRoom[]>(fdRoomsKey(entityCode), []);
}
export function listRooms(entityCode: string, opts?: { activeOnly?: boolean }): MeetingRoom[] {
  const rows = loadRooms(entityCode);
  return opts?.activeOnly ? rows.filter((r) => r.isActive) : rows;
}
export function getRoom(entityCode: string, id: string): MeetingRoom | null {
  return loadRooms(entityCode).find((r) => r.id === id) ?? null;
}

export function createRoom(
  entityCode: string,
  input: RoomInput,
  ctx: { entityId: string; userId: string },
): MeetingRoom {
  if (!input.name?.trim()) throw new Error('Room name required');
  if (!input.floor?.trim()) throw new Error('Floor required');
  if (!Number.isFinite(input.capacity) || input.capacity <= 0) {
    throw new Error('Room capacity must be > 0');
  }
  const now = nowISO();
  const room: MeetingRoom = {
    id: mkId('room'),
    entityId: ctx.entityId,
    name: input.name.trim(),
    floor: input.floor.trim(),
    capacity: input.capacity,
    amenities: input.amenities ?? [],
    isActive: input.isActive ?? true,
    createdAt: now,
    createdByUserId: ctx.userId,
  };
  const all = loadRooms(entityCode);
  writeJSON(fdRoomsKey(entityCode), [...all, room]);
  audit(entityCode, 'create', room.id, `room:${room.name}`, null, room as unknown as Record<string, unknown>, 'room.create');
  return room;
}

export function updateRoom(
  entityCode: string,
  id: string,
  patch: Partial<RoomInput>,
): MeetingRoom {
  const all = loadRooms(entityCode);
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error('Room not found');
  if (patch.capacity !== undefined && (!Number.isFinite(patch.capacity) || patch.capacity <= 0)) {
    throw new Error('Room capacity must be > 0');
  }
  const before = all[idx];
  const next: MeetingRoom = {
    ...before,
    name: patch.name?.trim() ?? before.name,
    floor: patch.floor?.trim() ?? before.floor,
    capacity: patch.capacity ?? before.capacity,
    amenities: patch.amenities ?? before.amenities,
    isActive: patch.isActive ?? before.isActive,
  };
  all[idx] = next;
  writeJSON(fdRoomsKey(entityCode), all);
  audit(entityCode, 'update', id, `room:${next.name}`,
    before as unknown as Record<string, unknown>,
    next as unknown as Record<string, unknown>, 'room.update');
  return next;
}

// ─── Computed room status (NEVER stored) ────────────────────────────
function dayBounds(dateISO: string): { startMs: number; endMs: number } {
  const d = new Date(dateISO);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

export function computeRoomStatus(
  entityCode: string,
  roomId: string,
  nowISO_?: string,
): RoomComputedStatus {
  const now = nowISO_ ? new Date(nowISO_).getTime() : Date.now();
  const { endMs } = dayBounds(nowISO_ ?? nowISO());
  const bookings = loadBookings(entityCode)
    .filter((b) => b.roomId === roomId && b.status !== 'cancelled');
  for (const b of bookings) {
    const s = new Date(b.startAt).getTime();
    const e = new Date(b.endAt).getTime();
    if (now >= s && now < e) return 'in_use';
  }
  for (const b of bookings) {
    const s = new Date(b.startAt).getTime();
    if (s > now && s <= endMs) return 'reserved';
  }
  return 'available';
}

// ─────────────────────────────────────────────────────────────────────
// BOOKINGS
// ─────────────────────────────────────────────────────────────────────
export interface BookingInput {
  roomId: string;
  title: string;
  organizerEmployeeId: string;
  organizerName: string;
  visitorId?: string | null;
  execAppointmentId?: string | null;
  startAt: string; endAt: string;
  attendeeCount?: number | null;
}
export interface BookingCreateResult {
  booking: RoomBooking;
  warning?: string;   // capacity overflow advisory · NEVER throws
}

export function loadBookings(entityCode: string): RoomBooking[] {
  return readJSON<RoomBooking[]>(fdBookingsKey(entityCode), []);
}
function saveBookings(entityCode: string, rows: RoomBooking[]): void {
  writeJSON(fdBookingsKey(entityCode), rows);
}

/** Overlap check: touching boundaries (endA === startB) is NOT a conflict. */
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function findRoomConflict(
  entityCode: string,
  roomId: string,
  startAt: string,
  endAt: string,
  excludeBookingId?: string,
): RoomBooking | null {
  const s = new Date(startAt).getTime();
  const e = new Date(endAt).getTime();
  return loadBookings(entityCode).find((b) =>
    b.id !== excludeBookingId &&
    b.roomId === roomId &&
    b.status !== 'cancelled' &&
    overlaps(s, e, new Date(b.startAt).getTime(), new Date(b.endAt).getTime()),
  ) ?? null;
}

export function createBooking(
  entityCode: string,
  input: BookingInput,
  ctx: { entityId: string; userId: string },
): BookingCreateResult {
  if (!input.title?.trim()) throw new Error('Booking title required');
  const start = new Date(input.startAt).getTime();
  const end = new Date(input.endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error('Invalid booking start/end');
  }
  if (end <= start) throw new Error('Booking endAt must be after startAt');

  const room = getRoom(entityCode, input.roomId);
  if (!room) throw new Error('Room not found');

  const clash = findRoomConflict(entityCode, input.roomId, input.startAt, input.endAt);
  if (clash) {
    throw new Error(`Room conflict with "${clash.title}" (${new Date(clash.startAt).toLocaleString('en-IN')})`);
  }

  if (input.visitorId) {
    const v = getVisitor(entityCode, input.visitorId);
    if (!v) throw new Error('Linked visitor not found');
  }

  const now = nowISO();
  const booking: RoomBooking = {
    id: mkId('bkg'),
    entityId: ctx.entityId,
    roomId: input.roomId,
    title: input.title.trim(),
    organizerEmployeeId: input.organizerEmployeeId,
    organizerName: input.organizerName,
    visitorId: input.visitorId ?? null,
    execAppointmentId: input.execAppointmentId ?? null,
    startAt: input.startAt,
    endAt: input.endAt,
    attendeeCount: input.attendeeCount ?? null,
    status: 'booked',
    createdAt: now,
    createdByUserId: ctx.userId,
  };
  saveBookings(entityCode, [...loadBookings(entityCode), booking]);
  audit(entityCode, 'create', booking.id, `booking:${booking.title}`, null,
    booking as unknown as Record<string, unknown>, 'booking.create');

  let warning: string | undefined;
  if (booking.attendeeCount != null && booking.attendeeCount > room.capacity) {
    warning = `Attendees (${booking.attendeeCount}) exceed room capacity (${room.capacity})`;
  }
  return warning ? { booking, warning } : { booking };
}

export function cancelBooking(entityCode: string, bookingId: string, _reason?: string): RoomBooking {
  const all = loadBookings(entityCode);
  const idx = all.findIndex((b) => b.id === bookingId);
  if (idx < 0) throw new Error('Booking not found');
  if (all[idx].status === 'cancelled') return all[idx];
  const before = all[idx];
  const next: RoomBooking = { ...before, status: 'cancelled' };
  all[idx] = next;
  saveBookings(entityCode, all);
  audit(entityCode, 'cancel', next.id, `booking:${next.title}`,
    before as unknown as Record<string, unknown>,
    next as unknown as Record<string, unknown>, _reason ?? 'booking.cancel');
  return next;
}

export function completeBooking(entityCode: string, bookingId: string): RoomBooking {
  const all = loadBookings(entityCode);
  const idx = all.findIndex((b) => b.id === bookingId);
  if (idx < 0) throw new Error('Booking not found');
  const before = all[idx];
  if (before.status === 'cancelled') throw new Error('Cannot complete a cancelled booking');
  const next: RoomBooking = { ...before, status: 'completed' };
  all[idx] = next;
  saveBookings(entityCode, all);
  audit(entityCode, 'update', next.id, `booking:${next.title}`,
    before as unknown as Record<string, unknown>,
    next as unknown as Record<string, unknown>, 'booking.complete');
  return next;
}

export function listBookings(
  entityCode: string,
  filter?: { roomId?: string; dateISO?: string; organizerId?: string },
): RoomBooking[] {
  let rows = loadBookings(entityCode);
  if (filter?.roomId) rows = rows.filter((b) => b.roomId === filter.roomId);
  if (filter?.organizerId) rows = rows.filter((b) => b.organizerEmployeeId === filter.organizerId);
  if (filter?.dateISO) {
    const { startMs, endMs } = dayBounds(filter.dateISO);
    rows = rows.filter((b) => {
      const s = new Date(b.startAt).getTime();
      const e = new Date(b.endAt).getTime();
      return overlaps(s, e, startMs, endMs);
    });
  }
  return rows.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export function linkBookingToVisitor(
  entityCode: string,
  bookingId: string,
  visitorId: string,
): RoomBooking {
  const v = getVisitor(entityCode, visitorId);
  if (!v) throw new Error('Visitor not found');
  const all = loadBookings(entityCode);
  const idx = all.findIndex((b) => b.id === bookingId);
  if (idx < 0) throw new Error('Booking not found');
  const before = all[idx];
  const next: RoomBooking = { ...before, visitorId };
  all[idx] = next;
  saveBookings(entityCode, all);
  audit(entityCode, 'update', next.id, `booking:${next.title}`,
    before as unknown as Record<string, unknown>,
    next as unknown as Record<string, unknown>, 'booking.link-visitor');
  return next;
}

// ─── Calendar grids ─────────────────────────────────────────────────
export interface DayGridSlot {
  hour: number;            // 0..23
  bookings: RoomBooking[]; // any booking overlapping that hour
}
export interface DayGridRow {
  room: MeetingRoom;
  slots: DayGridSlot[];    // 24 slots
}
export interface DayGrid {
  dateISO: string;
  rows: DayGridRow[];
}

export function buildDayGrid(entityCode: string, dateISO: string): DayGrid {
  const rooms = listRooms(entityCode, { activeOnly: true });
  const bookings = listBookings(entityCode, { dateISO });
  const d = new Date(dateISO);
  const rows: DayGridRow[] = rooms.map((room) => {
    const slots: DayGridSlot[] = Array.from({ length: 24 }, (_, hour) => {
      const slotStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, 0, 0, 0).getTime();
      const slotEnd = slotStart + 60 * 60 * 1000;
      const slotBookings = bookings.filter((b) =>
        b.roomId === room.id &&
        b.status !== 'cancelled' &&
        overlaps(slotStart, slotEnd, new Date(b.startAt).getTime(), new Date(b.endAt).getTime()),
      );
      return { hour, bookings: slotBookings };
    });
    return { room, slots };
  });
  return { dateISO, rows };
}

export interface WeekGrid {
  mondayISO: string;
  days: DayGrid[];   // 7 entries · Mon→Sun
}

export function buildWeekGrid(entityCode: string, mondayISO: string): WeekGrid {
  const monday = new Date(mondayISO);
  const days: DayGrid[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    days.push(buildDayGrid(entityCode, d.toISOString()));
  }
  return { mondayISO, days };
}

// ─────────────────────────────────────────────────────────────────────
// EXECUTIVE DESK (DP-FD-10)
// ─────────────────────────────────────────────────────────────────────
const EXEC_DESIGNATION_RE = /CEO|CTO|CFO|COO|Director|VP|President|Head|Founder|Principal|Managing/i;

function loadEmployeesFromMaster(): Employee[] {
  try {
    const raw = localStorage.getItem(EMPLOYEES_KEY);
    return raw ? (JSON.parse(raw) as Employee[]) : [];
  } catch { return []; }
}

/** Block-0 path A · executives identified by Employee.designation regex. */
export function listExecutives(_entityCode: string): Employee[] {
  return loadEmployeesFromMaster().filter((e) =>
    typeof e.designation === 'string' && EXEC_DESIGNATION_RE.test(e.designation),
  );
}

export function loadExecAppointments(entityCode: string): ExecAppointment[] {
  return readJSON<ExecAppointment[]>(fdExecAppointmentsKey(entityCode), []);
}
function saveExecAppointments(entityCode: string, rows: ExecAppointment[]): void {
  writeJSON(fdExecAppointmentsKey(entityCode), rows);
}

export function findExecConflict(
  entityCode: string,
  executiveEmployeeId: string,
  startAt: string,
  endAt: string,
  excludeId?: string,
): ExecAppointment | null {
  const s = new Date(startAt).getTime();
  const e = new Date(endAt).getTime();
  return loadExecAppointments(entityCode).find((a) =>
    a.id !== excludeId &&
    a.executiveEmployeeId === executiveEmployeeId &&
    a.status !== 'cancelled' &&
    overlaps(s, e, new Date(a.startAt).getTime(), new Date(a.endAt).getTime()),
  ) ?? null;
}

export interface ExecAppointmentInput {
  executiveEmployeeId: string;
  executiveName: string;
  title: string;
  partyId?: string | null;
  visitorId?: string | null;
  startAt: string; endAt: string;
  notes?: string | null;
  withRoomId?: string | null;         // optional one-call room hold
  withReminderMinutesBefore?: number | null;
}
export interface ExecAppointmentCreateResult {
  appointment: ExecAppointment;
  booking?: RoomBooking;
  reminderTaskId?: string | null;
}

export function createExecAppointment(
  entityCode: string,
  input: ExecAppointmentInput,
  ctx: { entityId: string; userId: string; departmentId?: string | null },
): ExecAppointmentCreateResult {
  if (!input.title?.trim()) throw new Error('Appointment title required');
  if (!input.executiveEmployeeId) throw new Error('Executive required');
  const s = new Date(input.startAt).getTime();
  const e = new Date(input.endAt).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e)) throw new Error('Invalid appointment start/end');
  if (e <= s) throw new Error('Appointment endAt must be after startAt');

  const clash = findExecConflict(entityCode, input.executiveEmployeeId, input.startAt, input.endAt);
  if (clash) {
    throw new Error(`Executive conflict with "${clash.title}" (${new Date(clash.startAt).toLocaleString('en-IN')})`);
  }

  const apptId = mkId('appt');
  let booking: RoomBooking | undefined;

  if (input.withRoomId) {
    // booking conflict propagates naturally (createBooking throws)
    const res = createBooking(entityCode, {
      roomId: input.withRoomId,
      title: input.title.trim(),
      organizerEmployeeId: input.executiveEmployeeId,
      organizerName: input.executiveName,
      visitorId: input.visitorId ?? null,
      execAppointmentId: apptId,
      startAt: input.startAt,
      endAt: input.endAt,
    }, ctx);
    booking = res.booking;
  }

  let reminderTaskId: string | null = null;
  if (input.withReminderMinutesBefore != null && input.withReminderMinutesBefore > 0) {
    const dueDate = new Date(s - input.withReminderMinutesBefore * 60_000).toISOString();
    try {
      const task = createTask(entityCode, {
        title: `Reminder: ${input.title.trim()}`,
        description: `Executive appointment reminder · ${new Date(input.startAt).toLocaleString('en-IN')}`,
        assigneeId: input.executiveEmployeeId,
        assigneeName: input.executiveName,
        creatorId: ctx.userId,
        departmentId: ctx.departmentId ?? null,
        priority: 'medium',
        category: 'general',
        dueDate,
        tags: [`exec-reminder:${apptId}`],
        entityId: ctx.entityId,
      });
      reminderTaskId = task.id;
    } catch (err) {
      console.error('[exec-reminder spawn failed]', err);
    }
  }

  const appt: ExecAppointment = {
    id: apptId,
    entityId: ctx.entityId,
    executiveEmployeeId: input.executiveEmployeeId,
    executiveName: input.executiveName,
    title: input.title.trim(),
    partyId: input.partyId ?? null,
    visitorId: input.visitorId ?? null,
    roomBookingId: booking?.id ?? null,
    startAt: input.startAt,
    endAt: input.endAt,
    notes: input.notes ?? null,
    reminderTaskId,
    status: 'scheduled',
    createdAt: nowISO(),
    createdByUserId: ctx.userId,
  };
  saveExecAppointments(entityCode, [...loadExecAppointments(entityCode), appt]);
  audit(entityCode, 'create', appt.id, `appt:${appt.title}`, null,
    appt as unknown as Record<string, unknown>, 'exec-appointment.create');

  return { appointment: appt, booking, reminderTaskId };
}

export function cancelExecAppointment(
  entityCode: string,
  appointmentId: string,
  _reason?: string,
): ExecAppointment {
  const all = loadExecAppointments(entityCode);
  const idx = all.findIndex((a) => a.id === appointmentId);
  if (idx < 0) throw new Error('Appointment not found');
  const before = all[idx];
  if (before.status === 'cancelled') return before;
  const next: ExecAppointment = { ...before, status: 'cancelled' };
  all[idx] = next;
  saveExecAppointments(entityCode, all);
  if (before.roomBookingId) {
    try { cancelBooking(entityCode, before.roomBookingId, 'exec-appointment.cancel'); }
    catch (e) { console.error('[exec cancel · booking cascade]', e); }
  }
  // Reminder task NOT deleted — TF-29a acknowledgment lifecycle preserved.
  audit(entityCode, 'cancel', next.id, `appt:${next.title}`,
    before as unknown as Record<string, unknown>,
    next as unknown as Record<string, unknown>, _reason ?? 'exec-appointment.cancel');
  return next;
}

export function completeExecAppointment(entityCode: string, appointmentId: string): ExecAppointment {
  const all = loadExecAppointments(entityCode);
  const idx = all.findIndex((a) => a.id === appointmentId);
  if (idx < 0) throw new Error('Appointment not found');
  const before = all[idx];
  if (before.status === 'cancelled') throw new Error('Cannot complete a cancelled appointment');
  const next: ExecAppointment = { ...before, status: 'completed' };
  all[idx] = next;
  saveExecAppointments(entityCode, all);
  audit(entityCode, 'update', next.id, `appt:${next.title}`,
    before as unknown as Record<string, unknown>,
    next as unknown as Record<string, unknown>, 'exec-appointment.complete');
  return next;
}

export function listExecAppointments(
  entityCode: string,
  filter?: { executiveEmployeeId?: string; dateISO?: string; status?: ExecAppointmentStatus },
): ExecAppointment[] {
  let rows = loadExecAppointments(entityCode);
  if (filter?.executiveEmployeeId) rows = rows.filter((a) => a.executiveEmployeeId === filter.executiveEmployeeId);
  if (filter?.status) rows = rows.filter((a) => a.status === filter.status);
  if (filter?.dateISO) {
    const { startMs, endMs } = dayBounds(filter.dateISO);
    rows = rows.filter((a) => {
      const s = new Date(a.startAt).getTime();
      const e = new Date(a.endAt).getTime();
      return overlaps(s, e, startMs, endMs);
    });
  }
  return rows.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

// ─── Executive Day View composition ─────────────────────────────────
export function buildExecutiveDayView(
  entityCode: string,
  executiveEmployeeId: string,
  dateISO: string,
): ExecutiveDayView {
  const { startMs, endMs } = dayBounds(dateISO);
  const appointments = listExecAppointments(entityCode, { executiveEmployeeId, dateISO });

  // Expected visitors = planned visitors hosted by this executive within the day.
  const visitors = loadVisitors(entityCode).filter((v) => {
    if (v.hostEmployeeId !== executiveEmployeeId) return false;
    if (v.status !== 'planned') return false;
    if (!v.plannedAt) return false;
    const t = new Date(v.plannedAt).getTime();
    return t >= startMs && t <= endMs;
  });
  const expectedVisitors = visitors.map((v) => ({
    visitorId: v.id, name: v.name, company: v.company ?? null, plannedAt: v.plannedAt as string,
  }));

  // Room bookings = organizer or exec-linked, intersecting the day.
  const apptIds = new Set(appointments.map((a) => a.id));
  const roomBookings = listBookings(entityCode, { dateISO }).filter((b) =>
    b.organizerEmployeeId === executiveEmployeeId ||
    (b.execAppointmentId && apptIds.has(b.execAppointmentId)),
  );

  // Reminder tasks for this executive's appointments (tag exec-reminder:<apptId>).
  const allTasks = listTasks(entityCode);
  const reminderTasks = appointments
    .map((a) => {
      const tag = `exec-reminder:${a.id}`;
      const t = allTasks.find((tk) => tk.tags.includes(tag));
      if (!t) return null;
      return {
        taskId: t.id,
        code: t.code,
        title: t.title,
        dueDate: t.dueDate,
        acknowledged: Boolean(t.acknowledgedAt),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return { executiveEmployeeId, dateISO, appointments, expectedVisitors, roomBookings, reminderTasks };
}

// ─── stats helper (Overview strip) ──────────────────────────────────
export function getSchedulingStats(entityCode: string, dateISO?: string): {
  bookingsToday: number;
  executivesWithAppointments: number;
} {
  const d = dateISO ?? nowISO();
  const bookings = listBookings(entityCode, { dateISO: d }).filter((b) => b.status !== 'cancelled');
  const appts = listExecAppointments(entityCode, { dateISO: d }).filter((a) => a.status !== 'cancelled');
  const execs = new Set(appts.map((a) => a.executiveEmployeeId));
  return { bookingsToday: bookings.length, executivesWithAppointments: execs.size };
}
