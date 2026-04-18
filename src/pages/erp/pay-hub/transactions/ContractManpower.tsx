import React, { useState, useMemo, useCallback } from 'react';
import { format, parseISO, getDaysInMonth, differenceInDays } from 'date-fns';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Separator } from '@/components/ui/separator';
import { Users, Building2, FileText, Shield, Plus, Download,
  AlertTriangle, Check, X, ChevronRight, HardHat, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import type { LabourContractor, ContractWorker, WorkOrder, ContractInvoice,
  ContractAttendance, ContractTab, WorkerSkillCategory, InvoiceStatus,
  WorkOrderStatus } from '@/types/contract-manpower';
import { LABOUR_CONTRACTORS_KEY, CONTRACT_WORKERS_KEY, WORK_ORDERS_KEY,
  CONTRACT_INVOICES_KEY, CONTRACT_ATTENDANCE_KEY,
  WORKER_SKILL_LABELS, INVOICE_STATUS_COLORS, WORK_ORDER_STATUS_COLORS,
  computeContractStatutory, CONTRACT_PF_CEILING, CONTRACT_ESIC_CEILING } from '@/types/contract-manpower';
import { toIndianFormat, amountInputProps, onEnterNext, useCtrlS } from '@/lib/keyboard';

interface ContractManpowerPanelProps { defaultTab?: ContractTab; }

export function ContractManpowerPanel({ defaultTab = 'agencies' }: ContractManpowerPanelProps) {

  // ── Agency / Contractor state ────────────────────────────────
  const [agencies, setAgencies] = useState<LabourContractor[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/contract/agencies
      const raw = localStorage.getItem(LABOUR_CONTRACTORS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveAgencies = (items: LabourContractor[]) => {
    // [JWT] PUT /api/pay-hub/contract/agencies
    localStorage.setItem(LABOUR_CONTRACTORS_KEY, JSON.stringify(items));
    setAgencies(items);
  };

  // ── Contract Workers state ───────────────────────────────────
  const [workers, setWorkers] = useState<ContractWorker[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/contract/workers
      const raw = localStorage.getItem(CONTRACT_WORKERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveWorkers = (items: ContractWorker[]) => {
    // [JWT] PUT /api/pay-hub/contract/workers
    localStorage.setItem(CONTRACT_WORKERS_KEY, JSON.stringify(items));
    setWorkers(items);
  };

  // ── Work Orders state ────────────────────────────────────────
  const [orders, setOrders] = useState<WorkOrder[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/contract/work-orders
      const raw = localStorage.getItem(WORK_ORDERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveOrders = (items: WorkOrder[]) => {
    // [JWT] PUT /api/pay-hub/contract/work-orders
    localStorage.setItem(WORK_ORDERS_KEY, JSON.stringify(items));
    setOrders(items);
  };

  // ── Contract Invoices state ──────────────────────────────────
  const [invoices, setInvoices] = useState<ContractInvoice[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/contract/invoices
      const raw = localStorage.getItem(CONTRACT_INVOICES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveInvoices = (items: ContractInvoice[]) => {
    // [JWT] PUT /api/pay-hub/contract/invoices
    localStorage.setItem(CONTRACT_INVOICES_KEY, JSON.stringify(items));
    setInvoices(items);
  };

  // ── Attendance state ─────────────────────────────────────────
  const [attendance, setAttendance] = useState<ContractAttendance[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/contract/attendance
      const raw = localStorage.getItem(CONTRACT_ATTENDANCE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveAttendance = (items: ContractAttendance[]) => {
    // [JWT] PUT /api/pay-hub/contract/attendance
    localStorage.setItem(CONTRACT_ATTENDANCE_KEY, JSON.stringify(items));
    setAttendance(items);
  };

  // ── Agency Sheet ─────────────────────────────────────────────
  const [agencySheetOpen, setAgencySheetOpen] = useState(false);
  const [agencyEditId, setAgencyEditId] = useState<string | null>(null);
  const BLANK_AGENCY = {
    agencyCode: '', agencyName: '', contactPerson: '', phone: '', email: '',
    address: '', stateCode: '', panNumber: '', gstNumber: '',
    pfRegistrationNo: '', esicRegistrationNo: '', clraLicenceNo: '',
    clraLicenceExpiry: '', serviceChargePct: 0, paymentTermsDays: 30,
    status: 'active' as LabourContractor['status'], notes: '',
  };
  const [agencyForm, setAgencyForm] = useState(BLANK_AGENCY);
  const auf = <K extends keyof typeof BLANK_AGENCY>(k: K, v: (typeof BLANK_AGENCY)[K]) =>
    setAgencyForm(prev => ({ ...prev, [k]: v }));

  const handleAgencySave = useCallback(() => {
    if (!agencySheetOpen) return;
    if (!agencyForm.agencyName.trim()) return toast.error('Agency name is required');
    const now = new Date().toISOString();
    if (agencyEditId) {
      saveAgencies(agencies.map(a => a.id !== agencyEditId ? a : { ...a, ...agencyForm, updated_at: now }));
    } else {
      const code = `AGY-${String(agencies.length + 1).padStart(6, '0')}`;
      saveAgencies([...agencies, { ...agencyForm, id: `agy-${Date.now()}`,
        agencyCode: code, created_at: now, updated_at: now } as LabourContractor]);
    }
    toast.success('Contractor saved');
    setAgencySheetOpen(false); setAgencyEditId(null); setAgencyForm(BLANK_AGENCY);
  }, [agencySheetOpen, agencyForm, agencyEditId, agencies]);

  // ── Worker Sheet ─────────────────────────────────────────────
  const [workerSheetOpen, setWorkerSheetOpen] = useState(false);
  const [workerEditId, setWorkerEditId] = useState<string | null>(null);
  const BLANK_WORKER = {
    agencyId: '', agencyName: '', firstName: '', lastName: '', displayName: '',
    gender: 'male' as ContractWorker['gender'], dob: '', mobile: '', aadhaar: '', uan: '', esicIpNo: '',
    skillCategory: 'unskilled' as WorkerSkillCategory,
    designation: '', deployedDepartment: '', deployedLocation: '',
    dailyWage: 0, pfApplicable: true, esicApplicable: true,
    deploymentStartDate: '', deploymentEndDate: '',
    status: 'active' as ContractWorker['status'], notes: '',
  };
  const [workerForm, setWorkerForm] = useState(BLANK_WORKER);
  const wuf = <K extends keyof typeof BLANK_WORKER>(k: K, v: (typeof BLANK_WORKER)[K]) =>
    setWorkerForm(prev => ({ ...prev, [k]: v }));

  const handleWorkerSave = useCallback(() => {
    if (!workerSheetOpen) return;
    if (!workerForm.agencyId) return toast.error('Select an agency');
    if (!workerForm.firstName.trim()) return toast.error('First name required');
    const now = new Date().toISOString();
    const displayName = `${workerForm.firstName} ${workerForm.lastName}`.trim();
    const monthlyEst = workerForm.dailyWage * 26;
    const pfApplicable = monthlyEst <= CONTRACT_PF_CEILING;
    const esicApplicable = monthlyEst <= CONTRACT_ESIC_CEILING;
    if (workerEditId) {
      saveWorkers(workers.map(w => w.id !== workerEditId ? w : {
        ...w, ...workerForm, displayName, pfApplicable, esicApplicable, updated_at: now }));
    } else {
      const code = `CW-${String(workers.length + 1).padStart(6, '0')}`;
      saveWorkers([...workers, { ...workerForm, displayName, pfApplicable, esicApplicable,
        id: `cw-${Date.now()}`, workerCode: code, created_at: now, updated_at: now } as ContractWorker]);
    }
    toast.success('Contract worker saved');
    setWorkerSheetOpen(false); setWorkerEditId(null); setWorkerForm(BLANK_WORKER);
  }, [workerSheetOpen, workerForm, workerEditId, workers]);

  // ── Work Order Sheet ─────────────────────────────────────────
  const [orderSheetOpen, setOrderSheetOpen] = useState(false);
  const [orderEditId, setOrderEditId] = useState<string | null>(null);
  const BLANK_ORDER = {
    agencyId: '', agencyName: '', description: '', department: '', location: '',
    fromDate: '', toDate: '', approvedHeadcount: 1,
    skillCategory: 'unskilled' as WorkerSkillCategory,
    ratePerDay: 0, totalOrderValue: 0,
    status: 'draft' as WorkOrderStatus,
    approvedBy: '', notes: '',
  };
  const [orderForm, setOrderForm] = useState(BLANK_ORDER);
  const orf = <K extends keyof typeof BLANK_ORDER>(k: K, v: (typeof BLANK_ORDER)[K]) =>
    setOrderForm(prev => ({ ...prev, [k]: v }));

  const computedOrderValue = useMemo(() => {
    if (!orderForm.fromDate || !orderForm.toDate || orderForm.ratePerDay <= 0) return 0;
    const days = Math.max(0, differenceInDays(
      parseISO(orderForm.toDate), parseISO(orderForm.fromDate)
    ));
    return Math.round(orderForm.ratePerDay * orderForm.approvedHeadcount * days);
  }, [orderForm.ratePerDay, orderForm.approvedHeadcount, orderForm.fromDate, orderForm.toDate]);

  const handleOrderSave = useCallback(() => {
    if (!orderSheetOpen) return;
    if (!orderForm.agencyId) return toast.error('Select an agency');
    if (!orderForm.fromDate || !orderForm.toDate) return toast.error('Date range required');
    if (!orderForm.description.trim()) return toast.error('Description required');
    const now = new Date().toISOString();
    if (orderEditId) {
      saveOrders(orders.map(o => o.id !== orderEditId ? o : { ...o, ...orderForm, totalOrderValue: computedOrderValue, updated_at: now }));
    } else {
      const code = `WO-${String(orders.length + 1).padStart(6, '0')}`;
      saveOrders([...orders, { ...orderForm, totalOrderValue: computedOrderValue, id: `wo-${Date.now()}`,
        orderCode: code, created_at: now, updated_at: now } as WorkOrder]);
    }
    toast.success('Work order saved');
    setOrderSheetOpen(false); setOrderEditId(null); setOrderForm(BLANK_ORDER);
  }, [orderSheetOpen, orderForm, orderEditId, orders]);

  // ── Invoice Sheet ────────────────────────────────────────────
  const [invoiceSheetOpen, setInvoiceSheetOpen] = useState(false);
  const BLANK_INVOICE = {
    workOrderId: '', workOrderCode: '', agencyId: '', agencyName: '',
    invoiceNumber: '', invoiceDate: '', billingMonth: '',
    manDaysWorked: 0, basicWages: 0, serviceCharge: 0,
    pfContribution: 0, esicContribution: 0, gstAmount: 0,
    totalInvoiceAmount: 0, verifiedManDays: 0, varianceAmount: 0,
    status: 'received' as InvoiceStatus, paymentDate: '', notes: '',
  };
  const [invoiceForm, setInvoiceForm] = useState(BLANK_INVOICE);
  const ivf = <K extends keyof typeof BLANK_INVOICE>(k: K, v: (typeof BLANK_INVOICE)[K]) =>
    setInvoiceForm(prev => ({ ...prev, [k]: v }));

  const handleInvoiceSave = useCallback(() => {
    if (!invoiceSheetOpen) return;
    if (!invoiceForm.workOrderId) return toast.error('Select a work order');
    if (!invoiceForm.invoiceNumber.trim()) return toast.error('Invoice number required');
    if (!invoiceForm.billingMonth) return toast.error('Billing month required');
    const variance = invoiceForm.basicWages
      - (invoiceForm.verifiedManDays * (orders.find(o => o.id === invoiceForm.workOrderId)?.ratePerDay ?? 0));
    const now = new Date().toISOString();
    const code = `INV-CL-${String(invoices.length + 1).padStart(6, '0')}`;
    saveInvoices([...invoices, { ...invoiceForm, varianceAmount: Math.round(variance),
      id: `inv-${Date.now()}`, invoiceCode: code, created_at: now, updated_at: now } as ContractInvoice]);
    toast.success('Invoice recorded');
    setInvoiceSheetOpen(false); setInvoiceForm(BLANK_INVOICE);
  }, [invoiceSheetOpen, invoiceForm, invoices, orders]);

  // ── Attendance Sheet ─────────────────────────────────────────
  const [attendanceSheetOpen, setAttendanceSheetOpen] = useState(false);
  const BLANK_ATTENDANCE = {
    workerId: '', workerCode: '', workerName: '', agencyId: '', workOrderId: '',
    billingMonth: '', totalDays: 30, daysPresent: 0, daysAbsent: 0,
    overtimeDays: 0, dailyWage: 0,
    grossWages: 0, pfWage: 0, empPF: 0, erPF: 0,
    esicWage: 0, empESIC: 0, erESIC: 0,
  };
  const [attForm, setAttForm] = useState(BLANK_ATTENDANCE);
  const atf = <K extends keyof typeof BLANK_ATTENDANCE>(k: K, v: (typeof BLANK_ATTENDANCE)[K]) =>
    setAttForm(prev => ({ ...prev, [k]: v }));

  const attStats = useMemo(() =>
    computeContractStatutory(attForm.dailyWage, attForm.daysPresent),
    [attForm.dailyWage, attForm.daysPresent]);

  const handleAttendanceSave = useCallback(() => {
    if (!attendanceSheetOpen) return;
    if (!attForm.workerId) return toast.error('Select a worker');
    if (!attForm.workOrderId) return toast.error('Select a work order');
    if (!attForm.billingMonth) return toast.error('Billing month required');
    const stats = computeContractStatutory(attForm.dailyWage, attForm.daysPresent);
    const now = new Date().toISOString();
    saveAttendance([...attendance, {
      ...attForm, ...stats,
      daysAbsent: attForm.totalDays - attForm.daysPresent,
      id: `att-${Date.now()}`, created_at: now, updated_at: now,
    } as ContractAttendance]);
    toast.success('Attendance recorded');
    setAttendanceSheetOpen(false); setAttForm(BLANK_ATTENDANCE);
  }, [attendanceSheetOpen, attForm, attendance]);

  // ── masterSave ────────────────────────────────────────────────
  const masterSave = useCallback(() => {
    if (agencySheetOpen) { handleAgencySave(); return; }
    if (workerSheetOpen) { handleWorkerSave(); return; }
    if (orderSheetOpen) { handleOrderSave(); return; }
    if (invoiceSheetOpen) { handleInvoiceSave(); return; }
    if (attendanceSheetOpen) { handleAttendanceSave(); return; }
  }, [agencySheetOpen, workerSheetOpen, orderSheetOpen, invoiceSheetOpen, attendanceSheetOpen,
    handleAgencySave, handleWorkerSave, handleOrderSave, handleInvoiceSave, handleAttendanceSave]);
  const isFormActive = true;
  useCtrlS(isFormActive ? masterSave : () => {});

  // ── Compliance data ──────────────────────────────────────────
  const complianceData = useMemo(() => {
    return attendance.map(a => {
      const stats = computeContractStatutory(a.dailyWage, a.daysPresent);
      return { ...a, ...stats };
    });
  }, [attendance]);

  // ── CSV export ───────────────────────────────────────────────
  const exportComplianceCSV = () => {
    if (complianceData.length === 0) { toast.error('No compliance data to export'); return; }
    const header = ['Worker Code', 'Worker Name', 'Agency', 'Month', 'Days Present',
      'Gross Wages', 'PF Wage', 'Emp PF', 'Er PF', 'ESIC Wage', 'Emp ESIC', 'Er ESIC'].join(',');
    const rows = complianceData.map(r => [r.workerCode, r.workerName, r.agencyId,
      r.billingMonth, r.daysPresent, r.grossWages, r.pfWage, r.empPF, r.erPF,
      r.esicWage, r.empESIC, r.erESIC].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `contract_compliance_${new Date().toISOString().slice(0, 7)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Filters ──────────────────────────────────────────────────
  const [workerAgencyFilter, setWorkerAgencyFilter] = useState('all');
  const [workerSkillFilter, setWorkerSkillFilter] = useState('all');
  const [workerStatusFilter, setWorkerStatusFilter] = useState('all');
  const [orderSubTab, setOrderSubTab] = useState<'orders' | 'invoices'>('orders');
  const [compAgencyFilter, setCompAgencyFilter] = useState('all');
  const [compMonthFilter, setCompMonthFilter] = useState('all');

  const filteredWorkers = useMemo(() => workers.filter(w => {
    if (workerAgencyFilter !== 'all' && w.agencyId !== workerAgencyFilter) return false;
    if (workerSkillFilter !== 'all' && w.skillCategory !== workerSkillFilter) return false;
    if (workerStatusFilter !== 'all' && w.status !== workerStatusFilter) return false;
    return true;
  }), [workers, workerAgencyFilter, workerSkillFilter, workerStatusFilter]);

  const filteredCompliance = useMemo(() => complianceData.filter(c => {
    if (compAgencyFilter !== 'all' && c.agencyId !== compAgencyFilter) return false;
    if (compMonthFilter !== 'all' && c.billingMonth !== compMonthFilter) return false;
    return true;
  }), [complianceData, compAgencyFilter, compMonthFilter]);

  const compTotals = useMemo(() => filteredCompliance.reduce((acc, c) => ({
    grossWages: acc.grossWages + c.grossWages,
    empPF: acc.empPF + c.empPF, erPF: acc.erPF + c.erPF,
    empESIC: acc.empESIC + c.empESIC, erESIC: acc.erESIC + c.erESIC,
  }), { grossWages: 0, empPF: 0, erPF: 0, empESIC: 0, erESIC: 0 }), [filteredCompliance]);

  // Stats
  const activeAgencies = agencies.filter(a => a.status === 'active').length;
  const activeWorkers = workers.filter(w => w.status === 'active').length;
  const activeOrders = orders.filter(o => o.status === 'active').length;
  const pendingInvoices = invoices.filter(i => i.status === 'received' || i.status === 'verified').length;

  const isExpired = (d: string) => d && new Date(d) < new Date();
  const isExpiringSoon = (d: string) => {
    if (!d) return false;
    const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30;
  };

  const activeAgencyList = agencies.filter(a => a.status === 'active');
  const activeOrderList = orders.filter(o => o.status === 'active');
  const activeWorkerList = workers.filter(w => w.status === 'active');

  return (
    <div className="space-y-4" data-keyboard-form>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
          <HardHat className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Contract Manpower</h2>
          <p className="text-xs text-muted-foreground">Contract Labour (Regulation &amp; Abolition) Act 1970 compliance</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Registered Agencies', value: activeAgencies, icon: Building2 },
          { label: 'Active Contract Workers', value: activeWorkers, icon: Users },
          { label: 'Active Work Orders', value: activeOrders, icon: FileText },
          { label: 'Pending Invoices', value: pendingInvoices, icon: Receipt },
        ].map(s => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="agencies" className="gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5" /> Agencies ({agencies.length})
          </TabsTrigger>
          <TabsTrigger value="workers" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" /> Workers ({workers.length})
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> Work Orders &amp; Invoices
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5" /> Compliance Register
          </TabsTrigger>
        </TabsList>

        {/* ═══ TAB: Agencies ═══ */}
        <TabsContent value="agencies" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm">Labour Contractor Registry</h3>
            <Button size="sm" onClick={() => { setAgencyForm(BLANK_AGENCY); setAgencyEditId(null); setAgencySheetOpen(true); }} data-primary>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Agency
            </Button>
          </div>

          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-3 flex gap-2 items-start">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Under CLRA 1970, the principal employer is liable if the contractor defaults on wages, PF, or ESIC. Verify contractor licences regularly.
              </p>
            </CardContent>
          </Card>

          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">Agency Name</TableHead>
                  <TableHead className="text-xs">Contact</TableHead>
                  <TableHead className="text-xs">PAN</TableHead>
                  <TableHead className="text-xs">GSTIN</TableHead>
                  <TableHead className="text-xs">CLRA Licence</TableHead>
                  <TableHead className="text-xs">Expiry</TableHead>
                  <TableHead className="text-xs">Svc Charge</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencies.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-xs text-muted-foreground py-8">No agencies registered yet</TableCell></TableRow>
                ) : agencies.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs font-mono">{a.agencyCode}</TableCell>
                    <TableCell className="text-xs font-medium">{a.agencyName}</TableCell>
                    <TableCell className="text-xs">{a.contactPerson}</TableCell>
                    <TableCell className="text-xs font-mono">{a.panNumber}</TableCell>
                    <TableCell className="text-xs font-mono">{a.gstNumber}</TableCell>
                    <TableCell className="text-xs">{a.clraLicenceNo}</TableCell>
                    <TableCell className="text-xs">
                      {a.clraLicenceExpiry && (
                        <Badge variant="outline" className={isExpired(a.clraLicenceExpiry) ? 'border-red-500 text-red-600' : isExpiringSoon(a.clraLicenceExpiry) ? 'border-amber-500 text-amber-600' : ''}>
                          {a.clraLicenceExpiry}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{a.serviceChargePct}%</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{a.status}</Badge></TableCell>
                    <TableCell className="space-x-1">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => {
                        setAgencyEditId(a.id); setAgencyForm(a); setAgencySheetOpen(true);
                      }}>Edit</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => {
                        saveAgencies(agencies.map(x => x.id !== a.id ? x : { ...x, status: x.status === 'active' ? 'inactive' : 'active', updated_at: new Date().toISOString() }));
                      }}>{a.status === 'active' ? 'Deactivate' : 'Activate'}</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ═══ TAB: Workers ═══ */}
        <TabsContent value="workers" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm">Contract Worker Registry</h3>
            <Button size="sm" onClick={() => { setWorkerForm(BLANK_WORKER); setWorkerEditId(null); setWorkerSheetOpen(true); }} data-primary>
              <Plus className="h-3.5 w-3.5 mr-1" /> Register Worker
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Select value={workerAgencyFilter} onValueChange={setWorkerAgencyFilter}>
              <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Agency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agencies</SelectItem>
                {activeAgencyList.filter(a => a.id).map(a => <SelectItem key={a.id} value={a.id}>{a.agencyName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={workerSkillFilter} onValueChange={setWorkerSkillFilter}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Skill" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Skills</SelectItem>
                {(Object.entries(WORKER_SKILL_LABELS) as [WorkerSkillCategory, string][]).map(([k, v]) =>
                  <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={workerStatusFilter} onValueChange={setWorkerStatusFilter}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="relieved">Relieved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Agency</TableHead>
                  <TableHead className="text-xs">Skill</TableHead>
                  <TableHead className="text-xs">Designation</TableHead>
                  <TableHead className="text-xs">Department</TableHead>
                  <TableHead className="text-xs">Daily Wage</TableHead>
                  <TableHead className="text-xs">PF</TableHead>
                  <TableHead className="text-xs">ESIC</TableHead>
                  <TableHead className="text-xs">Deployed</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkers.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center text-xs text-muted-foreground py-8">No workers found</TableCell></TableRow>
                ) : filteredWorkers.map(w => (
                  <TableRow key={w.id}>
                    <TableCell className="text-xs font-mono">{w.workerCode}</TableCell>
                    <TableCell className="text-xs font-medium">{w.displayName}</TableCell>
                    <TableCell className="text-xs">{w.agencyName}</TableCell>
                    <TableCell className="text-xs">{WORKER_SKILL_LABELS[w.skillCategory]}</TableCell>
                    <TableCell className="text-xs">{w.designation}</TableCell>
                    <TableCell className="text-xs">{w.deployedDepartment}</TableCell>
                    <TableCell className="text-xs">₹{toIndianFormat(w.dailyWage)}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] ${w.pfApplicable ? 'border-green-500 text-green-600' : ''}`}>{w.pfApplicable ? '✓' : '—'}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] ${w.esicApplicable ? 'border-green-500 text-green-600' : ''}`}>{w.esicApplicable ? '✓' : '—'}</Badge></TableCell>
                    <TableCell className="text-xs">{w.deploymentStartDate}–{w.deploymentEndDate || 'Ongoing'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{w.status}</Badge></TableCell>
                    <TableCell className="space-x-1">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => {
                        setWorkerEditId(w.id); setWorkerForm(w); setWorkerSheetOpen(true);
                      }}>Edit</Button>
                      {w.status === 'active' && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => {
                          saveWorkers(workers.map(x => x.id !== w.id ? x : { ...x, status: 'relieved' as const, deploymentEndDate: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() }));
                          toast.success('Worker relieved');
                        }}>Relieve</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ═══ TAB: Work Orders & Invoices ═══ */}
        <TabsContent value="orders" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button size="sm" variant={orderSubTab === 'orders' ? 'default' : 'outline'} className="text-xs h-7" onClick={() => setOrderSubTab('orders')}>Work Orders</Button>
              <Button size="sm" variant={orderSubTab === 'invoices' ? 'default' : 'outline'} className="text-xs h-7" onClick={() => setOrderSubTab('invoices')}>Invoices</Button>
            </div>
            {orderSubTab === 'orders' ? (
              <Button size="sm" onClick={() => { setOrderForm(BLANK_ORDER); setOrderEditId(null); setOrderSheetOpen(true); }} data-primary>
                <Plus className="h-3.5 w-3.5 mr-1" /> New Work Order
              </Button>
            ) : (
              <Button size="sm" onClick={() => { setInvoiceForm(BLANK_INVOICE); setInvoiceSheetOpen(true); }} data-primary>
                <Plus className="h-3.5 w-3.5 mr-1" /> Record Invoice
              </Button>
            )}
          </div>

          {orderSubTab === 'orders' && (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">WO Code</TableHead>
                    <TableHead className="text-xs">Agency</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Dept</TableHead>
                    <TableHead className="text-xs">From–To</TableHead>
                    <TableHead className="text-xs">Headcount</TableHead>
                    <TableHead className="text-xs">Rate/Day</TableHead>
                    <TableHead className="text-xs">Order Value</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center text-xs text-muted-foreground py-8">No work orders yet</TableCell></TableRow>
                  ) : orders.map(o => (
                    <TableRow key={o.id}>
                      <TableCell className="text-xs font-mono">{o.orderCode}</TableCell>
                      <TableCell className="text-xs">{o.agencyName}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{o.description}</TableCell>
                      <TableCell className="text-xs">{o.department}</TableCell>
                      <TableCell className="text-xs">{o.fromDate}–{o.toDate}</TableCell>
                      <TableCell className="text-xs">{o.approvedHeadcount}</TableCell>
                      <TableCell className="text-xs">₹{toIndianFormat(o.ratePerDay)}</TableCell>
                      <TableCell className="text-xs">₹{toIndianFormat(o.totalOrderValue)}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-[10px] ${WORK_ORDER_STATUS_COLORS[o.status]}`}>{o.status}</Badge></TableCell>
                      <TableCell className="space-x-1">
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => {
                          setOrderEditId(o.id); setOrderForm(o); setOrderSheetOpen(true);
                        }}>Edit</Button>
                        {o.status === 'draft' && <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => {
                          saveOrders(orders.map(x => x.id !== o.id ? x : { ...x, status: 'active' as WorkOrderStatus, updated_at: new Date().toISOString() }));
                        }}>Activate</Button>}
                        {o.status === 'active' && <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => {
                          saveOrders(orders.map(x => x.id !== o.id ? x : { ...x, status: 'completed' as WorkOrderStatus, updated_at: new Date().toISOString() }));
                        }}>Complete</Button>}
                        {(o.status === 'draft' || o.status === 'active') && <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => {
                          saveOrders(orders.map(x => x.id !== o.id ? x : { ...x, status: 'cancelled' as WorkOrderStatus, updated_at: new Date().toISOString() }));
                        }}>Cancel</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {orderSubTab === 'invoices' && (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Inv Code</TableHead>
                    <TableHead className="text-xs">Agency Inv #</TableHead>
                    <TableHead className="text-xs">Agency</TableHead>
                    <TableHead className="text-xs">Work Order</TableHead>
                    <TableHead className="text-xs">Month</TableHead>
                    <TableHead className="text-xs">Man-Days</TableHead>
                    <TableHead className="text-xs">Basic Wages</TableHead>
                    <TableHead className="text-xs">Total</TableHead>
                    <TableHead className="text-xs">Variance</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow><TableCell colSpan={11} className="text-center text-xs text-muted-foreground py-8">No invoices recorded</TableCell></TableRow>
                  ) : invoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="text-xs font-mono">{inv.invoiceCode}</TableCell>
                      <TableCell className="text-xs">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-xs">{inv.agencyName}</TableCell>
                      <TableCell className="text-xs font-mono">{inv.workOrderCode}</TableCell>
                      <TableCell className="text-xs">{inv.billingMonth}</TableCell>
                      <TableCell className="text-xs">{inv.manDaysWorked}</TableCell>
                      <TableCell className="text-xs">₹{toIndianFormat(inv.basicWages)}</TableCell>
                      <TableCell className="text-xs">₹{toIndianFormat(inv.totalInvoiceAmount)}</TableCell>
                      <TableCell className="text-xs">
                        <span className={inv.varianceAmount === 0 ? 'text-green-600' : inv.varianceAmount < 0 ? 'text-red-600' : 'text-amber-600'}>
                          ₹{toIndianFormat(inv.varianceAmount)}
                        </span>
                      </TableCell>
                      <TableCell><Badge variant="outline" className={`text-[10px] ${INVOICE_STATUS_COLORS[inv.status]}`}>{inv.status}</Badge></TableCell>
                      <TableCell className="space-x-1">
                        {inv.status === 'received' && <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => {
                          saveInvoices(invoices.map(x => x.id !== inv.id ? x : { ...x, status: 'verified' as InvoiceStatus, updated_at: new Date().toISOString() }));
                        }}>Verify</Button>}
                        {inv.status === 'verified' && <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => {
                          saveInvoices(invoices.map(x => x.id !== inv.id ? x : { ...x, status: 'approved' as InvoiceStatus, updated_at: new Date().toISOString() }));
                        }}>Approve</Button>}
                        {inv.status === 'approved' && <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => {
                          saveInvoices(invoices.map(x => x.id !== inv.id ? x : { ...x, status: 'paid' as InvoiceStatus, paymentDate: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() }));
                        }}>Mark Paid</Button>}
                        {inv.status !== 'paid' && inv.status !== 'disputed' && <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-600" onClick={() => {
                          saveInvoices(invoices.map(x => x.id !== inv.id ? x : { ...x, status: 'disputed' as InvoiceStatus, updated_at: new Date().toISOString() }));
                        }}>Dispute</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ═══ TAB: Compliance Register ═══ */}
        <TabsContent value="compliance" className="space-y-4 mt-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="font-semibold text-sm">Compliance Register (CLRA / PF / ESIC)</h3>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { setAttForm(BLANK_ATTENDANCE); setAttendanceSheetOpen(true); }} data-primary>
                <Plus className="h-3.5 w-3.5 mr-1" /> Record Attendance
              </Button>
              <Button size="sm" variant="outline" onClick={exportComplianceCSV}>
                <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
              </Button>
            </div>
          </div>

          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-3 flex gap-2 items-start">
              <Shield className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                The principal employer must maintain Form XIII (Register of Contractors),
                Form XIV (Register of Workmen), and Form XX (Register of Wages) under CLRA 1970.
                This compliance register covers PF and ESIC computation for all deployed contract workers.
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-2 flex-wrap">
            <Select value={compAgencyFilter} onValueChange={setCompAgencyFilter}>
              <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Agency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agencies</SelectItem>
                {activeAgencyList.filter(a => a.id).map(a => <SelectItem key={a.id} value={a.id}>{a.agencyName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={compMonthFilter} onValueChange={setCompMonthFilter}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {[...new Set(complianceData.map(c => c.billingMonth))].sort().map(m =>
                  <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Worker Code</TableHead>
                  <TableHead className="text-xs">Worker Name</TableHead>
                  <TableHead className="text-xs">Agency</TableHead>
                  <TableHead className="text-xs">Month</TableHead>
                  <TableHead className="text-xs">Days Present</TableHead>
                  <TableHead className="text-xs">Gross Wages</TableHead>
                  <TableHead className="text-xs">PF Wage</TableHead>
                  <TableHead className="text-xs">Emp PF</TableHead>
                  <TableHead className="text-xs">Er PF</TableHead>
                  <TableHead className="text-xs">ESIC Wage</TableHead>
                  <TableHead className="text-xs">Emp ESIC</TableHead>
                  <TableHead className="text-xs">Er ESIC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompliance.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center text-xs text-muted-foreground py-8">No compliance records</TableCell></TableRow>
                ) : filteredCompliance.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-mono">{c.workerCode}</TableCell>
                    <TableCell className="text-xs">{c.workerName}</TableCell>
                    <TableCell className="text-xs">{c.agencyId}</TableCell>
                    <TableCell className="text-xs">{c.billingMonth}</TableCell>
                    <TableCell className="text-xs">{c.daysPresent}</TableCell>
                    <TableCell className="text-xs">₹{toIndianFormat(c.grossWages)}</TableCell>
                    <TableCell className="text-xs">₹{toIndianFormat(c.pfWage)}</TableCell>
                    <TableCell className="text-xs">₹{toIndianFormat(c.empPF)}</TableCell>
                    <TableCell className="text-xs">₹{toIndianFormat(c.erPF)}</TableCell>
                    <TableCell className="text-xs">₹{toIndianFormat(c.esicWage)}</TableCell>
                    <TableCell className="text-xs">₹{toIndianFormat(c.empESIC)}</TableCell>
                    <TableCell className="text-xs">₹{toIndianFormat(c.erESIC)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total Gross Wages', value: compTotals.grossWages },
              { label: 'Total Emp PF', value: compTotals.empPF },
              { label: 'Total Er PF', value: compTotals.erPF },
              { label: 'Total Emp ESIC', value: compTotals.empESIC },
              { label: 'Total Er ESIC', value: compTotals.erESIC },
            ].map(s => (
              <Card key={s.label} className="border-border/50">
                <CardContent className="p-3">
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-bold">₹{toIndianFormat(s.value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ AGENCY SHEET ═══ */}
      <Sheet open={agencySheetOpen} onOpenChange={setAgencySheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>{agencyEditId ? 'Edit' : 'New'} Labour Contractor</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4" data-keyboard-form>
            <div><Label className="text-xs">Agency Name *</Label><Input value={agencyForm.agencyName} onChange={e => auf('agencyName', e.target.value)} onKeyDown={onEnterNext} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Contact Person</Label><Input value={agencyForm.contactPerson} onChange={e => auf('contactPerson', e.target.value)} onKeyDown={onEnterNext} /></div>
              <div><Label className="text-xs">Phone</Label><Input value={agencyForm.phone} onChange={e => auf('phone', e.target.value)} onKeyDown={onEnterNext} /></div>
            </div>
            <div><Label className="text-xs">Email</Label><Input value={agencyForm.email} onChange={e => auf('email', e.target.value)} onKeyDown={onEnterNext} /></div>
            <div><Label className="text-xs">Address</Label><Textarea value={agencyForm.address} onChange={e => auf('address', e.target.value)} rows={2} /></div>
            <div><Label className="text-xs">State</Label><Input value={agencyForm.stateCode} onChange={e => auf('stateCode', e.target.value)} onKeyDown={onEnterNext} /></div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">PAN Number</Label><Input value={agencyForm.panNumber} onChange={e => auf('panNumber', e.target.value)} onKeyDown={onEnterNext} /></div>
              <div><Label className="text-xs">GST Number</Label><Input value={agencyForm.gstNumber} onChange={e => auf('gstNumber', e.target.value)} onKeyDown={onEnterNext} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">PF Registration No</Label><Input value={agencyForm.pfRegistrationNo} onChange={e => auf('pfRegistrationNo', e.target.value)} onKeyDown={onEnterNext} /></div>
              <div><Label className="text-xs">ESIC Registration No</Label><Input value={agencyForm.esicRegistrationNo} onChange={e => auf('esicRegistrationNo', e.target.value)} onKeyDown={onEnterNext} /></div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">CLRA Licence No *</Label><Input value={agencyForm.clraLicenceNo} onChange={e => auf('clraLicenceNo', e.target.value)} onKeyDown={onEnterNext} /></div>
              <div><Label className="text-xs">CLRA Licence Expiry *</Label><SmartDateInput value={agencyForm.clraLicenceExpiry} onChange={v => auf('clraLicenceExpiry', v)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Service Charge %</Label><Input type="number" value={agencyForm.serviceChargePct || ''} onChange={e => auf('serviceChargePct', Number(e.target.value))} onKeyDown={onEnterNext} /></div>
              <div><Label className="text-xs">Payment Terms (days)</Label><Input type="number" value={agencyForm.paymentTermsDays || ''} onChange={e => auf('paymentTermsDays', Number(e.target.value))} onKeyDown={onEnterNext} /></div>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea value={agencyForm.notes} onChange={e => auf('notes', e.target.value)} rows={2} /></div>
            <div><Label className="text-xs">Status</Label>
              <Select value={agencyForm.status} onValueChange={v => auf('status', v as 'active' | 'inactive' | 'blacklisted')}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="blacklisted">Blacklisted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button onClick={handleAgencySave} data-primary>{agencyEditId ? 'Update' : 'Create'} Contractor</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══ WORKER SHEET ═══ */}
      <Sheet open={workerSheetOpen} onOpenChange={setWorkerSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>{workerEditId ? 'Edit' : 'Register'} Contract Worker</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4" data-keyboard-form>
            <div><Label className="text-xs">Agency *</Label>
              <Select value={workerForm.agencyId} onValueChange={v => { const ag = activeAgencyList.find(a => a.id === v); wuf('agencyId', v); wuf('agencyName', ag?.agencyName ?? ''); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select agency" /></SelectTrigger>
                <SelectContent>{activeAgencyList.filter(a => a.id).map(a => <SelectItem key={a.id} value={a.id}>{a.agencyName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">First Name *</Label><Input value={workerForm.firstName} onChange={e => wuf('firstName', e.target.value)} onKeyDown={onEnterNext} /></div>
              <div><Label className="text-xs">Last Name</Label><Input value={workerForm.lastName} onChange={e => wuf('lastName', e.target.value)} onKeyDown={onEnterNext} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Gender</Label>
                <Select value={workerForm.gender} onValueChange={v => wuf('gender', v as 'male' | 'female' | 'other')}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">DOB</Label><SmartDateInput value={workerForm.dob} onChange={v => wuf('dob', v)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Mobile</Label><Input value={workerForm.mobile} onChange={e => wuf('mobile', e.target.value)} onKeyDown={onEnterNext} /></div>
              <div><Label className="text-xs">Aadhaar</Label><Input value={workerForm.aadhaar} onChange={e => wuf('aadhaar', e.target.value)} onKeyDown={onEnterNext} /></div>
              <div><Label className="text-xs">UAN</Label><Input value={workerForm.uan} onChange={e => wuf('uan', e.target.value)} onKeyDown={onEnterNext} /></div>
            </div>
            <div><Label className="text-xs">ESIC IP No</Label><Input value={workerForm.esicIpNo} onChange={e => wuf('esicIpNo', e.target.value)} onKeyDown={onEnterNext} /></div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Skill Category *</Label>
                <Select value={workerForm.skillCategory} onValueChange={v => wuf('skillCategory', v as WorkerSkillCategory)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.entries(WORKER_SKILL_LABELS) as [WorkerSkillCategory, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Designation *</Label><Input value={workerForm.designation} onChange={e => wuf('designation', e.target.value)} onKeyDown={onEnterNext} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Department</Label><Input value={workerForm.deployedDepartment} onChange={e => wuf('deployedDepartment', e.target.value)} onKeyDown={onEnterNext} /></div>
              <div><Label className="text-xs">Location</Label><Input value={workerForm.deployedLocation} onChange={e => wuf('deployedLocation', e.target.value)} onKeyDown={onEnterNext} /></div>
            </div>
            <div>
              <Label className="text-xs">Daily Wage (₹) *</Label>
              <Input value={workerForm.dailyWage || ''} onChange={e => wuf('dailyWage', Number(e.target.value))} onKeyDown={onEnterNext} {...amountInputProps} />
              <p className="text-[10px] text-muted-foreground mt-1">
                Monthly est: ₹{toIndianFormat(workerForm.dailyWage * 26)} — PF: {workerForm.dailyWage * 26 <= CONTRACT_PF_CEILING ? 'applicable' : 'not applicable'} | ESIC: {workerForm.dailyWage * 26 <= CONTRACT_ESIC_CEILING ? 'applicable' : 'not applicable'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Deployment Start *</Label><SmartDateInput value={workerForm.deploymentStartDate} onChange={v => wuf('deploymentStartDate', v)} /></div>
              <div><Label className="text-xs">Deployment End</Label><SmartDateInput value={workerForm.deploymentEndDate} onChange={v => wuf('deploymentEndDate', v)} /></div>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea value={workerForm.notes} onChange={e => wuf('notes', e.target.value)} rows={2} /></div>
          </div>
          <SheetFooter>
            <Button onClick={handleWorkerSave} data-primary>{workerEditId ? 'Update' : 'Register'} Worker</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══ WORK ORDER SHEET ═══ */}
      <Sheet open={orderSheetOpen} onOpenChange={setOrderSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{orderEditId ? 'Edit' : 'New'} Work Order</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4" data-keyboard-form>
            <div><Label className="text-xs">Agency *</Label>
              <Select value={orderForm.agencyId} onValueChange={v => { const ag = activeAgencyList.find(a => a.id === v); orf('agencyId', v); orf('agencyName', ag?.agencyName ?? ''); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select agency" /></SelectTrigger>
                <SelectContent>{activeAgencyList.filter(a => a.id).map(a => <SelectItem key={a.id} value={a.id}>{a.agencyName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Description *</Label><Textarea value={orderForm.description} onChange={e => orf('description', e.target.value)} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Department</Label><Input value={orderForm.department} onChange={e => orf('department', e.target.value)} onKeyDown={onEnterNext} /></div>
              <div><Label className="text-xs">Location</Label><Input value={orderForm.location} onChange={e => orf('location', e.target.value)} onKeyDown={onEnterNext} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">From Date *</Label><SmartDateInput value={orderForm.fromDate} onChange={v => orf('fromDate', v)} /></div>
              <div><Label className="text-xs">To Date *</Label><SmartDateInput value={orderForm.toDate} onChange={v => orf('toDate', v)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Approved Headcount *</Label><Input type="number" value={orderForm.approvedHeadcount || ''} onChange={e => orf('approvedHeadcount', Number(e.target.value))} onKeyDown={onEnterNext} /></div>
              <div><Label className="text-xs">Skill Category</Label>
                <Select value={orderForm.skillCategory} onValueChange={v => orf('skillCategory', v as WorkerSkillCategory)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.entries(WORKER_SKILL_LABELS) as [WorkerSkillCategory, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Rate per Day (₹) *</Label><Input value={orderForm.ratePerDay || ''} onChange={e => orf('ratePerDay', Number(e.target.value))} onKeyDown={onEnterNext} {...amountInputProps} /></div>
              <div><Label className="text-xs">Total Order Value</Label><Input value={toIndianFormat(computedOrderValue)} disabled className="bg-muted" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Approved By</Label><Input value={orderForm.approvedBy} onChange={e => orf('approvedBy', e.target.value)} onKeyDown={onEnterNext} /></div>
              <div><Label className="text-xs">Status</Label>
                <Select value={orderForm.status} onValueChange={v => orf('status', v as WorkOrderStatus)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea value={orderForm.notes} onChange={e => orf('notes', e.target.value)} rows={2} /></div>
          </div>
          <SheetFooter>
            <Button onClick={handleOrderSave} data-primary>{orderEditId ? 'Update' : 'Create'} Work Order</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══ INVOICE SHEET ═══ */}
      <Sheet open={invoiceSheetOpen} onOpenChange={setInvoiceSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Record Contract Invoice</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4" data-keyboard-form>
            <div><Label className="text-xs">Work Order *</Label>
              <Select value={invoiceForm.workOrderId} onValueChange={v => {
                const wo = activeOrderList.find(o => o.id === v);
                ivf('workOrderId', v); ivf('workOrderCode', wo?.orderCode ?? '');
                ivf('agencyId', wo?.agencyId ?? ''); ivf('agencyName', wo?.agencyName ?? '');
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select work order" /></SelectTrigger>
                <SelectContent>{activeOrderList.filter(o => o.id).map(o => <SelectItem key={o.id} value={o.id}>{o.orderCode} — {o.agencyName} — {o.description}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Invoice Number *</Label><Input value={invoiceForm.invoiceNumber} onChange={e => ivf('invoiceNumber', e.target.value)} onKeyDown={onEnterNext} /></div>
              <div><Label className="text-xs">Invoice Date *</Label><SmartDateInput value={invoiceForm.invoiceDate} onChange={v => ivf('invoiceDate', v)} /></div>
            </div>
            <div><Label className="text-xs">Billing Month (YYYY-MM)</Label><Input type="month" value={invoiceForm.billingMonth} onChange={e => ivf('billingMonth', e.target.value)} onKeyDown={onEnterNext} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Man-Days Worked *</Label><Input type="number" value={invoiceForm.manDaysWorked || ''} onChange={e => { ivf('manDaysWorked', Number(e.target.value)); ivf('verifiedManDays', Number(e.target.value)); }} onKeyDown={onEnterNext} /></div>
              <div><Label className="text-xs">Verified Man-Days</Label><Input type="number" value={invoiceForm.verifiedManDays || ''} onChange={e => ivf('verifiedManDays', Number(e.target.value))} onKeyDown={onEnterNext} /></div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Basic Wages (₹)</Label><Input value={invoiceForm.basicWages || ''} onChange={e => ivf('basicWages', Number(e.target.value))} onKeyDown={onEnterNext} {...amountInputProps} /></div>
              <div><Label className="text-xs">Service Charge (₹)</Label><Input value={invoiceForm.serviceCharge || ''} onChange={e => ivf('serviceCharge', Number(e.target.value))} onKeyDown={onEnterNext} {...amountInputProps} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">PF Contribution (₹)</Label><Input value={invoiceForm.pfContribution || ''} onChange={e => ivf('pfContribution', Number(e.target.value))} onKeyDown={onEnterNext} {...amountInputProps} /></div>
              <div><Label className="text-xs">ESIC Contribution (₹)</Label><Input value={invoiceForm.esicContribution || ''} onChange={e => ivf('esicContribution', Number(e.target.value))} onKeyDown={onEnterNext} {...amountInputProps} /></div>
            </div>
            <div><Label className="text-xs">GST Amount (₹)</Label><Input value={invoiceForm.gstAmount || ''} onChange={e => ivf('gstAmount', Number(e.target.value))} onKeyDown={onEnterNext} {...amountInputProps} /></div>
            <div>
              <Label className="text-xs">Total Invoice Amount</Label>
              <Input value={toIndianFormat(invoiceForm.basicWages + invoiceForm.serviceCharge + invoiceForm.pfContribution + invoiceForm.esicContribution + invoiceForm.gstAmount)} disabled className="bg-muted font-bold" />
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea value={invoiceForm.notes} onChange={e => ivf('notes', e.target.value)} rows={2} /></div>
          </div>
          <SheetFooter>
            <Button onClick={handleInvoiceSave} data-primary>Record Invoice</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══ ATTENDANCE SHEET ═══ */}
      <Sheet open={attendanceSheetOpen} onOpenChange={setAttendanceSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Record Monthly Attendance</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4" data-keyboard-form>
            <div><Label className="text-xs">Worker *</Label>
              <Select value={attForm.workerId} onValueChange={v => {
                const w = activeWorkerList.find(x => x.id === v);
                atf('workerId', v); atf('workerCode', w?.workerCode ?? '');
                atf('workerName', w?.displayName ?? ''); atf('agencyId', w?.agencyId ?? '');
                atf('dailyWage', w?.dailyWage ?? 0);
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select worker" /></SelectTrigger>
                <SelectContent>{activeWorkerList.filter(w => w.id).map(w => <SelectItem key={w.id} value={w.id}>{w.workerCode} — {w.displayName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Work Order *</Label>
              <Select value={attForm.workOrderId} onValueChange={v => atf('workOrderId', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select work order" /></SelectTrigger>
                <SelectContent>{orders.filter(o => o.agencyId === attForm.agencyId && o.status === 'active').map(o =>
                  <SelectItem key={o.id} value={o.id}>{o.orderCode} — {o.description}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Billing Month (YYYY-MM)</Label>
              <Input type="month" value={attForm.billingMonth} onChange={e => {
                const m = e.target.value;
                atf('billingMonth', m);
                if (m) {
                  const [y, mo] = m.split('-').map(Number);
                  atf('totalDays', getDaysInMonth(new Date(y, mo - 1)));
                }
              }} onKeyDown={onEnterNext} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Total Days</Label><Input type="number" value={attForm.totalDays} onChange={e => atf('totalDays', Number(e.target.value))} onKeyDown={onEnterNext} /></div>
              <div><Label className="text-xs">Days Present *</Label><Input type="number" value={attForm.daysPresent || ''} onChange={e => atf('daysPresent', Number(e.target.value))} onKeyDown={onEnterNext} /></div>
              <div><Label className="text-xs">Overtime Days</Label><Input type="number" value={attForm.overtimeDays || ''} onChange={e => atf('overtimeDays', Number(e.target.value))} onKeyDown={onEnterNext} /></div>
            </div>
            <div><Label className="text-xs">Daily Wage (₹)</Label><Input value={attForm.dailyWage || ''} onChange={e => atf('dailyWage', Number(e.target.value))} onKeyDown={onEnterNext} {...amountInputProps} /></div>
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground">Computed Statutory</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Gross Wages', value: attStats.grossWages },
                { label: 'PF Wage', value: attStats.pfWage },
                { label: 'Emp PF (12%)', value: attStats.empPF },
                { label: 'Er PF (12%)', value: attStats.erPF },
                { label: 'ESIC Wage', value: attStats.esicWage },
                { label: 'Emp ESIC (0.75%)', value: attStats.empESIC },
                { label: 'Er ESIC (3.25%)', value: attStats.erESIC },
              ].map(s => (
                <Card key={s.label} className="border-border/50">
                  <CardContent className="p-2">
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    <p className="text-sm font-bold">₹{toIndianFormat(s.value)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <SheetFooter>
            <Button onClick={handleAttendanceSave} data-primary>Record Attendance</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function ContractManpower() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <ERPHeader breadcrumbs={[{ label: 'Operix Core', href: '/erp/dashboard' }, { label: 'Pay Hub' }, { label: 'Contract Manpower' }]} showDatePicker={false} showCompany={false} />
        <div className="flex-1 overflow-auto p-6"><ContractManpowerPanel /></div>
      </div>
    </SidebarProvider>
  );
}
