/**
 * StatutoryReturns.tsx — Sprint 9: PF ECR · ESI · PT · Form 24Q · Form 16 · Statutory Calendar
 * Single 6-tab screen. Each sidebar module routes here with a different defaultTab.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { format, addMonths, differenceInDays, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Separator } from '@/components/ui/separator';
import {
  Download, CheckCircle, AlertTriangle, Clock, Plus,
  Landmark, Shield, IndianRupee, FileText, Calendar, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PayrollRun, EmployeePayslip } from '@/types/payroll-run';
import type {
  ChallanRecord, PFECRRow, ESIRow, PTRow, Form24QRow, Form16Row,
  StatutoryDueDate, StatutoryTab,
} from '@/types/statutory-returns';
import { STATUTORY_CHALLANS_KEY, CHALLAN_STATUS_COLORS } from '@/types/statutory-returns';
import type { Employee } from '@/types/employee';
import { PAYROLL_RUNS_KEY, payrollRunsKey } from '@/types/payroll-run';
import { EMPLOYEES_KEY } from '@/types/employee';
import { useERPCompany } from '@/components/layout/ERPCompanySelector';
import { toIndianFormat, amountInputProps, onEnterNext, useCtrlS } from '@/lib/keyboard';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
void PAYROLL_RUNS_KEY;

// ── Helper: next Form 24Q due date ───────────────────────────────
function getNext24QDue(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  if (month <= 5) return `${year}-05-31`;
  if (month <= 7) return `${year}-07-31`;
  if (month <= 10) return `${year}-10-31`;
  return `${year + 1}-01-31`;
}

function getCurrentFY(): string {
  const today = new Date();
  const yr = today.getFullYear();
  const mo = today.getMonth() + 1;
  const fyStart = mo >= 4 ? yr : yr - 1;
  return `${fyStart}-${String(fyStart + 1).slice(2)}`;
}

// ── Panel Props ──────────────────────────────────────────────────
interface StatutoryReturnsPanelProps {
  defaultTab?: StatutoryTab;
}

interface ChallanBadgeProps {
  challan: { status: string; challanNo?: string } | null | undefined;
  onEdit?: () => void;
}

function ChallanBadge({ challan, onEdit }: ChallanBadgeProps) {
  if (challan) {
    return (
      <Badge variant="outline"
        className={CHALLAN_STATUS_COLORS[challan.status as keyof typeof CHALLAN_STATUS_COLORS] + ' cursor-pointer'}
        onClick={onEdit}>
        {challan.status === 'paid'
          ? <CheckCircle className="h-3 w-3 mr-1" />
          : <Clock className="h-3 w-3 mr-1" />}
        {challan.status.toUpperCase()}
        {challan.challanNo ? ` — ${challan.challanNo}` : ''}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
      <AlertTriangle className="h-3 w-3 mr-1" /> Not paid
    </Badge>
  );
}

export function StatutoryReturnsPanel({ defaultTab = 'calendar' }: StatutoryReturnsPanelProps) {
  const [selectedCompany] = useERPCompany();
  const entityCode = selectedCompany && selectedCompany !== 'all' ? selectedCompany : DEFAULT_ENTITY_SHORTCODE;
  // ── Cross-module reads ───────────────────────────────────────
  const payrollRuns = useMemo<PayrollRun[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/payroll/runs?entityCode={entityCode}
      const raw = localStorage.getItem(payrollRunsKey(entityCode));
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, [entityCode]);

  // [Abstract] Per D-126: intentional one-shot load. Empty deps array is correct
  //            because this useMemo reads static localStorage at component init.
  //            Closure hazards do not apply — no stale-ref usage downstream.
  const employees = useMemo<Employee[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/employees
      const raw = localStorage.getItem(EMPLOYEES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  // ── Challans CRUD ─────────────────────────────────────────────
  const [challans, setChallans] = useState<ChallanRecord[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/statutory/challans
      const raw = localStorage.getItem(STATUTORY_CHALLANS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveChallans = (items: ChallanRecord[]) => {
    // [JWT] PUT /api/pay-hub/statutory/challans
    localStorage.setItem(STATUTORY_CHALLANS_KEY, JSON.stringify(items));
    setChallans(items);
  };

  // ── Period selector (YYYY-MM) ─────────────────────────────────
  const allPeriods = [...new Set(payrollRuns.map(r => r.payPeriod))].sort().reverse();
  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    allPeriods[0] || format(new Date(), 'yyyy-MM'),
  );

  // ── Challan Sheet state ───────────────────────────────────────
  const [challanSheetOpen, setChallanSheetOpen] = useState(false);
  const [challanEditId, setChallanEditId] = useState<string | null>(null);
  const BLANK_CHALLAN: Omit<ChallanRecord, 'id' | 'created_at' | 'updated_at'> = {
    challanType: 'EPF', period: selectedPeriod, periodLabel: '',
    dueDate: '', totalAmount: 0, challanNo: '', paymentDate: '',
    bankName: '', status: 'pending', remarks: '',
  };
  const [challanForm, setChallanForm] = useState<typeof BLANK_CHALLAN>(BLANK_CHALLAN);
  const cf = <K extends keyof typeof BLANK_CHALLAN>(k: K, v: (typeof BLANK_CHALLAN)[K]) =>
    setChallanForm(prev => ({ ...prev, [k]: v }));

  const handleChallanSave = useCallback(() => {
    if (!challanSheetOpen) return;
    if (!challanForm.challanType || !challanForm.period)
      return toast.error('Challan type and period are required');
    const now = new Date().toISOString();
    if (challanEditId) {
      saveChallans(challans.map(c => c.id === challanEditId
        ? { ...c, ...challanForm, updated_at: now } : c));
    } else {
      saveChallans([...challans, { ...challanForm, id: `ch-${Date.now()}`, created_at: now, updated_at: now }]);
    }
    toast.success('Challan record saved');
    setChallanSheetOpen(false);
     
  }, [challanSheetOpen, challanForm, challanEditId, challans]);

  const isFormActive = true;
  useCtrlS(isFormActive ? handleChallanSave : () => {});

  // ── Get payslips for selected period ─────────────────────────
  const periodPayslips = useMemo<EmployeePayslip[]>(() => {
    const run = payrollRuns.find(r => r.payPeriod === selectedPeriod);
    return run?.payslips || [];
  }, [payrollRuns, selectedPeriod]);

  // ── Build PF ECR rows ─────────────────────────────────────────
  const pfECRRows = useMemo<PFECRRow[]>(() => {
    return periodPayslips
      .filter(ps => ps.empPF > 0)
      .map(ps => {
        const emp = employees.find(e => e.id === ps.employeeId);
        const erEPF = ps.lines.find(l => l.headCode === 'ER_EPF')?.monthly || 0;
        const erEPS = ps.lines.find(l => l.headCode === 'ER_EPS')?.monthly || 0;
        const erEDLI = ps.lines.find(l => l.headCode === 'ER_EDLI')?.monthly || 0;
        return {
          uan: emp?.uan || '—',
          employeeName: ps.employeeName,
          epfWages: ps.pfWage,
          epsWages: Math.min(ps.pfWage, 15000),
          edliWages: Math.min(ps.pfWage, 15000),
          empEPF: ps.empPF,
          erEPF, erEPS, erEDLI,
          empCode: ps.employeeCode,
        };
      });
  }, [periodPayslips, employees]);

  // ── Build ESI rows ────────────────────────────────────────────
  const esiRows = useMemo<ESIRow[]>(() => {
    return periodPayslips
      .filter(ps => ps.empESI > 0)
      .map(ps => {
        const emp = employees.find(e => e.id === ps.employeeId);
        const erESI = ps.lines.find(l => l.headCode === 'ER_ESI')?.monthly || 0;
        return {
          ipNo: emp?.esiIpNumber || '—',
          employeeName: ps.employeeName,
          grossWages: ps.esiWage,
          empESI: ps.empESI,
          erESI,
          empCode: ps.employeeCode,
        };
      });
  }, [periodPayslips, employees]);

  // ── Build PT rows ─────────────────────────────────────────────
  const ptRows = useMemo<PTRow[]>(() => {
    return periodPayslips
      .filter(ps => ps.pt > 0)
      .map(ps => {
        const emp = employees.find(e => e.id === ps.employeeId);
        return {
          employeeName: ps.employeeName,
          grossMonthly: ps.grossEarnings,
          ptDeducted: ps.pt,
          stateCode: emp?.ptStateCode || '—',
          empCode: ps.employeeCode,
        };
      });
  }, [periodPayslips, employees]);

  // ── Build Form 24Q rows (aggregate across FY) ─────────────────
  const fyStartStr = useMemo(() => {
    const yr = parseInt(selectedPeriod.slice(0, 4));
    const mo = parseInt(selectedPeriod.slice(5, 7));
    const fyYear = mo >= 4 ? yr : yr - 1;
    return `${fyYear}-04`;
  }, [selectedPeriod]);

  const form24QRows = useMemo<Form24QRow[]>(() => {
    const fyRuns = payrollRuns.filter(r => {
      const m = r.payPeriod.slice(0, 7);
      return m >= fyStartStr && m <= selectedPeriod;
    });
    const empMap = new Map<string, Form24QRow>();
    fyRuns.forEach(run => {
      run.payslips.forEach(ps => {
        const emp = employees.find(e => e.id === ps.employeeId);
        if (!emp?.pan) return;
        const existing = empMap.get(ps.employeeId);
        const it = ps.itComputation;
        if (existing) {
          existing.grossSalaryFY += ps.grossEarnings;
          existing.totalTDSFY += ps.tds;
          existing.tdsThisQuarter += ps.tds;
        } else {
          empMap.set(ps.employeeId, {
            employeeName: ps.employeeName,
            pan: emp.pan,
            grossSalaryFY: ps.grossEarnings,
            taxableIncomeFY: it?.taxableIncome || 0,
            totalTDSFY: ps.tds,
            tdsThisQuarter: ps.tds,
            regime: it?.regime || 'New Regime',
            empCode: ps.employeeCode,
          });
        }
      });
    });
    return Array.from(empMap.values());
  }, [payrollRuns, selectedPeriod, fyStartStr, employees]);

  // ── Build Form 16 rows (full FY summary per employee) ─────────
  const form16Rows = useMemo<Form16Row[]>(() => {
    const fyRuns = payrollRuns.filter(r => r.payPeriod >= fyStartStr);
    const empMap = new Map<string, Form16Row>();
    fyRuns.forEach(run => {
      run.payslips.forEach(ps => {
        const emp = employees.find(e => e.id === ps.employeeId);
        if (!emp?.pan) return;
        const it = ps.itComputation;
        const existing = empMap.get(ps.employeeId);
        if (existing) {
          existing.grossSalaryFY += ps.grossEarnings;
          existing.totalTDSFY += ps.tds;
        } else {
          empMap.set(ps.employeeId, {
            employeeName: ps.employeeName,
            empCode: ps.employeeCode,
            pan: emp.pan,
            designation: ps.designation,
            grossSalaryFY: ps.grossEarnings,
            standardDeduction: it?.standardDeduction || 75000,
            taxableIncomeFY: it?.taxableIncome || 0,
            taxBeforeCess: it?.taxBeforeCess || 0,
            cess: it?.cess || 0,
            rebate87A: it?.rebate87A || 0,
            surcharge: it?.surcharge || 0,
            totalTaxFY: it?.totalAnnualTax || 0,
            totalTDSFY: ps.tds,
            regime: it?.regime || 'New Regime',
          });
        }
      });
    });
    return Array.from(empMap.values());
  }, [payrollRuns, fyStartStr, employees]);

  // ── Statutory due dates (auto-computed from today) ────────────
  const dueDates = useMemo<StatutoryDueDate[]>(() => {
    const today = new Date();
    const nextMonth = addMonths(today, 1);
    const computeDue = (dueStr: string, label: string, desc: string, type: StatutoryDueDate['type']): StatutoryDueDate => {
      const due = parseISO(dueStr);
      const daysLeft = differenceInDays(due, today);
      const color: StatutoryDueDate['color'] = daysLeft < 0 ? 'red' : daysLeft <= 7 ? 'amber' : 'green';
      return { type, label, dueDate: dueStr, daysLeft, color, description: desc };
    };
    const y = nextMonth.getFullYear();
    const m = String(nextMonth.getMonth() + 1).padStart(2, '0');
    const cy = today.getFullYear();
    const cm = String(today.getMonth() + 1).padStart(2, '0');
    return [
      computeDue(`${y}-${m}-15`, 'EPF Challan', 'Employee + Employer PF, EPS, EDLI', 'EPF'),
      computeDue(`${y}-${m}-21`, 'ESI Challan', 'Employee + Employer ESI contribution', 'ESI'),
      computeDue(`${cy}-${cm}-28`, 'PT Challan', 'Professional Tax — state-wise', 'PT'),
      computeDue(`${y}-${m}-07`, 'TDS Challan', 'Income Tax (Form 26Q/24Q monthly)', 'TDS'),
      computeDue(getNext24QDue(), '24Q Return', 'Quarterly TDS return — TRACES filing', '24Q'),
    ];
  }, []);

  // ── CSV download helper ───────────────────────────────────────
  const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const lines = [headers.join(','), ...rows.map(r => r.join(','))];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} downloaded`);
  };

  // ── Totals ────────────────────────────────────────────────────
  const pfTotals = useMemo(() => ({
    empPF: pfECRRows.reduce((s, r) => s + r.empEPF, 0),
    erEPF: pfECRRows.reduce((s, r) => s + r.erEPF, 0),
    erEPS: pfECRRows.reduce((s, r) => s + r.erEPS, 0),
    erEDLI: pfECRRows.reduce((s, r) => s + r.erEDLI, 0),
  }), [pfECRRows]);

  const esiTotals = useMemo(() => ({
    empESI: esiRows.reduce((s, r) => s + r.empESI, 0),
    erESI: esiRows.reduce((s, r) => s + r.erESI, 0),
  }), [esiRows]);

  const ptTotal = useMemo(() => ptRows.reduce((s, r) => s + r.ptDeducted, 0), [ptRows]);

  // ── Challan helpers ───────────────────────────────────────────
  const openNewChallan = (type?: ChallanRecord['challanType']) => {
    setChallanEditId(null);
    setChallanForm({ ...BLANK_CHALLAN, challanType: type || 'EPF', period: selectedPeriod });
    setChallanSheetOpen(true);
  };

  const openEditChallan = (c: ChallanRecord) => {
    setChallanEditId(c.id);
    setChallanForm({
      challanType: c.challanType, period: c.period, periodLabel: c.periodLabel,
      dueDate: c.dueDate, totalAmount: c.totalAmount, challanNo: c.challanNo,
      paymentDate: c.paymentDate, bankName: c.bankName, status: c.status, remarks: c.remarks,
    });
    setChallanSheetOpen(true);
  };

  const periodChallans = challans.filter(c => c.period === selectedPeriod);
  const getChallan = (type: ChallanRecord['challanType']) =>
    periodChallans.find(c => c.challanType === type);

  // ChallanBadge is defined at module level (above) — see ChallanBadgeComponent

  // ── State grouping for PT ─────────────────────────────────────
  const ptByState = useMemo(() => {
    const map = new Map<string, PTRow[]>();
    ptRows.forEach(r => {
      const existing = map.get(r.stateCode) || [];
      existing.push(r);
      map.set(r.stateCode, existing);
    });
    return Array.from(map.entries());
  }, [ptRows]);

  // ── Form 16 expand state ──────────────────────────────────────
  const [expandedForm16, setExpandedForm16] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4" data-keyboard-form>
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <Landmark className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Statutory Returns & Compliance</h2>
            <p className="text-xs text-muted-foreground">PF ECR · ESI · PT · TDS · Form 16 · Calendar</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allPeriods.length === 0 && (
                <SelectItem value={selectedPeriod}>{selectedPeriod}</SelectItem>
              )}
              {allPeriods.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => openNewChallan()} data-primary>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Challan
          </Button>
        </div>
      </div>

      {/* TABS */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="pf-ecr" className="text-xs gap-1"><Shield className="h-3 w-3" /> PF ECR</TabsTrigger>
          <TabsTrigger value="esi" className="text-xs gap-1"><Shield className="h-3 w-3" /> ESI Returns</TabsTrigger>
          <TabsTrigger value="pt" className="text-xs gap-1"><IndianRupee className="h-3 w-3" /> PT Returns</TabsTrigger>
          <TabsTrigger value="tds-24q" className="text-xs gap-1"><FileText className="h-3 w-3" /> Form 24Q</TabsTrigger>
          <TabsTrigger value="form16" className="text-xs gap-1"><FileText className="h-3 w-3" /> Form 16</TabsTrigger>
          <TabsTrigger value="calendar" className="text-xs gap-1"><Calendar className="h-3 w-3" /> Statutory Calendar</TabsTrigger>
        </TabsList>

        {/* ════════ PF ECR ════════ */}
        <TabsContent value="pf-ecr" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card><CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">EPF Employees</p>
              <p className="text-lg font-bold">{pfECRRows.length}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Total Emp PF</p>
              <p className="text-lg font-bold text-violet-600">₹{toIndianFormat(pfTotals.empPF)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Total Er EPF</p>
              <p className="text-lg font-bold">₹{toIndianFormat(pfTotals.erEPF)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Total EPS</p>
              <p className="text-lg font-bold">₹{toIndianFormat(pfTotals.erEPS)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Total EDLI</p>
              <p className="text-lg font-bold">₹{toIndianFormat(pfTotals.erEDLI)}</p>
            </CardContent></Card>
          </div>

          <div className="flex justify-end">
            <Button size="sm" variant="outline" data-primary onClick={() => {
              downloadCSV(`PF_ECR_${selectedPeriod}.txt`,
                ['UAN', 'MemberName', 'EpfWages', 'EpsWages', 'EdliWages', 'EmpEpfContrib', 'ErEpfContrib', 'ErEpsContrib', 'ErEdliContrib'],
                pfECRRows.map(r => [r.uan, r.employeeName, r.epfWages, r.epsWages, r.edliWages, r.empEPF, r.erEPF, r.erEPS, r.erEDLI]),
              );
            }}>
              <Download className="h-3.5 w-3.5 mr-1" /> Download ECR (TXT)
            </Button>
          </div>

          {pfECRRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No payroll run found for {selectedPeriod}</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">UAN</TableHead>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs text-right">EPF Wages</TableHead>
                    <TableHead className="text-xs text-right">EPS Wages</TableHead>
                    <TableHead className="text-xs text-right">Emp PF</TableHead>
                    <TableHead className="text-xs text-right">Er EPF</TableHead>
                    <TableHead className="text-xs text-right">Er EPS</TableHead>
                    <TableHead className="text-xs text-right">EDLI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pfECRRows.map(r => (
                    <TableRow key={r.empCode}>
                      <TableCell className="text-xs font-mono">{r.uan}</TableCell>
                      <TableCell className="text-xs">{r.employeeName}</TableCell>
                      <TableCell className="text-xs text-right">₹{toIndianFormat(r.epfWages)}</TableCell>
                      <TableCell className="text-xs text-right">₹{toIndianFormat(r.epsWages)}</TableCell>
                      <TableCell className="text-xs text-right">₹{toIndianFormat(r.empEPF)}</TableCell>
                      <TableCell className="text-xs text-right">₹{toIndianFormat(r.erEPF)}</TableCell>
                      <TableCell className="text-xs text-right">₹{toIndianFormat(r.erEPS)}</TableCell>
                      <TableCell className="text-xs text-right">₹{toIndianFormat(r.erEDLI)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell className="text-xs" colSpan={4}>Total</TableCell>
                    <TableCell className="text-xs text-right">₹{toIndianFormat(pfTotals.empPF)}</TableCell>
                    <TableCell className="text-xs text-right">₹{toIndianFormat(pfTotals.erEPF)}</TableCell>
                    <TableCell className="text-xs text-right">₹{toIndianFormat(pfTotals.erEPS)}</TableCell>
                    <TableCell className="text-xs text-right">₹{toIndianFormat(pfTotals.erEDLI)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}

          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">EPF Challan for {selectedPeriod}</p>
              <p className="text-xs text-muted-foreground">
                Total payable: ₹{toIndianFormat(pfTotals.empPF + pfTotals.erEPF + pfTotals.erEPS + pfTotals.erEDLI)} · Due: 15th of next month
              </p>
            </div>
            <ChallanBadge challan={getChallan('EPF')} onEdit={() => { const c = getChallan('EPF'); if (c) openEditChallan(c); }} />
          </div>
        </TabsContent>

        {/* ════════ ESI ════════ */}
        <TabsContent value="esi" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">ESI Employees</p>
              <p className="text-lg font-bold">{esiRows.length}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Total Emp ESI</p>
              <p className="text-lg font-bold text-violet-600">₹{toIndianFormat(esiTotals.empESI)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Total Er ESI</p>
              <p className="text-lg font-bold">₹{toIndianFormat(esiTotals.erESI)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Total Payable</p>
              <p className="text-lg font-bold text-green-600">₹{toIndianFormat(esiTotals.empESI + esiTotals.erESI)}</p>
            </CardContent></Card>
          </div>

          <div className="flex justify-end">
            <Button size="sm" variant="outline" data-primary onClick={() => {
              downloadCSV(`ESI_Statement_${selectedPeriod}.csv`,
                ['IP_No', 'EmployeeName', 'EmpCode', 'GrossWages', 'EmpESI', 'ErESI'],
                esiRows.map(r => [r.ipNo, r.employeeName, r.empCode, r.grossWages, r.empESI, r.erESI]),
              );
            }}>
              <Download className="h-3.5 w-3.5 mr-1" /> Download ESI Statement (CSV)
            </Button>
          </div>

          {esiRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No payroll run found for {selectedPeriod}</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">IP No</TableHead>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs text-right">Gross Wages (≤21000)</TableHead>
                    <TableHead className="text-xs text-right">Emp ESI 0.75%</TableHead>
                    <TableHead className="text-xs text-right">Er ESI 3.25%</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {esiRows.map(r => (
                    <TableRow key={r.empCode}>
                      <TableCell className="text-xs font-mono">{r.ipNo}</TableCell>
                      <TableCell className="text-xs">{r.employeeName}</TableCell>
                      <TableCell className="text-xs text-right">₹{toIndianFormat(r.grossWages)}</TableCell>
                      <TableCell className="text-xs text-right">₹{toIndianFormat(r.empESI)}</TableCell>
                      <TableCell className="text-xs text-right">₹{toIndianFormat(r.erESI)}</TableCell>
                      <TableCell className="text-xs text-right">₹{toIndianFormat(r.empESI + r.erESI)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell className="text-xs" colSpan={3}>Total</TableCell>
                    <TableCell className="text-xs text-right">₹{toIndianFormat(esiTotals.empESI)}</TableCell>
                    <TableCell className="text-xs text-right">₹{toIndianFormat(esiTotals.erESI)}</TableCell>
                    <TableCell className="text-xs text-right">₹{toIndianFormat(esiTotals.empESI + esiTotals.erESI)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}

          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">ESI Challan for {selectedPeriod}</p>
              <p className="text-xs text-muted-foreground">
                Total ESI payable: ₹{toIndianFormat(esiTotals.empESI + esiTotals.erESI)} · Due: 21st of next month
              </p>
            </div>
            <ChallanBadge challan={getChallan('ESI')} onEdit={() => { const c = getChallan('ESI'); if (c) openEditChallan(c); }} />
          </div>
        </TabsContent>

        {/* ════════ PT ════════ */}
        <TabsContent value="pt" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Card><CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">PT Employees</p>
              <p className="text-lg font-bold">{ptRows.length}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Total PT Collected</p>
              <p className="text-lg font-bold text-violet-600">₹{toIndianFormat(ptTotal)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">States</p>
              <p className="text-lg font-bold">{ptByState.length}</p>
            </CardContent></Card>
          </div>

          <div className="flex justify-end">
            <Button size="sm" variant="outline" data-primary onClick={() => {
              downloadCSV(`PT_Register_${selectedPeriod}.csv`,
                ['EmpCode', 'EmployeeName', 'StateCode', 'GrossMonthly', 'PTDeducted'],
                ptRows.map(r => [r.empCode, r.employeeName, r.stateCode, r.grossMonthly, r.ptDeducted]),
              );
            }}>
              <Download className="h-3.5 w-3.5 mr-1" /> Download PT Register (CSV)
            </Button>
          </div>

          {ptRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No payroll run found for {selectedPeriod}</p>
          ) : (
            <div className="space-y-3">
              {ptByState.map(([state, rows]) => (
                <div key={state} className="border rounded-lg">
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
                    <p className="text-xs font-semibold">{state}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{rows.length} employees</span>
                      <span className="font-semibold text-foreground">₹{toIndianFormat(rows.reduce((s, r) => s + r.ptDeducted, 0))}</span>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Emp Code</TableHead>
                        <TableHead className="text-xs">Employee</TableHead>
                        <TableHead className="text-xs text-right">Gross Monthly</TableHead>
                        <TableHead className="text-xs text-right">PT Deducted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map(r => (
                        <TableRow key={r.empCode}>
                          <TableCell className="text-xs font-mono">{r.empCode}</TableCell>
                          <TableCell className="text-xs">{r.employeeName}</TableCell>
                          <TableCell className="text-xs text-right">₹{toIndianFormat(r.grossMonthly)}</TableCell>
                          <TableCell className="text-xs text-right">₹{toIndianFormat(r.ptDeducted)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}

          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">PT Challan for {selectedPeriod}</p>
              <p className="text-xs text-muted-foreground">
                Total PT payable: ₹{toIndianFormat(ptTotal)} · Due: 28th of current month
              </p>
            </div>
            <ChallanBadge challan={getChallan('PT')} onEdit={() => { const c = getChallan('PT'); if (c) openEditChallan(c); }} />
          </div>
        </TabsContent>

        {/* ════════ Form 24Q ════════ */}
        <TabsContent value="tds-24q" className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-semibold">Form 24Q — Quarterly TDS Return for Salaries</p>
              <p>File on TRACES by 31st of the month following the quarter.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Card><CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Employees Covered</p>
              <p className="text-lg font-bold">{form24QRows.length}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Total TDS (FY)</p>
              <p className="text-lg font-bold text-violet-600">₹{toIndianFormat(form24QRows.reduce((s, r) => s + r.totalTDSFY, 0))}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Next 24Q Due</p>
              <p className="text-lg font-bold">{getNext24QDue()}</p>
            </CardContent></Card>
          </div>

          <div className="flex justify-end">
            <Button size="sm" variant="outline" data-primary onClick={() => {
              downloadCSV(`Form24Q_AnnexureII_${selectedPeriod}.csv`,
                ['EmpCode', 'PAN', 'EmployeeName', 'GrossSalaryFY', 'TaxableIncomeFY', 'TotalTDSFY', 'TDSThisQuarter', 'Regime'],
                form24QRows.map(r => [r.empCode, r.pan, r.employeeName, r.grossSalaryFY, r.taxableIncomeFY, r.totalTDSFY, r.tdsThisQuarter, r.regime]),
              );
            }}>
              <Download className="h-3.5 w-3.5 mr-1" /> Download Annexure II (CSV)
            </Button>
          </div>

          {form24QRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No payroll run found for {selectedPeriod}</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">PAN</TableHead>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs text-right">Gross (FY)</TableHead>
                    <TableHead className="text-xs text-right">Taxable (FY)</TableHead>
                    <TableHead className="text-xs text-right">TDS (FY)</TableHead>
                    <TableHead className="text-xs text-right">TDS this Qtr</TableHead>
                    <TableHead className="text-xs">Regime</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form24QRows.map(r => (
                    <TableRow key={r.empCode}>
                      <TableCell className="text-xs font-mono">{r.pan}</TableCell>
                      <TableCell className="text-xs">{r.employeeName}</TableCell>
                      <TableCell className="text-xs text-right">₹{toIndianFormat(r.grossSalaryFY)}</TableCell>
                      <TableCell className="text-xs text-right">₹{toIndianFormat(r.taxableIncomeFY)}</TableCell>
                      <TableCell className="text-xs text-right">₹{toIndianFormat(r.totalTDSFY)}</TableCell>
                      <TableCell className="text-xs text-right">₹{toIndianFormat(r.tdsThisQuarter)}</TableCell>
                      <TableCell className="text-xs">{r.regime}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">TDS Challan for {selectedPeriod}</p>
              <p className="text-xs text-muted-foreground">
                TDS payable for period · Due: 7th of next month
              </p>
            </div>
            <ChallanBadge challan={getChallan('TDS')} onEdit={() => { const c = getChallan('TDS'); if (c) openEditChallan(c); }} />
          </div>
        </TabsContent>

        {/* ════════ Form 16 ════════ */}
        <TabsContent value="form16" className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-semibold">Form 16 — Part A is downloaded from TRACES (government portal).</p>
              <p>Part B (salary computation) is generated here.</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">FY {getCurrentFY()}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{form16Rows.length} employees</span>
              <span>Total Tax: ₹{toIndianFormat(form16Rows.reduce((s, r) => s + r.totalTaxFY, 0))}</span>
              <span>Total TDS: ₹{toIndianFormat(form16Rows.reduce((s, r) => s + r.totalTDSFY, 0))}</span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="sm" variant="outline" data-primary onClick={() => {
              downloadCSV(`Form16_PartB_${getCurrentFY()}.csv`,
                ['EmpCode', 'PAN', 'Name', 'Designation', 'GrossSalaryFY', 'StandardDeduction', 'TaxableIncomeFY',
                  'TaxBeforeCess', 'Cess', 'Rebate87A', 'Surcharge', 'TotalTaxFY', 'TotalTDSFY', 'Regime'],
                form16Rows.map(r => [r.empCode, r.pan, r.employeeName, r.designation, r.grossSalaryFY,
                  r.standardDeduction, r.taxableIncomeFY, r.taxBeforeCess, r.cess, r.rebate87A,
                  r.surcharge, r.totalTaxFY, r.totalTDSFY, r.regime]),
              );
            }}>
              <Download className="h-3.5 w-3.5 mr-1" /> Generate All Form 16 (CSV)
            </Button>
          </div>

          {form16Rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No payroll data for current FY</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">PAN</TableHead>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Designation</TableHead>
                    <TableHead className="text-xs text-right">Gross (FY)</TableHead>
                    <TableHead className="text-xs text-right">Std Ded</TableHead>
                    <TableHead className="text-xs text-right">Taxable</TableHead>
                    <TableHead className="text-xs text-right">Total Tax</TableHead>
                    <TableHead className="text-xs text-right">TDS</TableHead>
                    <TableHead className="text-xs">Regime</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form16Rows.map(r => (
                    <React.Fragment key={r.empCode}>
                      <TableRow className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedForm16(expandedForm16 === r.empCode ? null : r.empCode)}>
                        <TableCell className="text-xs font-mono">{r.pan}</TableCell>
                        <TableCell className="text-xs">{r.employeeName}</TableCell>
                        <TableCell className="text-xs">{r.designation}</TableCell>
                        <TableCell className="text-xs text-right">₹{toIndianFormat(r.grossSalaryFY)}</TableCell>
                        <TableCell className="text-xs text-right">₹{toIndianFormat(r.standardDeduction)}</TableCell>
                        <TableCell className="text-xs text-right">₹{toIndianFormat(r.taxableIncomeFY)}</TableCell>
                        <TableCell className="text-xs text-right">₹{toIndianFormat(r.totalTaxFY)}</TableCell>
                        <TableCell className="text-xs text-right">₹{toIndianFormat(r.totalTDSFY)}</TableCell>
                        <TableCell className="text-xs">{r.regime}</TableCell>
                      </TableRow>
                      {expandedForm16 === r.empCode && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-muted/30 p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              <div><span className="text-muted-foreground">Tax Before Cess:</span> ₹{toIndianFormat(r.taxBeforeCess)}</div>
                              <div><span className="text-muted-foreground">Cess (4%):</span> ₹{toIndianFormat(r.cess)}</div>
                              <div><span className="text-muted-foreground">Rebate 87A:</span> ₹{toIndianFormat(r.rebate87A)}</div>
                              <div><span className="text-muted-foreground">Surcharge:</span> ₹{toIndianFormat(r.surcharge)}</div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ════════ Statutory Calendar ════════ */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {dueDates.map(d => {
              const colorMap = {
                green: 'border-green-500/30 bg-green-500/5',
                amber: 'border-amber-500/30 bg-amber-500/5',
                red: 'border-red-500/30 bg-red-500/5',
              };
              const iconMap = {
                green: <CheckCircle className="h-4 w-4 text-green-600" />,
                amber: <Clock className="h-4 w-4 text-amber-600" />,
                red: <AlertTriangle className="h-4 w-4 text-red-600" />,
              };
              return (
                <Card key={d.label} className={`border ${colorMap[d.color]}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      {iconMap[d.color]}
                      <p className="text-xs font-semibold">{d.label}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{d.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs font-mono">{d.dueDate}</p>
                      <Badge variant="outline" className={`text-[10px] ${
                        d.color === 'red' ? 'text-red-700 border-red-500/30' :
                        d.color === 'amber' ? 'text-amber-700 border-amber-500/30' :
                        'text-green-700 border-green-500/30'
                      }`}>
                        {d.daysLeft < 0 ? `${Math.abs(d.daysLeft)}d overdue` : `${d.daysLeft}d left`}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Separator />
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Challan Records</h3>
            <Button size="sm" onClick={() => openNewChallan()} data-primary>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Challan
            </Button>
          </div>

          {challans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No challan records yet</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Period</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">Due Date</TableHead>
                    <TableHead className="text-xs">Challan No</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Payment Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {challans.map(c => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openEditChallan(c)}>
                      <TableCell className="text-xs font-semibold">{c.challanType}</TableCell>
                      <TableCell className="text-xs">{c.periodLabel || c.period}</TableCell>
                      <TableCell className="text-xs text-right">₹{toIndianFormat(c.totalAmount)}</TableCell>
                      <TableCell className="text-xs font-mono">{c.dueDate}</TableCell>
                      <TableCell className="text-xs font-mono">{c.challanNo || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={CHALLAN_STATUS_COLORS[c.status] + ' text-[10px]'}>
                          {c.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{c.paymentDate || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ════════ Challan Sheet ════════ */}
      <Sheet open={challanSheetOpen} onOpenChange={setChallanSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{challanEditId ? 'Edit Challan' : 'New Challan Record'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4" data-keyboard-form>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Challan Type</Label>
                <Select value={challanForm.challanType} onValueChange={v => cf('challanType', v as ChallanRecord['challanType'])}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EPF">EPF</SelectItem>
                    <SelectItem value="ESI">ESI</SelectItem>
                    <SelectItem value="PT">PT</SelectItem>
                    <SelectItem value="TDS">TDS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Period</Label>
                <Input className="h-8 text-xs" value={challanForm.period}
                  onChange={e => {
                    const v = e.target.value;
                    cf('period', v);
                    // Auto-populate periodLabel from payroll runs or format
                    const run = payrollRuns.find(r => r.payPeriod === v);
                    cf('periodLabel', run?.periodLabel || v);
                  }}
                  onKeyDown={onEnterNext}
                  placeholder="YYYY-MM" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Period Label</Label>
              <Input className="h-8 text-xs" value={challanForm.periodLabel}
                onChange={e => cf('periodLabel', e.target.value)} onKeyDown={onEnterNext}
                placeholder="e.g. December 2025" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <SmartDateInput value={challanForm.dueDate}
                  onChange={v => cf('dueDate', v)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Total Amount (₹)</Label>
                <Input className="h-8 text-xs" value={challanForm.totalAmount || ''}
                  onChange={e => cf('totalAmount', parseFloat(e.target.value) || 0)}
                  onKeyDown={onEnterNext} {...amountInputProps} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Challan / TRRN No</Label>
                <Input className="h-8 text-xs" value={challanForm.challanNo}
                  onChange={e => cf('challanNo', e.target.value)} onKeyDown={onEnterNext} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={challanForm.status} onValueChange={v => cf('status', v as ChallanRecord['status'])}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Payment Date</Label>
                <SmartDateInput value={challanForm.paymentDate}
                  onChange={v => cf('paymentDate', v)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bank Name</Label>
                <Input className="h-8 text-xs" value={challanForm.bankName}
                  onChange={e => cf('bankName', e.target.value)} onKeyDown={onEnterNext} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Remarks</Label>
              <Textarea className="text-xs" value={challanForm.remarks}
                onChange={e => cf('remarks', e.target.value)} rows={2} />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" size="sm" onClick={() => setChallanSheetOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleChallanSave} data-primary>
              {challanEditId ? 'Update Challan' : 'Save Challan'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function StatutoryReturns() {
  return <StatutoryReturnsPanel />;
}
