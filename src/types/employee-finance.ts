/** employee-finance.ts — Sprint 10 Employee Finance types */

export type FinanceTab = 'loans' | 'salary-advance' | 'expenses' | 'flexi';

// ── Loan Application ──────────────────────────────────────────────
export interface LoanApplication {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  loanTypeId: string;
  loanTypeName: string;
  principalAmount: number;
  tenureMonths: number;
  interestRatePct: number;
  interestType: 'simple' | 'compound' | 'nil';
  emiAmount: number;           // computed
  totalPayable: number;        // principal + total interest
  disbursedDate: string;
  firstEMIDate: string;
  remainingBalance: number;
  paidEMIs: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'disbursed' | 'closed' | 'foreclosed';
  approvedBy: string;
  approvedAt: string;
  rejectionReason: string;
  foreclosureDate: string;
  foreclosureAmount: number;
  created_at: string;
  updated_at: string;
}

// ── EMI Schedule row ──────────────────────────────────────────────
export interface EMIScheduleRow {
  installment: number;
  dueDate: string;
  openingBalance: number;
  emiAmount: number;
  principal: number;
  interest: number;
  closingBalance: number;
  status: 'upcoming' | 'paid' | 'overdue';
}

// ── Salary Advance ────────────────────────────────────────────────
export interface SalaryAdvance {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  amount: number;
  requestDate: string;
  recoveryPeriod: 'same_month' | 'next_month' | 'split_2_months';
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'recovered';
  approvedBy: string;
  recoveredDate: string;
  created_at: string;
  updated_at: string;
}

// ── Expense Claim ─────────────────────────────────────────────────
export type ExpenseCategory = 'travel' | 'fuel' | 'medical' | 'entertainment'
  | 'telephone' | 'accommodation' | 'client_entertainment' | 'other';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  travel: 'Travel', fuel: 'Fuel / Conveyance', medical: 'Medical',
  entertainment: 'Entertainment', telephone: 'Telephone / Internet',
  accommodation: 'Accommodation', client_entertainment: 'Client Entertainment', other: 'Other',
};

export interface ExpenseClaim {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  claimDate: string;
  expenseDate: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  receiptRef: string;
  status: 'submitted' | 'approved' | 'rejected' | 'reimbursed';
  approvedBy: string;
  approvedAmount: number;
  rejectionReason: string;
  reimbursedDate: string;
  reimbursementMode: 'payroll' | 'bank_transfer';
  created_at: string;
  updated_at: string;
}

// ── Flexi Allocation ──────────────────────────────────────────────
export type FlexiComponent = 'lta' | 'medical' | 'fuel' | 'books' | 'meal_voucher';

export const FLEXI_COMPONENT_LABELS: Record<FlexiComponent, string> = {
  lta: 'Leave Travel Allowance (LTA)',
  medical: 'Medical Reimbursement',
  fuel: 'Fuel & Conveyance',
  books: 'Books & Periodicals',
  meal_voucher: 'Meal Vouchers',
};

export interface FlexiComponentAllocation {
  component: FlexiComponent;
  allocatedAmount: number;
  claimedAmount: number;
  status: 'allocated' | 'claimed' | 'expired';
}

export interface FlexiAllocation {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  financialYear: string;
  totalFlexiAmount: number;
  components: FlexiComponentAllocation[];
  allocationDate: string;
  status: 'draft' | 'locked' | 'claimed' | 'expired';
  unspentAmount: number;
  unspentTaxable: boolean;
  created_at: string;
  updated_at: string;
}

export const LOAN_APPLICATIONS_KEY  = 'erp_loan_applications';
export const SALARY_ADVANCES_KEY    = 'erp_salary_advances';
export const EXPENSE_CLAIMS_KEY     = 'erp_expense_claims';
export const FLEXI_ALLOCATIONS_KEY  = 'erp_flexi_allocations';

export const LOAN_STATUS_COLORS: Record<LoanApplication['status'], string> = {
  pending:    'bg-amber-500/10 text-amber-700 border-amber-500/30',
  approved:   'bg-blue-500/10 text-blue-700 border-blue-500/30',
  rejected:   'bg-red-500/10 text-red-700 border-red-500/30',
  disbursed:  'bg-violet-500/10 text-violet-700 border-violet-500/30',
  closed:     'bg-green-500/10 text-green-700 border-green-500/30',
  foreclosed: 'bg-slate-500/10 text-slate-500 border-slate-400/30',
};

export const EXPENSE_STATUS_COLORS: Record<ExpenseClaim['status'], string> = {
  submitted:   'bg-amber-500/10 text-amber-700 border-amber-500/30',
  approved:    'bg-blue-500/10 text-blue-700 border-blue-500/30',
  rejected:    'bg-red-500/10 text-red-700 border-red-500/30',
  reimbursed:  'bg-green-500/10 text-green-700 border-green-500/30',
};
