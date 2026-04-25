import { useState, useMemo, useCallback } from 'react';
import { format, parseISO, isAfter } from 'date-fns';
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
import { Users, Heart, Gift, Plus, Search, Printer, Pin, Bell, ThumbsUp, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { Announcement, Recognition, ExperienceTab,
  AnnouncementPriority, AnnouncementAudience, RecognitionType } from '@/types/collaboration';
import { ANNOUNCEMENTS_KEY, RECOGNITIONS_KEY,
  PRIORITY_COLORS, RECOGNITION_TYPE_LABELS, RECOGNITION_ICONS } from '@/types/collaboration';
import type { Employee } from '@/types/employee';
import type { PayrollRun } from '@/types/payroll-run';
import { EMPLOYEES_KEY } from '@/types/employee';
import { PAYROLL_RUNS_KEY, payrollRunsKey } from '@/types/payroll-run';
import { useERPCompany } from '@/components/layout/ERPCompanySelector';
import { toIndianFormat, onEnterNext, useCtrlS } from '@/lib/keyboard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
void PAYROLL_RUNS_KEY;

/* ── helpers ─────────────────────────────────────────────────────── */
const avatarColor = (code: string) => {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = code.charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 55%, 50%)`;
};

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const relativeDate = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return format(parseISO(iso), 'dd MMM yyyy');
};

/* ── Component ───────────────────────────────────────────────────── */
interface EmployeeExperiencePanelProps { defaultTab?: ExperienceTab; }

export function EmployeeExperiencePanel({ defaultTab = 'directory' }: EmployeeExperiencePanelProps) {
  const [selectedCompany] = useERPCompany();
  const entityCode = selectedCompany && selectedCompany !== 'all' ? selectedCompany : DEFAULT_ENTITY_SHORTCODE;

  // ── Cross-module reads ───────────────────────────────────────
  const allEmployees = useMemo<Employee[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/employees
      const raw = localStorage.getItem(EMPLOYEES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);
  const activeEmployees = useMemo(() =>
    allEmployees.filter(e => e.status === 'active'), [allEmployees]);

  const payrollRuns = useMemo<PayrollRun[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/payroll/runs?entityCode={entityCode}
      const raw = localStorage.getItem(payrollRunsKey(entityCode));
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, [entityCode]);

  // ── Announcements state ──────────────────────────────────────
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/collaboration/announcements
      const raw = localStorage.getItem(ANNOUNCEMENTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveAnnouncements = (items: Announcement[]) => {
    // [JWT] PUT /api/pay-hub/collaboration/announcements
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(items));
    setAnnouncements(items);
  };

  // ── Recognitions state ───────────────────────────────────────
  const [recognitions, setRecognitions] = useState<Recognition[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/collaboration/recognitions
      const raw = localStorage.getItem(RECOGNITIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveRecognitions = (items: Recognition[]) => {
    // [JWT] PUT /api/pay-hub/collaboration/recognitions
    localStorage.setItem(RECOGNITIONS_KEY, JSON.stringify(items));
    setRecognitions(items);
  };

  // ── Announcement Sheet ───────────────────────────────────────
  const [annSheetOpen, setAnnSheetOpen] = useState(false);
  const [annEditId, setAnnEditId] = useState<string | null>(null);
  const BLANK_ANN = {
    title: '', body: '', priority: 'normal' as AnnouncementPriority,
    audience: 'all' as AnnouncementAudience, audienceValue: '',
    postedBy: 'HR Admin', pinned: false, expiryDate: '',
    readBy: [] as string[], attachmentRef: '',
  };
  const [annForm, setAnnForm] = useState(BLANK_ANN);
  const auf = <K extends keyof typeof BLANK_ANN>(k: K, v: (typeof BLANK_ANN)[K]) =>
    setAnnForm(prev => ({ ...prev, [k]: v }));

  const handleAnnSave = useCallback(() => {
    if (!annSheetOpen) return;
    if (!annForm.title.trim()) return toast.error('Title is required');
    if (!annForm.body.trim()) return toast.error('Body is required');
    const now = new Date().toISOString();
    if (annEditId) {
      saveAnnouncements(announcements.map(a => a.id !== annEditId ? a
        : { ...a, ...annForm, updated_at: now }));
    } else {
      saveAnnouncements([...announcements, {
        ...annForm, id: `ann-${Date.now()}`, created_at: now, updated_at: now,
      }]);
    }
    toast.success('Announcement posted');
    setAnnSheetOpen(false); setAnnEditId(null); setAnnForm(BLANK_ANN);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annSheetOpen, annForm, annEditId, announcements]);

  // ── Recognition Sheet ────────────────────────────────────────
  const [recogSheetOpen, setRecogSheetOpen] = useState(false);
  const BLANK_RECOG = {
    type: 'kudos' as RecognitionType,
    fromEmployeeId: '', fromEmployeeName: '',
    toEmployeeId: '', toEmployeeName: '',
    message: '', isPublic: true, likedBy: [] as string[],
  };
  const [recogForm, setRecogForm] = useState(BLANK_RECOG);
  const ruf = <K extends keyof typeof BLANK_RECOG>(k: K, v: (typeof BLANK_RECOG)[K]) =>
    setRecogForm(prev => ({ ...prev, [k]: v }));

  const handleRecogSave = useCallback(() => {
    if (!recogSheetOpen) return;
    if (!recogForm.toEmployeeId) return toast.error('Select recipient employee');
    if (!recogForm.message.trim()) return toast.error('Message is required');
    const now = new Date().toISOString();
    saveRecognitions([...recognitions, {
      ...recogForm, id: `rec-${Date.now()}`, created_at: now, updated_at: now,
    }]);
    toast.success(`${RECOGNITION_TYPE_LABELS[recogForm.type]} sent to ${recogForm.toEmployeeName}`);
    setRecogSheetOpen(false); setRecogForm(BLANK_RECOG);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recogSheetOpen, recogForm, recognitions]);

  // ── masterSave ────────────────────────────────────────────────
  const masterSave = useCallback(() => {
    if (annSheetOpen) { handleAnnSave(); return; }
    if (recogSheetOpen) { handleRecogSave(); return; }
  }, [annSheetOpen, recogSheetOpen, handleAnnSave, handleRecogSave]);
  const isFormActive = true;
  useCtrlS(isFormActive ? masterSave : () => {});

  // ── Directory state ───────────────────────────────────────────
  const [dirSearch, setDirSearch] = useState('');
  const [dirDept, setDirDept] = useState('all');
  const [dirView, setDirView] = useState<'grid' | 'list'>('grid');
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const selectedEmp = useMemo(() => allEmployees.find(e => e.id === selectedEmpId) || null, [allEmployees, selectedEmpId]);

  const departments = useMemo(() => {
    const depts = [...new Set(activeEmployees.map(e => e.departmentName).filter(Boolean))];
    return depts.sort();
  }, [activeEmployees]);

  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter(e => {
      const q = dirSearch.toLowerCase();
      const matchQ = !q || e.displayName.toLowerCase().includes(q)
        || e.empCode.toLowerCase().includes(q)
        || e.designation.toLowerCase().includes(q);
      const matchD = dirDept === 'all' || e.departmentName === dirDept;
      return matchQ && matchD;
    });
  }, [activeEmployees, dirSearch, dirDept]);

  // ── Total Rewards state ───────────────────────────────────────
  const [trEmpId, setTrEmpId] = useState<string>('');

  const trEmployee = useMemo(() =>
    allEmployees.find(e => e.id === trEmpId) || null,
    [allEmployees, trEmpId]);

  const trPayslip = useMemo(() => {
    if (!trEmpId) return null;
    const sorted = [...payrollRuns]
      .sort((a, b) => b.payPeriod.localeCompare(a.payPeriod));
    for (const run of sorted) {
      const ps = run.payslips.find(p => p.employeeId === trEmpId);
      if (ps) return ps;
    }
    return null;
  }, [trEmpId, payrollRuns]);

  const ytdData = useMemo(() => {
    if (!trEmpId) return null;
    const now = new Date();
    const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fyStart = `${fyYear}-04`;
    const fyRuns = payrollRuns.filter(r => r.payPeriod >= fyStart);
    let ytdGross = 0, ytdPF = 0, ytdESI = 0, ytdPT = 0, ytdTDS = 0, ytdNet = 0, ytdErCost = 0;
    fyRuns.forEach(run => {
      const ps = run.payslips.find(p => p.employeeId === trEmpId);
      if (!ps) return;
      ytdGross += ps.grossEarnings;
      ytdPF += ps.empPF;
      ytdESI += ps.empESI;
      ytdPT += ps.pt;
      ytdTDS += ps.tds;
      ytdNet += ps.netPay;
      ytdErCost += ps.totalEmployerCost;
    });
    return { ytdGross, ytdPF, ytdESI, ytdPT, ytdTDS, ytdNet, ytdErCost, months: fyRuns.length };
  }, [trEmpId, payrollRuns]);

  const companyName = useMemo(() => {
    try {
      // [JWT] GET /api/foundation/parent-company
      const raw = localStorage.getItem('erp_parent_company');
      if (raw) { const p = JSON.parse(raw); return p.legalName || p.name || 'Company'; }
    } catch { /* ignore */ }
    return 'Company Name';
  }, []);

  // ── Stats ─────────────────────────────────────────────────────
  const thisMonthRecognitions = useMemo(() => {
    const prefix = format(new Date(), 'yyyy-MM');
    return recognitions.filter(r => r.created_at.startsWith(prefix)).length;
  }, [recognitions]);

  // 'today' kept for display elsewhere; filters read new Date() inline so
  // listing it as a dep was redundant (recreated each render anyway).
  const today = format(new Date(), 'yyyy-MM-dd');
  const activeAnnouncements = useMemo(() =>
    announcements.filter(a => !a.expiryDate || isAfter(parseISO(a.expiryDate), new Date()))
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.created_at.localeCompare(a.created_at);
      }),
    [announcements]);
  const expiredAnnouncements = useMemo(() =>
    announcements.filter(a => a.expiryDate && !isAfter(parseISO(a.expiryDate), new Date())),
    [announcements]);
  void today;

  const publicRecognitions = useMemo(() =>
    recognitions.filter(r => r.isPublic).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [recognitions]);
  const privateRecognitions = useMemo(() =>
    recognitions.filter(r => !r.isPublic),
    [recognitions]);

  const handlePrint = () => {
    setTimeout(() => window.print(), 300);
  };

  const managerName = (managerId: string) => {
    const m = allEmployees.find(e => e.id === managerId);
    return m ? m.displayName : '—';
  };

  const yearsOfService = (doj: string) => {
    if (!doj) return '—';
    const diff = Date.now() - new Date(doj).getTime();
    const yrs = Math.floor(diff / (365.25 * 86400000));
    return yrs < 1 ? '< 1 year' : `${yrs} years`;
  };

  /* ── RENDER ─────────────────────────────────────────────────── */
  return (
    <div className="space-y-4" data-keyboard-form>
      {/* Print CSS */}
      <style>{`
        @media print {
          body > *:not(#total-rewards-print-area) { display: none !important; }
          #total-rewards-print-area { display: block !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
          <Users className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Employee Experience</h1>
          <p className="text-xs text-muted-foreground">Directory · Announcements · Collaboration · Total Rewards</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{activeEmployees.length}</p>
          <p className="text-xs text-muted-foreground">Active Employees</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{departments.length}</p>
          <p className="text-xs text-muted-foreground">Departments</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{announcements.length}</p>
          <p className="text-xs text-muted-foreground">Announcements</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{thisMonthRecognitions}</p>
          <p className="text-xs text-muted-foreground">Recognitions This Month</p>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="directory"><Users className="h-3.5 w-3.5 mr-1" /> Directory</TabsTrigger>
          <TabsTrigger value="inbox"><Bell className="h-3.5 w-3.5 mr-1" /> Inbox & Announcements</TabsTrigger>
          <TabsTrigger value="collaboration"><Heart className="h-3.5 w-3.5 mr-1" /> Collaboration</TabsTrigger>
          <TabsTrigger value="total-rewards"><Gift className="h-3.5 w-3.5 mr-1" /> Total Rewards</TabsTrigger>
        </TabsList>

        {/* ══════ TAB: Directory ══════ */}
        <TabsContent value="directory" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, code, designation..." value={dirSearch}
                onChange={e => setDirSearch(e.target.value)} className="pl-9 h-9" onKeyDown={onEnterNext} />
            </div>
            <Select value={dirDept} onValueChange={setDirDept}>
              <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button size="sm" variant={dirView === 'grid' ? 'default' : 'outline'} onClick={() => setDirView('grid')}>⊞</Button>
              <Button size="sm" variant={dirView === 'list' ? 'default' : 'outline'} onClick={() => setDirView('list')}>☰</Button>
            </div>
          </div>

          {filteredEmployees.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No employees found. Add employees in the Employee Master.</p>
          ) : dirView === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredEmployees.map(emp => (
                <Card key={emp.id} className="hover:border-violet-400/50 transition-colors">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: avatarColor(emp.empCode) }}>
                      {initials(emp.displayName)}
                    </div>
                    <p className="font-semibold text-sm">{emp.displayName}</p>
                    <p className="text-xs text-muted-foreground">{emp.designation}</p>
                    {emp.departmentName && <Badge variant="outline" className="text-[10px]">{emp.departmentName}</Badge>}
                    {emp.workLocation && <p className="text-[10px] text-muted-foreground">{emp.workLocation}</p>}
                    <Button size="sm" variant="ghost" className="text-xs mt-1" onClick={() => setSelectedEmpId(emp.id)}>
                      View Profile <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Designation</TableHead>
                    <TableHead>Department</TableHead><TableHead>Location</TableHead><TableHead>Manager</TableHead>
                    <TableHead>DOJ</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono text-xs">{emp.empCode}</TableCell>
                      <TableCell className="font-medium">{emp.displayName}</TableCell>
                      <TableCell>{emp.designation}</TableCell>
                      <TableCell>{emp.departmentName}</TableCell>
                      <TableCell>{emp.workLocation}</TableCell>
                      <TableCell>{emp.reportingManagerId ? managerName(emp.reportingManagerId) : '—'}</TableCell>
                      <TableCell>{emp.doj ? format(parseISO(emp.doj), 'dd MMM yyyy') : '—'}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => setSelectedEmpId(emp.id)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Employee Profile Sheet */}
          <Sheet open={!!selectedEmpId} onOpenChange={v => { if (!v) setSelectedEmpId(null); }}>
            <SheetContent className="sm:max-w-lg overflow-auto">
              {selectedEmp && (
                <div className="space-y-4" data-keyboard-form>
                  <SheetHeader>
                    <SheetTitle>Employee Profile</SheetTitle>
                  </SheetHeader>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: avatarColor(selectedEmp.empCode) }}>
                      {initials(selectedEmp.displayName)}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{selectedEmp.displayName}</p>
                      <p className="text-sm text-muted-foreground">{selectedEmp.designation}</p>
                      <div className="flex gap-2 mt-1">
                        {selectedEmp.departmentName && <Badge variant="outline">{selectedEmp.departmentName}</Badge>}
                        {selectedEmp.gradeName && <Badge variant="outline">{selectedEmp.gradeName}</Badge>}
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><Label className="text-muted-foreground text-xs">Mobile</Label><p>{selectedEmp.personalMobile ? selectedEmp.personalMobile.replace(/(\d{2})\d{4}(\d{4})/, '$1****$2') : '—'}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Email</Label><p>{selectedEmp.personalEmail ? selectedEmp.personalEmail.replace(/(.{2}).+(@.+)/, '$1***$2') : '—'}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Work Location</Label><p>{selectedEmp.workLocation || '—'}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Shift</Label><p>{selectedEmp.shiftCode || '—'}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Weekly Off</Label><p>{selectedEmp.weeklyOff || '—'}</p></div>
                    <div><Label className="text-muted-foreground text-xs">UAN</Label><p>{selectedEmp.uan || '—'}</p></div>
                    <div><Label className="text-muted-foreground text-xs">ESI IP</Label><p>{selectedEmp.esiIpNumber || '—'}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Reporting Manager</Label>
                      <p>{selectedEmp.reportingManagerId ? managerName(selectedEmp.reportingManagerId) : '—'}</p></div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold">{yearsOfService(selectedEmp.doj)}</p>
                      <p className="text-[10px] text-muted-foreground">Years of Service</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{selectedEmp.gradeName || '—'}</p>
                      <p className="text-[10px] text-muted-foreground">CTC Band</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{selectedEmp.employmentType || '—'}</p>
                      <p className="text-[10px] text-muted-foreground">Employment Type</p>
                    </div>
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </TabsContent>

        {/* ══════ TAB: Inbox & Announcements ══════ */}
        <TabsContent value="inbox" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Inbox & Announcements</h2>
            <Button size="sm" onClick={() => { setAnnForm(BLANK_ANN); setAnnEditId(null); setAnnSheetOpen(true); }} data-primary>
              <Plus className="h-4 w-4 mr-1" /> Post Announcement
            </Button>
          </div>

          {activeAnnouncements.length === 0 && expiredAnnouncements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No announcements yet. Post one to broadcast to employees.</p>
          ) : (
            <div className="space-y-3">
              {activeAnnouncements.map(a => (
                <Card key={a.id} className={a.pinned ? 'border-amber-400/60' : ''}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {a.pinned && <Pin className="h-3.5 w-3.5 text-amber-500" />}
                        <Badge variant="outline" className={PRIORITY_COLORS[a.priority]}>{a.priority}</Badge>
                        <h3 className="font-semibold">{a.title}</h3>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => {
                          const updated = announcements.map(x => x.id === a.id ? { ...x, pinned: !x.pinned, updated_at: new Date().toISOString() } : x);
                          saveAnnouncements(updated);
                        }}>{a.pinned ? 'Unpin' : 'Pin'}</Button>
                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => {
                          setAnnForm({ title: a.title, body: a.body, priority: a.priority, audience: a.audience,
                            audienceValue: a.audienceValue, postedBy: a.postedBy, pinned: a.pinned,
                            expiryDate: a.expiryDate, readBy: a.readBy, attachmentRef: a.attachmentRef });
                          setAnnEditId(a.id); setAnnSheetOpen(true);
                        }}>Edit</Button>
                        <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => {
                          saveAnnouncements(announcements.filter(x => x.id !== a.id));
                          toast.success('Announcement deleted');
                        }}>Delete</Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">{a.body}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>By {a.postedBy}</span>
                      <span>{format(parseISO(a.created_at), 'dd MMM yyyy')}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {a.audience === 'all' ? 'All Employees' : `${a.audience}: ${a.audienceValue}`}
                      </Badge>
                      {a.readBy.length > 0 && <span>Read by {a.readBy.length}</span>}
                    </div>
                    {!a.readBy.includes('HR Admin') && (
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                        saveAnnouncements(announcements.map(x => x.id === a.id
                          ? { ...x, readBy: [...x.readBy, 'HR Admin'], updated_at: new Date().toISOString() } : x));
                        toast.success('Marked as read');
                      }}>Mark Read</Button>
                    )}
                  </CardContent>
                </Card>
              ))}

              {expiredAnnouncements.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <ChevronRight className="h-4 w-4" /> Expired ({expiredAnnouncements.length})
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    {expiredAnnouncements.map(a => (
                      <Card key={a.id} className="opacity-60">
                        <CardContent className="p-3">
                          <p className="font-medium text-sm">{a.title}</p>
                          <p className="text-xs text-muted-foreground">{a.body.slice(0, 100)}...</p>
                          <p className="text-xs text-muted-foreground mt-1">Expired {a.expiryDate}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}

          {/* Announcement Sheet */}
          <Sheet open={annSheetOpen} onOpenChange={v => { if (!v) { setAnnSheetOpen(false); setAnnEditId(null); setAnnForm(BLANK_ANN); } }}>
            <SheetContent className="sm:max-w-lg overflow-auto">
              <div className="space-y-4" data-keyboard-form>
                <SheetHeader><SheetTitle>{annEditId ? 'Edit Announcement' : 'Post Announcement'}</SheetTitle></SheetHeader>
                <div className="space-y-3">
                  <div><Label>Title *</Label><Input value={annForm.title} onChange={e => auf('title', e.target.value)} onKeyDown={onEnterNext} /></div>
                  <div><Label>Body *</Label><Textarea value={annForm.body} onChange={e => auf('body', e.target.value)} rows={5} /></div>
                  <div><Label>Priority</Label>
                    <Select value={annForm.priority} onValueChange={v => auf('priority', v as AnnouncementPriority)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="important">Important</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Audience</Label>
                    <Select value={annForm.audience} onValueChange={v => auf('audience', v as AnnouncementAudience)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        <SelectItem value="department">Specific Department</SelectItem>
                        <SelectItem value="grade">Specific Grade</SelectItem>
                        <SelectItem value="location">Location</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {annForm.audience !== 'all' && (
                    <div><Label>Audience Value</Label>
                      <Input value={annForm.audienceValue} onChange={e => auf('audienceValue', e.target.value)}
                        placeholder={annForm.audience === 'department' ? 'Department name' : annForm.audience === 'grade' ? 'Grade code' : 'Location'}
                        onKeyDown={onEnterNext} />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Switch checked={annForm.pinned} onCheckedChange={v => auf('pinned', v)} />
                    <Label>Pin to top</Label>
                  </div>
                  <div><Label>Expiry Date</Label>
                    <SmartDateInput value={annForm.expiryDate} onChange={v => auf('expiryDate', v)} />
                  </div>
                  <div><Label>Posted By</Label>
                    <Input value={annForm.postedBy} onChange={e => auf('postedBy', e.target.value)} onKeyDown={onEnterNext} />
                  </div>
                </div>
                <SheetFooter>
                  <Button onClick={handleAnnSave} data-primary>{annEditId ? 'Update' : 'Post'}</Button>
                </SheetFooter>
              </div>
            </SheetContent>
          </Sheet>
        </TabsContent>

        {/* ══════ TAB: Collaboration ══════ */}
        <TabsContent value="collaboration" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Team Wall & Recognition</h2>
            <Button size="sm" onClick={() => { setRecogForm(BLANK_RECOG); setRecogSheetOpen(true); }} data-primary>
              <Plus className="h-4 w-4 mr-1" /> Give Recognition
            </Button>
          </div>

          {publicRecognitions.length === 0 && privateRecognitions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No recognitions yet. Give a shout-out to a colleague!</p>
          ) : (
            <div className="space-y-3">
              {publicRecognitions.map(r => (
                <Card key={r.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{RECOGNITION_ICONS[r.type]}</span>
                      <Badge variant="outline">{RECOGNITION_TYPE_LABELS[r.type]}</Badge>
                    </div>
                    <p className="text-sm"><span className="font-medium">From:</span> {r.fromEmployeeName} → <span className="font-medium">To:</span> {r.toEmployeeName}</p>
                    <p className="text-sm text-muted-foreground">{r.message}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{relativeDate(r.created_at)}</span>
                      <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => {
                        const liked = r.likedBy.includes('HR Admin');
                        const newLiked = liked ? r.likedBy.filter(x => x !== 'HR Admin') : [...r.likedBy, 'HR Admin'];
                        saveRecognitions(recognitions.map(x => x.id === r.id ? { ...x, likedBy: newLiked, updated_at: new Date().toISOString() } : x));
                      }}>
                        <ThumbsUp className={`h-3 w-3 mr-1 ${r.likedBy.includes('HR Admin') ? 'text-violet-600 fill-violet-600' : ''}`} />
                        {r.likedBy.length}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {privateRecognitions.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <ChevronRight className="h-4 w-4" /> Private Recognitions ({privateRecognitions.length})
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    {privateRecognitions.map(r => (
                      <Card key={r.id} className="opacity-75">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <span>{RECOGNITION_ICONS[r.type]}</span>
                            <Badge variant="outline" className="text-[10px]">{RECOGNITION_TYPE_LABELS[r.type]}</Badge>
                          </div>
                          <p className="text-sm mt-1">{r.fromEmployeeName} → {r.toEmployeeName}</p>
                          <p className="text-xs text-muted-foreground">{r.message}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}

          {/* Recognition Sheet */}
          <Sheet open={recogSheetOpen} onOpenChange={v => { if (!v) { setRecogSheetOpen(false); setRecogForm(BLANK_RECOG); } }}>
            <SheetContent className="sm:max-w-md overflow-auto">
              <div className="space-y-4" data-keyboard-form>
                <SheetHeader><SheetTitle>Give Recognition</SheetTitle></SheetHeader>
                <div className="space-y-3">
                  <div><Label>Type</Label>
                    <Select value={recogForm.type} onValueChange={v => ruf('type', v as RecognitionType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kudos">👏 Kudos</SelectItem>
                        <SelectItem value="shoutout">📣 Shout-Out</SelectItem>
                        <SelectItem value="milestone">🏆 Milestone</SelectItem>
                        <SelectItem value="award">⭐ Award</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>From</Label>
                    <Select value={recogForm.fromEmployeeId} onValueChange={v => {
                      const emp = activeEmployees.find(e => e.id === v);
                      ruf('fromEmployeeId', v);
                      ruf('fromEmployeeName', emp?.displayName || 'HR Admin');
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select sender" /></SelectTrigger>
                      <SelectContent>
                        {activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.displayName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>To *</Label>
                    <Select value={recogForm.toEmployeeId} onValueChange={v => {
                      const emp = activeEmployees.find(e => e.id === v);
                      ruf('toEmployeeId', v);
                      ruf('toEmployeeName', emp?.displayName || '');
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select recipient" /></SelectTrigger>
                      <SelectContent>
                        {activeEmployees.filter(e => e.id !== recogForm.fromEmployeeId).map(e =>
                          <SelectItem key={e.id} value={e.id}>{e.displayName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Message *</Label>
                    <Textarea value={recogForm.message} onChange={e => ruf('message', e.target.value)} rows={3} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={recogForm.isPublic} onCheckedChange={v => ruf('isPublic', v)} />
                    <Label>Make Public</Label>
                  </div>
                </div>
                <SheetFooter>
                  <Button onClick={handleRecogSave} data-primary>Send Recognition</Button>
                </SheetFooter>
              </div>
            </SheetContent>
          </Sheet>
        </TabsContent>

        {/* ══════ TAB: Total Rewards ══════ */}
        <TabsContent value="total-rewards" className="space-y-4">
          <Card className="bg-violet-50/50 dark:bg-violet-900/10 border-violet-200/50">
            <CardContent className="p-4">
              <p className="text-sm">Total Rewards gives employees a complete view of their compensation — not just take-home salary but the full investment the company makes in them.</p>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Select value={trEmpId} onValueChange={setTrEmpId}>
              <SelectTrigger className="w-80"><SelectValue placeholder="Select Employee" /></SelectTrigger>
              <SelectContent>
                {allEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName}</SelectItem>)}
              </SelectContent>
            </Select>
            {trEmployee && (
              <Button size="sm" onClick={handlePrint} data-primary>
                <Printer className="h-4 w-4 mr-1" /> Print Statement
              </Button>
            )}
          </div>

          {!trEmpId ? (
            <p className="text-sm text-muted-foreground text-center py-12">Select an employee to view their Total Rewards Statement</p>
          ) : !trPayslip ? (
            <p className="text-sm text-muted-foreground text-center py-12">No payroll data available for this employee yet.</p>
          ) : (
            <div id="total-rewards-print-area" className="space-y-6">
              {/* Print Header */}
              <div className="hidden print:block text-center mb-6">
                <h2 className="text-xl font-bold">{companyName}</h2>
                <h3 className="text-lg">Total Rewards Statement</h3>
                <p className="text-sm">{trEmployee?.displayName} ({trEmployee?.empCode})</p>
                <p className="text-xs text-muted-foreground">Period: {trPayslip.payPeriod} | Generated: {format(new Date(), 'dd MMM yyyy')}</p>
              </div>

              {/* Section 1: Current Year Compensation */}
              <h3 className="font-bold text-lg">Current Year Compensation</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Earnings */}
                <Card>
                  <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Earnings</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow><TableHead>Component</TableHead><TableHead className="text-right">Monthly ₹</TableHead><TableHead className="text-right">Annual ₹</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {trPayslip.lines.filter(l => l.type === 'earning').map(l => (
                          <TableRow key={l.headCode}>
                            <TableCell className="text-xs">{l.headName}</TableCell>
                            <TableCell className="text-right text-xs">{toIndianFormat(l.monthly)}</TableCell>
                            <TableCell className="text-right text-xs">{toIndianFormat(l.annual)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold">
                          <TableCell>Total Gross Earnings</TableCell>
                          <TableCell className="text-right">{toIndianFormat(trPayslip.grossEarnings)}</TableCell>
                          <TableCell className="text-right">{toIndianFormat(trPayslip.grossEarnings * 12)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Deductions */}
                <Card>
                  <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Deductions & Statutory</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow><TableHead>Component</TableHead><TableHead className="text-right">Monthly ₹</TableHead><TableHead className="text-right">Annual ₹</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow><TableCell className="text-xs">Employee PF</TableCell><TableCell className="text-right text-xs">{toIndianFormat(trPayslip.empPF)}</TableCell><TableCell className="text-right text-xs">{toIndianFormat(trPayslip.empPF * 12)}</TableCell></TableRow>
                        <TableRow><TableCell className="text-xs">Employee ESI</TableCell><TableCell className="text-right text-xs">{toIndianFormat(trPayslip.empESI)}</TableCell><TableCell className="text-right text-xs">{toIndianFormat(trPayslip.empESI * 12)}</TableCell></TableRow>
                        <TableRow><TableCell className="text-xs">Professional Tax</TableCell><TableCell className="text-right text-xs">{toIndianFormat(trPayslip.pt)}</TableCell><TableCell className="text-right text-xs">{toIndianFormat(trPayslip.pt * 12)}</TableCell></TableRow>
                        <TableRow><TableCell className="text-xs">Income Tax (TDS)</TableCell><TableCell className="text-right text-xs">{toIndianFormat(trPayslip.tds)}</TableCell><TableCell className="text-right text-xs">{toIndianFormat(trPayslip.tds * 12)}</TableCell></TableRow>
                        <TableRow className="font-bold">
                          <TableCell>Total Deductions</TableCell>
                          <TableCell className="text-right">{toIndianFormat(trPayslip.totalDeductions)}</TableCell>
                          <TableCell className="text-right">{toIndianFormat(trPayslip.totalDeductions * 12)}</TableCell>
                        </TableRow>
                        <TableRow className="font-bold bg-violet-50 dark:bg-violet-900/20">
                          <TableCell className="text-violet-700 dark:text-violet-300">NET TAKE-HOME</TableCell>
                          <TableCell className="text-right text-violet-700 dark:text-violet-300">{toIndianFormat(trPayslip.netPay)}</TableCell>
                          <TableCell className="text-right text-violet-700 dark:text-violet-300">{toIndianFormat(trPayslip.netPay * 12)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Employer Benefits */}
              <Card>
                <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Employer Benefits</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Component</TableHead><TableHead className="text-right">Monthly ₹</TableHead><TableHead className="text-right">Annual ₹</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {trPayslip.lines.filter(l => l.type === 'employer_contribution').map(l => (
                        <TableRow key={l.headCode}>
                          <TableCell className="text-xs">{l.headName}</TableCell>
                          <TableCell className="text-right text-xs">{toIndianFormat(l.monthly)}</TableCell>
                          <TableCell className="text-right text-xs">{toIndianFormat(l.annual)}</TableCell>
                        </TableRow>
                      ))}
                      {(() => {
                        const basicLine = trPayslip.lines.find(l => l.headCode === 'BASIC');
                        const annualBasic = basicLine ? basicLine.annual : 0;
                        const gratuity = Math.round((annualBasic * 4.81) / 100);
                        return (
                          <TableRow>
                            <TableCell className="text-xs">Gratuity Provision (est.)</TableCell>
                            <TableCell className="text-right text-xs">{toIndianFormat(Math.round(gratuity / 12))}</TableCell>
                            <TableCell className="text-right text-xs">{toIndianFormat(gratuity)}</TableCell>
                          </TableRow>
                        );
                      })()}
                      <TableRow className="font-bold">
                        <TableCell>Total Employer Cost</TableCell>
                        <TableCell className="text-right">{toIndianFormat(trPayslip.totalEmployerCost)}</TableCell>
                        <TableCell className="text-right">{toIndianFormat(trPayslip.totalEmployerCost * 12)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* CTC Summary */}
              {trEmployee && (
                <Card className="bg-violet-50/50 dark:bg-violet-900/10 border-violet-200/50">
                  <CardContent className="p-4">
                    <h4 className="font-bold mb-2">CTC Summary</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-lg font-bold text-violet-700 dark:text-violet-300">₹{toIndianFormat(trEmployee.annualCTC)}</p>
                        <p className="text-xs text-muted-foreground">Annual CTC</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{trEmployee.annualCTC > 0 ? Math.round((trPayslip.grossEarnings * 12 / trEmployee.annualCTC) * 100) : 0}%</p>
                        <p className="text-xs text-muted-foreground">Gross Salary %</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{trEmployee.annualCTC > 0 ? Math.round(((trPayslip.totalEmployerCost - trPayslip.grossEarnings) * 12 / trEmployee.annualCTC) * 100) : 0}%</p>
                        <p className="text-xs text-muted-foreground">Benefits %</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Section 2: YTD Summary */}
              {ytdData && (
                <>
                  <h3 className="font-bold text-lg">YTD Summary (Financial Year)</h3>
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Amount ₹</TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow><TableCell>YTD Gross Earnings</TableCell><TableCell className="text-right">{toIndianFormat(ytdData.ytdGross)}</TableCell></TableRow>
                          <TableRow><TableCell>YTD PF Deducted</TableCell><TableCell className="text-right">{toIndianFormat(ytdData.ytdPF)}</TableCell></TableRow>
                          <TableRow><TableCell>YTD ESI Deducted</TableCell><TableCell className="text-right">{toIndianFormat(ytdData.ytdESI)}</TableCell></TableRow>
                          <TableRow><TableCell>YTD PT Deducted</TableCell><TableCell className="text-right">{toIndianFormat(ytdData.ytdPT)}</TableCell></TableRow>
                          <TableRow><TableCell>YTD TDS</TableCell><TableCell className="text-right">{toIndianFormat(ytdData.ytdTDS)}</TableCell></TableRow>
                          <TableRow className="font-bold"><TableCell>YTD Net Pay</TableCell><TableCell className="text-right">{toIndianFormat(ytdData.ytdNet)}</TableCell></TableRow>
                          <TableRow><TableCell>Months Processed</TableCell><TableCell className="text-right">{ytdData.months}</TableCell></TableRow>
                          <TableRow className="font-bold"><TableCell>Total Employer Cost YTD</TableCell><TableCell className="text-right">{toIndianFormat(ytdData.ytdErCost)}</TableCell></TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function EmployeeExperience() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <ERPHeader breadcrumbs={[{ label: 'Operix Core', href: '/erp/dashboard' }, { label: 'Pay Hub' }, { label: 'Employee Experience' }]} showDatePicker={false} showCompany={false} />
        <div className="flex-1 overflow-auto p-6">
          <EmployeeExperiencePanel />
        </div>
      </div>
    </SidebarProvider>
  );
}
