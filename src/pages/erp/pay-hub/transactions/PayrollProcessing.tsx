/**
 * PayrollProcessing.tsx — Sprint 7
 * 8-step wizard: Period → Pre-check → Calculate → Review → Approve → GL Post → Bank File → Lock
 * Salary Hold management at the bottom.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import {
  Banknote, Check, ChevronRight, AlertTriangle, Lock, Unlock, Play,
  FileText, Download, Eye, UserX, RotateCcw, IndianRupee,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePayrollEngine } from '@/hooks/usePayrollEngine';
import type { PayrollRun, EmployeePayslip } from '@/types/payroll-run';
import { PAYROLL_RUN_STATUS_COLORS } from '@/types/payroll-run';
import { toIndianFormat, onEnterNext, useCtrlS } from '@/lib/keyboard';
import { EMPLOYEES_KEY } from '@/types/employee';
import { SALARY_STRUCTURES_KEY, PAY_HEADS_KEY } from '@/types/pay-hub';
import { ATTENDANCE_RECORDS_KEY } from '@/types/attendance-entry';
import { useERPCompany } from '@/components/layout/ERPCompanySelector';

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const STEP_LABELS = [
  'Period', 'Pre-check', 'Calculate', 'Review', 'Approve', 'GL Post', 'Bank File', 'Lock',
];

export function PayrollProcessingPanel() {
  const [selectedCompany] = useERPCompany();
  const entityCode = selectedCompany && selectedCompany !== 'all' ? selectedCompany : 'SMRT';
  const { runs, holds, calculatePayroll, approveRun, postRun, lockRun,
    createHold, releaseHold } = usePayrollEngine(entityCode);

  // ── Wizard state
  const [activeStep, setActiveStep] = useState<WizardStep>(1);
  const [selectedPeriod, setSelectedPeriod] = useState(() => format(new Date(), 'yyyy-MM'));
  const [currentRun, setCurrentRun] = useState<PayrollRun | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcProgress, setCalcProgress] = useState(0);
  const [approverName, setApproverName] = useState('HR Manager');
  const [expandedPayslipId, setExpandedPayslipId] = useState<string | null>(null);
  const [lockReason, setLockReason] = useState('');

  // ── Salary Hold Sheet
  const [holdSheetOpen, setHoldSheetOpen] = useState(false);
  const BLANK_HOLD = {
    employeeId: '', employeeCode: '', employeeName: '',
    fromPeriod: format(new Date(), 'yyyy-MM'),
    toPeriod: '', reason: '', status: 'active' as const,
    releasedAt: '', releasedBy: '',
  };
  const [holdForm, setHoldForm] = useState(BLANK_HOLD);

  const handleHoldSave = useCallback(() => {
    if (!holdSheetOpen) return;
    if (!holdForm.employeeId) return toast.error('Select an employee');
    if (!holdForm.reason.trim()) return toast.error('Reason is required');
    createHold(holdForm);
    setHoldSheetOpen(false);
    setHoldForm(BLANK_HOLD);
  }, [holdSheetOpen, holdForm, createHold]);
  useCtrlS(handleHoldSave);

  // ── Active employees (for hold sheet + pre-run check)
  const activeEmployees = useMemo(() => {
    try {
      // [JWT] GET /api/pay-hub/employees
      const raw = localStorage.getItem(EMPLOYEES_KEY);
      if (raw) return (JSON.parse(raw) as { id: string; empCode: string; displayName: string; status: string; salaryStructureId: string }[])
        .filter(e => e.status === 'active');
    } catch { /* ignore */ }
    return [];
  }, []);

  // ── Existing run for selected period
  const existingRun = useMemo(() =>
    runs.find(r => r.payPeriod === selectedPeriod) || null
    , [runs, selectedPeriod]);

  // ── Pre-run checks
  const preRunChecks = useMemo(() => {
    const empCount = activeEmployees.length;
    const withStructure = activeEmployees.filter(e => e.salaryStructureId).length;
    const holdsActive = holds.filter(h => h.status === 'active' && h.fromPeriod <= selectedPeriod && (h.toPeriod === '' || h.toPeriod >= selectedPeriod)).length;

    let attendanceCount = 0;
    try {
      // [JWT] GET /api/pay-hub/attendance/records
      const raw = localStorage.getItem(ATTENDANCE_RECORDS_KEY);
      if (raw) attendanceCount = (JSON.parse(raw) as { date: string }[]).filter(r => r.date.startsWith(selectedPeriod)).length;
    } catch { /* ignore */ }

    let payHeadCount = 0;
    try {
      // [JWT] GET /api/pay-hub/masters/pay-heads
      const raw = localStorage.getItem(PAY_HEADS_KEY);
      if (raw) payHeadCount = (JSON.parse(raw) as { status: string }[]).filter(p => p.status === 'active').length;
    } catch { /* ignore */ }

    let structureCount = 0;
    try {
      // [JWT] GET /api/pay-hub/masters/salary-structures
      const raw = localStorage.getItem(SALARY_STRUCTURES_KEY);
      if (raw) structureCount = (JSON.parse(raw) as { status: string }[]).filter(s => s.status === 'active').length;
    } catch { /* ignore */ }

    return [
      { ok: empCount > 0, label: `Active employees: ${empCount} employees will be processed` },
      { ok: withStructure === empCount && empCount > 0, label: `Salary structures assigned: ${withStructure} of ${empCount} employees have structure` },
      { ok: true, label: holdsActive > 0 ? `Salary holds active: ${holdsActive} employees on hold (will be flagged)` : 'No salary holds active' },
      { ok: true, label: `Attendance data: ${attendanceCount} records found for ${selectedPeriod}` },
      { ok: payHeadCount > 0, label: `Pay heads configured: ${payHeadCount} pay heads active` },
      { ok: structureCount > 0, label: `Salary structures: ${structureCount} active structures` },
    ];
  }, [activeEmployees, holds, selectedPeriod]);

  // ── Calculate handler
  const handleCalculate = useCallback(() => {
    setIsCalculating(true);
    setCalcProgress(0);
    // Simulate progress then compute synchronously
    const interval = setInterval(() => {
      setCalcProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 30;
      });
    }, 200);

    // Use requestAnimationFrame to let progress render, then compute
    requestAnimationFrame(() => {
      setTimeout(() => {
        const result = calculatePayroll(selectedPeriod);
        clearInterval(interval);
        setCalcProgress(100);
        setCurrentRun(result);
        setIsCalculating(false);
        setActiveStep(4);
        toast.success(`Payroll calculated: ${result.totalEmployees} employees processed`);
      }, 800);
    });
  }, [calculatePayroll, selectedPeriod]);

  // ── Review data
  const reviewRun = currentRun || existingRun;
  const reviewPayslips = reviewRun?.payslips || [];
  const errorPayslips = reviewPayslips.filter(p => p.errors.length > 0);
  const warningPayslips = reviewPayslips.filter(p => p.warnings.length > 0);
  const holdPayslips = reviewPayslips.filter(p => p.warnings.some(w => w.includes('hold')));

  // ── Bank file download
  const handleDownloadBankFile = useCallback(() => {
    if (!reviewRun) return;
    const lines = ['EmpCode,Name,AccountNo,IFSC,BankName,Amount'];
    reviewRun.payslips
      .filter(p => p.netPay > 0 && p.errors.length === 0)
      .forEach(p => {
        lines.push(`${p.employeeCode},${p.employeeName},${p.bankAccountNo},${p.bankIfsc},${p.bankName},${p.netPay}`);
      });
    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bank_file_${reviewRun.payPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Bank file downloaded');
  }, [reviewRun]);

  // ── Mask account number
  const maskAccount = (acc: string) => {
    if (!acc || acc.length <= 4) return acc || '—';
    return '••••' + acc.slice(-4);
  };

  // ── Summary KPI cards
  const KPICards = ({ run }: { run: PayrollRun }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card><CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">Total Employees</p>
        <p className="text-2xl font-bold">{run.totalEmployees}</p>
      </CardContent></Card>
      <Card><CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">Total Gross</p>
        <p className="text-2xl font-bold text-green-700">₹{toIndianFormat(run.totalGross)}</p>
      </CardContent></Card>
      <Card><CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">Total Net Pay</p>
        <p className="text-2xl font-bold text-blue-700">₹{toIndianFormat(run.totalNet)}</p>
      </CardContent></Card>
      <Card><CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">Employer Cost</p>
        <p className="text-2xl font-bold text-violet-700">₹{toIndianFormat(run.totalEmployerCost)}</p>
      </CardContent></Card>
    </div>
  );

  // ── Payslip detail expand
  const PayslipDetail = ({ ps }: { ps: EmployeePayslip }) => {
    const earningLines = ps.lines.filter(l => l.type === 'earning');
    const deductionLines = ps.lines.filter(l => l.type === 'deduction');
    const erLines = ps.lines.filter(l => l.type === 'employer_contribution');

    return (
      <TableRow key={`detail-${ps.employeeId}`} className="bg-muted/30">
        <TableCell colSpan={10}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            <div>
              <p className="text-xs font-semibold mb-2 text-green-700">Earnings</p>
              <Table>
                <TableHeader>
                  <TableRow><TableHead className="text-xs">Component</TableHead><TableHead className="text-xs text-right">Monthly ₹</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {earningLines.map(l => (
                    <TableRow key={l.headCode}><TableCell className="text-xs">{l.headName}</TableCell><TableCell className="text-xs text-right">₹{toIndianFormat(l.monthly)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div>
              <p className="text-xs font-semibold mb-2 text-red-700">Deductions</p>
              <Table>
                <TableHeader>
                  <TableRow><TableHead className="text-xs">Component</TableHead><TableHead className="text-xs text-right">Monthly ₹</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {deductionLines.map(l => (
                    <TableRow key={l.headCode}><TableCell className="text-xs">{l.headName}</TableCell><TableCell className="text-xs text-right">₹{toIndianFormat(l.monthly)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
              {erLines.length > 0 && (
                <>
                  <p className="text-xs font-semibold mt-3 mb-2 text-violet-700">Employer Contributions</p>
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead className="text-xs">Component</TableHead><TableHead className="text-xs text-right">Monthly ₹</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {erLines.map(l => (
                        <TableRow key={l.headCode}><TableCell className="text-xs">{l.headName}</TableCell><TableCell className="text-xs text-right">₹{toIndianFormat(l.monthly)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </div>
          </div>
          {ps.itComputation && (
            <Card className="mx-4 mb-4">
              <CardHeader className="py-2 px-4"><CardTitle className="text-xs">IT Computation</CardTitle></CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Regime:</span> {ps.itComputation.regime}</div>
                  <div><span className="text-muted-foreground">Gross Annual:</span> ₹{toIndianFormat(ps.itComputation.grossAnnualSalary)}</div>
                  <div><span className="text-muted-foreground">Std Deduction:</span> ₹{toIndianFormat(ps.itComputation.standardDeduction)}</div>
                  <div><span className="text-muted-foreground">Taxable:</span> ₹{toIndianFormat(ps.itComputation.taxableIncome)}</div>
                  <div><span className="text-muted-foreground">Tax:</span> ₹{toIndianFormat(ps.itComputation.totalAnnualTax)}</div>
                  <div><span className="text-muted-foreground">Rebate 87A:</span> ₹{toIndianFormat(ps.itComputation.rebate87A)}</div>
                  <div><span className="text-muted-foreground">Cess:</span> ₹{toIndianFormat(ps.itComputation.cess)}</div>
                  <div><span className="text-muted-foreground">Monthly TDS:</span> ₹{toIndianFormat(ps.itComputation.monthlyTDS)}</div>
                </div>
              </CardContent>
            </Card>
          )}
        </TableCell>
      </TableRow>
    );
  };

  // ── Payslip table rows
  const renderPayslipRows = (payslips: EmployeePayslip[]) =>
    payslips.map(ps => (
      <React.Fragment key={ps.employeeId}>
        <TableRow
          className="cursor-pointer hover:bg-muted/50"
          onClick={() => setExpandedPayslipId(expandedPayslipId === ps.employeeId ? null : ps.employeeId)}
        >
          <TableCell className="text-xs font-mono">{ps.employeeCode}</TableCell>
          <TableCell className="text-xs">{ps.employeeName}</TableCell>
          <TableCell className="text-xs text-right">{ps.lopDays}</TableCell>
          <TableCell className="text-xs text-right text-green-700">₹{toIndianFormat(ps.grossEarnings)}</TableCell>
          <TableCell className="text-xs text-right">₹{toIndianFormat(ps.empPF)}</TableCell>
          <TableCell className="text-xs text-right">₹{toIndianFormat(ps.empESI)}</TableCell>
          <TableCell className="text-xs text-right">₹{toIndianFormat(ps.pt)}</TableCell>
          <TableCell className="text-xs text-right">₹{toIndianFormat(ps.tds)}</TableCell>
          <TableCell className="text-xs text-right font-semibold text-blue-700">₹{toIndianFormat(ps.netPay)}</TableCell>
          <TableCell className="text-xs">
            {ps.errors.length > 0 && <Badge variant="destructive" className="text-[9px] mr-1">Error</Badge>}
            {ps.warnings.length > 0 && <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-[9px]">Warning</Badge>}
            {ps.errors.length === 0 && ps.warnings.length === 0 && <Badge className="bg-green-500/10 text-green-700 border-green-500/30 text-[9px]">OK</Badge>}
          </TableCell>
        </TableRow>
        {expandedPayslipId === ps.employeeId && <PayslipDetail ps={ps} />}
      </React.Fragment>
    ));

  return (
    <div className="space-y-6" data-keyboard-form>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <Banknote className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Payroll Processing</h2>
            <p className="text-xs text-muted-foreground">8-step wizard: compute, review, approve, and lock monthly payroll</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
            className="w-44 text-xs"
            onKeyDown={onEnterNext}
          />
          {existingRun && (
            <Badge className={`${PAYROLL_RUN_STATUS_COLORS[existingRun.status]} text-xs`}>
              {existingRun.status.toUpperCase()}
            </Badge>
          )}
        </div>
      </div>

      {/* ── Step Progress Bar ──────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
          {STEP_LABELS.map((label, i) => {
            const stepNum = (i + 1) as WizardStep;
            const isActive = activeStep === stepNum;
            const isCompleted = activeStep > stepNum;
            return (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isCompleted ? 'bg-green-500 text-white' :
                  isActive ? 'bg-violet-600 text-white' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
                </div>
                <span className={`text-[10px] ${isActive ? 'text-violet-700 font-semibold' : 'text-muted-foreground'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        <Progress value={((activeStep - 1) / 7) * 100} className="h-1.5" />
      </div>

      {/* ── Step Content ───────────────────────────────────────── */}

      {/* STEP 1 — Period */}
      {activeStep === 1 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Step 1 — Select Period</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Select the payroll period to process.</p>
            <Input type="month" value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)} className="w-60" onKeyDown={onEnterNext} />
            {existingRun && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md">
                <AlertTriangle className="h-4 w-4" />
                A run already exists for this period — status: <Badge className={`${PAYROLL_RUN_STATUS_COLORS[existingRun.status]} text-xs`}>{existingRun.status}</Badge>
              </div>
            )}
            <Button data-primary onClick={() => setActiveStep(2)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 2 — Pre-check */}
      {activeStep === 2 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Step 2 — Pre-Run Checks</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {preRunChecks.map(chk => (
              <div key={chk.label} className="flex items-center gap-2 text-sm">
                {chk.ok
                  ? <Check className="h-4 w-4 text-green-600" />
                  : <AlertTriangle className="h-4 w-4 text-amber-500" />
                }
                <span>{chk.label}</span>
              </div>
            ))}
            <Separator />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setActiveStep(1)}>← Back</Button>
              <Button data-primary onClick={() => setActiveStep(3)}>Proceed to Calculate <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3 — Calculate */}
      {activeStep === 3 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Step 3 — Calculate Payroll</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Click Calculate to run the payroll engine for all active employees.
            </p>
            <p className="text-xs text-muted-foreground">
              {activeEmployees.length} employees × salary structures + PT + PF + ESI + TDS
            </p>
            {isCalculating && (
              <div className="space-y-2">
                <Progress value={calcProgress} className="h-2" />
                <p className="text-xs text-muted-foreground animate-pulse">Computing payroll…</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setActiveStep(2)}>← Back</Button>
              <Button data-primary onClick={handleCalculate} disabled={isCalculating}>
                <Play className="h-4 w-4 mr-1" /> Calculate Payroll
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4 — Review */}
      {activeStep === 4 && reviewRun && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Step 4 — Review Register</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <KPICards run={reviewRun} />
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All ({reviewPayslips.length})</TabsTrigger>
                <TabsTrigger value="errors">Errors ({errorPayslips.length})</TabsTrigger>
                <TabsTrigger value="warnings">Warnings ({warningPayslips.length})</TabsTrigger>
                <TabsTrigger value="hold">On Hold ({holdPayslips.length})</TabsTrigger>
              </TabsList>
              {(['all', 'errors', 'warnings', 'hold'] as const).map(tab => (
                <TabsContent key={tab} value={tab}>
                  <div className="border rounded-md overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Code</TableHead>
                          <TableHead className="text-xs">Name</TableHead>
                          <TableHead className="text-xs text-right">LOP</TableHead>
                          <TableHead className="text-xs text-right">Gross</TableHead>
                          <TableHead className="text-xs text-right">PF</TableHead>
                          <TableHead className="text-xs text-right">ESI</TableHead>
                          <TableHead className="text-xs text-right">PT</TableHead>
                          <TableHead className="text-xs text-right">TDS</TableHead>
                          <TableHead className="text-xs text-right">Net Pay</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {renderPayslipRows(
                          tab === 'all' ? reviewPayslips :
                          tab === 'errors' ? errorPayslips :
                          tab === 'warnings' ? warningPayslips :
                          holdPayslips
                        )}
                        {(tab === 'all' ? reviewPayslips : tab === 'errors' ? errorPayslips : tab === 'warnings' ? warningPayslips : holdPayslips).length === 0 && (
                          <TableRow><TableCell colSpan={10} className="text-center text-xs text-muted-foreground py-8">No records</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setActiveStep(3); setCurrentRun(null); }}>
                <RotateCcw className="h-4 w-4 mr-1" /> Recalculate
              </Button>
              <Button data-primary onClick={() => setActiveStep(5)}>
                Proceed to Approve <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 5 — Approve */}
      {activeStep === 5 && reviewRun && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Step 5 — Approve Payroll</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Two-level approval. Enter approver name to confirm.</p>
            <div className="max-w-xs space-y-2">
              <Label className="text-xs">Approver Name</Label>
              <Input value={approverName} onChange={e => setApproverName(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <KPICards run={reviewRun} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setActiveStep(4)}>← Back</Button>
              <Button data-primary onClick={() => { approveRun(selectedPeriod, approverName); setActiveStep(6); }}>
                <Check className="h-4 w-4 mr-1" /> Approve Payroll
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 6 — GL Post */}
      {activeStep === 6 && reviewRun && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Step 6 — GL Posting</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Post payroll entries to the General Ledger.</p>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Account</TableHead>
                    <TableHead className="text-xs text-right">Debit ₹</TableHead>
                    <TableHead className="text-xs text-right">Credit ₹</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-xs">Salaries & Wages A/c</TableCell>
                    <TableCell className="text-xs text-right text-green-700">₹{toIndianFormat(reviewRun.totalGross)}</TableCell>
                    <TableCell className="text-xs text-right">—</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs">Salary Payable A/c</TableCell>
                    <TableCell className="text-xs text-right">—</TableCell>
                    <TableCell className="text-xs text-right text-red-700">₹{toIndianFormat(reviewRun.totalNet)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs">Employer Statutory A/c (PF+EDLI+ESI)</TableCell>
                    <TableCell className="text-xs text-right text-green-700">₹{toIndianFormat(reviewRun.totalEmployerCost - reviewRun.totalGross)}</TableCell>
                    <TableCell className="text-xs text-right">—</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs">PF Payable / ESI Payable A/c</TableCell>
                    <TableCell className="text-xs text-right">—</TableCell>
                    <TableCell className="text-xs text-right text-red-700">₹{toIndianFormat(reviewRun.totalEmployerCost - reviewRun.totalGross)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs">Statutory Deductions Payable (PT+TDS+PF)</TableCell>
                    <TableCell className="text-xs text-right">—</TableCell>
                    <TableCell className="text-xs text-right text-red-700">₹{toIndianFormat(reviewRun.totalDeductions)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground italic">GL posting creates journal entries in FineCore Accounting module.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setActiveStep(5)}>← Back</Button>
              <Button data-primary onClick={() => { postRun(selectedPeriod); setActiveStep(7); }}>
                <FileText className="h-4 w-4 mr-1" /> Post to GL
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 7 — Bank File */}
      {activeStep === 7 && reviewRun && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Step 7 — Bank File</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Generate NEFT payment file for bank transfer.</p>
            <div className="border rounded-md overflow-auto max-h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Account No</TableHead>
                    <TableHead className="text-xs">IFSC</TableHead>
                    <TableHead className="text-xs">Bank</TableHead>
                    <TableHead className="text-xs text-right">Net Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewRun.payslips.filter(p => p.netPay > 0 && p.errors.length === 0).map(p => (
                    <TableRow key={p.employeeId}>
                      <TableCell className="text-xs">{p.employeeName}</TableCell>
                      <TableCell className="text-xs font-mono">{maskAccount(p.bankAccountNo)}</TableCell>
                      <TableCell className="text-xs font-mono">{p.bankIfsc || '—'}</TableCell>
                      <TableCell className="text-xs">{p.bankName || '—'}</TableCell>
                      <TableCell className="text-xs text-right font-semibold">₹{toIndianFormat(p.netPay)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button variant="outline" onClick={handleDownloadBankFile}>
              <Download className="h-4 w-4 mr-1" /> Download Bank File
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setActiveStep(6)}>← Back</Button>
              <Button data-primary onClick={() => setActiveStep(8)}>
                Complete <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 8 — Lock */}
      {activeStep === 8 && reviewRun && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Step 8 — Lock Payroll</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {reviewRun.status === 'locked' ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-md p-4 flex items-center gap-3">
                <Lock className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-semibold text-green-700">Payroll {reviewRun.periodLabel} is now LOCKED</p>
                  <p className="text-xs text-muted-foreground">Locked payrolls cannot be modified.</p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Lock this payroll period. Locked payrolls cannot be modified.</p>
                <KPICards run={reviewRun} />
                <div className="max-w-sm space-y-2">
                  <Label className="text-xs">Lock Reason (optional)</Label>
                  <Input value={lockReason} onChange={e => setLockReason(e.target.value)} placeholder="e.g. Month-end closing" onKeyDown={onEnterNext} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setActiveStep(7)}>← Back</Button>
                  <Button data-primary onClick={() => { lockRun(selectedPeriod, approverName); }}>
                    <Lock className="h-4 w-4 mr-1" /> Lock Payroll
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* ── Payroll History ────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Previous Payroll Runs</h3>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Period</TableHead>
                <TableHead className="text-xs text-right">Employees</TableHead>
                <TableHead className="text-xs text-right">Gross</TableHead>
                <TableHead className="text-xs text-right">Net</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">No payroll runs yet</TableCell></TableRow>
              )}
              {runs.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs font-mono">{r.periodLabel}</TableCell>
                  <TableCell className="text-xs text-right">{r.totalEmployees}</TableCell>
                  <TableCell className="text-xs text-right">₹{toIndianFormat(r.totalGross)}</TableCell>
                  <TableCell className="text-xs text-right">₹{toIndianFormat(r.totalNet)}</TableCell>
                  <TableCell><Badge className={`${PAYROLL_RUN_STATUS_COLORS[r.status]} text-[9px]`}>{r.status}</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => {
                      setSelectedPeriod(r.payPeriod);
                      setCurrentRun(r);
                      setActiveStep(4);
                    }}>
                      <Eye className="h-3 w-3 mr-1" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Separator />

      {/* ── Salary Holds ──────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Salary Holds</h3>
          <Button size="sm" variant="outline" onClick={() => { setHoldForm(BLANK_HOLD); setHoldSheetOpen(true); }}>
            <UserX className="h-3.5 w-3.5 mr-1" /> + Add Hold
          </Button>
        </div>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">From Period</TableHead>
                <TableHead className="text-xs">To Period</TableHead>
                <TableHead className="text-xs">Reason</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holds.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">No salary holds</TableCell></TableRow>
              )}
              {holds.map(h => (
                <TableRow key={h.id}>
                  <TableCell className="text-xs">{h.employeeName} ({h.employeeCode})</TableCell>
                  <TableCell className="text-xs font-mono">{h.fromPeriod}</TableCell>
                  <TableCell className="text-xs font-mono">{h.toPeriod || 'Indefinite'}</TableCell>
                  <TableCell className="text-xs">{h.reason}</TableCell>
                  <TableCell>
                    <Badge className={h.status === 'active' ? 'bg-amber-500/10 text-amber-700 border-amber-500/30 text-[9px]' : 'bg-green-500/10 text-green-700 border-green-500/30 text-[9px]'}>
                      {h.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {h.status === 'active' && (
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => releaseHold(h.id, approverName)}>
                        <Unlock className="h-3 w-3 mr-1" /> Release
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Salary Hold Sheet ─────────────────────────────────── */}
      <Sheet open={holdSheetOpen} onOpenChange={setHoldSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add Salary Hold</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4" data-keyboard-form>
            <div className="space-y-2">
              <Label className="text-xs">Employee</Label>
              <Select value={holdForm.employeeId} onValueChange={v => {
                const emp = activeEmployees.find(e => e.id === v);
                if (emp) setHoldForm(f => ({ ...f, employeeId: emp.id, employeeCode: emp.empCode, employeeName: emp.displayName }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">From Period</Label>
              <Input type="month" value={holdForm.fromPeriod} onChange={e => setHoldForm(f => ({ ...f, fromPeriod: e.target.value }))} onKeyDown={onEnterNext} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">To Period (empty = indefinite)</Label>
              <Input type="month" value={holdForm.toPeriod} onChange={e => setHoldForm(f => ({ ...f, toPeriod: e.target.value }))} onKeyDown={onEnterNext} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Reason</Label>
              <Textarea value={holdForm.reason} onChange={e => setHoldForm(f => ({ ...f, reason: e.target.value }))} rows={3} />
            </div>
          </div>
          <SheetFooter>
            <Button data-primary onClick={handleHoldSave}>Save Hold</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function PayrollProcessing() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <ERPHeader breadcrumbs={[{ label: 'Operix Core', href: '/erp/dashboard' }, { label: 'Pay Hub' }, { label: 'Payroll Processing' }]} showDatePicker={false} showCompany={false} />
        <div className="flex-1 overflow-auto p-6">
          <PayrollProcessingPanel />
        </div>
      </div>
    </SidebarProvider>
  );
}
