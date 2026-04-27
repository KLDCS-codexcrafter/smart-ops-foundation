/**
 * EmployeeFinance.tsx — Sprint 10
 * 4-tab screen: Loans & Advances · Salary Advance · Expense Claims · Flexi Benefits
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addMonths, parseISO } from 'date-fns';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Wallet, Receipt, Gift, Plus, Check, X,
  ChevronDown, ChevronRight, Calculator, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { LoanApplication, SalaryAdvance, ExpenseClaim, FlexiAllocation,
  EMIScheduleRow, FlexiComponent, FinanceTab, ExpenseCategory } from '@/types/employee-finance';
import { LOAN_APPLICATIONS_KEY, SALARY_ADVANCES_KEY, EXPENSE_CLAIMS_KEY,
  FLEXI_ALLOCATIONS_KEY, LOAN_STATUS_COLORS, EXPENSE_STATUS_COLORS,
  EXPENSE_CATEGORY_LABELS, FLEXI_COMPONENT_LABELS } from '@/types/employee-finance';
import type { Employee } from '@/types/employee';
import type { LoanType } from '@/types/payroll-masters';
import { EMPLOYEES_KEY } from '@/types/employee';
import { LOAN_TYPES_KEY } from '@/types/payroll-masters';
import { toIndianFormat, amountInputProps, onEnterNext, useCtrlS } from '@/lib/keyboard';

/* ── generateEMISchedule — pure function, no library ─────────────── */
function generateEMISchedule(
  principal: number,
  tenureMonths: number,
  annualRatePct: number,
  interestType: 'simple' | 'compound' | 'nil',
  startDate: string
): EMIScheduleRow[] {
  if (!principal || !tenureMonths) return [];
  const rows: EMIScheduleRow[] = [];

  if (interestType === 'nil') {
    const emi = Math.ceil(principal / tenureMonths);
    let balance = principal;
    for (let i = 0; i < tenureMonths; i++) {
      const due = addMonths(parseISO(startDate), i);
      const dueStr = format(due, 'yyyy-MM-dd');
      const actualEmi = i < tenureMonths - 1 ? emi : balance;
      rows.push({
        installment: i + 1, dueDate: dueStr, openingBalance: balance,
        emiAmount: actualEmi, principal: actualEmi, interest: 0,
        closingBalance: balance - actualEmi,
        status: new Date(dueStr) < new Date() ? 'paid' : 'upcoming',
      });
      balance -= actualEmi;
    }
    return rows;
  }

  if (interestType === 'simple') {
    const totalInterest = (principal * annualRatePct * tenureMonths) / (100 * 12);
    const totalPayable = principal + totalInterest;
    const emi = Math.ceil(totalPayable / tenureMonths);
    const monthlyInterest = totalInterest / tenureMonths;
    let balance = principal;
    for (let i = 0; i < tenureMonths; i++) {
      const due = addMonths(parseISO(startDate), i);
      const dueStr = format(due, 'yyyy-MM-dd');
      const actualEmi = i < tenureMonths - 1 ? emi : balance + monthlyInterest;
      const prinPart = Math.ceil(actualEmi - monthlyInterest);
      rows.push({
        installment: i + 1, dueDate: dueStr, openingBalance: balance,
        emiAmount: Math.ceil(actualEmi), principal: prinPart,
        interest: Math.ceil(monthlyInterest),
        closingBalance: Math.max(0, balance - prinPart),
        status: new Date(dueStr) < new Date() ? 'paid' : 'upcoming',
      });
      balance = Math.max(0, balance - prinPart);
    }
    return rows;
  }

  // Compound (reducing balance)
  const monthlyRate = annualRatePct / (12 * 100);
  const emi = monthlyRate === 0
    ? Math.ceil(principal / tenureMonths)
    : Math.ceil(principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)
        / (Math.pow(1 + monthlyRate, tenureMonths) - 1));
  let balance = principal;
  for (let i = 0; i < tenureMonths; i++) {
    const due = addMonths(parseISO(startDate), i);
    const dueStr = format(due, 'yyyy-MM-dd');
    const interest = Math.round(balance * monthlyRate);
    const prinPart = Math.min(emi - interest, balance);
    rows.push({
      installment: i + 1, dueDate: dueStr, openingBalance: balance,
      emiAmount: i < tenureMonths - 1 ? emi : balance + interest,
      principal: prinPart, interest,
      closingBalance: Math.max(0, balance - prinPart),
      status: new Date(dueStr) < new Date() ? 'paid' : 'upcoming',
    });
    balance = Math.max(0, balance - prinPart);
  }
  return rows;
}

/* ── computeEMI — quick preview ──────────────────────────────────── */
function computeEMI(principal: number, tenureMonths: number, annualRatePct: number,
  interestType: 'simple' | 'compound' | 'nil'): number {
  if (!principal || !tenureMonths) return 0;
  if (interestType === 'nil') return Math.ceil(principal / tenureMonths);
  if (interestType === 'simple') {
    const totalInterest = (principal * annualRatePct * tenureMonths) / (100 * 12);
    return Math.ceil((principal + totalInterest) / tenureMonths);
  }
  const r = annualRatePct / (12 * 100);
  if (r === 0) return Math.ceil(principal / tenureMonths);
  return Math.ceil(principal * r * Math.pow(1+r,tenureMonths) / (Math.pow(1+r,tenureMonths)-1));
}

/* ══════════════════════════════════════════════════════════════════ */

interface EmployeeFinancePanelProps { defaultTab?: FinanceTab; }

export function EmployeeFinancePanel({ defaultTab = 'loans' }: EmployeeFinancePanelProps) {
  // [T-T8.4-Requisition-Universal] navigate used by additive Request Payment buttons
  const navigate = useNavigate();

  // ── Cross-module reads ───────────────────────────────────────
  const activeEmployees = useMemo<Employee[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/employees
      const raw = localStorage.getItem(EMPLOYEES_KEY);
      if (raw) return (JSON.parse(raw) as Employee[]).filter(e => e.status === 'active');
    } catch { /* ignore */ }
    return [];
  }, []);

  const loanTypes = useMemo<LoanType[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/masters/loan-types
      const raw = localStorage.getItem(LOAN_TYPES_KEY);
      if (raw) return (JSON.parse(raw) as LoanType[]).filter(l => l.status === 'active');
    } catch { /* ignore */ }
    return [];
  }, []);

  // ── Loans state ──────────────────────────────────────────────
  const [loans, setLoans] = useState<LoanApplication[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/finance/loans
      const raw = localStorage.getItem(LOAN_APPLICATIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveLoans = (items: LoanApplication[]) => {
    // [JWT] PUT /api/pay-hub/finance/loans
    localStorage.setItem(LOAN_APPLICATIONS_KEY, JSON.stringify(items));
    setLoans(items);
  };

  // ── Salary Advances state ─────────────────────────────────────
  const [advances, setAdvances] = useState<SalaryAdvance[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/finance/salary-advances
      const raw = localStorage.getItem(SALARY_ADVANCES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveAdvances = (items: SalaryAdvance[]) => {
    // [JWT] PUT /api/pay-hub/finance/salary-advances
    localStorage.setItem(SALARY_ADVANCES_KEY, JSON.stringify(items));
    setAdvances(items);
  };

  // ── Expense Claims state ──────────────────────────────────────
  const [expenses, setExpenses] = useState<ExpenseClaim[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/finance/expense-claims
      const raw = localStorage.getItem(EXPENSE_CLAIMS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveExpenses = (items: ExpenseClaim[]) => {
    // [JWT] PUT /api/pay-hub/finance/expense-claims
    localStorage.setItem(EXPENSE_CLAIMS_KEY, JSON.stringify(items));
    setExpenses(items);
  };

  // ── Flexi Allocations state ───────────────────────────────────
  const [flexiAllocs, setFlexiAllocs] = useState<FlexiAllocation[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/finance/flexi-allocations
      const raw = localStorage.getItem(FLEXI_ALLOCATIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveFlexiAllocs = (items: FlexiAllocation[]) => {
    // [JWT] PUT /api/pay-hub/finance/flexi-allocations
    localStorage.setItem(FLEXI_ALLOCATIONS_KEY, JSON.stringify(items));
    setFlexiAllocs(items);
  };

  // ── Loan Sheet ────────────────────────────────────────────────
  const [loanSheetOpen, setLoanSheetOpen] = useState(false);
  const BLANK_LOAN: {
    employeeId: string; employeeCode: string; employeeName: string;
    loanTypeId: string; loanTypeName: string;
    principalAmount: number; tenureMonths: number; interestRatePct: number;
    interestType: 'simple' | 'compound' | 'nil'; emiAmount: number; totalPayable: number;
    disbursedDate: string; firstEMIDate: string; remainingBalance: number; paidEMIs: number;
    reason: string; status: 'pending'; approvedBy: string;
    approvedAt: string; rejectionReason: string; foreclosureDate: string; foreclosureAmount: number;
  } = {
    employeeId:'', employeeCode:'', employeeName:'',
    loanTypeId:'', loanTypeName:'',
    principalAmount:0, tenureMonths:12, interestRatePct:0,
    interestType:'nil', emiAmount:0, totalPayable:0,
    disbursedDate:'', firstEMIDate:'', remainingBalance:0, paidEMIs:0,
    reason:'', status:'pending', approvedBy:'',
    approvedAt:'', rejectionReason:'', foreclosureDate:'', foreclosureAmount:0,
  };
  const [loanForm, setLoanForm] = useState(BLANK_LOAN);
  const luf = <K extends keyof typeof BLANK_LOAN>(k: K, v: (typeof BLANK_LOAN)[K]) =>
    setLoanForm(prev => ({ ...prev, [k]: v }));

  const handleLoanSave = useCallback(() => {
    if (!loanSheetOpen) return;
    if (!loanForm.employeeId) return toast.error('Select an employee');
    if (!loanForm.loanTypeId) return toast.error('Select a loan type');
    if (loanForm.principalAmount <= 0)
      return toast.error('Principal amount must be > 0');
    const emi = computeEMI(loanForm.principalAmount, loanForm.tenureMonths,
      loanForm.interestRatePct, loanForm.interestType);
    const totalPayable = emi * loanForm.tenureMonths;
    const now = new Date().toISOString();
    const newLoan: LoanApplication = {
      ...loanForm, id: `la-${Date.now()}`,
      emiAmount: emi, totalPayable,
      remainingBalance: loanForm.principalAmount,
      created_at: now, updated_at: now,
    };
    saveLoans([...loans, newLoan]);
    toast.success(`Loan application submitted for ${loanForm.employeeName}`);
    setLoanSheetOpen(false);
    setLoanForm(BLANK_LOAN);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: BLANK_LOAN is a stable shape constant defined in component scope
  }, [loanSheetOpen, loanForm, loans]);

  // ── Advance Sheet ─────────────────────────────────────────────
  const [advSheetOpen, setAdvSheetOpen] = useState(false);
  const BLANK_ADV: {
    employeeId: string; employeeCode: string; employeeName: string;
    amount: number; requestDate: string;
    recoveryPeriod: 'same_month' | 'next_month' | 'split_2_months'; reason: string;
    status: 'pending'; approvedBy: string; recoveredDate: string;
  } = {
    employeeId:'', employeeCode:'', employeeName:'',
    amount:0, requestDate: format(new Date(),'yyyy-MM-dd'),
    recoveryPeriod:'next_month', reason:'',
    status:'pending', approvedBy:'', recoveredDate:'',
  };
  const [advForm, setAdvForm] = useState(BLANK_ADV);

  const handleAdvSave = useCallback(() => {
    if (!advSheetOpen) return;
    if (!advForm.employeeId) return toast.error('Select an employee');
    if (advForm.amount <= 0)
      return toast.error('Advance amount must be > 0');
    const now = new Date().toISOString();
    saveAdvances([...advances, { ...advForm, id: `sa-${Date.now()}`, created_at: now, updated_at: now }]);
    toast.success(`Salary advance submitted for ${advForm.employeeName}`);
    setAdvSheetOpen(false);
    setAdvForm(BLANK_ADV);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: BLANK_ADV is a stable shape constant defined in component scope
  }, [advSheetOpen, advForm, advances]);

  // ── Expense Sheet ─────────────────────────────────────────────
  const [expSheetOpen, setExpSheetOpen] = useState(false);
  const BLANK_EXP: {
    employeeId: string; employeeCode: string; employeeName: string;
    claimDate: string; expenseDate: string;
    category: ExpenseCategory; description: string; amount: number;
    receiptRef: string; status: 'submitted'; approvedBy: string;
    approvedAmount: number; rejectionReason: string; reimbursedDate: string;
    reimbursementMode: 'payroll' | 'bank_transfer';
  } = {
    employeeId:'', employeeCode:'', employeeName:'',
    claimDate: format(new Date(),'yyyy-MM-dd'), expenseDate:'',
    category:'travel', description:'', amount:0,
    receiptRef:'', status:'submitted', approvedBy:'',
    approvedAmount:0, rejectionReason:'', reimbursedDate:'',
    reimbursementMode:'payroll',
  };
  const [expForm, setExpForm] = useState(BLANK_EXP);

  const handleExpSave = useCallback(() => {
    if (!expSheetOpen) return;
    if (!expForm.employeeId) return toast.error('Select an employee');
    if (!expForm.description.trim()) return toast.error('Description required');
    if (expForm.amount <= 0)
      return toast.error('Amount must be > 0');
    const now = new Date().toISOString();
    saveExpenses([...expenses, { ...expForm, approvedAmount: expForm.amount, id: `ec-${Date.now()}`, created_at: now, updated_at: now }]);
    toast.success('Expense claim submitted');
    setExpSheetOpen(false);
    setExpForm(BLANK_EXP);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: BLANK_EXP is a stable shape constant defined in component scope
  }, [expSheetOpen, expForm, expenses]);

  // ── Flexi Sheet ───────────────────────────────────────────────
  const [flexiSheetOpen, setFlexiSheetOpen] = useState(false);
  const FLEXI_COMPONENTS: FlexiComponent[] = ['lta','medical','fuel','books','meal_voucher'];
  const [flexiEmpId, setFlexiEmpId] = useState('');
  const [flexiTotal, setFlexiTotal] = useState(0);
  const [flexiComponents, setFlexiComponents] = useState<Record<FlexiComponent,number>>({
    lta:0, medical:0, fuel:0, books:0, meal_voucher:0,
  });

  const handleFlexiSave = useCallback(() => {
    if (!flexiSheetOpen) return;
    if (!flexiEmpId) return toast.error('Select an employee');
    const allocated = Object.values(flexiComponents).reduce((s,v) => s+v, 0);
    if (allocated > flexiTotal)
      return toast.error(`Allocated ₹${allocated} exceeds total flexi budget ₹${flexiTotal}`);
    const emp = activeEmployees.find(e => e.id === flexiEmpId);
    const now = new Date().toISOString();
    const fyYear = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear()-1;
    const alloc: FlexiAllocation = {
      id: `fa-${Date.now()}`,
      employeeId: flexiEmpId,
      employeeCode: emp?.empCode || '',
      employeeName: emp?.displayName || '',
      financialYear: `${fyYear}-${String(fyYear+1).slice(2)}`,
      totalFlexiAmount: flexiTotal,
      components: FLEXI_COMPONENTS.map(c => ({
        component: c,
        allocatedAmount: flexiComponents[c],
        claimedAmount: 0,
        status: 'allocated' as const,
      })),
      allocationDate: now.slice(0,10), status: 'draft',
      unspentAmount: flexiTotal - allocated, unspentTaxable: false,
      created_at: now, updated_at: now,
    };
    saveFlexiAllocs([...flexiAllocs, alloc]);
    toast.success(`Flexi allocation created for ${emp?.displayName}`);
    setFlexiSheetOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: FLEXI_COMPONENTS is a stable enum array defined in component scope
  }, [flexiSheetOpen, flexiEmpId, flexiTotal, flexiComponents, flexiAllocs, activeEmployees]);

  // ── masterSave ────────────────────────────────────────────────
  const masterSave = useCallback(() => {
    if (loanSheetOpen)  { handleLoanSave(); return; }
    if (advSheetOpen)   { handleAdvSave(); return; }
    if (expSheetOpen)   { handleExpSave(); return; }
    if (flexiSheetOpen) { handleFlexiSave(); return; }
  }, [loanSheetOpen, advSheetOpen, expSheetOpen, flexiSheetOpen,
    handleLoanSave, handleAdvSave, handleExpSave, handleFlexiSave]);
  const isFormActive = true;
  useCtrlS(isFormActive ? masterSave : () => {});

  // ── Approval helpers ──────────────────────────────────────────
  const approveLoan = (id: string) => {
    const updated = loans.map(x => x.id !== id ? x : {
      ...x, status: 'approved' as const, approvedBy: 'HR Admin',
      approvedAt: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    saveLoans(updated);
    toast.success('Loan approved');
  };
  const rejectLoan = (id: string) => {
    const updated = loans.map(x => x.id !== id ? x : {
      ...x, status: 'rejected' as const, approvedBy: 'HR Admin',
      approvedAt: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    saveLoans(updated);
    toast.success('Loan rejected');
  };
  const disburseLoan = (id: string) => {
    const updated = loans.map(x => x.id !== id ? x : {
      ...x, status: 'disbursed' as const, disbursedDate: format(new Date(), 'yyyy-MM-dd'),
      updated_at: new Date().toISOString(),
    });
    saveLoans(updated);
    toast.success('Loan marked as disbursed');
  };
  const closeLoan = (id: string) => {
    const updated = loans.map(x => x.id !== id ? x : {
      ...x, status: 'closed' as const, updated_at: new Date().toISOString(),
    });
    saveLoans(updated);
    toast.success('Loan closed');
  };

  const approveAdvance = (id: string) => {
    const updated = advances.map(x => x.id !== id ? x : {
      ...x, status: 'approved' as const, approvedBy: 'HR Admin',
      updated_at: new Date().toISOString(),
    });
    saveAdvances(updated);
    toast.success('Advance approved');
  };
  const rejectAdvance = (id: string) => {
    const updated = advances.map(x => x.id !== id ? x : {
      ...x, status: 'rejected' as const, approvedBy: 'HR Admin',
      updated_at: new Date().toISOString(),
    });
    saveAdvances(updated);
    toast.success('Advance rejected');
  };
  const recoverAdvance = (id: string) => {
    const updated = advances.map(x => x.id !== id ? x : {
      ...x, status: 'recovered' as const, recoveredDate: format(new Date(), 'yyyy-MM-dd'),
      updated_at: new Date().toISOString(),
    });
    saveAdvances(updated);
    toast.success('Advance recovered');
  };

  const approveExpense = (id: string) => {
    const updated = expenses.map(x => x.id !== id ? x : {
      ...x, status: 'approved' as const, approvedBy: 'HR Admin',
      updated_at: new Date().toISOString(),
    });
    saveExpenses(updated);
    toast.success('Expense approved');
  };
  const rejectExpense = (id: string) => {
    const updated = expenses.map(x => x.id !== id ? x : {
      ...x, status: 'rejected' as const, approvedBy: 'HR Admin',
      updated_at: new Date().toISOString(),
    });
    saveExpenses(updated);
    toast.success('Expense rejected');
  };
  const reimburseExpense = (id: string) => {
    const updated = expenses.map(x => x.id !== id ? x : {
      ...x, status: 'reimbursed' as const, reimbursedDate: format(new Date(), 'yyyy-MM-dd'),
      updated_at: new Date().toISOString(),
    });
    saveExpenses(updated);
    toast.success('Expense reimbursed');
  };

  // ── EMI schedule view state ───────────────────────────────────
  const [emiLoanId, setEmiLoanId] = useState<string|null>(null);
  const emiSchedule = useMemo<EMIScheduleRow[]>(() => {
    if (!emiLoanId) return [];
    const loan = loans.find(l => l.id === emiLoanId);
    if (!loan || !loan.firstEMIDate) return [];
    return generateEMISchedule(loan.principalAmount, loan.tenureMonths,
      loan.interestRatePct, loan.interestType, loan.firstEMIDate);
  }, [emiLoanId, loans]);

  // ── Loan filter ───────────────────────────────────────────────
  const [loanFilter, setLoanFilter] = useState('all');
  const filteredLoans = useMemo(() =>
    loanFilter === 'all' ? loans : loans.filter(l => l.status === loanFilter),
  [loans, loanFilter]);

  // ── Expense filter ────────────────────────────────────────────
  const [expFilter, setExpFilter] = useState('all');
  const filteredExpenses = useMemo(() =>
    expFilter === 'all' ? expenses : expenses.filter(e => e.status === expFilter),
  [expenses, expFilter]);

  // ── Flexi expand ──────────────────────────────────────────────
  const [flexiExpandId, setFlexiExpandId] = useState<string|null>(null);

  // ── Stats ─────────────────────────────────────────────────────
  const activeLoansCount = loans.filter(l => l.status === 'disbursed').length;
  const pendingAdvances = advances.filter(a => a.status === 'pending').length;
  const pendingExpenses = expenses.filter(e => e.status === 'submitted').length;
  const totalFlexiAllocated = flexiAllocs.reduce((s,a) => s + a.totalFlexiAmount, 0);

  // ── EMI preview in loan sheet ─────────────────────────────────
  const emiPreview = computeEMI(loanForm.principalAmount, loanForm.tenureMonths,
    loanForm.interestRatePct, loanForm.interestType);
  const totalPayablePreview = emiPreview * loanForm.tenureMonths;

  // ── Flexi running total ───────────────────────────────────────
  const flexiAllocated = Object.values(flexiComponents).reduce((s,v) => s+v, 0);
  const flexiOverBudget = flexiAllocated > flexiTotal && flexiTotal > 0;

  return (
    <div className="space-y-4" data-keyboard-form>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Employee Finance</h2>
          <p className="text-xs text-muted-foreground">Loans · Advances · Expenses · Flexi Benefits</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Active Loans</p>
          <p className="text-2xl font-bold">{activeLoansCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Pending Advances</p>
          <p className="text-2xl font-bold">{pendingAdvances}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Pending Expenses</p>
          <p className="text-2xl font-bold">{pendingExpenses}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Total Flexi Allocated</p>
          <p className="text-2xl font-bold">₹{toIndianFormat(totalFlexiAllocated)}</p>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="loans" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" />Loans & Advances</TabsTrigger>
          <TabsTrigger value="salary-advance" className="gap-1.5"><Wallet className="h-3.5 w-3.5" />Salary Advance</TabsTrigger>
          <TabsTrigger value="expenses" className="gap-1.5"><Receipt className="h-3.5 w-3.5" />Expense Claims</TabsTrigger>
          <TabsTrigger value="flexi" className="gap-1.5"><Gift className="h-3.5 w-3.5" />Flexi Benefits</TabsTrigger>
        </TabsList>

        {/* ═══ TAB: Loans ═══ */}
        <TabsContent value="loans" className="space-y-4">
          <div className="flex items-center justify-between">
            <Select value={loanFilter} onValueChange={setLoanFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="disbursed">Disbursed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => { setLoanForm(BLANK_LOAN); setLoanSheetOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />Apply for Loan
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Emp Code</TableHead><TableHead>Employee</TableHead>
                <TableHead>Loan Type</TableHead><TableHead className="text-right">Principal</TableHead>
                <TableHead className="text-right">EMI</TableHead><TableHead>Tenure</TableHead>
                <TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLoans.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No loan applications</TableCell></TableRow>
              )}
              {filteredLoans.map(loan => (
                <React.Fragment key={loan.id}>
                  <TableRow>
                    <TableCell className="font-mono text-xs">{loan.employeeCode}</TableCell>
                    <TableCell>{loan.employeeName}</TableCell>
                    <TableCell>{loan.loanTypeName}</TableCell>
                    <TableCell className="text-right">₹{toIndianFormat(loan.principalAmount)}</TableCell>
                    <TableCell className="text-right">₹{toIndianFormat(loan.emiAmount)}</TableCell>
                    <TableCell>{loan.tenureMonths}m</TableCell>
                    <TableCell><Badge variant="outline" className={LOAN_STATUS_COLORS[loan.status]}>{loan.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {loan.status === 'pending' && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600" onClick={() => approveLoan(loan.id)}><Check className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600" onClick={() => rejectLoan(loan.id)}><X className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                        {loan.status === 'approved' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => disburseLoan(loan.id)}>Disburse</Button>
                        )}
                        {loan.status === 'disbursed' && loan.remainingBalance <= 0 && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => closeLoan(loan.id)}>Close</Button>
                        )}
                        {/* [T-T8.4-Requisition-Universal] Request Payment button · additive */}
                        <Button size="sm" variant="outline" className="h-7 text-[10px]"
                          onClick={() => navigate(`/erp/payout/requisition?type=employee_loan_disbursement&linkedId=${loan.id}`)}>Request Payment</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEmiLoanId(emiLoanId === loan.id ? null : loan.id)}>
                          {emiLoanId === loan.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {emiLoanId === loan.id && emiSchedule.length > 0 && (
                    <TableRow key={`emi-${loan.id}`}>
                      <TableCell colSpan={8} className="bg-muted/30 p-4">
                        <p className="text-sm font-semibold mb-2">EMI Schedule — {loan.loanTypeName}</p>
                        <Table>
                          <TableHeader><TableRow>
                            <TableHead>#</TableHead><TableHead>Due Date</TableHead>
                            <TableHead className="text-right">Opening</TableHead><TableHead className="text-right">EMI</TableHead>
                            <TableHead className="text-right">Principal</TableHead><TableHead className="text-right">Interest</TableHead>
                            <TableHead className="text-right">Closing</TableHead><TableHead>Status</TableHead>
                          </TableRow></TableHeader>
                          <TableBody>
                            {emiSchedule.map(row => (
                              <TableRow key={row.installment}>
                                <TableCell>{row.installment}</TableCell>
                                <TableCell>{row.dueDate}</TableCell>
                                <TableCell className="text-right">₹{toIndianFormat(row.openingBalance)}</TableCell>
                                <TableCell className="text-right">₹{toIndianFormat(row.emiAmount)}</TableCell>
                                <TableCell className="text-right">₹{toIndianFormat(row.principal)}</TableCell>
                                <TableCell className="text-right">₹{toIndianFormat(row.interest)}</TableCell>
                                <TableCell className="text-right">₹{toIndianFormat(row.closingBalance)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={
                                    row.status === 'paid' ? 'bg-green-500/10 text-green-700 border-green-500/30'
                                    : row.status === 'overdue' ? 'bg-red-500/10 text-red-700 border-red-500/30'
                                    : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                                  }>{row.status}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ═══ TAB: Salary Advance ═══ */}
        <TabsContent value="salary-advance" className="space-y-4">
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="py-3 px-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">Salary advance is a quick partial payment against current month salary. Maximum advance: 50% of monthly net salary.</p>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setAdvForm(BLANK_ADV); setAdvSheetOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />Request Advance
            </Button>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Emp Code</TableHead><TableHead>Employee</TableHead>
              <TableHead className="text-right">Amount</TableHead><TableHead>Request Date</TableHead>
              <TableHead>Recovery</TableHead><TableHead>Reason</TableHead>
              <TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {advances.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No salary advances</TableCell></TableRow>
              )}
              {advances.map(adv => (
                <TableRow key={adv.id}>
                  <TableCell className="font-mono text-xs">{adv.employeeCode}</TableCell>
                  <TableCell>{adv.employeeName}</TableCell>
                  <TableCell className="text-right">₹{toIndianFormat(adv.amount)}</TableCell>
                  <TableCell>{adv.requestDate}</TableCell>
                  <TableCell>{adv.recoveryPeriod.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="max-w-32 truncate">{adv.reason}</TableCell>
                  <TableCell><Badge variant="outline" className={
                    adv.status === 'pending' ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                    : adv.status === 'approved' ? 'bg-blue-500/10 text-blue-700 border-blue-500/30'
                    : adv.status === 'rejected' ? 'bg-red-500/10 text-red-700 border-red-500/30'
                    : 'bg-green-500/10 text-green-700 border-green-500/30'
                  }>{adv.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {adv.status === 'pending' && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600" onClick={() => approveAdvance(adv.id)}><Check className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600" onClick={() => rejectAdvance(adv.id)}><X className="h-3.5 w-3.5" /></Button>
                        </>
                      )}
                      {adv.status === 'approved' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => recoverAdvance(adv.id)}>Recovered</Button>
                      )}
                      {/* [T-T8.4-Requisition-Universal] Request Payment button · additive */}
                      <Button size="sm" variant="outline" className="h-7 text-[10px]"
                        onClick={() => navigate(`/erp/payout/requisition?type=employee_advance&linkedId=${adv.id}`)}>Request Payment</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ═══ TAB: Expense Claims ═══ */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {['all','submitted','approved','rejected','reimbursed'].map(f => (
                <Button key={f} size="sm" variant={expFilter === f ? 'default' : 'outline'} className="h-7 text-xs capitalize" onClick={() => setExpFilter(f)}>{f}</Button>
              ))}
            </div>
            <Button size="sm" onClick={() => { setExpForm(BLANK_EXP); setExpSheetOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />Submit Claim
            </Button>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Emp Code</TableHead><TableHead>Category</TableHead>
              <TableHead>Date</TableHead><TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead><TableHead>Receipt</TableHead>
              <TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No expense claims</TableCell></TableRow>
              )}
              {filteredExpenses.map(exp => (
                <TableRow key={exp.id}>
                  <TableCell className="font-mono text-xs">{exp.employeeCode}</TableCell>
                  <TableCell>{EXPENSE_CATEGORY_LABELS[exp.category]}</TableCell>
                  <TableCell>{exp.expenseDate}</TableCell>
                  <TableCell className="max-w-40 truncate">{exp.description}</TableCell>
                  <TableCell className="text-right">₹{toIndianFormat(exp.amount)}</TableCell>
                  <TableCell className="text-xs">{exp.receiptRef || '—'}</TableCell>
                  <TableCell><Badge variant="outline" className={EXPENSE_STATUS_COLORS[exp.status]}>{exp.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {exp.status === 'submitted' && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600" onClick={() => approveExpense(exp.id)}><Check className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600" onClick={() => rejectExpense(exp.id)}><X className="h-3.5 w-3.5" /></Button>
                        </>
                      )}
                      {exp.status === 'approved' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => reimburseExpense(exp.id)}>Reimburse</Button>
                      )}
                      {/* [T-T8.4-Requisition-Universal] Request Payment button · additive */}
                      <Button size="sm" variant="outline" className="h-7 text-[10px]"
                        onClick={() => navigate(`/erp/payout/requisition?type=employee_reimbursement&linkedId=${exp.id}`)}>Request Payment</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ═══ TAB: Flexi Benefits ═══ */}
        <TabsContent value="flexi" className="space-y-4">
          <Card className="bg-violet-500/5 border-violet-500/20">
            <CardContent className="py-3 px-4">
              <p className="text-sm text-violet-700 dark:text-violet-300">Flexi benefits allow employees to structure their CTC across tax-exempt components. Allocate once per FY. Unspent amounts become taxable in March.</p>
            </CardContent>
          </Card>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              FY {new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear()-1}–{new Date().getMonth() >= 3 ? String(new Date().getFullYear()+1).slice(2) : String(new Date().getFullYear()).slice(2)}
            </p>
            <Button size="sm" onClick={() => {
              setFlexiEmpId(''); setFlexiTotal(0);
              setFlexiComponents({ lta:0, medical:0, fuel:0, books:0, meal_voucher:0 });
              setFlexiSheetOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-1" />Create Allocation
            </Button>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Employee</TableHead><TableHead>FY</TableHead>
              <TableHead className="text-right">Total Flexi</TableHead>
              <TableHead className="text-right">LTA</TableHead><TableHead className="text-right">Medical</TableHead>
              <TableHead className="text-right">Fuel</TableHead><TableHead className="text-right">Books</TableHead>
              <TableHead className="text-right">Meal</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {flexiAllocs.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No flexi allocations</TableCell></TableRow>
              )}
              {flexiAllocs.map(fa => (
                <React.Fragment key={fa.id}>
                  <TableRow className="cursor-pointer" onClick={() => setFlexiExpandId(flexiExpandId === fa.id ? null : fa.id)}>
                    <TableCell>{fa.employeeName}</TableCell>
                    <TableCell>{fa.financialYear}</TableCell>
                    <TableCell className="text-right">₹{toIndianFormat(fa.totalFlexiAmount)}</TableCell>
                    {FLEXI_COMPONENTS.map(c => {
                      const comp = fa.components.find(x => x.component === c);
                      return <TableCell key={c} className="text-right">₹{toIndianFormat(comp?.allocatedAmount || 0)}</TableCell>;
                    })}
                    <TableCell><Badge variant="outline">{fa.status}</Badge></TableCell>
                  </TableRow>
                  {flexiExpandId === fa.id && (
                    <TableRow>
                      <TableCell colSpan={9} className="bg-muted/30 p-4">
                        <Table>
                          <TableHeader><TableRow>
                            <TableHead>Component</TableHead><TableHead className="text-right">Allocated</TableHead>
                            <TableHead className="text-right">Claimed</TableHead><TableHead className="text-right">Remaining</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow></TableHeader>
                          <TableBody>
                            {fa.components.map(comp => (
                              <TableRow key={comp.component}>
                                <TableCell>{FLEXI_COMPONENT_LABELS[comp.component]}</TableCell>
                                <TableCell className="text-right">₹{toIndianFormat(comp.allocatedAmount)}</TableCell>
                                <TableCell className="text-right">₹{toIndianFormat(comp.claimedAmount)}</TableCell>
                                <TableCell className="text-right">₹{toIndianFormat(comp.allocatedAmount - comp.claimedAmount)}</TableCell>
                                <TableCell><Badge variant="outline">{comp.status}</Badge></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* ═══ LOAN SHEET ═══ */}
      <Sheet open={loanSheetOpen} onOpenChange={setLoanSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Apply for Loan</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4" data-keyboard-form>
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Select value={loanForm.employeeId} onValueChange={v => {
                const emp = activeEmployees.find(e => e.id === v);
                luf('employeeId', v); luf('employeeCode', emp?.empCode || ''); luf('employeeName', emp?.displayName || '');
              }}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Loan Type *</Label>
              <Select value={loanForm.loanTypeId} onValueChange={v => {
                const lt = loanTypes.find(l => l.id === v);
                if (lt) {
                  luf('loanTypeId', v); luf('loanTypeName', lt.name);
                  luf('interestRatePct', lt.interestRatePct); luf('interestType', lt.interestType as 'simple' | 'compound' | 'nil');
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Select loan type" /></SelectTrigger>
                <SelectContent>{loanTypes.map(lt => <SelectItem key={lt.id} value={lt.id}>{lt.code} — {lt.name} ({lt.interestRatePct}%)</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Principal Amount *</Label>
              <Input {...amountInputProps} value={loanForm.principalAmount || ''} onKeyDown={onEnterNext}
                onChange={e => luf('principalAmount', parseFloat(e.target.value.replace(/,/g,'')) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tenure (months) *</Label>
              <Input type="number" value={loanForm.tenureMonths} onKeyDown={onEnterNext}
                onChange={e => luf('tenureMonths', parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>First EMI Date *</Label>
              <SmartDateInput value={loanForm.firstEMIDate} onChange={v => luf('firstEMIDate', v)} />
            </div>
            <div className="space-y-1.5">
              <Label>Disbursed Date</Label>
              <SmartDateInput value={loanForm.disbursedDate} onChange={v => luf('disbursedDate', v)} />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea value={loanForm.reason} onChange={e => luf('reason', e.target.value)} rows={2} />
            </div>
            <Separator />
            <Card className="bg-violet-500/5 border-violet-500/20">
              <CardHeader className="py-2 px-4"><CardTitle className="text-sm flex items-center gap-1.5"><Calculator className="h-4 w-4" />EMI Preview</CardTitle></CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="flex justify-between text-sm">
                  <span>Monthly EMI</span><span className="font-bold">₹{toIndianFormat(emiPreview)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Payable</span><span className="font-bold">₹{toIndianFormat(totalPayablePreview)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
          <SheetFooter>
            <Button data-primary onClick={handleLoanSave}>Submit Application</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══ ADVANCE SHEET ═══ */}
      <Sheet open={advSheetOpen} onOpenChange={setAdvSheetOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Request Salary Advance</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4" data-keyboard-form>
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Select value={advForm.employeeId} onValueChange={v => {
                const emp = activeEmployees.find(e => e.id === v);
                setAdvForm(prev => ({ ...prev, employeeId: v, employeeCode: emp?.empCode || '', employeeName: emp?.displayName || '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount *</Label>
              <Input {...amountInputProps} value={advForm.amount || ''} onKeyDown={onEnterNext}
                onChange={e => setAdvForm(prev => ({ ...prev, amount: parseFloat(e.target.value.replace(/,/g,'')) || 0 }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Recovery Period</Label>
              <Select value={advForm.recoveryPeriod} onValueChange={v => setAdvForm(prev => ({ ...prev, recoveryPeriod: v as 'same_month' | 'next_month' | 'split_2_months' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="same_month">Same Month</SelectItem>
                  <SelectItem value="next_month">Next Month</SelectItem>
                  <SelectItem value="split_2_months">Split 2 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea value={advForm.reason} onChange={e => setAdvForm(prev => ({ ...prev, reason: e.target.value }))} rows={2} />
            </div>
          </div>
          <SheetFooter>
            <Button data-primary onClick={handleAdvSave}>Submit Advance</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══ EXPENSE SHEET ═══ */}
      <Sheet open={expSheetOpen} onOpenChange={setExpSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Submit Expense Claim</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4" data-keyboard-form>
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Select value={expForm.employeeId} onValueChange={v => {
                const emp = activeEmployees.find(e => e.id === v);
                setExpForm(prev => ({ ...prev, employeeId: v, employeeCode: emp?.empCode || '', employeeName: emp?.displayName || '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Expense Date *</Label>
              <SmartDateInput value={expForm.expenseDate} onChange={v => setExpForm(prev => ({ ...prev, expenseDate: v }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={expForm.category} onValueChange={v => setExpForm(prev => ({ ...prev, category: v as ExpenseCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(EXPENSE_CATEGORY_LABELS) as Array<keyof typeof EXPENSE_CATEGORY_LABELS>).map(cat => (
                    <SelectItem key={cat} value={cat}>{EXPENSE_CATEGORY_LABELS[cat]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Input value={expForm.description} onKeyDown={onEnterNext}
                onChange={e => setExpForm(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount *</Label>
              <Input {...amountInputProps} value={expForm.amount || ''} onKeyDown={onEnterNext}
                onChange={e => setExpForm(prev => ({ ...prev, amount: parseFloat(e.target.value.replace(/,/g,'')) || 0 }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Receipt Reference</Label>
              <Input value={expForm.receiptRef} onKeyDown={onEnterNext} placeholder="filename/ref — upload Phase 2"
                onChange={e => setExpForm(prev => ({ ...prev, receiptRef: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Reimbursement Mode</Label>
              <Select value={expForm.reimbursementMode} onValueChange={v => setExpForm(prev => ({ ...prev, reimbursementMode: v as 'payroll' | 'bank_transfer' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="payroll">Via Payroll</SelectItem>
                  <SelectItem value="bank_transfer">Direct Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button data-primary onClick={handleExpSave}>Submit Claim</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══ FLEXI SHEET ═══ */}
      <Sheet open={flexiSheetOpen} onOpenChange={setFlexiSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>Create Flexi Allocation</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4" data-keyboard-form>
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Select value={flexiEmpId} onValueChange={setFlexiEmpId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Total Flexi Budget (₹) *</Label>
              <Input {...amountInputProps} value={flexiTotal || ''} onKeyDown={onEnterNext}
                onChange={e => setFlexiTotal(parseFloat(e.target.value.replace(/,/g,'')) || 0)} />
            </div>
            <Separator />
            <p className="text-sm font-semibold">Component Allocations</p>
            {FLEXI_COMPONENTS.map(comp => (
              <div key={comp} className="flex items-center gap-3">
                <Label className="w-48 text-xs">{FLEXI_COMPONENT_LABELS[comp]}</Label>
                <Input {...amountInputProps} className="w-32" value={flexiComponents[comp] || ''} onKeyDown={onEnterNext}
                  onChange={e => setFlexiComponents(prev => ({ ...prev, [comp]: parseFloat(e.target.value.replace(/,/g,'')) || 0 }))} />
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {flexiTotal > 0 ? `${Math.round((flexiComponents[comp] / flexiTotal) * 100)}%` : '—'}
                </span>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-violet-600">Allocated: ₹{toIndianFormat(flexiAllocated)} / ₹{toIndianFormat(flexiTotal)}</span>
              {flexiOverBudget && (
                <span className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />Exceeds budget by ₹{toIndianFormat(flexiAllocated - flexiTotal)}
                </span>
              )}
            </div>
          </div>
          <SheetFooter>
            <Button data-primary onClick={handleFlexiSave}>Create Allocation</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function EmployeeFinance() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <ERPHeader breadcrumbs={[{label:'Operix Core',href:'/erp/dashboard'},{label:'Pay Hub'},{label:'Employee Finance'}]} showDatePicker={false} showCompany={false}/>
        <div className="flex-1 overflow-auto p-6"><EmployeeFinancePanel /></div>
      </div>
    </SidebarProvider>
  );
}
