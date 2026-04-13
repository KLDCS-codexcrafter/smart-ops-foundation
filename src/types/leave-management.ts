/** leave-management.ts — Sprint 6 Leave Management types */

// ── Leave Request ─────────────────────────────────────────────────
export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  leaveTypeId: string;
  leaveTypeCode: string;       // 'EL' | 'CL' | 'SL' etc.
  leaveTypeName: string;
  fromDate: string;            // YYYY-MM-DD
  toDate: string;
  halfDay: boolean;
  halfDaySession: 'morning' | 'afternoon' | '';
  totalDays: number;           // computed — excludes weekoffs + holidays
  reason: string;
  documentRef: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'withdrawn';
  approverId: string;
  approverName: string;
  approvedAt: string;
  approverRemarks: string;
  cancelledAt: string;
  cancelReason: string;
  created_at: string;
  updated_at: string;
}

// ── Approval Delegation ───────────────────────────────────────────
export interface ApprovalDelegation {
  id: string;
  delegatorId: string;         // manager who is delegating
  delegatorCode: string;
  delegatorName: string;
  delegateeId: string;         // who receives approval authority
  delegateeCode: string;
  delegateeName: string;
  fromDate: string;
  toDate: string;
  allLeaveTypes: boolean;
  leaveTypeCodes: string[];
  isActive: boolean;
  reason: string;              // e.g. 'Going on annual leave'
  created_at: string;
  updated_at: string;
}

// ── Comp-Off Ledger ───────────────────────────────────────────────
export interface CompOffEntry {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  workedDate: string;          // the date they worked extra
  workedHours: number;
  daysEarned: number;          // 0.5 or 1.0
  expiryDate: string;          // must avail before this date
  linkedLeaveRequestId: string;// set when availed via leave request
  status: 'available' | 'availed' | 'expired';
  addedBy: string;
  remarks: string;
  created_at: string;
  updated_at: string;
}

export const LEAVE_REQUESTS_KEY      = 'erp_leave_requests';
export const APPROVAL_DELEGATIONS_KEY = 'erp_approval_delegations';
export const COMP_OFF_LEDGER_KEY      = 'erp_comp_off_ledger';

// Status badge colors
export const LEAVE_STATUS_COLORS: Record<LeaveRequest['status'], string> = {
  pending:   'bg-amber-500/10 text-amber-700 border-amber-500/30',
  approved:  'bg-green-500/10 text-green-700 border-green-500/30',
  rejected:  'bg-red-500/10 text-red-700 border-red-500/30',
  cancelled: 'bg-slate-500/10 text-slate-500 border-slate-400/30',
  withdrawn: 'bg-slate-500/10 text-slate-500 border-slate-400/30',
};
