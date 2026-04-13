/**
 * usePayHubMasters3.ts — Sprint 3 master hooks
 * [JWT] GET/POST/PUT/DELETE for all 8 masters
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { Shift, LeaveType, HolidayCalendar, AttendanceType,
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
  const load = (): HolidayCalendar[] => {
    try {
      // [JWT] GET /api/pay-hub/masters/holiday-calendars
      const raw = localStorage.getItem(HOLIDAY_CALENDARS_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return [];
  };
  const [calendars, setCalendars] = useState<HolidayCalendar[]>(load);
  const save = (items: HolidayCalendar[]) => {
    // [JWT] PUT /api/pay-hub/masters/holiday-calendars
    localStorage.setItem(HOLIDAY_CALENDARS_KEY, JSON.stringify(items));
    setCalendars(items);
  };
  const create = (form: Omit<HolidayCalendar,"id"|"created_at"|"updated_at">) => {
    const now = new Date().toISOString();
    save([...calendars, { ...form, id: `hc-${Date.now()}`, created_at: now, updated_at: now }]);
    toast.success(`Calendar '${form.name}' created`);
    // [JWT] POST /api/pay-hub/masters/holiday-calendars
  };
  const update = (id: string, patch: Partial<HolidayCalendar>) => {
    save(calendars.map(c => c.id === id ? { ...c, ...patch, updated_at: new Date().toISOString() } : c));
    toast.success("Holiday calendar updated");
    // [JWT] PATCH /api/pay-hub/masters/holiday-calendars/:id
  };
  const toggleStatus = (id: string) => {
    const c = calendars.find(x => x.id === id);
    if (c) update(id, { status: c.status === 'active' ? 'inactive' : 'active' });
  };
  return { calendars, create, update, toggleStatus };
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
