/**
 * demo-transactions-pay-hub.ts — Pay Hub transaction seed data
 * 3 months of payroll runs, attendance, leave requests, IT declarations, loans.
 * [JWT] Replace localStorage writes with POST /api/demo/transactions/pay-hub
 */

import type { PayrollRun, EmployeePayslip, PayslipLine } from '@/types/payroll-run';
import type { AttendanceRecord } from '@/types/attendance-entry';
import type { LeaveRequest } from '@/types/leave-management';
import type { ITDeclaration } from '@/types/it-declaration';
import { DEMO_EMPLOYEES } from './demo-seed-data';

const now = new Date().toISOString();

// ── Helper: build payslip lines from CTC ────────────────────────────────

interface PayslipTemplate {
  empId: string; empCode: string; empName: string; designation: string; dept: string;
  structCode: string; annualCTC: number; gradeId: string;
}

function buildPayslip(t: PayslipTemplate, period: string, lopDays: number = 0): EmployeePayslip {
  const monthlyCTC = t.annualCTC / 12;
  const basic = Math.round(t.annualCTC * 0.4 / 12);
  const hra = Math.round(basic * 0.5);
  const isWorker = t.gradeId === 'grade-d';
  const isExec = t.gradeId === 'grade-c';

  const lines: PayslipLine[] = [];
  let grossEarnings = 0;

  if (isWorker) {
    const wBasic = Math.round(t.annualCTC * 0.7 / 12);
    const da = Math.round(wBasic * 0.15);
    const attBonus = 500;
    lines.push(
      { headCode: 'BASIC', headName: 'Basic Salary', type: 'earning', monthly: wBasic, annual: wBasic * 12, isTaxable: true, partOfCTC: true, partOfGross: true },
      { headCode: 'DA', headName: 'Dearness Allowance', type: 'earning', monthly: da, annual: da * 12, isTaxable: true, partOfCTC: true, partOfGross: true },
      { headCode: 'SPCL', headName: 'Attendance Bonus', type: 'earning', monthly: attBonus, annual: attBonus * 12, isTaxable: true, partOfCTC: true, partOfGross: true },
    );
    grossEarnings = wBasic + da + attBonus;
    const pfWage = Math.min(wBasic, 15000);
    const empPF = Math.round(pfWage * 0.12);
    const esiWage = grossEarnings <= 21000 ? grossEarnings : 0;
    const empESI = esiWage > 0 ? Math.round(esiWage * 0.0075) : 0;
    const pt = grossEarnings > 10000 ? 200 : 0;
    lines.push(
      { headCode: 'EMP_PF', headName: 'PF Employee (12%)', type: 'deduction', monthly: empPF, annual: empPF * 12, isTaxable: false },
      ...(empESI > 0 ? [{ headCode: 'EMP_ESI', headName: 'ESI Employee', type: 'deduction' as const, monthly: empESI, annual: empESI * 12, isTaxable: false }] : []),
      { headCode: 'EMP_PT', headName: 'Professional Tax', type: 'deduction', monthly: pt, annual: pt * 12, isTaxable: false },
    );
    const totalDed = empPF + empESI + pt;
    const workDays = 26;
    const presentDays = workDays - lopDays;
    const lopFactor = lopDays > 0 ? presentDays / workDays : 1;
    return {
      employeeId: t.empId, employeeCode: t.empCode, employeeName: t.empName,
      designation: t.designation, departmentName: t.dept, payPeriod: period,
      salaryStructureCode: t.structCode, annualCTC: t.annualCTC,
      workingDays: workDays, presentDays, lopDays,
      lines, loanDeductions: [], advanceRecoveries: [],
      grossEarnings: Math.round(grossEarnings * lopFactor),
      totalDeductions: totalDed,
      netPay: Math.round(grossEarnings * lopFactor) - totalDed,
      totalEmployerCost: Math.round(grossEarnings * lopFactor) + Math.round(pfWage * 0.1317) + (esiWage > 0 ? Math.round(esiWage * 0.0325) : 0),
      pfWage, esiWage, empPF, empESI, pt, tds: 0,
      itComputation: null,
      bankAccountNo: '', bankIfsc: '', bankName: '',
      errors: [], warnings: [],
    };
  }

  // Grade A/B/C
  const conv = isExec ? 800 : (t.gradeId === 'grade-b' ? 1600 : 0);
  const med = (isExec || t.gradeId === 'grade-b') ? 1250 : 0;
  const spcl = Math.round(monthlyCTC - basic - hra - conv - med);

  lines.push(
    { headCode: 'BASIC', headName: 'Basic Salary', type: 'earning', monthly: basic, annual: basic * 12, isTaxable: true, partOfCTC: true, partOfGross: true },
    { headCode: 'HRA', headName: 'House Rent Allowance', type: 'earning', monthly: hra, annual: hra * 12, isTaxable: false, partOfCTC: true, partOfGross: true },
  );
  if (conv > 0) lines.push({ headCode: 'CONV', headName: 'Conveyance Allowance', type: 'earning', monthly: conv, annual: conv * 12, isTaxable: false, partOfCTC: true, partOfGross: true });
  if (med > 0) lines.push({ headCode: 'MED', headName: 'Medical Allowance', type: 'earning', monthly: med, annual: med * 12, isTaxable: false, partOfCTC: true, partOfGross: true });
  lines.push({ headCode: 'SPCL', headName: 'Special Allowance', type: 'earning', monthly: spcl, annual: spcl * 12, isTaxable: true, partOfCTC: true, partOfGross: true });

  grossEarnings = basic + hra + conv + med + spcl;
  const pfWage = Math.min(basic, 15000);
  const empPF = Math.round(pfWage * 0.12);
  const esiWage = grossEarnings <= 21000 ? grossEarnings : 0;
  const empESI = esiWage > 0 ? Math.round(esiWage * 0.0075) : 0;
  const pt = grossEarnings > 10000 ? 200 : 0;
  const tds = t.annualCTC >= 1000000 ? Math.round(t.annualCTC * 0.05 / 12) : (t.annualCTC >= 500000 ? Math.round(t.annualCTC * 0.025 / 12) : 0);

  lines.push(
    { headCode: 'EMP_PF', headName: 'PF Employee (12%)', type: 'deduction', monthly: empPF, annual: empPF * 12, isTaxable: false },
    { headCode: 'EMP_PT', headName: 'Professional Tax', type: 'deduction', monthly: pt, annual: pt * 12, isTaxable: false },
  );
  if (tds > 0) lines.push({ headCode: 'TDS', headName: 'TDS on Salary', type: 'deduction', monthly: tds, annual: tds * 12, isTaxable: false });
  if (empESI > 0) lines.push({ headCode: 'EMP_ESI', headName: 'ESI Employee', type: 'deduction', monthly: empESI, annual: empESI * 12, isTaxable: false });

  const totalDed = empPF + pt + tds + empESI;
  const workDays = 26;
  const presentDays = workDays - lopDays;

  return {
    employeeId: t.empId, employeeCode: t.empCode, employeeName: t.empName,
    designation: t.designation, departmentName: t.dept, payPeriod: period,
    salaryStructureCode: t.structCode, annualCTC: t.annualCTC,
    workingDays: workDays, presentDays, lopDays,
    lines, loanDeductions: [], advanceRecoveries: [],
    grossEarnings, totalDeductions: totalDed, netPay: grossEarnings - totalDed,
    totalEmployerCost: grossEarnings + Math.round(pfWage * 0.1317) + (esiWage > 0 ? Math.round(esiWage * 0.0325) : 0),
    pfWage, esiWage, empPF, empESI, pt, tds,
    itComputation: null,
    bankAccountNo: '', bankIfsc: '', bankName: '',
    errors: [], warnings: [],
  };
}

// ── 4.1 Payroll Runs ────────────────────────────────────────────────────

function buildTemplates(): PayslipTemplate[] {
  return DEMO_EMPLOYEES.map(e => ({
    empId: e.id, empCode: e.empCode, empName: e.displayName,
    designation: e.designation, dept: e.departmentName,
    structCode: e.salaryStructureId, annualCTC: e.annualCTC,
    gradeId: e.gradeId,
  }));
}

function buildRun(period: string, label: string, status: 'locked' | 'approved' | 'draft', lopMap: Record<string, number> = {}, excludeIds: string[] = []): PayrollRun {
  const templates = buildTemplates().filter(t => !excludeIds.includes(t.empId));
  const payslips = templates.map(t => buildPayslip(t, period, lopMap[t.empId] ?? 0));
  const totalGross = payslips.reduce((s, p) => s + p.grossEarnings, 0);
  const totalDed = payslips.reduce((s, p) => s + p.totalDeductions, 0);
  const totalNet = payslips.reduce((s, p) => s + p.netPay, 0);
  const totalER = payslips.reduce((s, p) => s + p.totalEmployerCost, 0);
  return {
    id: `pr-${period}`, payPeriod: period, periodLabel: label,
    status, totalEmployees: payslips.length, totalGross, totalDeductions: totalDed,
    totalNet, totalEmployerCost: totalER, payslips,
    approvedBy: status !== 'draft' ? 'Arjun Mehta — MD' : '',
    approvedAt: status !== 'draft' ? now : '',
    postedAt: status === 'locked' ? now : '',
    lockedAt: status === 'locked' ? now : '',
    lockedBy: status === 'locked' ? 'Priya Sharma' : '',
    unlockReason: '',
    entityId: 'e1', notes: '', created_at: now, updated_at: now,
  };
}

export const DEMO_PAYROLL_RUNS: PayrollRun[] = [
  buildRun('2026-01', 'January 2026', 'locked'),
  buildRun('2026-02', 'February 2026', 'locked', { 'emp000015': 3 }),
  buildRun('2026-03', 'March 2026', 'draft', {}, ['emp000014']),
];

// ── 4.2 Attendance Records — generated at runtime ───────────────────────

export function generateAttendanceRecords(
  employeeIds: string[],
  months: string[],
  holidayDates: string[],
): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const holidaySet = new Set(holidayDates);
  const empMap = new Map(DEMO_EMPLOYEES.map(e => [e.id, e]));

  // Deterministic seed
  let seed = 42;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed % 100) / 100; };

  for (const month of months) {
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();

    for (const empId of employeeIds) {
      const e = empMap.get(empId);
      if (!e) continue;

      for (let d = 1; d <= daysInMonth; d++) {
        const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayOfWeek = new Date(y, m - 1, d).getDay();
        const isWeeklyOff = dayOfWeek === 0;
        const isHoliday = holidaySet.has(date);

        let typeCode = 'P';
        let typeColor = '#22c55e';
        let checkIn = e.shiftCode === 'MRN' ? '06:00' : '09:00';
        let checkOut = e.shiftCode === 'MRN' ? '14:00' : '18:00';
        let workHours = e.shiftCode === 'MRN' ? 7.5 : 8.5;

        if (isWeeklyOff || isHoliday) {
          typeCode = isWeeklyOff ? 'WO' : 'HO';
          typeColor = '#94a3b8';
          checkIn = '';
          checkOut = '';
          workHours = 0;
        } else {
          const r = rand();
          if (r < 0.02) { typeCode = 'A'; typeColor = '#ef4444'; checkIn = ''; checkOut = ''; workHours = 0; }
          else if (r < 0.07) { typeCode = 'HD'; typeColor = '#f59e0b'; workHours = 4; }
        }

        records.push({
          id: `att-${empId}-${date}`,
          employeeId: empId,
          employeeCode: e.empCode,
          employeeName: e.displayName,
          date,
          attendanceTypeId: `at-demo-${typeCode.toLowerCase()}`,
          attendanceTypeCode: typeCode,
          attendanceTypeColor: typeColor,
          checkIn,
          checkOut,
          workHours,
          breakHours: workHours > 0 ? (e.shiftCode === 'MRN' ? 0.5 : 1) : 0,
          overtimeHours: 0,
          isLate: false,
          lateMinutes: 0,
          isEarlyOut: false,
          earlyOutMinutes: 0,
          source: 'biometric',
          shiftCode: e.shiftCode,
          scheduledIn: checkIn,
          scheduledOut: checkOut,
          remarks: '',
          isHoliday,
          isWeeklyOff,
          regularizationStatus: 'none',
          created_at: now,
          updated_at: now,
        });
      }
    }
  }
  return records;
}

// ── 4.3 Leave Requests ──────────────────────────────────────────────────

export const DEMO_LEAVE_REQUESTS: LeaveRequest[] = [
  { id: 'lr-001', employeeId: 'emp000008', employeeCode: 'EMP-000008', employeeName: 'Kavitha Nair', departmentName: 'Human Resources',
    leaveTypeId: 'lt-demo-cl', leaveTypeCode: 'CL', leaveTypeName: 'Casual Leave',
    fromDate: '2026-01-06', toDate: '2026-01-07', halfDay: false, halfDaySession: '', totalDays: 2,
    reason: 'Personal work', documentRef: '', status: 'approved',
    approverId: 'emp000004', approverName: 'Sunita Patel', approvedAt: '2026-01-03', approverRemarks: 'Approved',
    cancelledAt: '', cancelReason: '', created_at: now, updated_at: now },
  { id: 'lr-002', employeeId: 'emp000009', employeeCode: 'EMP-000009', employeeName: 'Mohan Das', departmentName: 'Production',
    leaveTypeId: 'lt-demo-sl', leaveTypeCode: 'SL', leaveTypeName: 'Sick Leave',
    fromDate: '2026-01-20', toDate: '2026-01-22', halfDay: false, halfDaySession: '', totalDays: 3,
    reason: 'Medical treatment — certificate attached', documentRef: 'med-cert-mohan-jan26.pdf', status: 'approved',
    approverId: 'emp000003', approverName: 'Rahul Gupta', approvedAt: '2026-01-20', approverRemarks: 'Medical certificate verified',
    cancelledAt: '', cancelReason: '', created_at: now, updated_at: now },
  { id: 'lr-003', employeeId: 'emp000007', employeeCode: 'EMP-000007', employeeName: 'Vijay Kumar', departmentName: 'Purchase',
    leaveTypeId: 'lt-demo-el', leaveTypeCode: 'EL', leaveTypeName: 'Earned Leave',
    fromDate: '2026-02-10', toDate: '2026-02-14', halfDay: false, halfDaySession: '', totalDays: 5,
    reason: 'Family vacation', documentRef: '', status: 'approved',
    approverId: 'emp000005', approverName: 'Amit Singh', approvedAt: '2026-02-01', approverRemarks: 'Approved',
    cancelledAt: '', cancelReason: '', created_at: now, updated_at: now },
  { id: 'lr-004', employeeId: 'emp000010', employeeCode: 'EMP-000010', employeeName: 'Rekha Agarwal', departmentName: 'Administration',
    leaveTypeId: 'lt-demo-cl', leaveTypeCode: 'CL', leaveTypeName: 'Casual Leave',
    fromDate: '2026-02-24', toDate: '2026-02-24', halfDay: false, halfDaySession: '', totalDays: 1,
    reason: 'Personal work', documentRef: '', status: 'pending',
    approverId: 'emp000004', approverName: 'Sunita Patel', approvedAt: '', approverRemarks: '',
    cancelledAt: '', cancelReason: '', created_at: '2026-02-20T10:00:00Z', updated_at: '2026-02-20T10:00:00Z' },
  { id: 'lr-005', employeeId: 'emp000014', employeeCode: 'EMP-000014', employeeName: 'Pooja Iyer', departmentName: 'Sales',
    leaveTypeId: 'lt-demo-ml', leaveTypeCode: 'ML', leaveTypeName: 'Maternity Leave',
    fromDate: '2026-02-15', toDate: '2026-08-14', halfDay: false, halfDaySession: '', totalDays: 182,
    reason: 'Maternity leave — LWP exempted', documentRef: '', status: 'approved',
    approverId: 'emp000005', approverName: 'Amit Singh', approvedAt: '2026-01-30', approverRemarks: 'Approved as per policy',
    cancelledAt: '', cancelReason: '', created_at: now, updated_at: now },
  { id: 'lr-006', employeeId: 'emp000015', employeeCode: 'EMP-000015', employeeName: 'Suresh Naidu', departmentName: 'Production',
    leaveTypeId: 'lt-demo-cl', leaveTypeCode: 'CL', leaveTypeName: 'Casual Leave',
    fromDate: '2026-03-05', toDate: '2026-03-05', halfDay: false, halfDaySession: '', totalDays: 1,
    reason: 'Personal', documentRef: '', status: 'rejected',
    approverId: 'emp000009', approverName: 'Mohan Das', approvedAt: '2026-03-04', approverRemarks: 'Consecutive CL limit exceeded',
    cancelledAt: '', cancelReason: '', created_at: now, updated_at: now },
  { id: 'lr-007', employeeId: 'emp000006', employeeCode: 'EMP-000006', employeeName: 'Deepika Rao', departmentName: 'Finance',
    leaveTypeId: 'lt-demo-co', leaveTypeCode: 'CO', leaveTypeName: 'Compensatory Off',
    fromDate: '2026-03-10', toDate: '2026-03-10', halfDay: false, halfDaySession: '', totalDays: 1,
    reason: 'Comp off for overtime on 2026-03-02', documentRef: '', status: 'approved',
    approverId: 'emp000002', approverName: 'Priya Sharma', approvedAt: '2026-03-08', approverRemarks: 'Approved',
    cancelledAt: '', cancelReason: '', created_at: now, updated_at: now },
  { id: 'lr-008', employeeId: 'emp000003', employeeCode: 'EMP-000003', employeeName: 'Rahul Gupta', departmentName: 'Production',
    leaveTypeId: 'lt-demo-el', leaveTypeCode: 'EL', leaveTypeName: 'Earned Leave',
    fromDate: '2026-03-25', toDate: '2026-03-28', halfDay: false, halfDaySession: '', totalDays: 4,
    reason: 'Advance notice — planned leave', documentRef: '', status: 'pending',
    approverId: 'emp000001', approverName: 'Arjun Mehta', approvedAt: '', approverRemarks: '',
    cancelledAt: '', cancelReason: '', created_at: now, updated_at: now },
];

// ── 4.4 IT Declarations ────────────────────────────────────────────────

function itDecl(
  empId: string, empCode: string, empName: string,
  ppf: number, elss: number, lic: number, nsc: number, tuition: number,
  medSelf: number, medParent: number, eduLoan: number, donations: number,
  hraRent: number, homeLoanInt: number, homeLoanPrin: number,
): ITDeclaration {
  const total80C = Math.min(ppf + elss + lic + nsc + tuition + homeLoanPrin, 150000);
  const total80D = Math.min(medSelf + medParent, 75000);
  const totalDed = total80C + total80D + eduLoan + Math.min(donations, 100000);
  return {
    id: `itd-${empCode}`, employeeId: empId, employeeCode: empCode, employeeName: empName,
    financialYear: '2025-26', regime: 'old',
    pf: 0, vpf: 0, elss, ppf, licPremium: lic, tuitionFees: tuition,
    homeLoanPrincipal: homeLoanPrin, nscPurchase: nsc, otherSection80C: 0,
    medicalInsuranceSelf: medSelf, medicalInsuranceParents: medParent,
    educationLoanInterest: eduLoan, donations80G: donations, savingsInterest80TTA: 0,
    hra: hraRent > 0 ? { landlordName: 'Landlord', landlordPAN: '', rentPerMonth: hraRent, cityType: 'metro', rentFromDate: '2025-04-01', rentToDate: '2026-03-31' } : null,
    homeLoan: homeLoanInt > 0 ? { lenderName: 'HDFC Home Loans', loanAccountNo: 'HL-12345678', interestPaid: homeLoanInt, principalPaid: homeLoanPrin, propertyCity: 'Mumbai' } : null,
    prevEmployerGross: 0, prevEmployerTDS: 0, prevEmployerPF: 0,
    total80C, totalDeductions: totalDed,
    isSubmitted: true, submittedAt: now, hrStatus: 'verified', proofs: [],
    created_at: now, updated_at: now,
  };
}

export const DEMO_IT_DECLARATIONS: ITDeclaration[] = [
  itDecl('emp000001', 'EMP-000001', 'Arjun Mehta', 150000, 0, 0, 0, 0, 25000, 0, 0, 0, 0, 200000, 0),
  itDecl('emp000002', 'EMP-000002', 'Priya Sharma', 0, 150000, 0, 0, 0, 25000, 0, 12000, 0, 0, 0, 0),
  itDecl('emp000003', 'EMP-000003', 'Rahul Gupta', 60000, 0, 45000, 45000, 0, 0, 0, 0, 0, 15000, 0, 0),
  itDecl('emp000004', 'EMP-000004', 'Sunita Patel', 0, 78000, 72000, 0, 0, 15000, 0, 0, 0, 12000, 0, 0),
  itDecl('emp000005', 'EMP-000005', 'Amit Singh', 150000, 0, 0, 0, 0, 25000, 0, 0, 0, 0, 180000, 0),
  itDecl('emp000006', 'EMP-000006', 'Deepika Rao', 0, 0, 36000, 0, 0, 0, 0, 0, 0, 18000, 0, 0),
  itDecl('emp000007', 'EMP-000007', 'Vijay Kumar', 0, 30000, 30000, 0, 0, 0, 0, 0, 0, 10000, 0, 0),
  itDecl('emp000009', 'EMP-000009', 'Mohan Das', 0, 0, 48000, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  itDecl('emp000011', 'EMP-000011', 'Santosh Jha', 120000, 0, 30000, 0, 0, 15000, 0, 24000, 0, 0, 0, 0),
  itDecl('emp000013', 'EMP-000013', 'Ravi Krishnan', 0, 150000, 0, 0, 0, 25000, 0, 0, 0, 0, 200000, 0),
];

// ── 4.5 Loans and Salary Advances ──────────────────────────────────────

export interface DemoLoanApplication {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  loanTypeId: string;
  loanTypeName: string;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  sanctionDate: string;
  firstEmiDate: string;
  remainingBalance: number;
  emisPaid: number;
  status: 'active' | 'closed';
  closedDate: string;
}

export const DEMO_LOAN_APPLICATIONS: DemoLoanApplication[] = [
  { id: 'loan-001', employeeId: 'emp000007', employeeCode: 'EMP-000007', employeeName: 'Vijay Kumar',
    loanTypeId: 'lnt-demo-01', loanTypeName: 'Festival Advance',
    principalAmount: 50000, interestRate: 0, tenureMonths: 10, emiAmount: 5000,
    sanctionDate: '2025-11-01', firstEmiDate: '2025-12-01', remainingBalance: 20000, emisPaid: 6, status: 'active', closedDate: '' },
  { id: 'loan-002', employeeId: 'emp000009', employeeCode: 'EMP-000009', employeeName: 'Mohan Das',
    loanTypeId: 'lnt-demo-02', loanTypeName: 'Personal Loan',
    principalAmount: 100000, interestRate: 10, tenureMonths: 18, emiAmount: 6000,
    sanctionDate: '2025-07-01', firstEmiDate: '2025-08-01', remainingBalance: 54000, emisPaid: 9, status: 'active', closedDate: '' },
  { id: 'loan-003', employeeId: 'emp000010', employeeCode: 'EMP-000010', employeeName: 'Rekha Agarwal',
    loanTypeId: 'lnt-demo-01', loanTypeName: 'Laptop Advance',
    principalAmount: 30000, interestRate: 0, tenureMonths: 12, emiAmount: 2500,
    sanctionDate: '2025-01-01', firstEmiDate: '2025-02-01', remainingBalance: 0, emisPaid: 12, status: 'closed', closedDate: '2025-12-31' },
];

export interface DemoSalaryAdvance {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  amount: number;
  againstPeriod: string;
  deductedInPeriod: string;
  status: 'active' | 'closed';
}

export const DEMO_SALARY_ADVANCES: DemoSalaryAdvance[] = [
  { id: 'adv-001', employeeId: 'emp000015', employeeCode: 'EMP-000015', employeeName: 'Suresh Naidu',
    amount: 8000, againstPeriod: '2026-01', deductedInPeriod: '2026-01', status: 'closed' },
];
