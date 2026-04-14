/**
 * usePayHubMasters3.ts — Sprint 3 master hooks
 * [JWT] GET/POST/PUT/DELETE for all 8 masters
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { Shift, LeaveType, HolidayCalendar, Holiday, AttendanceType,
  OvertimeRule, LoanType, BonusConfig, GratuityNPSSettings } from '@/types/payroll-masters';
import {
  SHIFTS_KEY, LEAVE_TYPES_KEY, HOLIDAY_CALENDARS_KEY, ATTENDANCE_TYPES_KEY,
  OVERTIME_RULES_KEY, LOAN_TYPES_KEY, BONUS_CONFIGS_KEY, GRATUITY_NPS_KEY,
  getShiftSeeds, getLeaveTypeSeeds, getAttendanceTypeSeeds, DEFAULT_GRATUITY_NPS,
} from '@/types/payroll-masters';

// ── useShifts ────────────────────────────────────────────────────────
export function useShifts() {
  const load = (): Shift[] => {
    try {
      // [JWT] GET /api/pay-hub/masters/shifts
      const raw = localStorage.getItem(SHIFTS_KEY);
      if (raw) { const d: Shift[] = JSON.parse(raw); if (d.length > 0) return d; }
    } catch { /* ignore */ }
    const seeds = getShiftSeeds();
    // [JWT] POST /api/pay-hub/masters/shifts/seed
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(seeds));
    return seeds;
  };
  const [shifts, setShifts] = useState<Shift[]>(load);
  const save = (items: Shift[]) => {
    // [JWT] PUT /api/pay-hub/masters/shifts
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(items));
    setShifts(items);
  };
  const create = (form: Omit<Shift,"id"|"created_at"|"updated_at">) => {
    const now = new Date().toISOString();
    const item: Shift = { ...form, id: `sh-${Date.now()}`, created_at: now, updated_at: now };
    save([...shifts, item]);
    toast.success(`Shift '${item.name}' created`);
    // [JWT] POST /api/pay-hub/masters/shifts
  };
  const update = (id: string, patch: Partial<Shift>) => {
    save(shifts.map(s => s.id === id ? { ...s, ...patch, updated_at: new Date().toISOString() } : s));
    toast.success("Shift updated");
    // [JWT] PATCH /api/pay-hub/masters/shifts/:id
  };
  const toggleStatus = (id: string) => {
    const s = shifts.find(x => x.id === id);
    if (s) update(id, { status: s.status === 'active' ? 'inactive' : 'active' });
  };
  return { shifts, create, update, toggleStatus };
}

// ── useLeaveTypes ────────────────────────────────────────────────────
export function useLeaveTypes() {
  const load = (): LeaveType[] => {
    try {
      // [JWT] GET /api/pay-hub/masters/leave-types
      const raw = localStorage.getItem(LEAVE_TYPES_KEY);
      if (raw) { const d: LeaveType[] = JSON.parse(raw); if (d.length > 0) return d; }
    } catch { /* ignore */ }
    const seeds = getLeaveTypeSeeds();
    // [JWT] POST /api/pay-hub/masters/leave-types/seed
    localStorage.setItem(LEAVE_TYPES_KEY, JSON.stringify(seeds));
    return seeds;
  };
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(load);
  const save = (items: LeaveType[]) => {
    // [JWT] PUT /api/pay-hub/masters/leave-types
    localStorage.setItem(LEAVE_TYPES_KEY, JSON.stringify(items));
    setLeaveTypes(items);
  };
  const create = (form: Omit<LeaveType,"id"|"created_at"|"updated_at">) => {
    const now = new Date().toISOString();
    save([...leaveTypes, { ...form, id: `lt-${Date.now()}`, created_at: now, updated_at: now }]);
    toast.success(`Leave type '${form.name}' created`);
    // [JWT] POST /api/pay-hub/masters/leave-types
  };
  const update = (id: string, patch: Partial<LeaveType>) => {
    save(leaveTypes.map(l => l.id === id ? { ...l, ...patch, updated_at: new Date().toISOString() } : l));
    toast.success("Leave type updated");
    // [JWT] PATCH /api/pay-hub/masters/leave-types/:id
  };
  const toggleStatus = (id: string) => {
    const l = leaveTypes.find(x => x.id === id);
    if (l) update(id, { status: l.status === 'active' ? 'inactive' : 'active' });
  };
  return { leaveTypes, create, update, toggleStatus };
}

// ── useHolidayCalendars ──────────────────────────────────────────────
export function useHolidayCalendars() {

  // ── Migration-safe load ─────────────────────────────────────────
  const load = (): HolidayCalendar[] => {
    try {
      // [JWT] GET /api/pay-hub/masters/holiday-calendars
      const raw = localStorage.getItem(HOLIDAY_CALENDARS_KEY);
      if (!raw) return [];
      const parsed: HolidayCalendar[] = JSON.parse(raw);
      // Migrate old records that have year but no fromDate
      return parsed.map(c => {
        if (c.fromDate) return c; // already new shape
        const yr = (c as unknown as {year?:number}).year ?? new Date().getFullYear();
        return {
          ...c,
          calendarLevel: c.calendarLevel ?? 'national',
          parentCalendarId: c.parentCalendarId ?? '',
          entityId: c.entityId ?? '',
          entityType: c.entityType ?? 'parent_company',
          fromDate: `${yr}-01-01`,
          toDate: `${yr}-12-31`,
          stateCode: c.stateCode ?? '',
          stateName: c.stateName ?? '',
          location: c.location ?? 'All Locations',
          inheritedHolidays: c.inheritedHolidays ?? [],
          holidays: (c.holidays ?? []).map(h => ({
            ...h,
            localName: (h as any).localName ?? '',
            counties: (h as any).counties ?? [],
            isFixed: (h as any).isFixed ?? false,
            source: (h as any).source ?? 'manual',
          })),
        };
      });
    } catch { /* ignore */ }
    return [];
  };

  const [calendars, setCalendars] = useState<HolidayCalendar[]>(load);

  const save = (items: HolidayCalendar[]) => {
    // [JWT] PUT /api/pay-hub/masters/holiday-calendars
    localStorage.setItem(HOLIDAY_CALENDARS_KEY, JSON.stringify(items));
    setCalendars(items);
  };

  // ── Compute inherited holidays for a calendar ──────────────────
  // Walks the parent chain and collects all holidays from ancestors.
  const resolveInherited = (cal: HolidayCalendar, all: HolidayCalendar[]): Holiday[] => {
    if (!cal.parentCalendarId) return [];
    const parent = all.find(c => c.id === cal.parentCalendarId);
    if (!parent) return [];
    const grandparentInherited = resolveInherited(parent, all);
    return [...grandparentInherited, ...parent.holidays];
  };

  const create = (form: Omit<HolidayCalendar,"id"|"created_at"|"updated_at">) => {
    const now = new Date().toISOString();
    const newCal: HolidayCalendar = {
      ...form,
      id: `hc-${Date.now()}`,
      created_at: now, updated_at: now,
    };
    // Auto-resolve inherited holidays from parent chain
    const allWithNew = [...calendars, newCal];
    newCal.inheritedHolidays = resolveInherited(newCal, allWithNew);
    save([...calendars, newCal]);
    toast.success(`Calendar '${form.name}' created`);
    // [JWT] POST /api/pay-hub/masters/holiday-calendars
  };

  const update = (id: string, patch: Partial<HolidayCalendar>) => {
    const updated = calendars.map(c => c.id === id
      ? { ...c, ...patch, updated_at: new Date().toISOString() } : c);
    // Re-resolve inherited for this and any children
    const reResolved = updated.map(c => {
      if (c.id === id || c.parentCalendarId === id) {
        return { ...c, inheritedHolidays: resolveInherited(c, updated) };
      }
      return c;
    });
    save(reResolved);
    toast.success('Holiday calendar updated');
    // [JWT] PATCH /api/pay-hub/masters/holiday-calendars/:id
  };

  const remove = (id: string) => {
    save(calendars.filter(c => c.id !== id));
    toast.success('Calendar deleted');
    // [JWT] DELETE /api/pay-hub/masters/holiday-calendars/:id
  };

  const toggleStatus = (id: string) => {
    const c = calendars.find(x => x.id === id);
    if (c) update(id, { status: c.status === 'active' ? 'inactive' : 'active' });
  };

  const clone = (id: string) => {
    const src = calendars.find(c => c.id === id);
    if (!src) return;
    const now = new Date().toISOString();
    const newCal: HolidayCalendar = {
      ...src,
      id: `hc-${Date.now()}`,
      name: `${src.name} (Copy)`,
      status: 'inactive',
      created_at: now, updated_at: now,
    };
    save([...calendars, newCal]);
    toast.success(`Calendar cloned from '${src.name}'`);
  };

  return { calendars, create, update, remove, clone, toggleStatus };
}

// ── useAttendanceTypes ───────────────────────────────────────────────
export function useAttendanceTypes() {
  const load = (): AttendanceType[] => {
    try {
      // [JWT] GET /api/pay-hub/masters/attendance-types
      const raw = localStorage.getItem(ATTENDANCE_TYPES_KEY);
      if (raw) { const d: AttendanceType[] = JSON.parse(raw); if (d.length > 0) return d; }
    } catch { /* ignore */ }
    const seeds = getAttendanceTypeSeeds();
    // [JWT] POST /api/pay-hub/masters/attendance-types/seed
    localStorage.setItem(ATTENDANCE_TYPES_KEY, JSON.stringify(seeds));
    return seeds;
  };
  const [attendanceTypes, setAttendanceTypes] = useState<AttendanceType[]>(load);
  const save = (items: AttendanceType[]) => {
    // [JWT] PUT /api/pay-hub/masters/attendance-types
    localStorage.setItem(ATTENDANCE_TYPES_KEY, JSON.stringify(items));
    setAttendanceTypes(items);
  };
  const create = (form: Omit<AttendanceType,"id"|"created_at"|"updated_at">) => {
    const now = new Date().toISOString();
    save([...attendanceTypes, { ...form, id: `at-${Date.now()}`, created_at: now, updated_at: now }]);
    toast.success(`Attendance type '${form.name}' created`);
    // [JWT] POST /api/pay-hub/masters/attendance-types
  };
  const update = (id: string, patch: Partial<AttendanceType>) => {
    save(attendanceTypes.map(a => a.id === id ? { ...a, ...patch, updated_at: new Date().toISOString() } : a));
    toast.success("Attendance type updated");
  };
  const toggleStatus = (id: string) => {
    const a = attendanceTypes.find(x => x.id === id);
    if (a) update(id, { status: a.status === 'active' ? 'inactive' : 'active' });
  };
  return { attendanceTypes, create, update, toggleStatus };
}

// ── useOvertimeRules ─────────────────────────────────────────────────
export function useOvertimeRules() {
  const load = (): OvertimeRule[] => {
    try {
      // [JWT] GET /api/pay-hub/masters/overtime-rules
      const raw = localStorage.getItem(OVERTIME_RULES_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return [];
  };
  const [rules, setRules] = useState<OvertimeRule[]>(load);
  const save = (items: OvertimeRule[]) => {
    // [JWT] PUT /api/pay-hub/masters/overtime-rules
    localStorage.setItem(OVERTIME_RULES_KEY, JSON.stringify(items));
    setRules(items);
  };
  const create = (form: Omit<OvertimeRule,"id"|"created_at"|"updated_at">) => {
    const now = new Date().toISOString();
    save([...rules, { ...form, id: `ot-${Date.now()}`, created_at: now, updated_at: now }]);
    toast.success(`OT Rule '${form.name}' created`);
    // [JWT] POST /api/pay-hub/masters/overtime-rules
  };
  const update = (id: string, patch: Partial<OvertimeRule>) => {
    save(rules.map(r => r.id === id ? { ...r, ...patch, updated_at: new Date().toISOString() } : r));
    toast.success("OT Rule updated");
  };
  const toggleStatus = (id: string) => {
    const r = rules.find(x => x.id === id);
    if (r) update(id, { status: r.status === 'active' ? 'inactive' : 'active' });
  };
  return { rules, create, update, toggleStatus };
}

// ── useLoanTypes ─────────────────────────────────────────────────────
export function useLoanTypes() {
  const load = (): LoanType[] => {
    try {
      // [JWT] GET /api/pay-hub/masters/loan-types
      const raw = localStorage.getItem(LOAN_TYPES_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return [];
  };
  const [loanTypes, setLoanTypes] = useState<LoanType[]>(load);
  const save = (items: LoanType[]) => {
    // [JWT] PUT /api/pay-hub/masters/loan-types
    localStorage.setItem(LOAN_TYPES_KEY, JSON.stringify(items));
    setLoanTypes(items);
  };
  const create = (form: Omit<LoanType,"id"|"created_at"|"updated_at">) => {
    const now = new Date().toISOString();
    save([...loanTypes, { ...form, id: `lnt-${Date.now()}`, created_at: now, updated_at: now }]);
    toast.success(`Loan type '${form.name}' created`);
    // [JWT] POST /api/pay-hub/masters/loan-types
  };
  const update = (id: string, patch: Partial<LoanType>) => {
    save(loanTypes.map(l => l.id === id ? { ...l, ...patch, updated_at: new Date().toISOString() } : l));
    toast.success("Loan type updated");
  };
  const toggleStatus = (id: string) => {
    const l = loanTypes.find(x => x.id === id);
    if (l) update(id, { status: l.status === 'active' ? 'inactive' : 'active' });
  };
  return { loanTypes, create, update, toggleStatus };
}

// ── useBonusConfigs ──────────────────────────────────────────────────
export function useBonusConfigs() {
  const load = (): BonusConfig[] => {
    try {
      // [JWT] GET /api/pay-hub/masters/bonus-configs
      const raw = localStorage.getItem(BONUS_CONFIGS_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return [];
  };
  const [bonusConfigs, setBonusConfigs] = useState<BonusConfig[]>(load);
  const save = (items: BonusConfig[]) => {
    // [JWT] PUT /api/pay-hub/masters/bonus-configs
    localStorage.setItem(BONUS_CONFIGS_KEY, JSON.stringify(items));
    setBonusConfigs(items);
  };
  const create = (form: Omit<BonusConfig,"id"|"created_at"|"updated_at">) => {
    const now = new Date().toISOString();
    save([...bonusConfigs, { ...form, id: `bc-${Date.now()}`, created_at: now, updated_at: now }]);
    toast.success(`Bonus config '${form.name}' created`);
    // [JWT] POST /api/pay-hub/masters/bonus-configs
  };
  const update = (id: string, patch: Partial<BonusConfig>) => {
    save(bonusConfigs.map(b => b.id === id ? { ...b, ...patch, updated_at: new Date().toISOString() } : b));
    toast.success("Bonus config updated");
  };
  const toggleStatus = (id: string) => {
    const b = bonusConfigs.find(x => x.id === id);
    if (b) update(id, { status: b.status === 'active' ? 'inactive' : 'active' });
  };
  return { bonusConfigs, create, update, toggleStatus };
}

// ── useGratuityNPS ──────────────────────────────────────────────────
export function useGratuityNPS() {
  const load = (): GratuityNPSSettings => {
    try {
      // [JWT] GET /api/pay-hub/masters/gratuity-nps
      const raw = localStorage.getItem(GRATUITY_NPS_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return DEFAULT_GRATUITY_NPS;
  };
  const [settings, setSettings] = useState<GratuityNPSSettings>(load);
  const save = (s: GratuityNPSSettings) => {
    // [JWT] PUT /api/pay-hub/masters/gratuity-nps
    localStorage.setItem(GRATUITY_NPS_KEY, JSON.stringify(s));
    setSettings(s);
    toast.success("Gratuity & NPS settings saved");
  };
  return { settings, save };
}
