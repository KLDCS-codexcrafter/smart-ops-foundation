/** exit-management.ts — Sprint 17 Exit Management & F&F types */

export type ExitTab = 'exit' | 'fnf';

// ── Exit Request ──────────────────────────────────────────────────
export type ExitType = 'resignation' | 'termination' | 'retirement' | 'contract_end' | 'absconding';
export type ExitStatus =
  | 'initiated' | 'notice_period' | 'clearance_pending'
  | 'fnf_pending' | 'completed' | 'withdrawn' | 'rejected';

export const EXIT_TYPE_LABELS: Record<ExitType, string> = {
  resignation:   'Resignation',
  termination:   'Termination',
  retirement:    'Retirement',
  contract_end:  'Contract End',
  absconding:    'Absconding',
};

export const EXIT_STATUS_COLORS: Record<ExitStatus, string> = {
  initiated:         'bg-slate-500/10 text-slate-600 border-slate-400/30',
  notice_period:     'bg-amber-500/10 text-amber-700 border-amber-500/30',
  clearance_pending: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  fnf_pending:       'bg-violet-500/10 text-violet-700 border-violet-500/30',
  completed:         'bg-green-500/10 text-green-700 border-green-500/30',
  withdrawn:         'bg-slate-500/10 text-slate-500 border-slate-400/30',
  rejected:          'bg-red-500/10 text-red-700 border-red-500/30',
};

// ── Clearance Item ────────────────────────────────────────────────
export type ClearanceStatus = 'pending' | 'cleared' | 'waived';

export interface ClearanceItem {
  id: string;
  department: string;
  item: string;
  assignedTo: string;
  status: ClearanceStatus;
  remarks: string;
  clearedDate: string;
}

export interface ExitRequest {
  id: string;
  exitCode: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  designation: string;
  departmentName: string;
  exitType: ExitType;
  resignationDate: string;
  lastWorkingDate: string;
  noticePeriodDays: number;
  noticePeriodServed: number;
  exitReason: string;
  exitInterviewDone: boolean;
  exitInterviewNotes: string;
  clearanceItems: ClearanceItem[];
  status: ExitStatus;
  approvedBy: string;
  approvedAt: string;
  hrRemarks: string;
  created_at: string;
  updated_at: string;
}

// ── FnF Settlement Line ───────────────────────────────────────────
export interface FnFLine {
  label: string;
  type: 'earning' | 'deduction';
  amount: number;
  remarks: string;
}

// ── Full & Final Settlement ───────────────────────────────────────
export type FnFStatus = 'draft' | 'approved' | 'paid';

export interface FnFSettlement {
  id: string;
  fnfCode: string;
  exitRequestId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  lastWorkingDate: string;
  paymentDate: string;
  lastMonthSalary: number;
  leaveEncashment: number;
  gratuity: number;
  bonusArrears: number;
  otherEarnings: number;
  noticePeriodShortfall: number;
  loanOutstanding: number;
  assetDamage: number;
  otherDeductions: number;
  lines: FnFLine[];
  totalEarnings: number;
  totalDeductions: number;
  netPayable: number;
  status: FnFStatus;
  approvedBy: string;
  approvedAt: string;
  paidVia: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const EXIT_REQUESTS_KEY  = 'erp_exit_requests';
export const FNF_SETTLEMENTS_KEY = 'erp_fnf_settlements';

// ── Default clearance checklist items (seeded per exit request) ──
export const DEFAULT_CLEARANCE_ITEMS: Omit<ClearanceItem, 'id' | 'status' | 'remarks' | 'clearedDate'>[] = [
  { department: 'IT',      item: 'Laptop / devices returned',       assignedTo: 'IT Admin'   },
  { department: 'IT',      item: 'System access & email revoked',   assignedTo: 'IT Admin'   },
  { department: 'IT',      item: 'Software licences de-allocated',  assignedTo: 'IT Admin'   },
  { department: 'Admin',   item: 'ID card & access card returned',  assignedTo: 'HR Admin'   },
  { department: 'Admin',   item: 'Company vehicle / keys returned', assignedTo: 'Admin Team' },
  { department: 'Finance', item: 'Outstanding advances cleared',    assignedTo: 'Finance'    },
  { department: 'Finance', item: 'Company credit card surrendered', assignedTo: 'Finance'    },
  { department: 'HR',      item: 'Exit interview conducted',        assignedTo: 'HR Admin'   },
  { department: 'HR',      item: 'PF withdrawal / transfer form',   assignedTo: 'HR Admin'   },
  { department: 'Manager', item: 'Knowledge transfer completed',    assignedTo: 'Manager'    },
];

// ── Sprint T-Phase-1.2.5h-a · Multi-tenant key migration (Bucket C) ──────
// [JWT] GET /api/peoplepay/exit-requests?entityCode={e}
export const exitRequestsKey = (e: string): string =>
  e ? `erp_exit_requests_${e}` : 'erp_exit_requests';
// [JWT] GET /api/peoplepay/fnf-settlements?entityCode={e}
export const fnfSettlementsKey = (e: string): string =>
  e ? `erp_fnf_settlements_${e}` : 'erp_fnf_settlements';
