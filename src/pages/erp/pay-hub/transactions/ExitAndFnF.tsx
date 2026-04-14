import React, { useState, useMemo, useCallback } from 'react';
import { format, parseISO, differenceInDays, getDaysInMonth } from 'date-fns';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Separator } from '@/components/ui/separator';
import { LogOut, Receipt, Check, X, Printer, Plus, AlertTriangle,
  Clock, CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { ExitRequest, FnFSettlement, FnFLine, ClearanceItem,
  ExitType, ExitStatus, ExitTab } from '@/types/exit-management';
import { EXIT_REQUESTS_KEY, FNF_SETTLEMENTS_KEY,
  EXIT_TYPE_LABELS, EXIT_STATUS_COLORS,
  DEFAULT_CLEARANCE_ITEMS } from '@/types/exit-management';
import type { Employee } from '@/types/employee';
import type { LeaveType } from '@/types/payroll-masters';
import { EMPLOYEES_KEY } from '@/types/employee';
import { LEAVE_TYPES_KEY } from '@/types/payroll-masters';
import { LOAN_APPLICATIONS_KEY } from '@/types/employee-finance';
import { GRATUITY_NPS_KEY, DEFAULT_GRATUITY_NPS } from '@/types/payroll-masters';
import type { GratuityNPSSettings } from '@/types/payroll-masters';
import { toIndianFormat, onEnterNext, useCtrlS } from '@/lib/keyboard';

// ── loadGratuityConfig ───────────────────────────────────────────
function loadGratuityConfig(): GratuityNPSSettings['gratuity'] {
  try {
    // [JWT] GET /api/pay-hub/masters/gratuity-nps-config
    const raw = localStorage.getItem(GRATUITY_NPS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.gratuity) return parsed.gratuity;
    }
  } catch { /* ignore */ }
  return DEFAULT_GRATUITY_NPS.gratuity;
}

// ── computeGratuity ──────────────────────────────────────────────
function computeGratuity(
  monthlyBasic: number, dojStr: string, lwdStr: string,
  maxGratuity?: number
): number {
  if (!dojStr || !lwdStr || monthlyBasic <= 0) return 0;
  try {
    const doj = new Date(dojStr);
    const lwd = new Date(lwdStr);
    const years = (lwd.getTime() - doj.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (years < 5) return 0;
    const gratuity = (monthlyBasic * 15 * Math.floor(years)) / 26;
    const cap = maxGratuity ?? loadGratuityConfig().maxGratuityAmount ?? 2000000;
    return Math.min(Math.round(gratuity), cap);
  } catch { return 0; }
}

// ── computeLeaveEncashment ────────────────────────────────────────
function computeLeaveEncashment(
  elBalance: number,
  monthlyBasic: number,
  maxEncashmentDays: number
): number {
  if (elBalance <= 0 || monthlyBasic <= 0) return 0;
  const encashableDays = Math.min(elBalance, maxEncashmentDays);
  return Math.round(encashableDays * (monthlyBasic / 26));
}

// ── computeNoticePeriodShortfall ──────────────────────────────────
function computeNoticePeriodShortfall(
  noticeRequired: number,
  noticeServed: number,
  dailyRate: number
): number {
  const shortfall = Math.max(0, noticeRequired - noticeServed);
  return Math.round(shortfall * dailyRate);
}

// ── computeProRataSalary ──────────────────────────────────────────
function computeProRataSalary(
  monthlyGross: number,
  daysWorked: number,
  totalDaysInMonth: number
): number {
  if (monthlyGross <= 0 || totalDaysInMonth <= 0) return 0;
  return Math.round((monthlyGross / totalDaysInMonth) * daysWorked);
}

const amountInputProps = { type: 'number' as const, min: 0, step: 1, className: 'text-right' };

interface ExitAndFnFPanelProps { defaultTab?: ExitTab; }

export function ExitAndFnFPanel({ defaultTab = 'exit' }: ExitAndFnFPanelProps) {

  // ── Cross-module reads ───────────────────────────────────────
  const allEmployees = useMemo<Employee[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/employees
      const raw = localStorage.getItem(EMPLOYEES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  const leaveTypes = useMemo<LeaveType[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/masters/leave-types
      const raw = localStorage.getItem(LEAVE_TYPES_KEY);
      if (raw) return (JSON.parse(raw) as LeaveType[]).filter(l => l.encashable && l.status === 'active');
    } catch { /* ignore */ }
    return [];
  }, []);

  // ── Exit Requests state ──────────────────────────────────────
  const [exitRequests, setExitRequests] = useState<ExitRequest[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/exit/requests
      const raw = localStorage.getItem(EXIT_REQUESTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveExitRequests = (items: ExitRequest[]) => {
    // [JWT] PUT /api/pay-hub/exit/requests
    localStorage.setItem(EXIT_REQUESTS_KEY, JSON.stringify(items));
    setExitRequests(items);
  };

  // ── FnF Settlements state ────────────────────────────────────
  const [settlements, setSettlements] = useState<FnFSettlement[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/exit/fnf
      const raw = localStorage.getItem(FNF_SETTLEMENTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveSettlements = (items: FnFSettlement[]) => {
    // [JWT] PUT /api/pay-hub/exit/fnf
    localStorage.setItem(FNF_SETTLEMENTS_KEY, JSON.stringify(items));
    setSettlements(items);
  };

  // ── Selected exit request for detail view ─────────────────────
  const [selectedExitId, setSelectedExitId] = useState<string | null>(null);
  const selectedExit = exitRequests.find(e => e.id === selectedExitId) || null;

  // ── Filters ──────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredExits = useMemo(() => {
    return exitRequests.filter(e => {
      if (filterStatus !== 'all' && e.status !== filterStatus) return false;
      if (filterType !== 'all' && e.exitType !== filterType) return false;
      return true;
    });
  }, [exitRequests, filterStatus, filterType]);

  // ── Exit Initiation Sheet ─────────────────────────────────────
  const [exitSheetOpen, setExitSheetOpen] = useState(false);
  const BLANK_EXIT = {
    employeeId: '', employeeCode: '', employeeName: '',
    designation: '', departmentName: '',
    exitType: 'resignation' as ExitType,
    resignationDate: '', lastWorkingDate: '',
    noticePeriodDays: 30, noticePeriodServed: 0,
    exitReason: '', exitInterviewDone: false, exitInterviewNotes: '',
    clearanceItems: [] as ClearanceItem[],
    status: 'initiated' as ExitStatus,
    approvedBy: '', approvedAt: '', hrRemarks: '',
  };
  const [exitForm, setExitForm] = useState(BLANK_EXIT);
  const euf = <K extends keyof typeof BLANK_EXIT>(k: K, v: (typeof BLANK_EXIT)[K]) =>
    setExitForm(prev => ({ ...prev, [k]: v }));

  const handleExitSave = useCallback(() => {
    if (!exitSheetOpen) return;
    if (!exitForm.employeeId) return toast.error('Select an employee');
    if (!exitForm.resignationDate) return toast.error('Resignation date required');
    if (!exitForm.lastWorkingDate) return toast.error('Last working date required');
    const now = new Date().toISOString();
    const clearance: ClearanceItem[] = DEFAULT_CLEARANCE_ITEMS.map((item, i) => ({
      ...item, id: `cl-${Date.now()}-${i}`, status: 'pending' as const, remarks: '', clearedDate: '',
    }));
    const code = `EXIT-${String(exitRequests.length + 1).padStart(6, '0')}`;
    saveExitRequests([...exitRequests, {
      ...exitForm,
      clearanceItems: clearance,
      id: `exit-${Date.now()}`, exitCode: code,
      created_at: now, updated_at: now,
    }]);
    toast.success(`Exit request created for ${exitForm.employeeName}`);
    setExitSheetOpen(false); setExitForm(BLANK_EXIT);
  }, [exitSheetOpen, exitForm, exitRequests]);

  // ── FnF Sheet (adjust computed figures before finalizing) ────
  const [fnfSheetOpen, setFnfSheetOpen] = useState(false);
  const [fnfTargetExitId, setFnfTargetExitId] = useState<string>('');
  const [customLines, setCustomLines] = useState<FnFLine[]>([]);
  const [bonusArrears, setBonusArrears] = useState(0);
  const [otherEarnings, setOtherEarnings] = useState(0);
  const [assetDamage, setAssetDamage] = useState(0);
  const [otherDeductions, setOtherDeductions] = useState(0);
  const [fnfNotes, setFnfNotes] = useState('');

  // Eligible exits for FnF (clearance_pending with no settlement yet)
  const eligibleExits = useMemo(() => {
    const settledIds = new Set(settlements.map(s => s.exitRequestId));
    return exitRequests.filter(e => e.status === 'clearance_pending' && !settledIds.has(e.id));
  }, [exitRequests, settlements]);

  // Live preview of FnF computation
  const fnfPreview = useMemo(() => {
    const exit = exitRequests.find(e => e.id === fnfTargetExitId);
    if (!exit) return null;
    const emp = allEmployees.find(e => e.id === exit.employeeId);
    if (!emp) return null;
    const monthlyGross = emp.annualCTC / 12;
    const monthlyBasic = monthlyGross * 0.4;
    const dailyRate = monthlyGross / 26;
    const lwd = new Date(exit.lastWorkingDate);
    const totalDays = getDaysInMonth(lwd);
    const daysWorked = lwd.getDate();
    const proRata = computeProRataSalary(monthlyGross, daysWorked, totalDays);
    const gratuity = computeGratuity(monthlyBasic, emp.doj, exit.lastWorkingDate, loadGratuityConfig().maxGratuityAmount);
    const elType = leaveTypes.find(l => l.code === 'EL');
    const elBalance = emp.elOpeningBalance || 0;
    const encashment = elType ? computeLeaveEncashment(elBalance, monthlyBasic, elType.maxEncashmentDays) : 0;
    const served = differenceInDays(lwd, new Date(exit.resignationDate));
    const shortfall = computeNoticePeriodShortfall(exit.noticePeriodDays, served, dailyRate);
    let loanOut = 0;
    try {
      // [JWT] GET /api/pay-hub/finance/loans
      const raw = localStorage.getItem(LOAN_APPLICATIONS_KEY);
      if (raw) {
        const loans = JSON.parse(raw);
        loanOut = loans
          .filter((l: { employeeId: string; status: string; remainingBalance: number }) =>
            l.employeeId === emp.id && (l.status === 'disbursed' || l.status === 'approved'))
          .reduce((s: number, l: { remainingBalance: number }) => s + l.remainingBalance, 0);
      }
    } catch { /* ignore */ }
    const totalE = proRata + gratuity + encashment + bonusArrears + otherEarnings +
      customLines.filter(l => l.type === 'earning').reduce((s, l) => s + l.amount, 0);
    const totalD = shortfall + loanOut + assetDamage + otherDeductions +
      customLines.filter(l => l.type === 'deduction').reduce((s, l) => s + l.amount, 0);
    return { proRata, gratuity, encashment, shortfall, loanOut, totalE, totalD, net: totalE - totalD };
  }, [fnfTargetExitId, exitRequests, allEmployees, leaveTypes, bonusArrears, otherEarnings, assetDamage, otherDeductions, customLines]);

  const handleFnfSave = useCallback(() => {
    if (!fnfSheetOpen) return;
    const exit = exitRequests.find(e => e.id === fnfTargetExitId);
    if (!exit) return;
    const emp = allEmployees.find(e => e.id === exit.employeeId);
    if (!emp) return;

    const monthlyGross = emp.annualCTC / 12;
    const monthlyBasic = monthlyGross * 0.4;
    const dailyRate = monthlyGross / 26;

    const lwd = new Date(exit.lastWorkingDate);
    const totalDays = getDaysInMonth(lwd);
    const daysWorked = lwd.getDate();
    const proRata = computeProRataSalary(monthlyGross, daysWorked, totalDays);
    const gratuity = computeGratuity(monthlyBasic, emp.doj, exit.lastWorkingDate, loadGratuityConfig().maxGratuityAmount);
    const elType = leaveTypes.find(l => l.code === 'EL');
    const elBalance = emp.elOpeningBalance || 0;
    const encashment = elType
      ? computeLeaveEncashment(elBalance, monthlyBasic, elType.maxEncashmentDays)
      : 0;

    const served = differenceInDays(lwd, new Date(exit.resignationDate));
    const shortfall = computeNoticePeriodShortfall(
      exit.noticePeriodDays, served, dailyRate
    );

    let loanOutstanding = 0;
    try {
      // [JWT] GET /api/pay-hub/finance/loans
      const raw = localStorage.getItem(LOAN_APPLICATIONS_KEY);
      if (raw) {
        const loans = JSON.parse(raw);
        loanOutstanding = loans
          .filter((l: { employeeId: string; status: string; remainingBalance: number }) =>
            l.employeeId === emp.id && (l.status === 'disbursed' || l.status === 'approved'))
          .reduce((s: number, l: { remainingBalance: number }) => s + l.remainingBalance, 0);
      }
    } catch { /* ignore */ }

    const totalEarnings = proRata + gratuity + encashment + bonusArrears + otherEarnings;
    const totalDeductions = shortfall + loanOutstanding + assetDamage + otherDeductions;
    const netPayable = totalEarnings - totalDeductions;

    const code = `FNF-${String(settlements.length + 1).padStart(6, '0')}`;
    const now = new Date().toISOString();
    saveSettlements([...settlements, {
      id: `fnf-${Date.now()}`, fnfCode: code,
      exitRequestId: exit.id,
      employeeId: emp.id, employeeCode: emp.empCode, employeeName: emp.displayName,
      lastWorkingDate: exit.lastWorkingDate, paymentDate: '',
      lastMonthSalary: proRata, leaveEncashment: encashment,
      gratuity, bonusArrears, otherEarnings,
      noticePeriodShortfall: shortfall, loanOutstanding, assetDamage, otherDeductions,
      lines: customLines, totalEarnings, totalDeductions, netPayable,
      status: 'draft', approvedBy: '', approvedAt: '', paidVia: '',
      notes: fnfNotes, created_at: now, updated_at: now,
    }]);
    saveExitRequests(exitRequests.map(e => e.id !== exit.id ? e : {
      ...e, status: 'fnf_pending' as const, updated_at: now,
    }));
    toast.success(`F&F Settlement created: ${code}`);
    setFnfSheetOpen(false);
  }, [fnfSheetOpen, fnfTargetExitId, exitRequests, allEmployees, leaveTypes,
    bonusArrears, otherEarnings, assetDamage, otherDeductions, customLines, fnfNotes, settlements]);

  // ── Apply approved F&F — write-back to employee.status ───────
  const applyFnF = (fnf: FnFSettlement) => {
    try {
      // [JWT] GET /api/pay-hub/employees
      const raw = localStorage.getItem(EMPLOYEES_KEY);
      if (!raw) return;
      const emps: Employee[] = JSON.parse(raw);
      const now = new Date().toISOString();
      // [JWT] PUT /api/pay-hub/employees
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(
        emps.map(e => e.id !== fnf.employeeId ? e : {
          ...e, status: 'relieved' as const, updated_at: now,
        })
      ));
      saveSettlements(settlements.map(s => s.id !== fnf.id ? s : {
        ...s, status: 'paid' as const, paymentDate: now.slice(0, 10), updated_at: now,
      }));
      saveExitRequests(exitRequests.map(e => e.employeeId !== fnf.employeeId ? e : {
        ...e, status: 'completed' as const, updated_at: now,
      }));
      toast.success(`F&F applied — ${fnf.employeeName} marked as Relieved`);
    } catch {
      toast.error('Failed to apply F&F');
    }
  };

  // ── masterSave ────────────────────────────────────────────────
  const masterSave = useCallback(() => {
    if (exitSheetOpen) { handleExitSave(); return; }
    if (fnfSheetOpen) { handleFnfSave(); return; }
  }, [exitSheetOpen, fnfSheetOpen, handleExitSave, handleFnfSave]);
  useCtrlS(masterSave);

  // ── Print state ───────────────────────────────────────────────
  const [printExitId, setPrintExitId] = useState<string | null>(null);
  const [printType, setPrintType] = useState<'relieving' | 'experience' | 'fnf'>('relieving');
  const companyName = useMemo(() => {
    try {
      // [JWT] GET /api/foundation/parent-company
      const raw = localStorage.getItem('erp_parent_company');
      if (raw) { const p = JSON.parse(raw); return p.legalName || p.name || 'Company'; }
    } catch { /* ignore */ }
    return 'Company Name';
  }, []);

  const printExit = exitRequests.find(e => e.id === printExitId) || null;
  const printFnf = printExit ? settlements.find(s => s.exitRequestId === printExit.id) : null;
  const printEmp = printExit ? allEmployees.find(e => e.id === printExit.employeeId) : null;

  const handlePrint = (exitId: string, type: 'relieving' | 'experience' | 'fnf') => {
    setPrintExitId(exitId);
    setPrintType(type);
    setTimeout(() => window.print(), 300);
  };

  // ── Clearance helpers ─────────────────────────────────────────
  const updateClearanceItem = (exitId: string, itemId: string, status: 'cleared' | 'waived') => {
    const now = new Date().toISOString();
    saveExitRequests(exitRequests.map(e => e.id !== exitId ? e : {
      ...e,
      clearanceItems: e.clearanceItems.map(c => c.id !== itemId ? c : {
        ...c, status, clearedDate: status === 'cleared' ? now.slice(0, 10) : '', remarks: status === 'waived' ? 'Waived' : c.remarks,
      }),
      updated_at: now,
    }));
  };

  const updateExitStatus = (exitId: string, newStatus: ExitStatus) => {
    const now = new Date().toISOString();
    saveExitRequests(exitRequests.map(e => e.id !== exitId ? e : {
      ...e, status: newStatus, updated_at: now,
    }));
    toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
  };

  const saveInterviewNotes = (exitId: string, done: boolean, notes: string) => {
    const now = new Date().toISOString();
    saveExitRequests(exitRequests.map(e => e.id !== exitId ? e : {
      ...e, exitInterviewDone: done, exitInterviewNotes: notes, updated_at: now,
    }));
    toast.success('Interview notes saved');
  };

  // ── FnF expanded row ─────────────────────────────────────────
  const [expandedFnfId, setExpandedFnfId] = useState<string | null>(null);

  // ── Stats ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = exitRequests.filter(e => !['completed', 'withdrawn', 'rejected'].includes(e.status)).length;
    const clearance = exitRequests.filter(e => e.status === 'clearance_pending').length;
    const fnfPending = exitRequests.filter(e => e.status === 'fnf_pending').length;
    const completed = exitRequests.filter(e => e.status === 'completed').length;
    return { active, clearance, fnfPending, completed };
  }, [exitRequests]);

  return (
    <div className="space-y-4" data-keyboard-form>
      {/* Print CSS */}
      <style>{`
        @media print {
          body > *:not(.print-target) { display: none !important; }
          .print-target { display: block !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <LogOut className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Exit Management & F&F</h2>
            <p className="text-xs text-muted-foreground">Separation · Clearance · Full & Final Settlement</p>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Active Exit Requests', value: stats.active, color: 'text-amber-600' },
          { label: 'Clearance Pending', value: stats.clearance, color: 'text-blue-600' },
          { label: 'F&F Pending', value: stats.fnfPending, color: 'text-violet-600' },
          { label: 'Completed This FY', value: stats.completed, color: 'text-green-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="exit" className="gap-1.5"><LogOut className="h-3.5 w-3.5" />Exit Management</TabsTrigger>
          <TabsTrigger value="fnf" className="gap-1.5"><Receipt className="h-3.5 w-3.5" />F&F Settlements</TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════ TAB: exit ═══════════════════════════ */}
        <TabsContent value="exit" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {(Object.keys(EXIT_STATUS_COLORS) as ExitStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {(Object.keys(EXIT_TYPE_LABELS) as ExitType[]).map(t => (
                    <SelectItem key={t} value={t}>{EXIT_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={() => setExitSheetOpen(true)} data-primary>
              <Plus className="h-3.5 w-3.5 mr-1" />Initiate Exit
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* LEFT: Exit list */}
            <div className="col-span-1 space-y-2 max-h-[70vh] overflow-auto pr-1">
              {filteredExits.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No exit requests found</p>
              )}
              {filteredExits.map(e => {
                const isSelected = selectedExitId === e.id;
                const daysRemaining = e.status === 'notice_period' && e.lastWorkingDate
                  ? differenceInDays(parseISO(e.lastWorkingDate), new Date()) : null;
                return (
                  <Card key={e.id}
                    className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-violet-500' : 'hover:border-violet-300'}`}
                    onClick={() => setSelectedExitId(e.id)}>
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-muted-foreground">{e.exitCode}</span>
                        <Badge variant="outline" className={`text-[9px] ${EXIT_STATUS_COLORS[e.status]}`}>
                          {e.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold">{e.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{e.designation}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Badge variant="outline" className="text-[9px]">{EXIT_TYPE_LABELS[e.exitType]}</Badge>
                        {e.lastWorkingDate && <span>LWD: {format(parseISO(e.lastWorkingDate), 'dd MMM yyyy')}</span>}
                      </div>
                      {daysRemaining !== null && (
                        <p className="text-[10px] text-amber-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" />{daysRemaining} days remaining
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* RIGHT: Detail */}
            <div className="col-span-2">
              {!selectedExit ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <p>Select an exit request from the list</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Header */}
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold">{selectedExit.employeeName}</h3>
                          <p className="text-xs text-muted-foreground">
                            {selectedExit.employeeCode} · {selectedExit.designation} · {selectedExit.departmentName}
                          </p>
                        </div>
                        <Badge variant="outline" className={EXIT_STATUS_COLORS[selectedExit.status]}>
                          {selectedExit.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span><strong>Type:</strong> {EXIT_TYPE_LABELS[selectedExit.exitType]}</span>
                        <span><strong>Resignation:</strong> {selectedExit.resignationDate ? format(parseISO(selectedExit.resignationDate), 'dd MMM yyyy') : '—'}</span>
                        <span><strong>LWD:</strong> {selectedExit.lastWorkingDate ? format(parseISO(selectedExit.lastWorkingDate), 'dd MMM yyyy') : '—'}</span>
                      </div>
                      {/* Notice period progress */}
                      {selectedExit.resignationDate && selectedExit.lastWorkingDate && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span>Notice Period: {selectedExit.noticePeriodDays} days required</span>
                            <span>{differenceInDays(parseISO(selectedExit.lastWorkingDate), parseISO(selectedExit.resignationDate))} days served</span>
                          </div>
                          <Progress value={Math.min(100, (differenceInDays(parseISO(selectedExit.lastWorkingDate), parseISO(selectedExit.resignationDate)) / selectedExit.noticePeriodDays) * 100)} className="h-2" />
                        </div>
                      )}
                      {/* Workflow buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedExit.status === 'initiated' && (
                          <Button size="sm" variant="outline" onClick={() => updateExitStatus(selectedExit.id, 'notice_period')} data-primary>
                            <Clock className="h-3 w-3 mr-1" />Move to Notice Period
                          </Button>
                        )}
                        {selectedExit.status === 'notice_period' && (
                          <Button size="sm" variant="outline" onClick={() => updateExitStatus(selectedExit.id, 'clearance_pending')} data-primary>
                            <CheckCircle2 className="h-3 w-3 mr-1" />Start Clearance
                          </Button>
                        )}
                        {selectedExit.status === 'clearance_pending' &&
                          selectedExit.clearanceItems.every(c => c.status !== 'pending') && (
                          <Button size="sm" variant="outline" onClick={() => {
                            setFnfTargetExitId(selectedExit.id);
                            setFnfSheetOpen(true);
                          }} data-primary>
                            <ChevronRight className="h-3 w-3 mr-1" />Initiate F&F →
                          </Button>
                        )}
                        {selectedExit.status === 'fnf_pending' && (
                          <Button size="sm" variant="outline" onClick={() => updateExitStatus(selectedExit.id, 'completed')} data-primary>
                            <Check className="h-3 w-3 mr-1" />Approve Exit
                          </Button>
                        )}
                        {!['completed', 'withdrawn', 'rejected'].includes(selectedExit.status) && (
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => updateExitStatus(selectedExit.id, 'withdrawn')}>
                            <X className="h-3 w-3 mr-1" />Withdraw
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Clearance checklist */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Clearance Checklist</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(() => {
                        const cleared = selectedExit.clearanceItems.filter(c => c.status !== 'pending').length;
                        const total = selectedExit.clearanceItems.length;
                        return (
                          <>
                            <div className="flex items-center gap-2">
                              <Progress value={total > 0 ? (cleared / total) * 100 : 0} className="h-2 flex-1" />
                              <span className="text-xs text-muted-foreground">{cleared}/{total} items cleared</span>
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">Department</TableHead>
                                  <TableHead className="text-xs">Item</TableHead>
                                  <TableHead className="text-xs">Assigned To</TableHead>
                                  <TableHead className="text-xs">Status</TableHead>
                                  <TableHead className="text-xs">Cleared Date</TableHead>
                                  <TableHead className="text-xs">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedExit.clearanceItems.map(c => (
                                  <TableRow key={c.id}>
                                    <TableCell className="text-xs">{c.department}</TableCell>
                                    <TableCell className="text-xs">{c.item}</TableCell>
                                    <TableCell className="text-xs">{c.assignedTo}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className={`text-[9px] ${c.status === 'cleared' ? 'bg-green-500/10 text-green-700' : c.status === 'waived' ? 'bg-slate-500/10 text-slate-500' : 'bg-amber-500/10 text-amber-700'}`}>
                                        {c.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs">{c.clearedDate || '—'}</TableCell>
                                    <TableCell>
                                      {c.status === 'pending' && (
                                        <div className="flex gap-1">
                                          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-green-600" onClick={() => updateClearanceItem(selectedExit.id, c.id, 'cleared')}>
                                            <Check className="h-3 w-3 mr-0.5" />Clear
                                          </Button>
                                          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-slate-500" onClick={() => updateClearanceItem(selectedExit.id, c.id, 'waived')}>
                                            Waive
                                          </Button>
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  {/* Exit Interview */}
                  {(selectedExit.exitType === 'resignation' || selectedExit.exitType === 'retirement') && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Exit Interview</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={selectedExit.exitInterviewDone}
                            onCheckedChange={v => saveInterviewNotes(selectedExit.id, v, selectedExit.exitInterviewNotes)}
                          />
                          <Label className="text-xs">Exit Interview Done</Label>
                        </div>
                        <Textarea
                          placeholder="Interview notes..."
                          value={selectedExit.exitInterviewNotes}
                          onChange={ev => {
                            const val = ev.target.value;
                            saveExitRequests(exitRequests.map(e => e.id !== selectedExit.id ? e : {
                              ...e, exitInterviewNotes: val,
                            }));
                          }}
                          rows={3}
                          className="text-xs"
                        />
                        <Button size="sm" variant="outline" onClick={() => saveInterviewNotes(selectedExit.id, selectedExit.exitInterviewDone, selectedExit.exitInterviewNotes)} data-primary>
                          Save Interview Notes
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Print section */}
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => handlePrint(selectedExit.id, 'relieving')}>
                      <Printer className="h-3 w-3 mr-1" />Relieving Letter
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handlePrint(selectedExit.id, 'experience')}>
                      <Printer className="h-3 w-3 mr-1" />Experience Letter
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════ TAB: fnf ═══════════════════════════ */}
        <TabsContent value="fnf" className="space-y-4">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                Full & Final Settlement is computed when all clearances are done. The settlement includes pro-rated salary, gratuity, leave encashment, notice period shortfall, and outstanding dues.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button size="sm" onClick={() => {
              setCustomLines([]);
              setBonusArrears(0); setOtherEarnings(0); setAssetDamage(0); setOtherDeductions(0);
              setFnfNotes(''); setFnfTargetExitId('');
              setFnfSheetOpen(true);
            }} data-primary disabled={eligibleExits.length === 0}>
              <Plus className="h-3.5 w-3.5 mr-1" />Create F&F Settlement
            </Button>
          </div>

          {settlements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No F&F settlements yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">FnF Code</TableHead>
                  <TableHead className="text-xs">Employee</TableHead>
                  <TableHead className="text-xs text-right">Earnings</TableHead>
                  <TableHead className="text-xs text-right">Deductions</TableHead>
                  <TableHead className="text-xs text-right">Net Payable</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map(s => (
                  <React.Fragment key={s.id}>
                    <TableRow className="cursor-pointer" onClick={() => setExpandedFnfId(expandedFnfId === s.id ? null : s.id)}>
                      <TableCell className="text-xs font-mono">{s.fnfCode}</TableCell>
                      <TableCell className="text-xs">{s.employeeName}</TableCell>
                      <TableCell className="text-xs text-right text-green-600">₹{toIndianFormat(s.totalEarnings)}</TableCell>
                      <TableCell className="text-xs text-right text-red-600">₹{toIndianFormat(s.totalDeductions)}</TableCell>
                      <TableCell className="text-xs text-right font-bold text-violet-600">₹{toIndianFormat(s.netPayable)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[9px] ${s.status === 'paid' ? 'bg-green-500/10 text-green-700' : s.status === 'approved' ? 'bg-blue-500/10 text-blue-700' : 'bg-slate-500/10 text-slate-600'}`}>
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={ev => ev.stopPropagation()}>
                          {s.status === 'draft' && (
                            <Button size="sm" variant="ghost" className="h-6 text-[10px]" data-primary onClick={() => {
                              const now = new Date().toISOString();
                              saveSettlements(settlements.map(x => x.id !== s.id ? x : { ...x, status: 'approved' as const, approvedBy: 'HR Admin', approvedAt: now, updated_at: now }));
                              toast.success('F&F approved');
                            }}>
                              <Check className="h-3 w-3 mr-0.5" />Approve
                            </Button>
                          )}
                          {s.status === 'approved' && (
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-green-600" data-primary onClick={() => applyFnF(s)}>
                              <CheckCircle2 className="h-3 w-3 mr-0.5" />Mark Paid + Relieve
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => {
                            const exit = exitRequests.find(e => e.id === s.exitRequestId);
                            if (exit) handlePrint(exit.id, 'fnf');
                          }}>
                            <Printer className="h-3 w-3 mr-0.5" />F&F Statement
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedFnfId === s.id && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/30 p-4">
                          <div className="grid grid-cols-2 gap-6 text-xs">
                            <div>
                              <h4 className="font-semibold text-green-700 mb-2">EARNINGS</h4>
                              <div className="space-y-1">
                                <div className="flex justify-between"><span>Pro-Rata Salary</span><span>₹{toIndianFormat(s.lastMonthSalary)}</span></div>
                                <div className="flex justify-between"><span>Leave Encashment</span><span>₹{toIndianFormat(s.leaveEncashment)}</span></div>
                                <div className="flex justify-between"><span>Gratuity</span><span>₹{toIndianFormat(s.gratuity)}</span></div>
                                <div className="flex justify-between"><span>Bonus Arrears</span><span>₹{toIndianFormat(s.bonusArrears)}</span></div>
                                <div className="flex justify-between"><span>Other Earnings</span><span>₹{toIndianFormat(s.otherEarnings)}</span></div>
                                <Separator />
                                <div className="flex justify-between font-semibold"><span>Total Earnings</span><span>₹{toIndianFormat(s.totalEarnings)}</span></div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-red-700 mb-2">DEDUCTIONS</h4>
                              <div className="space-y-1">
                                <div className="flex justify-between"><span>Notice Period Shortfall</span><span>₹{toIndianFormat(s.noticePeriodShortfall)}</span></div>
                                <div className="flex justify-between"><span>Loan Outstanding</span><span>₹{toIndianFormat(s.loanOutstanding)}</span></div>
                                <div className="flex justify-between"><span>Asset Damage</span><span>₹{toIndianFormat(s.assetDamage)}</span></div>
                                <div className="flex justify-between"><span>Other Deductions</span><span>₹{toIndianFormat(s.otherDeductions)}</span></div>
                                <Separator />
                                <div className="flex justify-between font-semibold"><span>Total Deductions</span><span>₹{toIndianFormat(s.totalDeductions)}</span></div>
                              </div>
                            </div>
                          </div>
                          <Separator className="my-3" />
                          <div className="flex justify-end text-lg font-bold text-violet-600">
                            NET PAYABLE: ₹{toIndianFormat(s.netPayable)}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════════ Exit Initiation Sheet ═══════════════════ */}
      <Sheet open={exitSheetOpen} onOpenChange={setExitSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-auto">
          <SheetHeader><SheetTitle>Initiate Exit</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4" data-keyboard-form>
            <div className="space-y-1.5">
              <Label className="text-xs">Employee *</Label>
              <Select value={exitForm.employeeId} onValueChange={v => {
                const emp = allEmployees.find(e => e.id === v);
                if (emp) {
                  euf('employeeId', emp.id);
                  euf('employeeCode', emp.empCode);
                  euf('employeeName', emp.displayName);
                  euf('designation', emp.designation);
                  euf('departmentName', emp.departmentName);
                  euf('noticePeriodDays', emp.noticePeriodDays || 30);
                }
              }}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {allEmployees.filter(e => e.status === 'active').map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Exit Type</Label>
              <Select value={exitForm.exitType} onValueChange={v => euf('exitType', v as ExitType)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(EXIT_TYPE_LABELS) as ExitType[]).map(t => (
                    <SelectItem key={t} value={t}>{EXIT_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Resignation Date *</Label>
                <SmartDateInput value={exitForm.resignationDate} onChange={v => euf('resignationDate', v)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Last Working Date *</Label>
                <SmartDateInput value={exitForm.lastWorkingDate} onChange={v => euf('lastWorkingDate', v)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notice Period (days)</Label>
              <Input type="number" value={exitForm.noticePeriodDays} onChange={ev => euf('noticePeriodDays', Number(ev.target.value))} className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Exit Reason</Label>
              <Textarea value={exitForm.exitReason} onChange={ev => euf('exitReason', ev.target.value)} rows={2} className="text-xs" placeholder="Reason for leaving..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">HR Remarks</Label>
              <Textarea value={exitForm.hrRemarks} onChange={ev => euf('hrRemarks', ev.target.value)} rows={2} className="text-xs" />
            </div>
          </div>
          <SheetFooter>
            <Button onClick={handleExitSave} data-primary>Create Exit Request</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══════════════════ FnF Sheet ═══════════════════ */}
      <Sheet open={fnfSheetOpen} onOpenChange={setFnfSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-auto">
          <SheetHeader><SheetTitle>Create F&F Settlement</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4" data-keyboard-form>
            <div className="space-y-1.5">
              <Label className="text-xs">Select Exit Request</Label>
              <Select value={fnfTargetExitId} onValueChange={setFnfTargetExitId}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select exit request" /></SelectTrigger>
                <SelectContent>
                  {eligibleExits.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.exitCode} — {e.employeeName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {fnfPreview && (
              <>
                <Separator />
                <h4 className="text-xs font-semibold text-muted-foreground">AUTO-COMPUTED (read-only)</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span>Pro-Rata Last Month Salary</span><span>₹{toIndianFormat(fnfPreview.proRata)}</span></div>
                  <div className="flex justify-between"><span>Gratuity</span><span>₹{toIndianFormat(fnfPreview.gratuity)}</span></div>
                  <div className="flex justify-between"><span>Leave Encashment</span><span>₹{toIndianFormat(fnfPreview.encashment)}</span></div>
                  <div className="flex justify-between"><span>Notice Period Shortfall</span><span className="text-red-600">₹{toIndianFormat(fnfPreview.shortfall)}</span></div>
                  <div className="flex justify-between"><span>Loan Outstanding</span><span className="text-red-600">₹{toIndianFormat(fnfPreview.loanOut)}</span></div>
                </div>

                <Separator />
                <h4 className="text-xs font-semibold text-muted-foreground">ADJUSTMENTS</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Bonus Arrears (₹)</Label><Input {...amountInputProps} value={bonusArrears} onChange={ev => setBonusArrears(Number(ev.target.value))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Other Earnings (₹)</Label><Input {...amountInputProps} value={otherEarnings} onChange={ev => setOtherEarnings(Number(ev.target.value))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Asset Damage Deduction (₹)</Label><Input {...amountInputProps} value={assetDamage} onChange={ev => setAssetDamage(Number(ev.target.value))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Other Deductions (₹)</Label><Input {...amountInputProps} value={otherDeductions} onChange={ev => setOtherDeductions(Number(ev.target.value))} /></div>
                </div>

                {/* Custom Lines */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Custom Lines</Label>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setCustomLines([...customLines, { label: '', type: 'earning', amount: 0, remarks: '' }])}>
                      <Plus className="h-3 w-3 mr-0.5" />Add Line
                    </Button>
                  </div>
                  {customLines.map((line, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 items-end">
                      <Input placeholder="Label" value={line.label} onChange={ev => {
                        const arr = [...customLines]; arr[i] = { ...arr[i], label: ev.target.value }; setCustomLines(arr);
                      }} className="text-xs" />
                      <Select value={line.type} onValueChange={v => {
                        const arr = [...customLines]; arr[i] = { ...arr[i], type: v as 'earning' | 'deduction' }; setCustomLines(arr);
                      }}>
                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="earning">Earning</SelectItem>
                          <SelectItem value="deduction">Deduction</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="number" value={line.amount} onChange={ev => {
                        const arr = [...customLines]; arr[i] = { ...arr[i], amount: Number(ev.target.value) }; setCustomLines(arr);
                      }} className="text-xs text-right" />
                      <Button size="sm" variant="ghost" className="h-8 text-red-500" onClick={() => setCustomLines(customLines.filter((_, j) => j !== i))}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Notes</Label>
                  <Textarea value={fnfNotes} onChange={ev => setFnfNotes(ev.target.value)} rows={2} className="text-xs" />
                </div>

                <Separator />
                <div className="space-y-1 text-sm font-semibold">
                  <div className="flex justify-between text-green-600"><span>Total Earnings</span><span>₹{toIndianFormat(fnfPreview.totalE)}</span></div>
                  <div className="flex justify-between text-red-600"><span>Total Deductions</span><span>₹{toIndianFormat(fnfPreview.totalD)}</span></div>
                  <div className="flex justify-between text-lg text-violet-600 font-bold"><span>Net Payable</span><span>₹{toIndianFormat(fnfPreview.net)}</span></div>
                </div>
              </>
            )}
          </div>
          <SheetFooter>
            <Button onClick={handleFnfSave} data-primary disabled={!fnfTargetExitId}>Create F&F Settlement</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══════════════════ Print Areas ═══════════════════ */}
      {printExit && printEmp && (
        <>
          {/* Relieving Letter */}
          <div id="relieving-letter-print-area" className={`hidden ${printType === 'relieving' ? 'print-target' : ''}`}
            style={{ fontFamily: 'serif', padding: '60px', lineHeight: 1.8 }}>
            <h2 style={{ textAlign: 'center', marginBottom: 40 }}>{companyName}</h2>
            <p style={{ textAlign: 'right' }}>Date: {format(new Date(), 'dd MMMM yyyy')}</p>
            <h3 style={{ textAlign: 'center', margin: '30px 0' }}>RELIEVING LETTER</h3>
            <p><strong>To Whom It May Concern</strong></p>
            <p style={{ marginTop: 20 }}>
              This is to certify that <strong>{printExit.employeeName}</strong> (EmpCode: {printExit.employeeCode})
              worked with us as <strong>{printExit.designation}</strong> in the <strong>{printExit.departmentName}</strong> department
              from <strong>{printEmp.doj ? format(parseISO(printEmp.doj), 'dd MMMM yyyy') : '—'}</strong> to{' '}
              <strong>{printExit.lastWorkingDate ? format(parseISO(printExit.lastWorkingDate), 'dd MMMM yyyy') : '—'}</strong>.
            </p>
            <p style={{ marginTop: 16 }}>
              They are hereby relieved from their duties effective{' '}
              <strong>{printExit.lastWorkingDate ? format(parseISO(printExit.lastWorkingDate), 'dd MMMM yyyy') : '—'}</strong>.
            </p>
            <p style={{ marginTop: 16 }}>We wish them success in their future endeavours.</p>
            <div style={{ marginTop: 60 }}>
              <p>Authorised Signatory</p>
              <p>{companyName}</p>
            </div>
          </div>

          {/* Experience Letter */}
          <div id="experience-letter-print-area" className={`hidden ${printType === 'experience' ? 'print-target' : ''}`}
            style={{ fontFamily: 'serif', padding: '60px', lineHeight: 1.8 }}>
            <h2 style={{ textAlign: 'center', marginBottom: 40 }}>{companyName}</h2>
            <p style={{ textAlign: 'right' }}>Date: {format(new Date(), 'dd MMMM yyyy')}</p>
            <h3 style={{ textAlign: 'center', margin: '30px 0' }}>EXPERIENCE CERTIFICATE</h3>
            <p><strong>To Whom It May Concern</strong></p>
            <p style={{ marginTop: 20 }}>
              This is to certify that <strong>{printExit.employeeName}</strong> was employed with{' '}
              <strong>{companyName}</strong> as <strong>{printExit.designation}</strong> from{' '}
              <strong>{printEmp.doj ? format(parseISO(printEmp.doj), 'dd MMMM yyyy') : '—'}</strong> to{' '}
              <strong>{printExit.lastWorkingDate ? format(parseISO(printExit.lastWorkingDate), 'dd MMMM yyyy') : '—'}</strong>.
            </p>
            <p style={{ marginTop: 16 }}>
              During this period, they demonstrated{' '}
              {printExit.exitInterviewNotes || 'professional conduct and dedication to their responsibilities'}.
            </p>
            <p style={{ marginTop: 16 }}>We wish them success in their future career.</p>
            <div style={{ marginTop: 60 }}>
              <p>Authorised Signatory</p>
              <p>{companyName}</p>
            </div>
          </div>

          {/* FnF Statement */}
          {printFnf && (
            <div id="fnf-statement-print-area" className={`hidden ${printType === 'fnf' ? 'print-target' : ''}`}
              style={{ fontFamily: 'sans-serif', padding: '40px', lineHeight: 1.6 }}>
              <h2 style={{ textAlign: 'center' }}>{companyName}</h2>
              <h3 style={{ textAlign: 'center', margin: '16px 0' }}>FULL & FINAL SETTLEMENT STATEMENT</h3>
              <table style={{ width: '100%', marginBottom: 20, fontSize: 13 }}>
                <tbody>
                  <tr><td><strong>Employee:</strong> {printFnf.employeeName} ({printFnf.employeeCode})</td><td><strong>FnF Code:</strong> {printFnf.fnfCode}</td></tr>
                  <tr><td><strong>LWD:</strong> {printFnf.lastWorkingDate ? format(parseISO(printFnf.lastWorkingDate), 'dd MMM yyyy') : '—'}</td><td><strong>Date:</strong> {format(new Date(), 'dd MMM yyyy')}</td></tr>
                </tbody>
              </table>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ border: '1px solid #ccc', padding: 6, textAlign: 'left' }}>EARNINGS</th>
                    <th style={{ border: '1px solid #ccc', padding: 6, textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td style={{ border: '1px solid #ccc', padding: 4 }}>Pro-Rata Salary</td><td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'right' }}>{toIndianFormat(printFnf.lastMonthSalary)}</td></tr>
                  <tr><td style={{ border: '1px solid #ccc', padding: 4 }}>Leave Encashment</td><td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'right' }}>{toIndianFormat(printFnf.leaveEncashment)}</td></tr>
                  <tr><td style={{ border: '1px solid #ccc', padding: 4 }}>Gratuity</td><td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'right' }}>{toIndianFormat(printFnf.gratuity)}</td></tr>
                  <tr><td style={{ border: '1px solid #ccc', padding: 4 }}>Bonus Arrears</td><td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'right' }}>{toIndianFormat(printFnf.bonusArrears)}</td></tr>
                  <tr><td style={{ border: '1px solid #ccc', padding: 4 }}>Other Earnings</td><td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'right' }}>{toIndianFormat(printFnf.otherEarnings)}</td></tr>
                  <tr style={{ fontWeight: 'bold' }}><td style={{ border: '1px solid #ccc', padding: 4 }}>Total Earnings</td><td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'right' }}>{toIndianFormat(printFnf.totalEarnings)}</td></tr>
                </tbody>
              </table>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 16 }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ border: '1px solid #ccc', padding: 6, textAlign: 'left' }}>DEDUCTIONS</th>
                    <th style={{ border: '1px solid #ccc', padding: 6, textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td style={{ border: '1px solid #ccc', padding: 4 }}>Notice Period Shortfall</td><td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'right' }}>{toIndianFormat(printFnf.noticePeriodShortfall)}</td></tr>
                  <tr><td style={{ border: '1px solid #ccc', padding: 4 }}>Loan Outstanding</td><td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'right' }}>{toIndianFormat(printFnf.loanOutstanding)}</td></tr>
                  <tr><td style={{ border: '1px solid #ccc', padding: 4 }}>Asset Damage</td><td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'right' }}>{toIndianFormat(printFnf.assetDamage)}</td></tr>
                  <tr><td style={{ border: '1px solid #ccc', padding: 4 }}>Other Deductions</td><td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'right' }}>{toIndianFormat(printFnf.otherDeductions)}</td></tr>
                  <tr style={{ fontWeight: 'bold' }}><td style={{ border: '1px solid #ccc', padding: 4 }}>Total Deductions</td><td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'right' }}>{toIndianFormat(printFnf.totalDeductions)}</td></tr>
                </tbody>
              </table>
              <div style={{ marginTop: 24, textAlign: 'right', fontSize: 18, fontWeight: 'bold' }}>
                NET PAYABLE: ₹{toIndianFormat(printFnf.netPayable)}
              </div>
              <div style={{ marginTop: 60 }}>
                <p>Authorised Signatory</p>
                <p>{companyName}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ExitAndFnF() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <ERPHeader breadcrumbs={[{ label: 'Operix Core', href: '/erp/dashboard' }, { label: 'Pay Hub' }, { label: 'Exit & F&F' }]} showDatePicker={false} showCompany={false} />
        <div className="flex-1 overflow-auto p-6"><ExitAndFnFPanel /></div>
      </div>
    </SidebarProvider>
  );
}
