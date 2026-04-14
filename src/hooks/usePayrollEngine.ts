/**
 * usePayrollEngine.ts — Sprint 7 Payroll computation engines + CRUD
 * [JWT] GET/POST/PUT for payroll runs and salary holds
 */
import { useState } from 'react';
import { format, getDaysInMonth } from 'date-fns';
import { toast } from 'sonner';
import type { PayrollRun, EmployeePayslip, PayslipLine, ITComputation, SalaryHold } from '@/types/payroll-run';
import { PAYROLL_RUNS_KEY, SALARY_HOLDS_KEY } from '@/types/payroll-run';
import type { Employee } from '@/types/employee';
import type { SalaryStructure, PayHead } from '@/types/pay-hub';
import type { AttendanceRecord } from '@/types/attendance-entry';
import { EMPLOYEES_KEY } from '@/types/employee';
import { SALARY_STRUCTURES_KEY, PAY_HEADS_KEY } from '@/types/pay-hub';
import { ATTENDANCE_RECORDS_KEY } from '@/types/attendance-entry';
import { PROFESSIONAL_TAX_SLABS, IT_SLABS_NEW_REGIME, IT_SLABS_OLD_REGIME, SURCHARGE_RATES }
  from '@/data/payroll-statutory-seed-data';

const loadRuns = (): PayrollRun[] => {
  try {
    // [JWT] GET /api/pay-hub/payroll/runs
    const raw = localStorage.getItem(PAYROLL_RUNS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
};
const saveRuns = (items: PayrollRun[]) => {
  // [JWT] PUT /api/pay-hub/payroll/runs
  localStorage.setItem(PAYROLL_RUNS_KEY, JSON.stringify(items));
};
const loadHolds = (): SalaryHold[] => {
  try {
    // [JWT] GET /api/pay-hub/payroll/holds
    const raw = localStorage.getItem(SALARY_HOLDS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
};
const saveHolds = (items: SalaryHold[]) => {
  // [JWT] PUT /api/pay-hub/payroll/holds
  localStorage.setItem(SALARY_HOLDS_KEY, JSON.stringify(items));
};

// ── computeCTCBreakdown ──────────────────────────────────────────
// Extended from SalaryStructureMaster.computeBreakdown.
// Returns monthly amounts for all components in the structure.
export function computeCTCBreakdown(
  annualCTC: number,
  structure: SalaryStructure,
  payHeads: PayHead[]
): PayslipLine[] {
  if (annualCTC <= 0 || !structure) return [];
  const monthlyCTC = annualCTC / 12;
  let basic = 0, gross = 0;

  // Pass 1: compute BASIC
  const basicComp = structure.components.find(c => c.payHeadCode === 'BASIC');
  if (basicComp) {
    if (basicComp.calculationType === 'percentage_ctc')
      basic = (annualCTC * basicComp.calculationValue / 100) / 12;
    else if (basicComp.calculationType === 'fixed')
      basic = basicComp.calculationValue;
    else basic = monthlyCTC * 0.4;
  } else {
    basic = monthlyCTC * 0.4;
  }

  // Pass 2: compute all components sequentially
  const lines: PayslipLine[] = [];
  let totalEarnings = 0;
  const sorted = [...structure.components].sort((a, b) => a.sortOrder - b.sortOrder);

  sorted.forEach(comp => {
    if (comp.calculationType === 'balancing') return; // filled in pass 3
    const ph = payHeads.find(h => h.id === comp.payHeadId);
    if (!ph || ph.status !== 'active') return;

    let val = 0;
    if (comp.calculationType === 'percentage_ctc')
      val = (annualCTC * comp.calculationValue / 100) / 12;
    else if (comp.calculationType === 'percentage_basic')
      val = basic * comp.calculationValue / 100;
    else if (comp.calculationType === 'percentage_gross')
      val = gross * comp.calculationValue / 100;
    else if (comp.calculationType === 'fixed')
      val = comp.calculationValue;
    else if (comp.calculationType === 'slab' || comp.calculationType === 'computed')
      val = 0; // PT and TDS resolved later

    // Apply ceiling
    if (comp.maxValueMonthly > 0 && val > comp.maxValueMonthly) val = comp.maxValueMonthly;
    // Apply ESI conditional ceiling
    if (ph.conditionalMaxWage > 0 && gross > ph.conditionalMaxWage) val = 0;

    val = Math.round(val);
    if (ph.type === 'earning') { totalEarnings += val; gross += val; }

    lines.push({
      headCode: ph.code, headName: ph.name, headShortName: ph.shortName,
      type: ph.type as PayslipLine['type'],
      monthly: val, annual: val * 12,
      isTaxable: ph.taxable, partOfCTC: ph.partOfCTC, partOfGross: ph.partOfGross,
    });
  });

  // Pass 3: fill balancing component (SPCL)
  const balComp = sorted.find(c => c.calculationType === 'balancing');
  if (balComp) {
    const ph = payHeads.find(h => h.id === balComp.payHeadId);
    if (ph) {
      const targetGross = monthlyCTC;
      const balVal = Math.max(0, Math.round(targetGross - totalEarnings));
      lines.push({
        headCode: ph.code, headName: ph.name, headShortName: ph.shortName,
        type: 'earning',
        monthly: balVal, annual: balVal * 12,
        isTaxable: ph.taxable, partOfCTC: ph.partOfCTC, partOfGross: ph.partOfGross,
      });
    }
  }

  return lines;
}

// ── computeLOPDays ───────────────────────────────────────────────
// LOP = Absent days + (0.5 × half-day unpaid days)
export function computeLOPDays(
  employeeId: string,
  payPeriod: string,    // "YYYY-MM"
  attendanceRecords: AttendanceRecord[]
): number {
  const prefix = payPeriod; // records have date: 'YYYY-MM-DD'
  const empRecords = attendanceRecords.filter(
    r => r.employeeId === employeeId && r.date.startsWith(prefix)
  );
  let lop = 0;
  empRecords.forEach(r => {
    const code = r.attendanceTypeCode.toUpperCase();
    if (code === 'A') lop += 1;           // Absent = 1 day LOP
    else if (code === 'HD') lop += 0.5;  // Half Day = 0.5 day LOP
  });
  return Math.round(lop * 2) / 2; // round to nearest 0.5
}

// ── applyLOP — reduce earnings proportionally ────────────────────
export function applyLOP(
  lines: PayslipLine[],
  lopDays: number,
  workingDays: number
): PayslipLine[] {
  if (lopDays <= 0 || workingDays <= 0) return lines;
  const deductFactor = lopDays / workingDays;
  return lines.map(l => {
    if (l.type !== 'earning') return l;
    const reduced = Math.round(l.monthly * (1 - deductFactor));
    return { ...l, monthly: reduced, annual: reduced * 12 };
  });
}

// ── computePT ────────────────────────────────────────────────────
// Looks up state slab from PROFESSIONAL_TAX_SLABS, returns monthly PT
export function computePT(grossMonthly: number, stateCode: string): number {
  if (!stateCode) return 0;
  const stateSlabs = PROFESSIONAL_TAX_SLABS.filter(s => s.stateCode === stateCode);
  if (!stateSlabs.length) return 0;
  for (const slab of stateSlabs) {
    const inRange = (g: number) => g >= slab.slabFrom &&
      (slab.slabTo === null || g <= slab.slabTo);
    if (inRange(grossMonthly)) return slab.monthlyTax;
  }
  return 0;
}

// ── computeMonthlyTDS ─────────────────────────────────────────────
// Full IT computation per approved plan — Tally Prime 7 level.
export function computeMonthlyTDS(
  annualGrossSalary: number,
  regime: 'old' | 'new',
  payPeriod: string,        // "YYYY-MM"
  previousTDSThisYear: number
): ITComputation {
  const month = parseInt(payPeriod.split('-')[1], 10);
  const fyMonth = month >= 4 ? month - 3 : month + 9;
  const remainingMonths = Math.max(1, 13 - fyMonth);

  const stdDeduction = regime === 'new' ? 75000 : 50000;
  const taxableIncome = Math.max(0, annualGrossSalary - stdDeduction);

  const slabs = regime === 'new' ? IT_SLABS_NEW_REGIME : IT_SLABS_OLD_REGIME;
  let taxOnIncome = 0;
  slabs.forEach(slab => {
    if (taxableIncome <= slab.incomeFrom) return;
    const upper = slab.incomeTo ?? taxableIncome;
    const taxable = Math.min(taxableIncome, upper) - slab.incomeFrom;
    if (taxable > 0) taxOnIncome += (taxable * slab.ratePercent) / 100;
  });

  let rebate87A = 0;
  if (regime === 'new' && taxableIncome <= 1200000) rebate87A = Math.min(taxOnIncome, 60000);
  else if (regime === 'old' && taxableIncome <= 500000) rebate87A = Math.min(taxOnIncome, 12500);

  const taxAfterRebate = Math.max(0, taxOnIncome - rebate87A);

  let surcharge = 0;
  for (const s of SURCHARGE_RATES) {
    if (taxableIncome > s.incomeFrom && (s.incomeTo === null || taxableIncome <= s.incomeTo)) {
      surcharge = taxAfterRebate * s.ratePercent / 100;
      break;
    }
  }

  const taxWithSurcharge = taxAfterRebate + surcharge;
  const cess = Math.round(taxWithSurcharge * 0.04);

  const totalAnnualTax = Math.round(taxAfterRebate + surcharge + cess);
  const remainingTax = Math.max(0, totalAnnualTax - previousTDSThisYear);
  const monthlyTDS = Math.round(remainingTax / remainingMonths);

  return {
    regime: regime === 'new' ? 'New Regime FY 2025-26' : 'Old Regime',
    grossAnnualSalary: Math.round(annualGrossSalary),
    standardDeduction: stdDeduction,
    taxableIncome: Math.round(taxableIncome),
    taxBeforeCess: Math.round(taxOnIncome - rebate87A + surcharge),
    surcharge: Math.round(surcharge),
    cess,
    rebate87A: Math.round(rebate87A),
    totalAnnualTax,
    monthlyTDS,
    remainingMonths,
  };
}

// ── computeEmployeePayslip ────────────────────────────────────────
export function computeEmployeePayslip(
  employee: Employee,
  payPeriod: string,
  structures: SalaryStructure[],
  payHeads: PayHead[],
  attendanceRecords: AttendanceRecord[],
  holds: SalaryHold[]
): EmployeePayslip {
  const errors: string[] = [];
  const warnings: string[] = [];

  const isOnHold = holds.some(h =>
    h.employeeId === employee.id && h.status === 'active' &&
    h.fromPeriod <= payPeriod && (h.toPeriod === '' || h.toPeriod >= payPeriod)
  );
  if (isOnHold) {
    warnings.push('Salary is on hold for this period');
  }

  const structure = structures.find(s => s.id === employee.salaryStructureId && s.status === 'active');
  if (!structure) {
    errors.push('No active salary structure assigned');
  }
  if (!employee.annualCTC || employee.annualCTC <= 0) {
    errors.push('Annual CTC is ₹0 or not set');
  }

  if (errors.length > 0 || !structure) {
    return {
      employeeId: employee.id, employeeCode: employee.empCode,
      employeeName: employee.displayName, designation: employee.designation,
      departmentName: employee.departmentName, payPeriod,
      salaryStructureCode: '', annualCTC: employee.annualCTC,
      workingDays: 0, presentDays: 0, lopDays: 0,
      lines: [], grossEarnings: 0, totalDeductions: 0, netPay: 0,
      totalEmployerCost: 0, pfWage: 0, esiWage: 0,
      empPF: 0, empESI: 0, pt: 0, tds: 0, itComputation: null,
      bankAccountNo: employee.bankAccountNo, bankIfsc: employee.bankIfsc, bankName: employee.bankName,
      errors, warnings,
    };
  }

  // 1. CTC breakdown
  let lines = computeCTCBreakdown(employee.annualCTC, structure, payHeads);

  // 2. Working days and LOP
  const [year, monthStr] = payPeriod.split('-');
  const workingDays = getDaysInMonth(new Date(parseInt(year), parseInt(monthStr) - 1));
  const lopDays = computeLOPDays(employee.id, payPeriod, attendanceRecords);
  const presentDays = Math.max(0, workingDays - lopDays);
  if (lopDays > 0) lines = applyLOP(lines, lopDays, workingDays);

  // 3. PT
  const earnings = lines.filter(l => l.type === 'earning');
  const grossEarnings = earnings.reduce((s, l) => s + l.monthly, 0);
  const ptStateCode = employee.ptStateCode ||
    (employee.workLocation?.split('-')[0] || '').trim().toUpperCase();
  const ptAmt = employee.pfApplicable !== false ? computePT(grossEarnings, ptStateCode) : 0;

  // 4. PF
  const pfCeiling = employee.pfWageCeilingOverride > 0 ? employee.pfWageCeilingOverride : 15000;
  const basicLine = lines.find(l => l.headCode === 'BASIC');
  const daLine = lines.find(l => l.headCode === 'DA');
  const basicPlusDA = (basicLine?.monthly || 0) + (daLine?.monthly || 0);
  const pfWage = Math.min(basicPlusDA, pfCeiling);
  const empPF = employee.pfApplicable ? Math.round(pfWage * 0.12) : 0;
  const erEPF = employee.pfApplicable ? Math.round(pfWage * 0.0367) : 0;
  const erEPS = employee.pfApplicable ? Math.min(Math.round(pfWage * 0.0833), 1250) : 0;
  const erEDLI = employee.pfApplicable ? Math.min(Math.round(pfWage * 0.005), 75) : 0;

  // 5. ESI
  const esiWage = (employee.esiApplicable && grossEarnings <= 21000) ? grossEarnings : 0;
  const empESI = esiWage > 0 ? Math.round(esiWage * 0.0075) : 0;
  const erESI = esiWage > 0 ? Math.round(esiWage * 0.0325) : 0;

  // 6. TDS
  const taxableAnnual = lines
    .filter(l => l.isTaxable && l.type === 'earning')
    .reduce((s, l) => s + l.annual, 0);
  let itComp: ITComputation | null = null;
  let tdsAmt = 0;
  if (employee.tdsApplicable) {
    itComp = computeMonthlyTDS(taxableAnnual, employee.taxRegime || 'new', payPeriod, 0);
    tdsAmt = itComp.monthlyTDS;
  }

  // 7. Resolve computed/slab deduction lines
  lines = lines.map(l => {
    if (l.headCode === 'PT') return { ...l, monthly: ptAmt, annual: ptAmt * 12 };
    if (l.headCode === 'EMP_PF') return { ...l, monthly: empPF, annual: empPF * 12 };
    if (l.headCode === 'EMP_ESI') return { ...l, monthly: empESI, annual: empESI * 12 };
    if (l.headCode === 'TDS') return { ...l, monthly: tdsAmt, annual: tdsAmt * 12 };
    if (l.headCode === 'ER_EPF') return { ...l, monthly: erEPF, annual: erEPF * 12 };
    if (l.headCode === 'ER_EPS') return { ...l, monthly: erEPS, annual: erEPS * 12 };
    if (l.headCode === 'ER_EDLI') return { ...l, monthly: erEDLI, annual: erEDLI * 12 };
    if (l.headCode === 'ER_ESI') return { ...l, monthly: erESI, annual: erESI * 12 };
    return l;
  });

  // 8. Totals
  const totalDeductions = lines.filter(l => l.type === 'deduction').reduce((s, l) => s + l.monthly, 0);
  const erContribs = lines.filter(l => l.type === 'employer_contribution').reduce((s, l) => s + l.monthly, 0);
  const netPay = grossEarnings - totalDeductions;
  const totalEmployerCost = grossEarnings + erContribs;

  return {
    employeeId: employee.id, employeeCode: employee.empCode,
    employeeName: employee.displayName, designation: employee.designation,
    departmentName: employee.departmentName, payPeriod,
    salaryStructureCode: structure.code,
    annualCTC: employee.annualCTC,
    workingDays, presentDays, lopDays,
    lines, grossEarnings, totalDeductions, netPay, totalEmployerCost,
    pfWage, esiWage, empPF, empESI, pt: ptAmt, tds: tdsAmt, itComputation: itComp,
    bankAccountNo: employee.bankAccountNo, bankIfsc: employee.bankIfsc, bankName: employee.bankName,
    errors, warnings,
  };
}

// ── Main hook ─────────────────────────────────────────────────────
export function usePayrollEngine() {
  const [runs, setRuns] = useState<PayrollRun[]>(loadRuns);
  const [holds, setHolds] = useState<SalaryHold[]>(loadHolds);

  const calculatePayroll = (payPeriod: string): PayrollRun => {
    const employees: Employee[] = (() => {
      try {
        // [JWT] GET /api/pay-hub/employees
        const raw = localStorage.getItem(EMPLOYEES_KEY);
        return raw ? (JSON.parse(raw) as Employee[]).filter(e => e.status === 'active') : [];
      } catch { return []; }
    })();
    const structures: SalaryStructure[] = (() => {
      try {
        // [JWT] GET /api/pay-hub/masters/salary-structures
        const raw = localStorage.getItem(SALARY_STRUCTURES_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
    })();
    const payHeadsData: PayHead[] = (() => {
      try {
        // [JWT] GET /api/pay-hub/masters/pay-heads
        const raw = localStorage.getItem(PAY_HEADS_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
    })();
    const attendanceRecords: AttendanceRecord[] = (() => {
      try {
        // [JWT] GET /api/pay-hub/attendance/records
        const raw = localStorage.getItem(ATTENDANCE_RECORDS_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
    })();
    const currentHolds = loadHolds();

    const payslips = employees.map(emp =>
      computeEmployeePayslip(emp, payPeriod, structures, payHeadsData, attendanceRecords, currentHolds)
    );

    const [year, monthStr] = payPeriod.split('-');
    const periodLabel = format(new Date(parseInt(year), parseInt(monthStr) - 1, 1), 'MMMM yyyy');

    const run: PayrollRun = {
      id: `pr-${payPeriod}-${Date.now()}`,
      payPeriod, periodLabel,
      status: 'calculated',
      totalEmployees: payslips.length,
      totalGross: payslips.reduce((s, p) => s + p.grossEarnings, 0),
      totalDeductions: payslips.reduce((s, p) => s + p.totalDeductions, 0),
      totalNet: payslips.reduce((s, p) => s + p.netPay, 0),
      totalEmployerCost: payslips.reduce((s, p) => s + p.totalEmployerCost, 0),
      payslips,
      approvedBy: '', approvedAt: '',
      postedAt: '', lockedAt: '', lockedBy: '', unlockReason: '',
      entityId: 'parent-root',
      notes: '',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };

    const allRuns = loadRuns();
    const existingIdx = allRuns.findIndex(r => r.payPeriod === payPeriod);
    const updated = existingIdx >= 0
      ? allRuns.map((r, i) => i === existingIdx ? run : r)
      : [...allRuns, run];
    setRuns(updated); saveRuns(updated);

    // [JWT] POST /api/pay-hub/payroll/runs/:period/calculate

    toast.success(`Payroll ${run.payPeriod} calculated — ${payslips.length} employee(s) processed`);

    return run;
  };

  const approveRun = (payPeriod: string, approvedBy: string) => {
    const updated = loadRuns().map(r => r.payPeriod !== payPeriod ? r : {
      ...r, status: 'approved' as const, approvedBy, approvedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setRuns(updated); saveRuns(updated);
    toast.success(`Payroll ${payPeriod} approved by ${approvedBy}`);
  };

  const postRun = (payPeriod: string) => {
    const updated = loadRuns().map(r => r.payPeriod !== payPeriod ? r : {
      ...r, status: 'posted' as const, postedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setRuns(updated); saveRuns(updated);
    toast.success(`Payroll ${payPeriod} posted to GL`);
  };

  const lockRun = (payPeriod: string, lockedBy: string) => {
    const updated = loadRuns().map(r => r.payPeriod !== payPeriod ? r : {
      ...r, status: 'locked' as const, lockedAt: new Date().toISOString(),
      lockedBy, updated_at: new Date().toISOString(),
    });
    setRuns(updated); saveRuns(updated);
    toast.success(`Payroll ${payPeriod} locked`);
  };

  const createHold = (data: Omit<SalaryHold, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const hold: SalaryHold = { ...data, id: `sh-${Date.now()}`, created_at: now, updated_at: now };
    const updated = [...loadHolds(), hold];
    setHolds(updated); saveHolds(updated);
    toast.success(`Salary hold created for ${data.employeeName}`);
  };

  const releaseHold = (holdId: string, releasedBy: string) => {
    const updated = loadHolds().map(h => h.id !== holdId ? h : {
      ...h, status: 'released' as const, releasedAt: new Date().toISOString(),
      releasedBy, updated_at: new Date().toISOString(),
    });
    setHolds(updated); saveHolds(updated);
    toast.success('Salary hold released');
  };

  return {
    runs, holds,
    calculatePayroll, approveRun, postRun, lockRun,
    createHold, releaseHold,
  };
}
