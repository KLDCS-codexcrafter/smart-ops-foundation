/** payroll-run.ts — Sprint 7 Payroll Run types */

// ── Single payslip line (one component row) ───────────────────────
export interface PayslipLine {
  id?: string;               // optional — used for loan/advance lines
  headCode: string;          // 'BASIC', 'HRA', 'EMP_PF' …
  headName: string;
  headShortName?: string;
  type: 'earning' | 'deduction' | 'employer_contribution';
  monthly: number;           // rounded to nearest rupee
  annual: number;
  isTaxable: boolean;
  partOfCTC?: boolean;
  partOfGross?: boolean;
  calculationType?: string;
  calculationValue?: number;
  payHeadId?: string;
}

// ── Loan deduction line (embedded in payslip) ─────────────────────
export interface LoanDeductionLine {
  loanId: string;
  loanTypeName: string;
  emiAmount: number;
  remainingBalance: number;
}

// ── Advance recovery line (embedded in payslip) ───────────────────
export interface AdvanceRecoveryLine {
  advanceId: string;
  amount: number;
  recoveryPeriod: string;
}

// ── IT computation detail ─────────────────────────────────────────
export interface ITComputation {
  regime: string;
  grossAnnualSalary: number;
  standardDeduction: number;
  taxableIncome: number;
  taxBeforeCess: number;
  surcharge: number;
  cess: number;
  rebate87A: number;
  totalAnnualTax: number;
  monthlyTDS: number;
  remainingMonths: number;
}

// ── Employee payslip for one pay period ──────────────────────────
export interface EmployeePayslip {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  designation: string;
  departmentName: string;
  payPeriod: string;          // "2025-12"
  salaryStructureCode: string;
  annualCTC: number;
  workingDays: number;        // calendar working days in month
  presentDays: number;        // days actually worked (after LOP)
  lopDays: number;
  lines: PayslipLine[];
  loanDeductions: LoanDeductionLine[];
  advanceRecoveries: AdvanceRecoveryLine[];
  // Totals
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  totalEmployerCost: number;  // gross + employer contributions
  // Statutory
  pfWage: number;             // Basic+DA used for PF calc (after ceiling)
  esiWage: number;            // gross used for ESI (0 if > 21000)
  empPF: number;
  empESI: number;
  pt: number;
  tds: number;
  itComputation: ITComputation | null;
  // Bank
  bankAccountNo: string;
  bankIfsc: string;
  bankName: string;
  // Errors/warnings
  errors: string[];
  warnings: string[];
}

// ── Payroll Run (one per month per entity) ────────────────────────
export type PayrollRunStatus = 'draft' | 'calculated' | 'approved' | 'posted' | 'locked';

export interface PayrollRun {
  id: string;
  payPeriod: string;          // "2025-12" (YYYY-MM)
  periodLabel: string;        // "December 2025"
  status: PayrollRunStatus;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalEmployerCost: number;
  payslips: EmployeePayslip[];
  approvedBy: string;
  approvedAt: string;
  postedAt: string;
  lockedAt: string;
  lockedBy: string;
  unlockReason: string;
  entityId: string;  // entity this payroll run belongs to
  // "parent-root" | company.id | branch.id
  // Reads as undefined on old records — treat as "parent-root".
  notes: string;
  created_at: string;
  updated_at: string;
}

// ── Salary Hold ───────────────────────────────────────────────────
export interface SalaryHold {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  fromPeriod: string;         // "2025-12"
  toPeriod: string;           // empty = indefinite (until released)
  reason: string;
  status: 'active' | 'released';
  releasedAt: string;
  releasedBy: string;
  created_at: string;
  updated_at: string;
}

export const PAYROLL_RUNS_KEY = 'erp_payroll_runs';
export const SALARY_HOLDS_KEY = 'erp_salary_holds';

// Entity-scoped key helpers — use these for all new reads/writes
// [JWT] GET /api/pay-hub/payroll/runs?entityCode={e}
export const payrollRunsKey = (e: string) => `erp_payroll_runs_${e}`;
// [JWT] GET /api/pay-hub/payroll/holds?entityCode={e}
export const salaryHoldsKey = (e: string) => `erp_salary_holds_${e}`;

export const PAYROLL_RUN_STATUS_COLORS: Record<PayrollRunStatus, string> = {
  draft:      'bg-slate-500/10 text-slate-600 border-slate-400/30',
  calculated: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  approved:   'bg-blue-500/10 text-blue-700 border-blue-500/30',
  posted:     'bg-violet-500/10 text-violet-700 border-violet-500/30',
  locked:     'bg-green-500/10 text-green-700 border-green-500/30',
};
