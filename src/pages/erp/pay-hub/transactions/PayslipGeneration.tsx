import React, { useState, useMemo, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { FileText, Printer, Download, Eye, Check, X, AlertTriangle, IndianRupee, ShieldCheck, FileSearch } from 'lucide-react';
import { toast } from 'sonner';
import type { PayrollRun, EmployeePayslip } from '@/types/payroll-run';
import type { ITDeclaration, InvestmentProof } from '@/types/it-declaration';
import { IT_DECLARATIONS_KEY, computeTotal80C, computeTotalDeductions, getCurrentFY } from '@/types/it-declaration';
import { PAYROLL_RUNS_KEY } from '@/types/payroll-run';
import type { Employee } from '@/types/employee';
import { EMPLOYEES_KEY } from '@/types/employee';
import { DEDUCTION_LIMITS } from '@/data/payroll-statutory-seed-data';
import { toIndianFormat, amountInputProps, onEnterNext, useCtrlS } from '@/lib/keyboard';

// ── numberToWords helper (inline, no library) ──────────────────
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
    'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }
  return convert(Math.round(num)) + ' Rupees Only';
}

// ── Main Panel ─────────────────────────────────────────────────────
export function PayslipGenerationPanel() {

  // ── Cross-module reads ───────────────────────────────────────
  const runs = useMemo<PayrollRun[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/payroll/runs
      const raw = localStorage.getItem(PAYROLL_RUNS_KEY);
      return raw ? (JSON.parse(raw) as PayrollRun[]).filter(r => r.status !== 'draft') : [];
    } catch { return []; }
  }, []);

  const allEmployees = useMemo<Employee[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/employees
      const raw = localStorage.getItem(EMPLOYEES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  const activeEmployees = useMemo(() =>
    allEmployees.filter(e => e.status === 'active')
  , [allEmployees]);

  // ── IT Declarations CRUD ─────────────────────────────────────
  const [declarations, setDeclarations] = useState<ITDeclaration[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/it-declarations
      const raw = localStorage.getItem(IT_DECLARATIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveDeclarations = (items: ITDeclaration[]) => {
    // [JWT] PUT /api/pay-hub/it-declarations
    localStorage.setItem(IT_DECLARATIONS_KEY, JSON.stringify(items));
    setDeclarations(items);
  };

  // ── Tab 1 state ──────────────────────────────────────────────
  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    runs.find(r => r.status === 'locked' || r.status === 'posted')?.payPeriod ||
    runs[runs.length - 1]?.payPeriod || ''
  );
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null);
  const [empSearch, setEmpSearch] = useState('');

  // ── Tab 2 (Form 12BB) Sheet state ───────────────────────────
  const [declSheetOpen, setDeclSheetOpen] = useState(false);
  const [editDeclId, setEditDeclId] = useState<string | null>(null);
  const [declForm, setDeclForm] = useState<Partial<ITDeclaration>>({});
  const [duf, setDuf] = useState<(k: keyof ITDeclaration, v: unknown) => void>(
    () => () => {}
  );

  // ── Tab 3 (Proof Verification) state ────────────────────────
  const [proofEmpId, setProofEmpId] = useState<string>('');
  const [proofFY, setProofFY] = useState<string>(getCurrentFY());

  // ── HRA / HomeLoan / PrevEmp toggles ────────────────────────
  const [showHRA, setShowHRA] = useState(false);
  const [showHomeLoan, setShowHomeLoan] = useState(false);
  const [showPrevEmp, setShowPrevEmp] = useState(false);

  // ── Proof inline form state ────────────────────────────────
  const [proofSection, setProofSection] = useState('80C');
  const [proofDesc, setProofDesc] = useState('');
  const [proofAmount, setProofAmount] = useState('');
  const [proofRef, setProofRef] = useState('');
  const [rejectingProofId, setRejectingProofId] = useState<string | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState('');

  // ── Blank Form 12BB ──────────────────────────────────────────
  const makeBlankDecl = (emp: Employee): Omit<ITDeclaration, 'id' | 'created_at' | 'updated_at'> => {
    const licTotal = (emp.licPolicies || []).reduce((s, p) => s + p.premiumAnnual, 0);
    return {
      employeeId: emp.id, employeeCode: emp.empCode, employeeName: emp.displayName,
      financialYear: getCurrentFY(),
      regime: emp.taxRegime || 'new',
      pf: emp.annualCTC ? Math.round(Math.min((emp.annualCTC * 0.4 / 12) * 0.12 * 12, 21600)) : 0,
      vpf: 0, elss: 0, ppf: 0,
      licPremium: licTotal,
      tuitionFees: 0, homeLoanPrincipal: 0, nscPurchase: 0, otherSection80C: 0,
      medicalInsuranceSelf: 0, medicalInsuranceParents: 0,
      educationLoanInterest: 0, donations80G: 0, savingsInterest80TTA: 0,
      hra: null, homeLoan: null,
      prevEmployerGross: 0, prevEmployerTDS: 0, prevEmployerPF: 0,
      total80C: 0, totalDeductions: 0,
      isSubmitted: false, submittedAt: '',
      hrStatus: 'pending_review',
      proofs: [],
    };
  };

  const openDeclSheet = (emp: Employee) => {
    const existing = declarations.find(
      d => d.employeeId === emp.id && d.financialYear === getCurrentFY()
    );
    const form = existing
      ? { ...existing }
      : { ...makeBlankDecl(emp), id: '' };
    setDeclForm(form);
    setEditDeclId(existing?.id || null);
    setShowHRA(!!form.hra);
    setShowHomeLoan(!!form.homeLoan);
    setShowPrevEmp(!!(form.prevEmployerGross || form.prevEmployerTDS || form.prevEmployerPF));
    const uf = (k: keyof ITDeclaration, v: unknown) =>
      setDeclForm(prev => {
        const updated = { ...prev, [k]: v } as ITDeclaration;
        updated.total80C = computeTotal80C(updated);
        updated.totalDeductions = computeTotalDeductions(updated);
        return updated;
      });
    setDuf(() => uf);
    setDeclSheetOpen(true);
  };

  const handleDeclSave = useCallback(() => {
    if (!declSheetOpen) return;
    if (!declForm.employeeId) return;
    const now = new Date().toISOString();
    const computed = { ...declForm } as ITDeclaration;
    computed.total80C = computeTotal80C(computed);
    computed.totalDeductions = computeTotalDeductions(computed);
    if (editDeclId) {
      const updated = declarations.map(d =>
        d.id === editDeclId ? { ...computed, updated_at: now } : d
      );
      saveDeclarations(updated);
    } else {
      const newDecl: ITDeclaration = {
        ...computed,
        id: `itd-${Date.now()}`,
        isSubmitted: true,
        submittedAt: now,
        created_at: now,
        updated_at: now,
      };
      saveDeclarations([...declarations, newDecl]);
    }
    toast.success('Form 12BB saved');
    setDeclSheetOpen(false);
  }, [declSheetOpen, declForm, editDeclId, declarations]);

  useCtrlS(handleDeclSave);

  // ── Derived data ─────────────────────────────────────────────
  const selectedRun = runs.find(r => r.payPeriod === selectedPeriod);
  const filteredPayslips = useMemo(() => {
    if (!selectedRun) return [];
    const q = empSearch.toLowerCase();
    return selectedRun.payslips.filter(ps =>
      !q || ps.employeeName.toLowerCase().includes(q) || ps.employeeCode.toLowerCase().includes(q)
    );
  }, [selectedRun, empSearch]);

  const selectedPayslip = selectedRun?.payslips.find(ps => ps.employeeId === selectedPayslipId);

  // ── Company name read ────────────────────────────────────────
  const companyName = useMemo(() => {
    try {
      const raw = localStorage.getItem('erp_parent_company');
      if (raw) {
        const p = JSON.parse(raw);
        return p.legalName || p.name || 'Company';
      }
    } catch { /* ignore */ }
    return 'Company';
  }, []);

  // ── Print handler ────────────────────────────────────────────
  const handlePrint = (ps: EmployeePayslip) => {
    setSelectedPayslipId(ps.employeeId);
    setTimeout(() => window.print(), 300);
  };

  // ── Download CSV handler ─────────────────────────────────────
  const handleDownload = (ps: EmployeePayslip) => {
    const rows = [
      ['Component', 'Type', 'Monthly', 'Annual'],
      ...ps.lines.filter(l => l.monthly > 0).map(l => [l.headName, l.type, String(l.monthly), String(l.annual)]),
      [],
      ['Gross Earnings', '', String(ps.grossEarnings), String(ps.grossEarnings * 12)],
      ['Total Deductions', '', String(ps.totalDeductions), String(ps.totalDeductions * 12)],
      ['Net Pay', '', String(ps.netPay), String(ps.netPay * 12)],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslip_${ps.employeeCode}_${ps.payPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Payslip downloaded for ${ps.employeeName}`);
  };

  // ── Mask account number ──────────────────────────────────────
  const maskAccount = (acct: string) => {
    if (!acct || acct.length <= 4) return acct || '—';
    return '****' + acct.slice(-4);
  };

  // ── Payslip Template Render ──────────────────────────────────
  const renderPayslip = (ps: EmployeePayslip) => {
    const emp = allEmployees.find(e => e.id === ps.employeeId);
    const earnings = ps.lines.filter(l => l.type === 'earning' && l.monthly > 0);
    const deductions = ps.lines.filter(l => l.type === 'deduction' && l.monthly > 0);
    const erContribs = ps.lines.filter(l => l.type === 'employer_contribution' && l.monthly > 0);
    const maxRows = Math.max(earnings.length, deductions.length);

    return (
      <div id="payslip-print-area" className="border rounded-lg p-6 bg-background text-sm max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center border-b pb-3 mb-3">
          <h2 className="text-lg font-bold">{companyName}</h2>
          <p className="text-muted-foreground text-xs">Payslip for {ps.payPeriod}</p>
        </div>
        {/* Employee info */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
          <div><span className="text-muted-foreground">Employee Code:</span> {ps.employeeCode}</div>
          <div><span className="text-muted-foreground">Name:</span> {ps.employeeName}</div>
          <div><span className="text-muted-foreground">Designation:</span> {ps.designation}</div>
          <div><span className="text-muted-foreground">Department:</span> {ps.departmentName}</div>
          <div><span className="text-muted-foreground">DOB:</span> {emp?.dob ? format(parseISO(emp.dob), 'dd-MMM-yyyy') : '—'}</div>
          <div><span className="text-muted-foreground">PAN:</span> {emp?.pan || '—'}</div>
          <div><span className="text-muted-foreground">UAN:</span> {emp?.uan || '—'}</div>
          <div><span className="text-muted-foreground">Bank A/C:</span> {maskAccount(ps.bankAccountNo)}</div>
          <div><span className="text-muted-foreground">Working Days:</span> {ps.workingDays}</div>
          <div><span className="text-muted-foreground">Present Days:</span> {ps.presentDays}</div>
          <div><span className="text-muted-foreground">LOP Days:</span> {ps.lopDays}</div>
          <div><span className="text-muted-foreground">Pay Period:</span> {ps.payPeriod}</div>
        </div>
        {/* Earnings + Deductions side by side */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/4">Earnings</TableHead>
              <TableHead className="w-1/4 text-right">Amount (₹)</TableHead>
              <TableHead className="w-1/4">Deductions</TableHead>
              <TableHead className="w-1/4 text-right">Amount (₹)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: maxRows }).map((_, i) => (
              <TableRow key={`payslip-row-${i}`}>
                <TableCell className="text-xs py-1">{earnings[i]?.headName || ''}</TableCell>
                <TableCell className="text-xs py-1 text-right">{earnings[i] ? toIndianFormat(earnings[i].monthly) : ''}</TableCell>
                <TableCell className="text-xs py-1">{deductions[i]?.headName || ''}</TableCell>
                <TableCell className="text-xs py-1 text-right">{deductions[i] ? toIndianFormat(deductions[i].monthly) : ''}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold border-t-2">
              <TableCell className="text-xs py-1">Total Earnings</TableCell>
              <TableCell className="text-xs py-1 text-right">₹{toIndianFormat(ps.grossEarnings)}</TableCell>
              <TableCell className="text-xs py-1">Total Deductions</TableCell>
              <TableCell className="text-xs py-1 text-right">₹{toIndianFormat(ps.totalDeductions)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {/* Net Pay */}
        <div className="mt-3 border-t pt-2 flex justify-between font-bold text-base">
          <span>Net Pay</span>
          <span>₹{toIndianFormat(ps.netPay)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          <em>{numberToWords(ps.netPay)}</em>
        </p>
        {/* Employer contributions (muted) */}
        {erContribs.length > 0 && (
          <div className="mt-4 pt-2 border-t border-dashed">
            <p className="text-[10px] text-muted-foreground font-semibold mb-1">Employer Contributions (not part of take-home)</p>
            <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground">
              {erContribs.map(c => (
                <span key={c.headCode}>{c.headShortName}: ₹{toIndianFormat(c.monthly)}</span>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4 pt-2 border-t text-center text-[10px] text-muted-foreground">
          This is a computer-generated payslip. No signature required.
        </div>
      </div>
    );
  };

  // ── Proof verification helpers ───────────────────────────────
  const proofDecl = declarations.find(d => d.employeeId === proofEmpId && d.financialYear === proofFY);

  const addProof = () => {
    if (!proofDecl || !proofDesc || !proofAmount) return;
    const proof: InvestmentProof = {
      id: `prf-${Date.now()}`,
      section: proofSection,
      description: proofDesc,
      declaredAmount: parseFloat(proofAmount) || 0,
      proofRef: proofRef,
      status: 'submitted',
      hrRemarks: '',
      verifiedBy: '',
      verifiedAt: '',
    };
    const updated = declarations.map(d =>
      d.id === proofDecl.id ? { ...d, proofs: [...d.proofs, proof], updated_at: new Date().toISOString() } : d
    );
    saveDeclarations(updated);
    setProofDesc(''); setProofAmount(''); setProofRef('');
    toast.success('Proof added');
  };

  const verifyProof = (proofId: string) => {
    if (!proofDecl) return;
    const now = new Date().toISOString();
    const updatedProofs = proofDecl.proofs.map(p =>
      p.id === proofId ? { ...p, status: 'verified' as const, verifiedBy: 'HR Admin', verifiedAt: now } : p
    );
    const allVerified = updatedProofs.every(p => p.status === 'verified');
    const anyRejected = updatedProofs.some(p => p.status === 'rejected');
    const hrStatus = allVerified ? 'verified' as const : anyRejected ? 'rejected' as const : 'pending_review' as const;
    const updated = declarations.map(d =>
      d.id === proofDecl.id ? { ...d, proofs: updatedProofs, hrStatus, updated_at: now } : d
    );
    saveDeclarations(updated);
    toast.success('Proof verified');
  };

  const rejectProof = (proofId: string) => {
    if (!proofDecl || !rejectRemarks) return;
    const now = new Date().toISOString();
    const updatedProofs = proofDecl.proofs.map(p =>
      p.id === proofId ? { ...p, status: 'rejected' as const, hrRemarks: rejectRemarks, verifiedBy: 'HR Admin', verifiedAt: now } : p
    );
    const hrStatus = 'rejected' as const;
    const updated = declarations.map(d =>
      d.id === proofDecl.id ? { ...d, proofs: updatedProofs, hrStatus, updated_at: now } : d
    );
    saveDeclarations(updated);
    setRejectingProofId(null); setRejectRemarks('');
    toast.success('Proof rejected');
  };

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <div className="space-y-4" data-keyboard-form>
      {/* Print CSS */}
      <style>{`
        @media print {
          body > *:not(#payslip-print-area) { display: none !important; }
          #payslip-print-area { display: block !important; }
        }
      `}</style>

      <Tabs defaultValue="payslips" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payslips" className="gap-1"><FileText className="h-3.5 w-3.5" /> Payslip Generation</TabsTrigger>
          <TabsTrigger value="form12bb" className="gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Form 12BB</TabsTrigger>
          <TabsTrigger value="proofs" className="gap-1"><FileSearch className="h-3.5 w-3.5" /> Investment Proof Verification</TabsTrigger>
        </TabsList>

        {/* ═══════════════════ TAB 1 — PAYSLIP GENERATION ═══════════════════ */}
        <TabsContent value="payslips" className="space-y-4">
          {/* Password hint banner */}
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-700 dark:text-blue-300">Payslip PDFs are password-protected.</p>
                <p className="text-muted-foreground mt-1">
                  Password = Employee Date of Birth in DDMMYYYY format.<br />
                  Example: For DOB 15-Mar-1990, password is <strong>15031990</strong>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Pay Period</Label>
              <Select value={selectedPeriod} onValueChange={v => { setSelectedPeriod(v); setSelectedPayslipId(null); }}>
                <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="Select period" /></SelectTrigger>
                <SelectContent>
                  {runs.map(r => (
                    <SelectItem key={r.payPeriod} value={r.payPeriod}>
                      {r.periodLabel} ({r.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Search by name or code..."
              value={empSearch}
              onChange={e => setEmpSearch(e.target.value)}
              onKeyDown={onEnterNext}
              className="max-w-xs h-8 text-xs"
            />
          </div>

          {/* Employee table */}
          {selectedRun ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Emp Code</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Dept</TableHead>
                    <TableHead className="text-xs text-right">Gross</TableHead>
                    <TableHead className="text-xs text-right">Net Pay</TableHead>
                    <TableHead className="text-xs text-center">Days</TableHead>
                    <TableHead className="text-xs text-center">LOP</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayslips.map(ps => (
                    <React.Fragment key={ps.employeeId}>
                      <TableRow>
                        <TableCell className="text-xs font-mono">{ps.employeeCode}</TableCell>
                        <TableCell className="text-xs">{ps.employeeName}</TableCell>
                        <TableCell className="text-xs">{ps.departmentName}</TableCell>
                        <TableCell className="text-xs text-right">₹{toIndianFormat(ps.grossEarnings)}</TableCell>
                        <TableCell className="text-xs text-right font-semibold">₹{toIndianFormat(ps.netPay)}</TableCell>
                        <TableCell className="text-xs text-center">{ps.presentDays}/{ps.workingDays}</TableCell>
                        <TableCell className="text-xs text-center">{ps.lopDays || '—'}</TableCell>
                        <TableCell className="text-xs text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost" size="sm" className="h-7 px-2"
                              onClick={() => setSelectedPayslipId(selectedPayslipId === ps.employeeId ? null : ps.employeeId)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handlePrint(ps)}>
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleDownload(ps)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {selectedPayslipId === ps.employeeId && (
                        <TableRow>
                          <TableCell colSpan={8} className="p-4 bg-muted/30">
                            {renderPayslip(ps)}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                  {filteredPayslips.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No payslips found for this period.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Select a pay period to view payslips.</CardContent></Card>
          )}
        </TabsContent>

        {/* ═══════════════════ TAB 2 — FORM 12BB ═══════════════════ */}
        <TabsContent value="form12bb" className="space-y-4">
          <Card className="border-violet-500/30 bg-violet-500/5">
            <CardContent className="p-4 text-sm">
              <p className="font-semibold text-violet-700 dark:text-violet-300">Form 12BB — Investment Declaration</p>
              <p className="text-muted-foreground mt-1">
                Employees must declare their investments and deductions so that TDS is computed correctly throughout the year.
                Final TDS is adjusted in the last quarter based on actual proofs.
              </p>
            </CardContent>
          </Card>

          {/* Declaration table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Emp Code</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Regime</TableHead>
                  <TableHead className="text-xs text-right">80C</TableHead>
                  <TableHead className="text-xs text-right">80D</TableHead>
                  <TableHead className="text-xs text-right">HRA</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeEmployees.map(emp => {
                  const decl = declarations.find(d => d.employeeId === emp.id && d.financialYear === getCurrentFY());
                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="text-xs font-mono">{emp.empCode}</TableCell>
                      <TableCell className="text-xs">{emp.displayName}</TableCell>
                      <TableCell className="text-xs">{decl?.regime === 'old' ? 'Old' : 'New'}</TableCell>
                      <TableCell className="text-xs text-right">{decl ? toIndianFormat(decl.total80C) : '—'}</TableCell>
                      <TableCell className="text-xs text-right">{decl ? toIndianFormat(decl.medicalInsuranceSelf + decl.medicalInsuranceParents) : '—'}</TableCell>
                      <TableCell className="text-xs text-right">{decl?.hra ? toIndianFormat(decl.hra.rentPerMonth * 12) : '—'}</TableCell>
                      <TableCell className="text-xs text-right">{decl ? toIndianFormat(decl.totalDeductions) : '—'}</TableCell>
                      <TableCell className="text-xs">
                        {decl ? (
                          <Badge variant="outline" className={
                            decl.hrStatus === 'verified' ? 'bg-green-500/10 text-green-700 border-green-500/30' :
                            decl.hrStatus === 'rejected' ? 'bg-rose-500/10 text-rose-700 border-rose-500/30' :
                            'bg-amber-500/10 text-amber-700 border-amber-500/30'
                          }>{decl.hrStatus}</Badge>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => openDeclSheet(emp)} data-primary>
                            {decl ? 'Edit' : '+ New'}
                          </Button>
                          {decl && decl.hrStatus !== 'verified' && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-600" onClick={() => {
                              const updated = declarations.map(d => d.id === decl.id ? { ...d, hrStatus: 'verified' as const, updated_at: new Date().toISOString() } : d);
                              saveDeclarations(updated);
                              toast.success('Declaration verified');
                            }}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {decl && decl.hrStatus !== 'rejected' && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-rose-600" onClick={() => {
                              const updated = declarations.map(d => d.id === decl.id ? { ...d, hrStatus: 'rejected' as const, updated_at: new Date().toISOString() } : d);
                              saveDeclarations(updated);
                              toast.success('Declaration rejected');
                            }}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {activeEmployees.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No IT declarations yet. Add declarations for employees.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Form 12BB Sheet */}
          <Sheet open={declSheetOpen} onOpenChange={setDeclSheetOpen}>
            <SheetContent className="sm:max-w-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Form 12BB — {declForm.employeeName || ''} — FY {declForm.financialYear || getCurrentFY()}</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 py-4" data-keyboard-form>
                {/* Tax Regime */}
                <div className="space-y-2">
                  <Label className="font-semibold">Tax Regime</Label>
                  <Select value={declForm.regime || 'new'} onValueChange={v => duf('regime', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New Regime FY 2025-26</SelectItem>
                      <SelectItem value="old">Old Regime</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    New regime: higher standard deduction (₹75,000) but most deductions not available.
                    Old regime: lower standard deduction (₹50,000) but all Chapter VI-A deductions available.
                  </p>
                </div>

                {/* Section 80C — only old regime */}
                {declForm.regime === 'old' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold">Section 80C</Label>
                      <Badge variant="outline" className={
                        (declForm as ITDeclaration).total80C >= DEDUCTION_LIMITS.section80C
                          ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                          : 'bg-green-500/10 text-green-700 border-green-500/30'
                      }>
                        ₹{toIndianFormat((declForm as ITDeclaration).total80C || 0)} / ₹1,50,000 limit
                      </Badge>
                    </div>
                    {([
                      ['pf', 'Employee PF (auto)', true],
                      ['vpf', 'Voluntary PF (VPF)', false],
                      ['elss', 'ELSS / Mutual Funds', false],
                      ['ppf', 'PPF', false],
                      ['licPremium', 'LIC Premium', false],
                      ['tuitionFees', 'Tuition Fees (children)', false],
                      ['homeLoanPrincipal', 'Home Loan Principal', false],
                      ['nscPurchase', 'NSC Purchase', false],
                      ['otherSection80C', 'Other 80C', false],
                    ] as [keyof ITDeclaration, string, boolean][]).map(([key, label, readOnly]) => (
                      <div key={key} className="flex items-center gap-3">
                        <Label className="text-xs w-48 shrink-0">{label}</Label>
                        <Input
                          {...amountInputProps}
                          value={declForm[key] as number || ''}
                          readOnly={readOnly}
                          onChange={e => duf(key, parseFloat(e.target.value) || 0)}
                          onKeyDown={onEnterNext}
                          className="h-8 text-xs max-w-40"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Section 80D — only old regime */}
                {declForm.regime === 'old' && (
                  <div className="space-y-3">
                    <Label className="font-semibold">Section 80D — Medical Insurance</Label>
                    <div className="flex items-center gap-3">
                      <Label className="text-xs w-48 shrink-0">Self & Family (limit ₹25,000)</Label>
                      <Input {...amountInputProps} value={declForm.medicalInsuranceSelf || ''} onChange={e => duf('medicalInsuranceSelf', parseFloat(e.target.value) || 0)} onKeyDown={onEnterNext} className="h-8 text-xs max-w-40" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-xs w-48 shrink-0">Parents (limit ₹25,000/₹50,000)</Label>
                      <Input {...amountInputProps} value={declForm.medicalInsuranceParents || ''} onChange={e => duf('medicalInsuranceParents', parseFloat(e.target.value) || 0)} onKeyDown={onEnterNext} className="h-8 text-xs max-w-40" />
                    </div>
                  </div>
                )}

                {/* Other Deductions — only old regime */}
                {declForm.regime === 'old' && (
                  <div className="space-y-3">
                    <Label className="font-semibold">Other Deductions</Label>
                    <div className="flex items-center gap-3">
                      <Label className="text-xs w-48 shrink-0">Education Loan Interest (80E)</Label>
                      <Input {...amountInputProps} value={declForm.educationLoanInterest || ''} onChange={e => duf('educationLoanInterest', parseFloat(e.target.value) || 0)} onKeyDown={onEnterNext} className="h-8 text-xs max-w-40" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-xs w-48 shrink-0">Donations (80G — limit ₹1,00,000)</Label>
                      <Input {...amountInputProps} value={declForm.donations80G || ''} onChange={e => duf('donations80G', parseFloat(e.target.value) || 0)} onKeyDown={onEnterNext} className="h-8 text-xs max-w-40" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-xs w-48 shrink-0">Savings Interest 80TTA (limit ₹10,000)</Label>
                      <Input {...amountInputProps} value={declForm.savingsInterest80TTA || ''} onChange={e => duf('savingsInterest80TTA', parseFloat(e.target.value) || 0)} onKeyDown={onEnterNext} className="h-8 text-xs max-w-40" />
                    </div>
                  </div>
                )}

                {/* HRA — always visible */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Switch checked={showHRA} onCheckedChange={v => { setShowHRA(v); if (!v) duf('hra', null); }} />
                    <Label className="font-semibold">Claiming HRA Exemption</Label>
                  </div>
                  {showHRA && (
                    <div className="space-y-2 pl-8">
                      <div className="flex items-center gap-3">
                        <Label className="text-xs w-40 shrink-0">Landlord Name</Label>
                        <Input value={(declForm.hra as any)?.landlordName || ''} onChange={e => duf('hra', { ...(declForm.hra || {}), landlordName: e.target.value })} onKeyDown={onEnterNext} className="h-8 text-xs" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Label className="text-xs w-40 shrink-0">Landlord PAN</Label>
                        <Input value={(declForm.hra as any)?.landlordPAN || ''} onChange={e => duf('hra', { ...(declForm.hra || {}), landlordPAN: e.target.value })} onKeyDown={onEnterNext} className="h-8 text-xs" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Label className="text-xs w-40 shrink-0">Monthly Rent (₹)</Label>
                        <Input {...amountInputProps} value={(declForm.hra as any)?.rentPerMonth || ''} onChange={e => duf('hra', { ...(declForm.hra || {}), rentPerMonth: parseFloat(e.target.value) || 0 })} onKeyDown={onEnterNext} className="h-8 text-xs max-w-40" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Label className="text-xs w-40 shrink-0">City Type</Label>
                        <Select value={(declForm.hra as any)?.cityType || 'metro'} onValueChange={v => duf('hra', { ...(declForm.hra || {}), cityType: v })}>
                          <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="metro">Metro</SelectItem>
                            <SelectItem value="non-metro">Non-Metro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-3">
                        <Label className="text-xs w-40 shrink-0">Rent From</Label>
                        <SmartDateInput value={(declForm.hra as any)?.rentFromDate || ''} onChange={v => duf('hra', { ...(declForm.hra || {}), rentFromDate: v })} className="h-8 text-xs" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Label className="text-xs w-40 shrink-0">Rent To</Label>
                        <SmartDateInput value={(declForm.hra as any)?.rentToDate || ''} onChange={v => duf('hra', { ...(declForm.hra || {}), rentToDate: v })} className="h-8 text-xs" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Home Loan — always visible */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Switch checked={showHomeLoan} onCheckedChange={v => { setShowHomeLoan(v); if (!v) duf('homeLoan', null); }} />
                    <Label className="font-semibold">Home Loan Interest Deduction</Label>
                  </div>
                  {showHomeLoan && (
                    <div className="space-y-2 pl-8">
                      <div className="flex items-center gap-3">
                        <Label className="text-xs w-40 shrink-0">Lender Name</Label>
                        <Input value={(declForm.homeLoan as any)?.lenderName || ''} onChange={e => duf('homeLoan', { ...(declForm.homeLoan || {}), lenderName: e.target.value })} onKeyDown={onEnterNext} className="h-8 text-xs" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Label className="text-xs w-40 shrink-0">Loan Account No</Label>
                        <Input value={(declForm.homeLoan as any)?.loanAccountNo || ''} onChange={e => duf('homeLoan', { ...(declForm.homeLoan || {}), loanAccountNo: e.target.value })} onKeyDown={onEnterNext} className="h-8 text-xs" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Label className="text-xs w-40 shrink-0">Interest Paid (₹)</Label>
                        <Input {...amountInputProps} value={(declForm.homeLoan as any)?.interestPaid || ''} onChange={e => duf('homeLoan', { ...(declForm.homeLoan || {}), interestPaid: parseFloat(e.target.value) || 0 })} onKeyDown={onEnterNext} className="h-8 text-xs max-w-40" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Label className="text-xs w-40 shrink-0">Principal Paid (₹)</Label>
                        <Input {...amountInputProps} value={(declForm.homeLoan as any)?.principalPaid || ''} onChange={e => duf('homeLoan', { ...(declForm.homeLoan || {}), principalPaid: parseFloat(e.target.value) || 0 })} onKeyDown={onEnterNext} className="h-8 text-xs max-w-40" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Label className="text-xs w-40 shrink-0">Property City</Label>
                        <Input value={(declForm.homeLoan as any)?.propertyCity || ''} onChange={e => duf('homeLoan', { ...(declForm.homeLoan || {}), propertyCity: e.target.value })} onKeyDown={onEnterNext} className="h-8 text-xs" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Previous Employer — always visible */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Switch checked={showPrevEmp} onCheckedChange={v => { setShowPrevEmp(v); if (!v) { duf('prevEmployerGross', 0); duf('prevEmployerTDS', 0); duf('prevEmployerPF', 0); } }} />
                    <Label className="font-semibold">Joined mid-year? Add previous employer income</Label>
                  </div>
                  {showPrevEmp && (
                    <div className="space-y-2 pl-8">
                      <div className="flex items-center gap-3">
                        <Label className="text-xs w-48 shrink-0">Previous Employer Gross Income (₹)</Label>
                        <Input {...amountInputProps} value={declForm.prevEmployerGross || ''} onChange={e => duf('prevEmployerGross', parseFloat(e.target.value) || 0)} onKeyDown={onEnterNext} className="h-8 text-xs max-w-40" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Label className="text-xs w-48 shrink-0">TDS Deducted by Previous Employer (₹)</Label>
                        <Input {...amountInputProps} value={declForm.prevEmployerTDS || ''} onChange={e => duf('prevEmployerTDS', parseFloat(e.target.value) || 0)} onKeyDown={onEnterNext} className="h-8 text-xs max-w-40" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Label className="text-xs w-48 shrink-0">PF Contributed (₹)</Label>
                        <Input {...amountInputProps} value={declForm.prevEmployerPF || ''} onChange={e => duf('prevEmployerPF', parseFloat(e.target.value) || 0)} onKeyDown={onEnterNext} className="h-8 text-xs max-w-40" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <Separator />
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-xs">
                    <div className="flex justify-between"><span>Total 80C Deduction:</span><span className="font-semibold">₹{toIndianFormat((declForm as ITDeclaration).total80C || 0)}</span></div>
                    <div className="flex justify-between"><span>Total All Deductions:</span><span className="font-semibold">₹{toIndianFormat((declForm as ITDeclaration).totalDeductions || 0)}</span></div>
                  </CardContent>
                </Card>
              </div>
              <SheetFooter>
                <Button onClick={handleDeclSave} data-primary className="bg-violet-600 hover:bg-violet-700">Save Form 12BB</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </TabsContent>

        {/* ═══════════════════ TAB 3 — PROOF VERIFICATION ═══════════════════ */}
        <TabsContent value="proofs" className="space-y-4">
          <Card className="border-violet-500/30 bg-violet-500/5">
            <CardContent className="p-4 text-sm">
              <p className="font-semibold text-violet-700 dark:text-violet-300">Investment Proof Verification</p>
              <p className="text-muted-foreground mt-1">
                Employees submit proofs for their declared investments. HR verifies each proof before final TDS calculation in March.
              </p>
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Employee</Label>
              <Select value={proofEmpId} onValueChange={setProofEmpId}>
                <SelectTrigger className="w-56 h-8 text-xs"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">FY</Label>
              <Select value={proofFY} onValueChange={setProofFY}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={getCurrentFY()}>{getCurrentFY()}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {proofDecl ? (
            <div className="space-y-4">
              {/* Summary card */}
              {(() => {
                const verified = proofDecl.proofs.filter(p => p.status === 'verified');
                const pending = proofDecl.proofs.filter(p => p.status === 'submitted' || p.status === 'pending');
                const rejected = proofDecl.proofs.filter(p => p.status === 'rejected');
                const verifiedAmt = verified.reduce((s, p) => s + p.declaredAmount, 0);
                const declaredAmt = proofDecl.proofs.reduce((s, p) => s + p.declaredAmount, 0);
                const diff = declaredAmt - verifiedAmt;
                return (
                  <div className="flex gap-4 flex-wrap">
                    <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">Verified: {verified.length}</Badge>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">Pending: {pending.length}</Badge>
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-700 border-rose-500/30">Rejected: {rejected.length}</Badge>
                    <span className="text-xs text-muted-foreground">Verified: ₹{toIndianFormat(verifiedAmt)} / Declared: ₹{toIndianFormat(declaredAmt)}</span>
                    {diff > 0 && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                        <AlertTriangle className="h-3 w-3 mr-1" /> ₹{toIndianFormat(diff)} declared but unverified — TDS may increase
                      </Badge>
                    )}
                  </div>
                );
              })()}

              {/* Add proof form */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">+ Add Proof</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-2 flex-wrap items-end">
                    <div>
                      <Label className="text-xs">Section</Label>
                      <Select value={proofSection} onValueChange={setProofSection}>
                        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['80C', '80D', '80E', '80G', '80TTA', 'HRA', 'HOMELOAN', 'PREV_EMP'].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Input value={proofDesc} onChange={e => setProofDesc(e.target.value)} onKeyDown={onEnterNext} className="h-8 text-xs w-48" placeholder="e.g. LIC Premium 2024-25" />
                    </div>
                    <div>
                      <Label className="text-xs">Amount (₹)</Label>
                      <Input {...amountInputProps} value={proofAmount} onChange={e => setProofAmount(e.target.value)} onKeyDown={onEnterNext} className="h-8 text-xs w-32" />
                    </div>
                    <div>
                      <Label className="text-xs">Proof Reference</Label>
                      <Input value={proofRef} onChange={e => setProofRef(e.target.value)} onKeyDown={onEnterNext} className="h-8 text-xs w-48" placeholder="Filename / reference" />
                    </div>
                    <Button size="sm" className="h-8" onClick={addProof} data-primary>Add</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Proof table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Section</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                      <TableHead className="text-xs">Reference</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">HR Remarks</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proofDecl.proofs.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs">{p.section}</TableCell>
                        <TableCell className="text-xs">{p.description}</TableCell>
                        <TableCell className="text-xs text-right">₹{toIndianFormat(p.declaredAmount)}</TableCell>
                        <TableCell className="text-xs">{p.proofRef || '—'}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className={
                            p.status === 'verified' ? 'bg-green-500/10 text-green-700 border-green-500/30' :
                            p.status === 'rejected' ? 'bg-rose-500/10 text-rose-700 border-rose-500/30' :
                            'bg-amber-500/10 text-amber-700 border-amber-500/30'
                          }>{p.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{p.hrRemarks || '—'}</TableCell>
                        <TableCell className="text-xs text-right">
                          <div className="flex justify-end gap-1">
                            {p.status !== 'verified' && (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-green-600" onClick={() => verifyProof(p.id)}>
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {p.status !== 'rejected' && rejectingProofId !== p.id && (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-rose-600" onClick={() => setRejectingProofId(p.id)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {rejectingProofId === p.id && (
                              <div className="flex gap-1 items-center">
                                <Input value={rejectRemarks} onChange={e => setRejectRemarks(e.target.value)} onKeyDown={onEnterNext} placeholder="Reason" className="h-7 text-xs w-32" />
                                <Button size="sm" className="h-7 px-2" variant="destructive" onClick={() => rejectProof(p.id)} data-primary>Reject</Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {proofDecl.proofs.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No proofs submitted yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : proofEmpId ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No IT declaration found for this employee in FY {proofFY}. Create one in the Form 12BB tab first.</CardContent></Card>
          ) : (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Select an employee to view and manage investment proofs.</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function PayslipGeneration() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <ERPHeader breadcrumbs={[{ label: 'Operix Core', href: '/erp/dashboard' }, { label: 'Pay Hub' }, { label: 'Payslip Generation' }]} showDatePicker={false} showCompany={false} />
        <div className="flex-1 overflow-auto p-6">
          <PayslipGenerationPanel />
        </div>
      </div>
    </SidebarProvider>
  );
}
