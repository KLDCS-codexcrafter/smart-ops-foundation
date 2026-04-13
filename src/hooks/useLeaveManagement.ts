/**
 * useLeaveManagement.ts — Sprint 6 Leave Management hook
 * [JWT] GET/POST/PUT /api/pay-hub/leave
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import type { LeaveRequest, ApprovalDelegation, CompOffEntry } from '@/types/leave-management';
import { LEAVE_REQUESTS_KEY, APPROVAL_DELEGATIONS_KEY, COMP_OFF_LEDGER_KEY } from '@/types/leave-management';

// ── Loaders / Savers ──────────────────────────────────────────────
const loadLeaveRequests = (): LeaveRequest[] => {
  try {
    // [JWT] GET /api/pay-hub/leave/requests
    const raw = localStorage.getItem(LEAVE_REQUESTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
};
const saveLeaveRequests = (items: LeaveRequest[]) => {
  // [JWT] PUT /api/pay-hub/leave/requests
  localStorage.setItem(LEAVE_REQUESTS_KEY, JSON.stringify(items));
};

const loadDelegations = (): ApprovalDelegation[] => {
  try {
    // [JWT] GET /api/pay-hub/leave/delegations
    const raw = localStorage.getItem(APPROVAL_DELEGATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
};
const saveDelegations = (items: ApprovalDelegation[]) => {
  // [JWT] PUT /api/pay-hub/leave/delegations
  localStorage.setItem(APPROVAL_DELEGATIONS_KEY, JSON.stringify(items));
};

const loadCompOff = (): CompOffEntry[] => {
  try {
    // [JWT] GET /api/pay-hub/leave/comp-off
    const raw = localStorage.getItem(COMP_OFF_LEDGER_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
};
const saveCompOff = (items: CompOffEntry[]) => {
  // [JWT] PUT /api/pay-hub/leave/comp-off
  localStorage.setItem(COMP_OFF_LEDGER_KEY, JSON.stringify(items));
};

// ── computeLeaveDays — excludes weekoffs + holidays ───────────────
// Exported for use in the screen component (real-time preview)
export function computeLeaveDays(
  fromDate: string,
  toDate: string,
  halfDay: boolean,
  weeklyOff: string[],        // employee weeklyOff array e.g. ["Sunday"]
  holidayDates: Set<string>   // flattened set of YYYY-MM-DD holiday dates
): number {
  if (!fromDate || !toDate) return 0;
  if (halfDay) return 0.5;
  try {
    const days = eachDayOfInterval({ start: parseISO(fromDate), end: parseISO(toDate) });
    return days.filter(d => {
      const dayName = format(d, 'EEEE');
      const dateStr = format(d, 'yyyy-MM-dd');
      return !weeklyOff.includes(dayName) && !holidayDates.has(dateStr);
    }).length;
  } catch { return 0; }
}

// ── getApprover — checks if manager has delegated authority ───────
export function getEffectiveApprover(
  managerId: string,
  managerName: string,
  fromDate: string,
  toDate: string,
  delegations: ApprovalDelegation[],
  leaveTypeCode: string
): { id: string; name: string; isDelegated: boolean } {
  const active = delegations.find(d =>
    d.delegatorId === managerId &&
    d.isActive &&
    d.fromDate <= fromDate &&
    d.toDate >= toDate &&
    (d.allLeaveTypes || d.leaveTypeCodes.includes(leaveTypeCode))
  );
  if (active) {
    return { id: active.delegateeId, name: active.delegateeName, isDelegated: true };
  }
  return { id: managerId, name: managerName, isDelegated: false };
}

// ── computeLeaveBalance — real-time balance for one employee + type
export function computeLeaveBalance(
  employeeId: string,
  leaveTypeCode: string,
  daysPerYear: number,
  proRata: boolean,
  openingBalance: number,    // from employee.elOpeningBalance (for EL) or 0
  _joinDate: string,
  requests: LeaveRequest[]
): { opening: number; earned: number; availed: number; balance: number } {
  // Earned: pro-rata based on months since April 1 of current FY
  const now = new Date();
  const fyStart = now.getMonth() >= 3
    ? new Date(now.getFullYear(), 3, 1)   // Apr 1 current year
    : new Date(now.getFullYear() - 1, 3, 1); // Apr 1 last year
  const monthsInFY = 12;
  const monthsElapsed = Math.max(0, Math.floor(
    (now.getTime() - fyStart.getTime()) / (30.44 * 24 * 3600 * 1000)
  ));
  const earned = proRata
    ? Math.floor((daysPerYear / monthsInFY) * Math.min(monthsElapsed, monthsInFY) * 2) / 2
    : daysPerYear;
  // Availed: sum of approved requests this FY
  const fyStartStr = fyStart.toISOString().slice(0, 10);
  const availed = requests
    .filter(r =>
      r.employeeId === employeeId &&
      r.leaveTypeCode === leaveTypeCode &&
      r.status === 'approved' &&
      r.fromDate >= fyStartStr
    )
    .reduce((s, r) => s + r.totalDays, 0);
  const balance = openingBalance + earned - availed;
  return { opening: openingBalance, earned, availed, balance: Math.max(0, balance) };
}

// ── Main hook ─────────────────────────────────────────────────────
export function useLeaveManagement() {
  const [requests, setRequests] = useState<LeaveRequest[]>(loadLeaveRequests);
  const [delegations, setDelegations] = useState<ApprovalDelegation[]>(loadDelegations);
  const [compOff, setCompOff] = useState<CompOffEntry[]>(loadCompOff);

  // ── Leave Request CRUD ───────────────────────────────────────
  const createRequest = (form: Omit<LeaveRequest, "id" | "created_at" | "updated_at">) => {
    const now = new Date().toISOString();
    const item: LeaveRequest = { ...form, id: `lr-${Date.now()}`, created_at: now, updated_at: now };
    const all = loadLeaveRequests();
    const updated = [...all, item];
    setRequests(updated); saveLeaveRequests(updated);
    toast.success(`Leave request submitted for ${form.employeeName}`);
  };

  const approveRequest = (id: string, approverName: string, remarks: string) => {
    const all = loadLeaveRequests();
    const updated = all.map(r => r.id !== id ? r : {
      ...r,
      status: 'approved' as const,
      approverName,
      approverRemarks: remarks,
      approvedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setRequests(updated); saveLeaveRequests(updated);
    toast.success('Leave approved');
  };

  const rejectRequest = (id: string, approverName: string, remarks: string) => {
    const all = loadLeaveRequests();
    const updated = all.map(r => r.id !== id ? r : {
      ...r,
      status: 'rejected' as const,
      approverName,
      approverRemarks: remarks,
      approvedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setRequests(updated); saveLeaveRequests(updated);
    toast.success('Leave rejected');
  };

  const cancelRequest = (id: string, reason: string) => {
    const all = loadLeaveRequests();
    const updated = all.map(r => r.id !== id ? r : {
      ...r,
      status: 'cancelled' as const,
      cancelReason: reason,
      cancelledAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setRequests(updated); saveLeaveRequests(updated);
    toast.success('Request cancelled');
  };

  // ── Delegation CRUD ──────────────────────────────────────────
  const createDelegation = (form: Omit<ApprovalDelegation, "id" | "created_at" | "updated_at">) => {
    const now = new Date().toISOString();
    const item: ApprovalDelegation = { ...form, id: `del-${Date.now()}`, created_at: now, updated_at: now };
    const all = loadDelegations();
    const updated = [...all, item];
    setDelegations(updated); saveDelegations(updated);
    toast.success(`Delegation created — ${form.delegateeCode} will approve on behalf of ${form.delegatorCode}`);
  };

  const updateDelegation = (id: string, patch: Partial<ApprovalDelegation>) => {
    const all = loadDelegations();
    const updated = all.map(d => d.id !== id ? d : { ...d, ...patch, updated_at: new Date().toISOString() });
    setDelegations(updated); saveDelegations(updated);
    toast.success('Delegation updated');
  };

  // ── Comp-Off CRUD ────────────────────────────────────────────
  const addCompOff = (form: Omit<CompOffEntry, "id" | "created_at" | "updated_at">) => {
    const now = new Date().toISOString();
    const item: CompOffEntry = { ...form, id: `co-${Date.now()}`, created_at: now, updated_at: now };
    const all = loadCompOff();
    const updated = [...all, item];
    setCompOff(updated); saveCompOff(updated);
    toast.success(`${form.daysEarned} comp-off day(s) added for ${form.employeeName}`);
  };

  // ── Stats ────────────────────────────────────────────────────
  const stats = {
    pendingCount: requests.filter(r => r.status === 'pending').length,
    approvedThisMonth: requests.filter(r => r.status === 'approved' &&
      r.approvedAt.slice(0, 7) === new Date().toISOString().slice(0, 7)).length,
    activeDelegations: delegations.filter(d => d.isActive).length,
    availableCompOff: compOff.filter(c => c.status === "available").reduce((s, c) => s + c.daysEarned, 0),
  };

  return {
    requests, delegations, compOff, stats,
    createRequest, approveRequest, rejectRequest, cancelRequest,
    createDelegation, updateDelegation,
    addCompOff,
  };
}
