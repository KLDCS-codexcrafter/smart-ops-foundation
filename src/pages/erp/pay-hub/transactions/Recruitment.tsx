import { useState, useMemo, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Briefcase, Users, Calendar, Plus, ChevronRight,
  X, Printer, ArrowRight, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { JobRequisition, CandidateApplication, ApplicationStage, RequisitionStatus } from '@/types/recruitment';
import { JOB_REQUISITIONS_KEY, JOB_APPLICATIONS_KEY, STAGE_LABELS, STAGE_COLORS,
  REQ_STATUS_COLORS } from '@/types/recruitment';
import type { Employee } from '@/types/employee';
import type { PayGrade } from '@/types/pay-hub';
import { EMPLOYEES_KEY } from '@/types/employee';
import { PAY_GRADES_KEY } from '@/types/pay-hub';
import { toIndianFormat, amountInputProps, onEnterNext, useCtrlS } from '@/lib/keyboard';

const ACTIVE_STAGES: ApplicationStage[] = ['applied', 'screening', 'interview', 'offer_sent', 'joined'];
const NEXT_STAGE: Record<string, ApplicationStage> = {
  applied: 'screening', screening: 'interview', interview: 'offer_sent', offer_sent: 'joined',
};

export function RecruitmentPanel() {
  // ── Cross-module reads ───────────────────────────────────────
  const employees = useMemo<Employee[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/employees
      const raw = localStorage.getItem(EMPLOYEES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  const payGrades = useMemo<PayGrade[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/masters/pay-grades
      const raw = localStorage.getItem(PAY_GRADES_KEY);
      return raw ? (JSON.parse(raw) as PayGrade[]).filter(g => g.status === 'active') : [];
    } catch { return []; }
  }, []);

  // ── Requisitions state ───────────────────────────────────────
  const [requisitions, setRequisitions] = useState<JobRequisition[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/recruitment/requisitions
      const raw = localStorage.getItem(JOB_REQUISITIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveRequisitions = (items: JobRequisition[]) => {
    // [JWT] PUT /api/pay-hub/recruitment/requisitions
    localStorage.setItem(JOB_REQUISITIONS_KEY, JSON.stringify(items));
    setRequisitions(items);
  };

  // ── Applications state ───────────────────────────────────────
  const [applications, setApplications] = useState<CandidateApplication[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/recruitment/applications
      const raw = localStorage.getItem(JOB_APPLICATIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveApplications = (items: CandidateApplication[]) => {
    // [JWT] PUT /api/pay-hub/recruitment/applications
    localStorage.setItem(JOB_APPLICATIONS_KEY, JSON.stringify(items));
    setApplications(items);
  };

  // ── Code generators ──────────────────────────────────────────
  const nextReqCode = () => `JR-${String(requisitions.length + 1).padStart(6, '0')}`;
  const nextAppCode = () => `CA-${String(applications.length + 1).padStart(6, '0')}`;

  // ── Filters ──────────────────────────────────────────────────
  const [reqStatusFilter, setReqStatusFilter] = useState('all');
  const [reqTypeFilter, setReqTypeFilter] = useState('all');
  const [reqSearch, setReqSearch] = useState('');
  const [pipelineReqFilter, setPipelineReqFilter] = useState('all');
  const [showRejected, setShowRejected] = useState(false);

  // ── JR Sheet ─────────────────────────────────────────────────
  const [jrSheetOpen, setJrSheetOpen] = useState(false);
  const [jrEditId, setJrEditId] = useState<string | null>(null);
  const BLANK_JR: {
    reqCode: string; jobTitle: string; departmentId: string; departmentName: string;
    reportingManagerId: string; reportingManagerName: string;
    gradeId: string; gradeName: string; minCTC: number; maxCTC: number;
    openings: number; filled: number; employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
    location: string; experienceMin: number; experienceMax: number;
    skills: string[]; description: string; targetDate: string;
    status: RequisitionStatus; approvedBy: string; approvedAt: string;
    rejectionReason: string; isInternal: boolean; isExternal: boolean;
  } = {
    reqCode: '', jobTitle: '', departmentId: '', departmentName: '',
    reportingManagerId: '', reportingManagerName: '',
    gradeId: '', gradeName: '', minCTC: 0, maxCTC: 0,
    openings: 1, filled: 0, employmentType: 'full_time',
    location: '', experienceMin: 0, experienceMax: 5,
    skills: [], description: '', targetDate: '',
    status: 'draft', approvedBy: '', approvedAt: '',
    rejectionReason: '', isInternal: true, isExternal: false,
  };
  const [jrForm, setJrForm] = useState(BLANK_JR);
  const juf = <K extends keyof typeof BLANK_JR>(k: K, v: (typeof BLANK_JR)[K]) =>
    setJrForm(prev => ({ ...prev, [k]: v }));

  const handleJrSave = useCallback(() => {
    if (!jrSheetOpen) return;
    if (!jrForm.jobTitle.trim()) return toast.error('Job title is required');
    if (!jrForm.departmentName.trim()) return toast.error('Department is required');
    const now = new Date().toISOString();
    if (jrEditId) {
      saveRequisitions(requisitions.map(r => r.id === jrEditId
        ? { ...r, ...jrForm, updated_at: now } : r));
    } else {
      saveRequisitions([...requisitions, {
        ...jrForm, id: `jr-${Date.now()}`, reqCode: nextReqCode(),
        created_at: now, updated_at: now,
      }]);
    }
    toast.success('Job requisition saved');
    setJrSheetOpen(false); setJrEditId(null); setJrForm(BLANK_JR);
  }, [jrSheetOpen, jrForm, jrEditId, requisitions]);

  // ── Application Sheet ─────────────────────────────────────────
  const [appSheetOpen, setAppSheetOpen] = useState(false);
  const [appEditId, setAppEditId] = useState<string | null>(null);
  const BLANK_APP: {
    appCode: string; requisitionId: string; jobTitle: string; candidateName: string;
    email: string; phone: string; currentCTC: number; expectedCTC: number;
    noticePeriodDays: number; totalExperience: number; currentEmployer: string;
    source: string; resumeRef: string; stage: ApplicationStage; interviewDate: string;
    interviewMode: string; interviewerName: string; interviewFeedback: string;
    offerAmount: number; offerDate: string; joiningDate: string;
    rejectionReason: string; notes: string;
  } = {
    appCode: '', requisitionId: '', jobTitle: '', candidateName: '', email: '',
    phone: '', currentCTC: 0, expectedCTC: 0, noticePeriodDays: 30,
    totalExperience: 0, currentEmployer: '', source: 'LinkedIn',
    resumeRef: '', stage: 'applied', interviewDate: '',
    interviewMode: 'Video', interviewerName: '', interviewFeedback: '',
    offerAmount: 0, offerDate: '', joiningDate: '', rejectionReason: '', notes: '',
  };
  const [appForm, setAppForm] = useState(BLANK_APP);
  const auf = <K extends keyof typeof BLANK_APP>(k: K, v: (typeof BLANK_APP)[K]) =>
    setAppForm(prev => ({ ...prev, [k]: v }));

  const handleAppSave = useCallback(() => {
    if (!appSheetOpen) return;
    if (!appForm.candidateName.trim()) return toast.error('Candidate name is required');
    if (!appForm.requisitionId) return toast.error('Select a job requisition');
    const now = new Date().toISOString();
    if (appEditId) {
      saveApplications(applications.map(a => a.id === appEditId
        ? { ...a, ...appForm, updated_at: now } : a));
    } else {
      saveApplications([...applications, {
        ...appForm, id: `ca-${Date.now()}`, appCode: nextAppCode(),
        created_at: now, updated_at: now,
      }]);
    }
    toast.success('Application saved');
    setAppSheetOpen(false); setAppEditId(null); setAppForm(BLANK_APP);
  }, [appSheetOpen, appForm, appEditId, applications]);

  // ── Move application stage ────────────────────────────────────
  const moveStage = (id: string, newStage: ApplicationStage) => {
    saveApplications(applications.map(a => a.id !== id ? a : {
      ...a, stage: newStage, updated_at: new Date().toISOString(),
    }));
  };

  // ── Offer letter print state ──────────────────────────────────
  const [offerAppId, setOfferAppId] = useState<string | null>(null);
  const offerApp = applications.find(a => a.id === offerAppId) || null;
  const offerReq = offerApp ? requisitions.find(r => r.id === offerApp.requisitionId) : null;
  const companyName = useMemo(() => {
    try {
      // [JWT] GET /api/foundation/parent-company
      const raw = localStorage.getItem('erp_parent_company');
      if (raw) { const p = JSON.parse(raw); return p.legalName || p.name || 'Company'; }
    } catch { /* ignore */ }
    return 'Company Name';
  }, []);

  // ── masterSave ────────────────────────────────────────────────
  const masterSave = useCallback(() => {
    if (jrSheetOpen) { handleJrSave(); return; }
    if (appSheetOpen) { handleAppSave(); return; }
  }, [jrSheetOpen, appSheetOpen, handleJrSave, handleAppSave]);
  const isFormActive = true;
  useCtrlS(isFormActive ? masterSave : () => {});

  // ── Pipeline stats ────────────────────────────────────────────
  const stats = useMemo(() => ({
    openReqs: requisitions.filter(r => r.status === 'open' || r.status === 'approved').length,
    totalApps: applications.length,
    inInterview: applications.filter(a => a.stage === 'interview').length,
    offersSent: applications.filter(a => a.stage === 'offer_sent').length,
    joined: applications.filter(a => a.stage === 'joined').length,
  }), [requisitions, applications]);

  // ── Filtered requisitions ─────────────────────────────────────
  const filteredReqs = useMemo(() => {
    let list = requisitions;
    if (reqStatusFilter !== 'all') list = list.filter(r => r.status === reqStatusFilter);
    if (reqTypeFilter !== 'all') list = list.filter(r => r.employmentType === reqTypeFilter);
    if (reqSearch) {
      const s = reqSearch.toLowerCase();
      list = list.filter(r =>
        r.reqCode.toLowerCase().includes(s) ||
        r.jobTitle.toLowerCase().includes(s) ||
        r.departmentName.toLowerCase().includes(s)
      );
    }
    return list;
  }, [requisitions, reqStatusFilter, reqTypeFilter, reqSearch]);

  // ── Filtered pipeline apps ────────────────────────────────────
  const filteredApps = useMemo(() => {
    if (pipelineReqFilter === 'all') return applications;
    return applications.filter(a => a.requisitionId === pipelineReqFilter);
  }, [applications, pipelineReqFilter]);

  // ── Interviews ────────────────────────────────────────────────
  const interviews = useMemo(() =>
    applications
      .filter(a => a.interviewDate)
      .sort((a, b) => a.interviewDate.localeCompare(b.interviewDate)),
    [applications]);

  const openReqs = useMemo(() =>
    requisitions.filter(r => r.status === 'open' || r.status === 'approved'),
    [requisitions]);

  return (
    <div className="space-y-4" data-keyboard-form>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
          <Briefcase className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Recruitment Pipeline</h2>
          <p className="text-xs text-muted-foreground">Manage job requisitions, candidate pipeline &amp; interviews</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Open Positions', value: stats.openReqs },
          { label: 'Total Applicants', value: stats.totalApps },
          { label: 'In Interview', value: stats.inInterview },
          { label: 'Offers Sent', value: stats.offersSent },
          { label: 'Joined', value: stats.joined },
        ].map(s => (
          <Card key={s.label} className="p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="requisitions">
        <TabsList>
          <TabsTrigger value="requisitions" className="gap-1">
            <Briefcase className="h-3.5 w-3.5" /> Requisitions
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1">
            <Users className="h-3.5 w-3.5" /> Pipeline
            {stats.totalApps > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{stats.totalApps}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="interviews" className="gap-1">
            <Calendar className="h-3.5 w-3.5" /> Interview Schedule
          </TabsTrigger>
        </TabsList>

        {/* ═══ TAB: requisitions ═══ */}
        <TabsContent value="requisitions" className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={reqStatusFilter} onValueChange={setReqStatusFilter}>
                <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={reqTypeFilter} onValueChange={setReqTypeFilter}>
                <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input className="pl-7 h-8 w-[200px] text-xs" placeholder="Search..." value={reqSearch} onChange={e => setReqSearch(e.target.value)} onKeyDown={onEnterNext} />
              </div>
            </div>
            <Button size="sm" onClick={() => { setJrEditId(null); setJrForm(BLANK_JR); setJrSheetOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New Requisition
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">JR Code</TableHead>
                <TableHead className="text-xs">Job Title</TableHead>
                <TableHead className="text-xs">Dept</TableHead>
                <TableHead className="text-xs">Openings</TableHead>
                <TableHead className="text-xs">CTC Band</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Target Date</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReqs.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No requisitions found</TableCell></TableRow>
              )}
              {filteredReqs.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs font-mono">{r.reqCode}</TableCell>
                  <TableCell className="text-xs font-medium">{r.jobTitle}</TableCell>
                  <TableCell className="text-xs">{r.departmentName}</TableCell>
                  <TableCell className="text-xs">{r.filled}/{r.openings}</TableCell>
                  <TableCell className="text-xs">₹{toIndianFormat(r.minCTC)} – ₹{toIndianFormat(r.maxCTC)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${REQ_STATUS_COLORS[r.status]}`}>
                      {r.status.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{r.targetDate ? format(parseISO(r.targetDate), 'dd MMM yyyy') : '—'}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                      setJrEditId(r.id);
                      setJrForm({
                        reqCode: r.reqCode, jobTitle: r.jobTitle, departmentId: r.departmentId,
                        departmentName: r.departmentName, reportingManagerId: r.reportingManagerId,
                        reportingManagerName: r.reportingManagerName, gradeId: r.gradeId,
                        gradeName: r.gradeName, minCTC: r.minCTC, maxCTC: r.maxCTC,
                        openings: r.openings, filled: r.filled, employmentType: r.employmentType,
                        location: r.location, experienceMin: r.experienceMin, experienceMax: r.experienceMax,
                        skills: r.skills, description: r.description, targetDate: r.targetDate,
                        status: r.status, approvedBy: r.approvedBy, approvedAt: r.approvedAt,
                        rejectionReason: r.rejectionReason, isInternal: r.isInternal, isExternal: r.isExternal,
                      });
                      setJrSheetOpen(true);
                    }}>Edit</Button>
                    {r.status === 'pending_approval' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                        saveRequisitions(requisitions.map(x => x.id === r.id
                          ? { ...x, status: 'approved' as const, approvedBy: 'Admin', approvedAt: new Date().toISOString(), updated_at: new Date().toISOString() }
                          : x));
                        toast.success('Requisition approved');
                      }}>Approve</Button>
                    )}
                    {r.status === 'approved' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                        saveRequisitions(requisitions.map(x => x.id === r.id
                          ? { ...x, status: 'open' as const, updated_at: new Date().toISOString() }
                          : x));
                        toast.success('Requisition opened');
                      }}>Open</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ═══ TAB: pipeline (Kanban) ═══ */}
        <TabsContent value="pipeline" className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Select value={pipelineReqFilter} onValueChange={setPipelineReqFilter}>
              <SelectTrigger className="w-[250px] h-8 text-xs"><SelectValue placeholder="Filter by requisition" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requisitions</SelectItem>
                {requisitions.map(r => <SelectItem key={r.id} value={r.id}>{r.reqCode} — {r.jobTitle}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => { setAppEditId(null); setAppForm(BLANK_APP); setAppSheetOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Application
            </Button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {ACTIVE_STAGES.map(stage => {
              const cards = filteredApps.filter(a => a.stage === stage);
              return (
                <div key={stage} className="min-w-[220px] flex-1">
                  <div className={`rounded-t-lg px-3 py-2 border ${STAGE_COLORS[stage]} flex items-center justify-between`}>
                    <span className="text-xs font-semibold">{STAGE_LABELS[stage]}</span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">{cards.length}</Badge>
                  </div>
                  <div className="space-y-2 p-2 bg-muted/30 rounded-b-lg min-h-[200px] border border-t-0">
                    {cards.map(app => (
                      <Card key={app.id} className="p-2.5">
                        <div className="flex items-start justify-between">
                          <p className="text-xs font-semibold">{app.candidateName}</p>
                          <Badge variant="outline" className="text-[8px] h-4 px-1">{app.source}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{app.jobTitle}</p>
                        <p className="text-[10px] mt-1">Expected: ₹{toIndianFormat(app.expectedCTC)}</p>
                        <p className="text-[10px]">Notice: {app.noticePeriodDays}d</p>
                        {stage === 'interview' && app.interviewDate && (
                          <p className="text-[10px] text-blue-600 mt-0.5">
                            {format(parseISO(app.interviewDate), 'dd MMM')} · {app.interviewMode}
                          </p>
                        )}
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {NEXT_STAGE[stage] && (
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5" onClick={() => moveStage(app.id, NEXT_STAGE[stage])}>
                              <ArrowRight className="h-3 w-3 mr-0.5" /> Next
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5 text-red-600" onClick={() => moveStage(app.id, 'rejected')}>
                            <X className="h-3 w-3 mr-0.5" /> Reject
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5" onClick={() => {
                            setAppEditId(app.id);
                            setAppForm({
                              appCode: app.appCode, requisitionId: app.requisitionId, jobTitle: app.jobTitle,
                              candidateName: app.candidateName, email: app.email, phone: app.phone,
                              currentCTC: app.currentCTC, expectedCTC: app.expectedCTC,
                              noticePeriodDays: app.noticePeriodDays, totalExperience: app.totalExperience,
                              currentEmployer: app.currentEmployer, source: app.source,
                              resumeRef: app.resumeRef, stage: app.stage, interviewDate: app.interviewDate,
                              interviewMode: app.interviewMode, interviewerName: app.interviewerName,
                              interviewFeedback: app.interviewFeedback, offerAmount: app.offerAmount,
                              offerDate: app.offerDate, joiningDate: app.joiningDate,
                              rejectionReason: app.rejectionReason, notes: app.notes,
                            });
                            setAppSheetOpen(true);
                          }}>Edit</Button>
                          {stage === 'offer_sent' && (
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5" onClick={() => {
                              setOfferAppId(app.id);
                              setTimeout(() => window.print(), 300);
                            }}>
                              <Printer className="h-3 w-3 mr-0.5" /> Offer
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rejected */}
          {(() => {
            const rejected = filteredApps.filter(a => a.stage === 'rejected');
            if (rejected.length === 0) return null;
            return (
              <div>
                <Button variant="ghost" className="text-xs gap-1" onClick={() => setShowRejected(!showRejected)}>
                  <ChevronRight className={`h-3 w-3 transition-transform ${showRejected ? 'rotate-90' : ''}`} />
                  Show Rejected ({rejected.length})
                </Button>
                {showRejected && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {rejected.map(app => (
                      <Card key={app.id} className="p-2.5 opacity-60">
                        <p className="text-xs font-semibold">{app.candidateName}</p>
                        <p className="text-[10px] text-muted-foreground">{app.jobTitle}</p>
                        <p className="text-[10px] text-red-600">Rejected</p>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </TabsContent>

        {/* ═══ TAB: interviews ═══ */}
        <TabsContent value="interviews" className="space-y-3">
          {interviews.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No interviews scheduled. Set an interview date when editing an application.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Candidate</TableHead>
                  <TableHead className="text-xs">Job</TableHead>
                  <TableHead className="text-xs">Mode</TableHead>
                  <TableHead className="text-xs">Interviewer</TableHead>
                  <TableHead className="text-xs">Stage</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interviews.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs">{a.interviewDate ? format(parseISO(a.interviewDate), 'dd MMM yyyy') : ''}</TableCell>
                    <TableCell className="text-xs font-medium">{a.candidateName}</TableCell>
                    <TableCell className="text-xs">{a.jobTitle}</TableCell>
                    <TableCell className="text-xs">{a.interviewMode}</TableCell>
                    <TableCell className="text-xs">{a.interviewerName || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${STAGE_COLORS[a.stage]}`}>{STAGE_LABELS[a.stage]}</Badge>
                    </TableCell>
                    <TableCell>
                      {a.stage === 'interview' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => moveStage(a.id, 'offer_sent')}>
                          Move to Offer
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══ JR Sheet ═══ */}
      <Sheet open={jrSheetOpen} onOpenChange={v => { if (!v) { setJrSheetOpen(false); setJrEditId(null); setJrForm(BLANK_JR); } }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{jrEditId ? 'Edit Requisition' : 'New Requisition'}</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4" data-keyboard-form>
            <div><Label className="text-xs">Job Title *</Label><Input value={jrForm.jobTitle} onChange={e => juf('jobTitle', e.target.value)} onKeyDown={onEnterNext} /></div>
            <div><Label className="text-xs">Department *</Label><Input value={jrForm.departmentName} onChange={e => juf('departmentName', e.target.value)} onKeyDown={onEnterNext} /></div>
            <div>
              <Label className="text-xs">Reporting Manager</Label>
              <Select value={jrForm.reportingManagerId} onValueChange={v => {
                const emp = employees.find(e => e.id === v);
                juf('reportingManagerId', v);
                juf('reportingManagerName', emp ? `${emp.empCode} — ${emp.displayName}` : '');
              }}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select manager" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Pay Grade</Label>
              <Select value={jrForm.gradeId} onValueChange={v => {
                const g = payGrades.find(pg => pg.id === v);
                if (g) { juf('gradeId', v); juf('gradeName', g.name); juf('minCTC', g.minCTC); juf('maxCTC', g.maxCTC); }
              }}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>{payGrades.map(g => <SelectItem key={g.id} value={g.id}>{g.code} — {g.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Min CTC</Label><Input value={jrForm.minCTC || ''} onChange={e => juf('minCTC', Number(e.target.value) || 0)} onKeyDown={onEnterNext} {...amountInputProps} /></div>
              <div><Label className="text-xs">Max CTC</Label><Input value={jrForm.maxCTC || ''} onChange={e => juf('maxCTC', Number(e.target.value) || 0)} onKeyDown={onEnterNext} {...amountInputProps} /></div>
            </div>
            <div><Label className="text-xs">Number of Openings *</Label><Input type="number" value={jrForm.openings} onChange={e => juf('openings', Number(e.target.value) || 1)} onKeyDown={onEnterNext} /></div>
            <div>
              <Label className="text-xs">Employment Type</Label>
              <Select value={jrForm.employmentType} onValueChange={v => juf('employmentType', v as 'full_time' | 'part_time' | 'contract' | 'intern')}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Location</Label><Input value={jrForm.location} onChange={e => juf('location', e.target.value)} onKeyDown={onEnterNext} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Exp Min (yrs)</Label><Input type="number" value={jrForm.experienceMin} onChange={e => juf('experienceMin', Number(e.target.value) || 0)} onKeyDown={onEnterNext} /></div>
              <div><Label className="text-xs">Exp Max (yrs)</Label><Input type="number" value={jrForm.experienceMax} onChange={e => juf('experienceMax', Number(e.target.value) || 0)} onKeyDown={onEnterNext} /></div>
            </div>
            <div>
              <Label className="text-xs">Required Skills (comma-separated)</Label>
              <Input value={jrForm.skills.join(', ')} onChange={e => juf('skills', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} onKeyDown={onEnterNext} />
            </div>
            <div><Label className="text-xs">Job Description</Label><Textarea value={jrForm.description} onChange={e => juf('description', e.target.value)} rows={4} /></div>
            <div><Label className="text-xs">Target Fill Date</Label><SmartDateInput value={jrForm.targetDate} onChange={v => juf('targetDate', v)} /></div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={jrForm.isInternal} onCheckedChange={v => juf('isInternal', v)} />
                <Label className="text-xs">Post Internally</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={jrForm.isExternal} onCheckedChange={v => juf('isExternal', v)} />
                <Label className="text-xs">Post Externally</Label>
              </div>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={jrForm.status} onValueChange={v => juf('status', v as RequisitionStatus)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button data-primary onClick={handleJrSave}>Save Requisition</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══ Application Sheet ═══ */}
      <Sheet open={appSheetOpen} onOpenChange={v => { if (!v) { setAppSheetOpen(false); setAppEditId(null); setAppForm(BLANK_APP); } }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{appEditId ? 'Edit Application' : 'New Application'}</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4" data-keyboard-form>
            <div>
              <Label className="text-xs">Job Requisition *</Label>
              <Select value={appForm.requisitionId} onValueChange={v => {
                const req = openReqs.find(r => r.id === v);
                auf('requisitionId', v);
                auf('jobTitle', req?.jobTitle || '');
              }}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select requisition" /></SelectTrigger>
                <SelectContent>{openReqs.map(r => <SelectItem key={r.id} value={r.id}>{r.reqCode} — {r.jobTitle}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Candidate Name *</Label><Input value={appForm.candidateName} onChange={e => auf('candidateName', e.target.value)} onKeyDown={onEnterNext} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Email</Label><Input value={appForm.email} onChange={e => auf('email', e.target.value)} onKeyDown={onEnterNext} /></div>
              <div><Label className="text-xs">Phone</Label><Input value={appForm.phone} onChange={e => auf('phone', e.target.value)} onKeyDown={onEnterNext} /></div>
            </div>
            <div><Label className="text-xs">Current Employer</Label><Input value={appForm.currentEmployer} onChange={e => auf('currentEmployer', e.target.value)} onKeyDown={onEnterNext} /></div>
            <div><Label className="text-xs">Total Experience (years)</Label><Input type="number" step="0.5" value={appForm.totalExperience || ''} onChange={e => auf('totalExperience', Number(e.target.value) || 0)} onKeyDown={onEnterNext} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Current CTC</Label><Input value={appForm.currentCTC || ''} onChange={e => auf('currentCTC', Number(e.target.value) || 0)} onKeyDown={onEnterNext} {...amountInputProps} /></div>
              <div><Label className="text-xs">Expected CTC</Label><Input value={appForm.expectedCTC || ''} onChange={e => auf('expectedCTC', Number(e.target.value) || 0)} onKeyDown={onEnterNext} {...amountInputProps} /></div>
            </div>
            <div><Label className="text-xs">Notice Period (days)</Label><Input type="number" value={appForm.noticePeriodDays} onChange={e => auf('noticePeriodDays', Number(e.target.value) || 0)} onKeyDown={onEnterNext} /></div>
            <div>
              <Label className="text-xs">Source</Label>
              <Select value={appForm.source} onValueChange={v => auf('source', v)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['LinkedIn', 'Naukri', 'Referral', 'Walk-in', 'Company Website', 'Other'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Resume Reference</Label><Input value={appForm.resumeRef} onChange={e => auf('resumeRef', e.target.value)} placeholder="upload Phase 2" onKeyDown={onEnterNext} /></div>
            <div>
              <Label className="text-xs">Stage</Label>
              <Select value={appForm.stage} onValueChange={v => auf('stage', v as ApplicationStage)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['applied', 'screening', 'interview', 'offer_sent', 'joined', 'rejected'] as ApplicationStage[]).map(s => (
                    <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(appForm.stage === 'screening' || appForm.stage === 'interview') && (
              <>
                <Separator />
                <div><Label className="text-xs">Interview Date</Label><SmartDateInput value={appForm.interviewDate} onChange={v => auf('interviewDate', v)} /></div>
                <div>
                  <Label className="text-xs">Interview Mode</Label>
                  <Select value={appForm.interviewMode} onValueChange={v => auf('interviewMode', v)}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Video', 'In-Person', 'Phone'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Interviewer Name</Label><Input value={appForm.interviewerName} onChange={e => auf('interviewerName', e.target.value)} onKeyDown={onEnterNext} /></div>
              </>
            )}

            {(['interview', 'offer_sent', 'joined'] as ApplicationStage[]).includes(appForm.stage) && (
              <div><Label className="text-xs">Interview Feedback</Label><Textarea value={appForm.interviewFeedback} onChange={e => auf('interviewFeedback', e.target.value)} rows={3} /></div>
            )}

            {(appForm.stage === 'offer_sent' || appForm.stage === 'joined') && (
              <>
                <Separator />
                <div><Label className="text-xs">Offer Amount (₹)</Label><Input value={appForm.offerAmount || ''} onChange={e => auf('offerAmount', Number(e.target.value) || 0)} onKeyDown={onEnterNext} {...amountInputProps} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Offer Date</Label><SmartDateInput value={appForm.offerDate} onChange={v => auf('offerDate', v)} /></div>
                  <div><Label className="text-xs">Joining Date</Label><SmartDateInput value={appForm.joiningDate} onChange={v => auf('joiningDate', v)} /></div>
                </div>
              </>
            )}

            <div><Label className="text-xs">Notes</Label><Textarea value={appForm.notes} onChange={e => auf('notes', e.target.value)} rows={2} /></div>
          </div>
          <SheetFooter>
            <Button data-primary onClick={handleAppSave}>Save Application</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══ Offer Letter Print Area ═══ */}
      {offerApp && (
        <div id="offer-letter-print-area" className="hidden print:block p-12">
          <style>{`@media print { body > *:not(#offer-letter-print-area) { display: none !important; } #offer-letter-print-area { display: block !important; position: absolute; top: 0; left: 0; width: 100%; } }`}</style>
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-center mb-8">{companyName}</h1>
            <p className="text-right mb-4">Date: {offerApp.offerDate ? format(parseISO(offerApp.offerDate), 'dd MMMM yyyy') : format(new Date(), 'dd MMMM yyyy')}</p>
            <p className="mb-2">Ref: {offerApp.appCode}</p>
            <p className="mb-6">Dear <strong>{offerApp.candidateName}</strong>,</p>
            <p className="mb-4">
              We are pleased to offer you the position of <strong>{offerApp.jobTitle}</strong>{offerReq ? ` in the ${offerReq.departmentName} department` : ''}.
            </p>
            <p className="mb-4">
              Your annual CTC will be <strong>₹{toIndianFormat(offerApp.offerAmount)}</strong>.
            </p>
            {offerApp.joiningDate && (
              <p className="mb-4">Your expected date of joining is <strong>{format(parseISO(offerApp.joiningDate), 'dd MMMM yyyy')}</strong>.</p>
            )}
            <p className="mb-4">Please confirm your acceptance by signing and returning a copy of this letter.</p>
            <p className="mb-8">We look forward to welcoming you aboard.</p>
            <div className="mt-16">
              <p>Yours sincerely,</p>
              <p className="mt-8 font-semibold">{companyName}</p>
              <p className="text-sm text-muted-foreground">Authorized Signatory</p>
            </div>
            <div className="mt-16 border-t pt-4">
              <p className="text-sm">Candidate Acceptance:</p>
              <p className="mt-8">Signature: ___________________________</p>
              <p className="mt-2">Date: ___________________________</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Recruitment() {
  return <RecruitmentPanel />;
}
