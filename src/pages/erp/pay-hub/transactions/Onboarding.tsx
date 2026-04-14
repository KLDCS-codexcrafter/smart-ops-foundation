import React, { useState, useMemo, useCallback } from 'react';
import { format, parseISO, differenceInDays, isBefore } from 'date-fns';
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
import { Rocket, CheckCircle2, Circle, Clock, FileCheck, UserPlus,
  ChevronDown, ChevronRight, AlertTriangle, Mail, Check, X,
  ClipboardList, FolderOpen, Settings } from 'lucide-react';
import { toast } from 'sonner';
import type { OnboardingJourney, ChecklistTask, DocRequirement,
  OnboardingPhase, TaskStatus, JourneyStatus } from '@/types/onboarding';
import { ONBOARDING_KEY, PHASE_LABELS, PHASE_ORDER,
  SEED_TASKS, SEED_DOCS } from '@/types/onboarding';
import type { CandidateApplication } from '@/types/recruitment';
import type { Employee } from '@/types/employee';
import { JOB_APPLICATIONS_KEY } from '@/types/recruitment';
import { EMPLOYEES_KEY, BLANK_EMPLOYEE } from '@/types/employee';
import { toIndianFormat, amountInputProps, onEnterNext, useCtrlS } from '@/lib/keyboard';

const STATUS_COLORS: Record<JourneyStatus, string> = {
  active: 'bg-green-500/10 text-green-700 border-green-500/30',
  completed: 'bg-violet-500/10 text-violet-700 border-violet-500/30',
  on_hold: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
};

const TASK_STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  pending: <Circle className="h-4 w-4 text-slate-400" />,
  in_progress: <Clock className="h-4 w-4 text-amber-500" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  skipped: <X className="h-4 w-4 text-slate-400" />,
};

const DOC_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  collected: 'bg-green-500/10 text-green-700 border-green-500/30',
  waived: 'bg-slate-500/10 text-slate-600 border-slate-400/30',
};

const OWNER_COLORS: Record<string, string> = {
  HR: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  IT: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
  Manager: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  Employee: 'bg-green-500/10 text-green-700 border-green-500/30',
};

export function OnboardingPanel() {

  // ── Cross-module: joined candidates from Recruitment ────────
  const joinedCandidates = useMemo<CandidateApplication[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/recruitment/applications
      const raw = localStorage.getItem(JOB_APPLICATIONS_KEY);
      if (raw) return (JSON.parse(raw) as CandidateApplication[]).filter(a => a.stage === 'joined');
    } catch { /* ignore */ }
    return [];
  }, []);

  // ── Journeys state ───────────────────────────────────────────
  const [journeys, setJourneys] = useState<OnboardingJourney[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/onboarding/journeys
      const raw = localStorage.getItem(ONBOARDING_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveJourneys = (items: OnboardingJourney[]) => {
    // [JWT] PUT /api/pay-hub/onboarding/journeys
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(items));
    setJourneys(items);
  };

  const nextCode = () => `OB-${String(journeys.length + 1).padStart(6, '0')}`;

  // ── Selected journey for detail view ─────────────────────────
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const selectedJourney = journeys.find(j => j.id === selectedJourneyId) || null;

  // ── Journey creation Sheet ────────────────────────────────────
  const [journeySheetOpen, setJourneySheetOpen] = useState(false);
  const [populateFromRecruitment, setPopulateFromRecruitment] = useState(true);
  const BLANK_JOURNEY_FORM = {
    candidateAppId: '', candidateName: '', jobTitle: '',
    departmentName: '', joiningDate: '', reportingManagerName: '',
    offerAmount: 0, orientationDate: '', notes: '',
  };
  const [journeyForm, setJourneyForm] = useState(BLANK_JOURNEY_FORM);
  const jf = <K extends keyof typeof BLANK_JOURNEY_FORM>(k: K, v: (typeof BLANK_JOURNEY_FORM)[K]) =>
    setJourneyForm(prev => ({ ...prev, [k]: v }));

  const handleJourneySave = useCallback(() => {
    if (!journeySheetOpen) return;
    if (!journeyForm.candidateName.trim()) return toast.error('Candidate name is required');
    if (!journeyForm.joiningDate) return toast.error('Joining date is required');
    // Check if journey already exists for this candidate
    if (journeyForm.candidateAppId &&
      journeys.some(j => j.candidateAppId === journeyForm.candidateAppId)) {
      return toast.error('An onboarding journey already exists for this candidate');
    }
    const now = new Date().toISOString();
    // Build seeded tasks with unique IDs
    const tasks: ChecklistTask[] = SEED_TASKS.map((t, i) => ({
      ...t, id: `task-${Date.now()}-${i}`, status: 'pending' as const, completedBy: '', completedAt: '', notes: '',
    }));
    const docs: DocRequirement[] = SEED_DOCS.map((d, i) => ({
      ...d, id: `doc-${Date.now()}-${i}`, status: 'pending' as const, collectedDate: '', notes: '',
    }));
    const newJourney: OnboardingJourney = {
      id: `ob-${Date.now()}`, journeyCode: nextCode(),
      candidateAppId: journeyForm.candidateAppId,
      employeeId: '', employeeCode: '',
      candidateName: journeyForm.candidateName,
      jobTitle: journeyForm.jobTitle,
      departmentName: journeyForm.departmentName,
      joiningDate: journeyForm.joiningDate,
      reportingManagerName: journeyForm.reportingManagerName,
      offerAmount: journeyForm.offerAmount,
      status: 'active',
      tasks, documents: docs,
      employeeCreated: false, welcomeEmailSent: false,
      orientationDate: journeyForm.orientationDate,
      notes: journeyForm.notes,
      created_at: now, updated_at: now,
    };
    saveJourneys([...journeys, newJourney]);
    toast.success(`Onboarding journey created for ${journeyForm.candidateName}`);
    setJourneySheetOpen(false);
    setJourneyForm(BLANK_JOURNEY_FORM);
    setSelectedJourneyId(newJourney.id);
  }, [journeySheetOpen, journeyForm, journeys]);

  // ── Task edit Sheet ───────────────────────────────────────────
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [editTask, setEditTask] = useState<ChecklistTask | null>(null);
  const [taskNotes, setTaskNotes] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('pending');

  const openTaskSheet = (task: ChecklistTask) => {
    setEditTask(task); setTaskNotes(task.notes); setTaskStatus(task.status); setTaskSheetOpen(true);
  };

  const handleTaskSave = useCallback(() => {
    if (!taskSheetOpen || !editTask || !selectedJourneyId) return;
    saveJourneys(journeys.map(j => j.id !== selectedJourneyId ? j : {
      ...j,
      tasks: j.tasks.map(t => t.id !== editTask.id ? t : {
        ...t,
        notes: taskNotes,
        status: taskStatus,
        completedBy: taskStatus === 'completed' ? 'HR Admin' : '',
        completedAt: taskStatus === 'completed' ? new Date().toISOString() : '',
      }),
      updated_at: new Date().toISOString(),
    }));
    toast.success('Task updated');
    setTaskSheetOpen(false);
  }, [taskSheetOpen, editTask, taskNotes, taskStatus, selectedJourneyId, journeys]);

  // ── masterSave ────────────────────────────────────────────────
  const masterSave = useCallback(() => {
    if (journeySheetOpen) { handleJourneySave(); return; }
    if (taskSheetOpen) { handleTaskSave(); return; }
  }, [journeySheetOpen, taskSheetOpen, handleJourneySave, handleTaskSave]);
  useCtrlS(masterSave);

  // ── Task status toggle ────────────────────────────────────────
  const toggleTask = (journeyId: string, taskId: string, newStatus: TaskStatus) => {
    saveJourneys(journeys.map(j => j.id !== journeyId ? j : {
      ...j,
      tasks: j.tasks.map(t => t.id !== taskId ? t : {
        ...t, status: newStatus,
        completedBy: newStatus === 'completed' ? 'HR Admin' : '',
        completedAt: newStatus === 'completed' ? new Date().toISOString() : '',
      }),
      updated_at: new Date().toISOString(),
    }));
  };

  // ── Doc status toggle ─────────────────────────────────────────
  const toggleDoc = (journeyId: string, docId: string, newStatus: DocRequirement['status']) => {
    saveJourneys(journeys.map(j => j.id !== journeyId ? j : {
      ...j,
      documents: j.documents.map(d => d.id !== docId ? d : {
        ...d, status: newStatus,
        collectedDate: newStatus === 'collected' ? new Date().toISOString().slice(0, 10) : '',
      }),
      updated_at: new Date().toISOString(),
    }));
  };

  // ── Progress computation ──────────────────────────────────────
  const getProgress = (j: OnboardingJourney) => {
    if (!j.tasks.length) return 0;
    const done = j.tasks.filter(t => t.status === 'completed' || t.status === 'skipped').length;
    return Math.round((done / j.tasks.length) * 100);
  };

  // ── Create employee record from journey ───────────────────────
  const createEmployeeFromJourney = (journey: OnboardingJourney) => {
    if (journey.employeeCreated) {
      toast.error('Employee record already created for this journey'); return;
    }
    try {
      // [JWT] GET /api/pay-hub/employees
      const raw = localStorage.getItem(EMPLOYEES_KEY);
      const existing: Employee[] = raw ? JSON.parse(raw) : [];
      const empNextCode = `EMP-${String(existing.length + 1).padStart(6, '0')}`;
      // Split candidate name into first/last
      const parts = journey.candidateName.trim().split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';
      const now = new Date().toISOString();
      const emp: Employee = {
        ...BLANK_EMPLOYEE,
        id: `emp-${Date.now()}`, empCode: empNextCode,
        firstName, lastName,
        displayName: journey.candidateName,
        designation: journey.jobTitle,
        departmentName: journey.departmentName,
        doj: journey.joiningDate,
        reportingManagerName: journey.reportingManagerName,
        annualCTC: journey.offerAmount,
        status: 'active',
        created_at: now, updated_at: now,
      };
      // [JWT] PUT /api/pay-hub/employees
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify([...existing, emp]));
      // Mark journey as employee-created
      saveJourneys(journeys.map(j => j.id !== journey.id ? j : {
        ...j, employeeCreated: true, employeeCode: empNextCode, employeeId: emp.id,
        updated_at: now,
      }));
      toast.success(`Employee record created: ${empNextCode} — ${journey.candidateName}`);
    } catch {
      toast.error('Failed to create employee record');
    }
  };

  // ── Filters for checklist tab ──────────────────────────────────
  const [phaseFilter, setPhaseFilter] = useState<OnboardingPhase | 'all'>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');

  // ── Stats ──────────────────────────────────────────────────────
  const activeCount = journeys.filter(j => j.status === 'active').length;
  const today = new Date();
  const joiningThisWeek = journeys.filter(j => {
    if (!j.joiningDate) return false;
    const d = differenceInDays(parseISO(j.joiningDate), today);
    return d >= 0 && d <= 7;
  }).length;
  const avgProgress = journeys.length > 0
    ? Math.round(journeys.reduce((s, j) => s + getProgress(j), 0) / journeys.length)
    : 0;
  const empCreatedCount = journeys.filter(j => j.employeeCreated).length;

  return (
    <div className="space-y-4" data-keyboard-form>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
          <Rocket className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Onboarding Journey</h2>
          <p className="text-xs text-muted-foreground">End-to-end new joiner onboarding — Pre-Join to Month 1</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Journeys</p>
          <p className="text-xl font-bold">{activeCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Joining This Week</p>
          <p className="text-xl font-bold">{joiningThisWeek}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Completion %</p>
          <p className="text-xl font-bold">{avgProgress}%</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Employee Records Created</p>
          <p className="text-xl font-bold">{empCreatedCount}</p>
        </CardContent></Card>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-3 gap-4">
        {/* LEFT PANEL — Journey List */}
        <div className="space-y-2">
          <Button size="sm" className="w-full" onClick={() => {
            setJourneyForm(BLANK_JOURNEY_FORM);
            setPopulateFromRecruitment(true);
            setJourneySheetOpen(true);
          }}>
            <UserPlus className="h-3.5 w-3.5 mr-1" /> New Journey
          </Button>

          {journeys.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">No onboarding journeys yet</p>
          )}

          {journeys.map(j => {
            const prog = getProgress(j);
            const isSelected = selectedJourneyId === j.id;
            const daysToJoin = j.joiningDate ? differenceInDays(parseISO(j.joiningDate), today) : null;
            return (
              <Card
                key={j.id}
                className={`cursor-pointer transition-all ${isSelected ? 'border-violet-500 ring-1 ring-violet-500/30' : 'hover:border-violet-300'}`}
                onClick={() => setSelectedJourneyId(j.id)}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-muted-foreground">{j.journeyCode}</span>
                    <div className="flex items-center gap-1">
                      {j.employeeCreated && (
                        <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-700 border-green-500/30">EMP</Badge>
                      )}
                      <Badge variant="outline" className={`text-[9px] ${STATUS_COLORS[j.status]}`}>{j.status}</Badge>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">{j.candidateName}</p>
                  <p className="text-[10px] text-muted-foreground">{j.jobTitle}</p>
                  <div className="flex items-center gap-2">
                    <Progress value={prog} className="h-1.5 flex-1" />
                    <span className="text-[10px] font-medium">{prog}%</span>
                  </div>
                  {daysToJoin !== null && (
                    <p className={`text-[10px] ${daysToJoin > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {daysToJoin > 0 ? `in ${daysToJoin} days` : 'Joined'}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* RIGHT PANEL — Selected Journey Detail */}
        <div className="col-span-2">
          {!selectedJourney ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Rocket className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Select a journey from the list</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Journey header */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-bold text-base">{selectedJourney.candidateName}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{selectedJourney.jobTitle}</span>
                    <Separator orientation="vertical" className="h-3" />
                    <span>{selectedJourney.departmentName || '—'}</span>
                    <Separator orientation="vertical" className="h-3" />
                    <span>{selectedJourney.joiningDate ? format(parseISO(selectedJourney.joiningDate), 'dd MMM yyyy') : '—'}</span>
                    <Separator orientation="vertical" className="h-3" />
                    <span>₹{toIndianFormat(selectedJourney.offerAmount)}</span>
                    <Separator orientation="vertical" className="h-3" />
                    <span>{selectedJourney.reportingManagerName || '—'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!selectedJourney.welcomeEmailSent && (
                    <Button size="sm" variant="outline" className="text-xs h-7"
                      onClick={() => {
                        saveJourneys(journeys.map(j => j.id !== selectedJourney.id ? j : {
                          ...j, welcomeEmailSent: true, updated_at: new Date().toISOString(),
                        }));
                        toast.success('Welcome email marked as sent');
                      }}>
                      <Mail className="h-3 w-3 mr-1" /> Send Welcome Email
                    </Button>
                  )}
                  {selectedJourney.status === 'active' && (
                    <Button size="sm" variant="outline" className="text-xs h-7"
                      onClick={() => {
                        saveJourneys(journeys.map(j => j.id !== selectedJourney.id ? j : {
                          ...j, status: 'completed' as const, updated_at: new Date().toISOString(),
                        }));
                        toast.success('Journey marked as complete');
                      }}>
                      <Check className="h-3 w-3 mr-1" /> Mark Complete
                    </Button>
                  )}
                </div>
              </div>

              {/* 4 Tabs */}
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview" className="gap-1 text-xs">
                    <ClipboardList className="h-3.5 w-3.5" /> Overview
                  </TabsTrigger>
                  <TabsTrigger value="checklist" className="gap-1 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Checklist
                    <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">
                      {selectedJourney.tasks.filter(t => t.status === 'completed').length}/{selectedJourney.tasks.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="gap-1 text-xs">
                    <FolderOpen className="h-3.5 w-3.5" /> Documents
                    <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">
                      {selectedJourney.documents.filter(d => d.status === 'collected').length}/{selectedJourney.documents.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="employee-setup" className="gap-1 text-xs">
                    <Settings className="h-3.5 w-3.5" /> Employee Setup
                  </TabsTrigger>
                </TabsList>

                {/* ═══ TAB 1: overview ═══ */}
                <TabsContent value="overview" className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold mb-1">Overall Progress</p>
                    <Progress value={getProgress(selectedJourney)} className="h-3" />
                    <p className="text-xs text-muted-foreground mt-1">{getProgress(selectedJourney)}% complete</p>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {PHASE_ORDER.map(phase => {
                      const phaseTasks = selectedJourney.tasks.filter(t => t.phase === phase);
                      const done = phaseTasks.filter(t => t.status === 'completed' || t.status === 'skipped').length;
                      const pct = phaseTasks.length > 0 ? Math.round((done / phaseTasks.length) * 100) : 0;
                      return (
                        <Card key={phase} className="cursor-pointer hover:border-violet-300"
                          onClick={() => { setPhaseFilter(phase); }}>
                          <CardContent className="p-3 space-y-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider">{PHASE_LABELS[phase]}</p>
                            <Progress value={pct} className="h-1.5" />
                            <p className="text-[10px] text-muted-foreground">{done}/{phaseTasks.length} tasks</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Orientation Date</Label>
                      <SmartDateInput value={selectedJourney.orientationDate} onChange={v => {
                        saveJourneys(journeys.map(j => j.id !== selectedJourney.id ? j : {
                          ...j, orientationDate: v, updated_at: new Date().toISOString(),
                        }));
                      }} />
                    </div>
                    <div>
                      <Label className="text-xs">Notes</Label>
                      <Textarea
                        value={selectedJourney.notes}
                        rows={3}
                        onChange={e => {
                          const val = e.target.value;
                          saveJourneys(journeys.map(j => j.id !== selectedJourney.id ? j : {
                            ...j, notes: val, updated_at: new Date().toISOString(),
                          }));
                        }}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* ═══ TAB 2: checklist ═══ */}
                <TabsContent value="checklist" className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold mr-1">Phase:</p>
                    {(['all', ...PHASE_ORDER] as const).map(p => (
                      <Button key={p} size="sm" variant={phaseFilter === p ? 'default' : 'outline'}
                        className="h-6 text-[10px] px-2"
                        onClick={() => setPhaseFilter(p)}>
                        {p === 'all' ? 'All' : PHASE_LABELS[p]}
                      </Button>
                    ))}
                    <Separator orientation="vertical" className="h-4 mx-1" />
                    <p className="text-xs font-semibold mr-1">Owner:</p>
                    {['all', 'HR', 'IT', 'Manager', 'Employee'].map(o => (
                      <Button key={o} size="sm" variant={ownerFilter === o ? 'default' : 'outline'}
                        className="h-6 text-[10px] px-2"
                        onClick={() => setOwnerFilter(o)}>
                        {o === 'all' ? 'All' : o}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {selectedJourney.tasks
                      .filter(t => phaseFilter === 'all' || t.phase === phaseFilter)
                      .filter(t => ownerFilter === 'all' || t.owner === ownerFilter)
                      .map(task => (
                        <Card key={task.id} className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">{TASK_STATUS_ICONS[task.status]}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{task.title}</span>
                                <Badge variant="outline" className={`text-[9px] ${OWNER_COLORS[task.owner] || ''}`}>{task.owner}</Badge>
                                {task.isMandatory && (
                                  <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-700 border-red-500/30">Required</Badge>
                                )}
                                <Badge variant="outline" className="text-[9px]">{PHASE_LABELS[task.phase]}</Badge>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{task.description}</p>
                              {task.notes && <p className="text-[10px] text-muted-foreground mt-1 italic">📝 {task.notes}</p>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {task.status !== 'completed' && (
                                <Button size="sm" variant="ghost" className="h-6 text-[10px] text-green-600 px-1.5"
                                  onClick={() => toggleTask(selectedJourney.id, task.id, 'completed')}>
                                  <Check className="h-3 w-3 mr-0.5" /> Complete
                                </Button>
                              )}
                              {task.status !== 'in_progress' && task.status !== 'completed' && (
                                <Button size="sm" variant="ghost" className="h-6 text-[10px] text-amber-600 px-1.5"
                                  onClick={() => toggleTask(selectedJourney.id, task.id, 'in_progress')}>
                                  <Clock className="h-3 w-3 mr-0.5" /> In Progress
                                </Button>
                              )}
                              {task.status !== 'skipped' && task.status !== 'completed' && (
                                <Button size="sm" variant="ghost" className="h-6 text-[10px] text-slate-500 px-1.5"
                                  onClick={() => toggleTask(selectedJourney.id, task.id, 'skipped')}>
                                  Skip
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5"
                                onClick={() => openTaskSheet(task)}>
                                Edit Notes
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>
                </TabsContent>

                {/* ═══ TAB 3: documents ═══ */}
                <TabsContent value="documents" className="space-y-3">
                  {(() => {
                    const collected = selectedJourney.documents.filter(d => d.status === 'collected').length;
                    const total = selectedJourney.documents.length;
                    const pending = selectedJourney.documents.filter(d => d.status === 'pending').length;
                    return (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{collected}</span> collected / {total} required — <span className="font-semibold text-amber-600">{pending}</span> pending
                      </p>
                    );
                  })()}

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Document Name</TableHead>
                        <TableHead className="text-xs">Mandatory</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Collected Date</TableHead>
                        <TableHead className="text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedJourney.documents.map(doc => (
                        <TableRow key={doc.id} className={doc.isMandatory && doc.status === 'pending' ? 'bg-amber-500/5' : ''}>
                          <TableCell className="text-xs font-medium">{doc.docName}</TableCell>
                          <TableCell>
                            {doc.isMandatory
                              ? <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-700 border-red-500/30">Yes</Badge>
                              : <span className="text-xs text-muted-foreground">No</span>
                            }
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[9px] ${DOC_STATUS_COLORS[doc.status]}`}>{doc.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {doc.collectedDate ? format(parseISO(doc.collectedDate), 'dd MMM yyyy') : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {doc.status === 'pending' && (
                                <>
                                  <Button size="sm" variant="ghost" className="h-6 text-[10px] text-green-600 px-1.5"
                                    onClick={() => toggleDoc(selectedJourney.id, doc.id, 'collected')}>
                                    <Check className="h-3 w-3 mr-0.5" /> Collected
                                  </Button>
                                  {!doc.isMandatory && (
                                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-slate-500 px-1.5"
                                      onClick={() => toggleDoc(selectedJourney.id, doc.id, 'waived')}>
                                      Waive
                                    </Button>
                                  )}
                                </>
                              )}
                              {(doc.status === 'collected' || doc.status === 'waived') && (
                                <Button size="sm" variant="ghost" className="h-6 text-[10px] text-amber-600 px-1.5"
                                  onClick={() => toggleDoc(selectedJourney.id, doc.id, 'pending')}>
                                  Revert
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                {/* ═══ TAB 4: employee-setup ═══ */}
                <TabsContent value="employee-setup" className="space-y-4">
                  <h3 className="font-bold text-sm">HRMS Employee Record Setup</h3>
                  <Card>
                    <CardContent className="p-4 text-xs text-muted-foreground">
                      Once all Day-1 tasks and documents are collected, create the employee's HRMS record.
                      This will generate their Employee Code and enable payroll processing.
                    </CardContent>
                  </Card>

                  {/* Pre-flight checklist */}
                  {(() => {
                    const joiningSet = !!selectedJourney.joiningDate;
                    const offerSet = selectedJourney.offerAmount > 0;
                    const mandatoryDocsCollected = selectedJourney.documents
                      .filter(d => d.isMandatory)
                      .every(d => d.status === 'collected');
                    const day1Tasks = selectedJourney.tasks.filter(t => t.phase === 'day_1');
                    const day1Complete = day1Tasks.length > 0 && day1Tasks.every(t => t.status === 'completed' || t.status === 'skipped');
                    const allPassed = joiningSet && offerSet && mandatoryDocsCollected && day1Complete;

                    const checks = [
                      { label: 'Joining date set', ok: joiningSet },
                      { label: 'Offer amount > 0', ok: offerSet },
                      { label: 'All mandatory documents collected', ok: mandatoryDocsCollected },
                      { label: 'Day-1 checklist 100% complete', ok: day1Complete },
                    ];

                    return (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          {checks.map(c => (
                            <div key={c.label} className="flex items-center gap-2 text-xs">
                              {c.ok
                                ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                                : <AlertTriangle className="h-4 w-4 text-amber-500" />
                              }
                              <span className={c.ok ? 'text-foreground' : 'text-muted-foreground'}>{c.label}</span>
                            </div>
                          ))}
                        </div>

                        {selectedJourney.employeeCreated ? (
                          <Card className="border-green-500/30 bg-green-500/5">
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                <span className="font-bold text-sm text-green-700">Employee record created!</span>
                              </div>
                              <p className="text-xs">Employee Code: <span className="font-mono font-bold">{selectedJourney.employeeCode}</span></p>
                              <Button size="sm" variant="outline" className="text-xs h-7"
                                onClick={() => {
                                  window.dispatchEvent(new CustomEvent('ph-navigate', { detail: 'ph-employees' }));
                                }}>
                                View in Employee Master →
                              </Button>
                            </CardContent>
                          </Card>
                        ) : (
                          <div>
                            {!allPassed && (
                              <p className="text-[10px] text-amber-600 mb-2 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Complete pre-flight checks before creating employee record
                              </p>
                            )}
                            <Button data-primary disabled={selectedJourney.employeeCreated}
                              onClick={() => createEmployeeFromJourney(selectedJourney)}>
                              <UserPlus className="h-4 w-4 mr-1" /> Create Employee Record
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Journey Creation Sheet ═══ */}
      <Sheet open={journeySheetOpen} onOpenChange={v => { if (!v) { setJourneySheetOpen(false); setJourneyForm(BLANK_JOURNEY_FORM); } }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>New Onboarding Journey</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4" data-keyboard-form>
            <div className="flex items-center gap-2">
              <Switch checked={populateFromRecruitment} onCheckedChange={setPopulateFromRecruitment} />
              <Label className="text-xs">Populate from Recruitment</Label>
            </div>

            {populateFromRecruitment && joinedCandidates.length > 0 && (
              <div>
                <Label className="text-xs">Select Candidate</Label>
                <Select value={journeyForm.candidateAppId} onValueChange={v => {
                  const c = joinedCandidates.find(a => a.id === v);
                  if (c) {
                    jf('candidateAppId', c.id);
                    jf('candidateName', c.candidateName);
                    jf('jobTitle', c.jobTitle);
                    jf('joiningDate', c.joiningDate || '');
                    jf('offerAmount', c.offerAmount || 0);
                  }
                }}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select joined candidate" /></SelectTrigger>
                  <SelectContent>
                    {joinedCandidates.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.appCode} — {c.candidateName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-xs">Candidate Name *</Label>
              <Input value={journeyForm.candidateName} onChange={e => jf('candidateName', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Job Title</Label>
              <Input value={journeyForm.jobTitle} onChange={e => jf('jobTitle', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Department</Label>
              <Input value={journeyForm.departmentName} onChange={e => jf('departmentName', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Joining Date *</Label>
              <SmartDateInput value={journeyForm.joiningDate} onChange={v => jf('joiningDate', v)} />
            </div>
            <div>
              <Label className="text-xs">Reporting Manager</Label>
              <Input value={journeyForm.reportingManagerName} onChange={e => jf('reportingManagerName', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Offer / Annual CTC (₹)</Label>
              <Input {...amountInputProps} value={journeyForm.offerAmount || ''} onChange={e => jf('offerAmount', parseFloat(e.target.value) || 0)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Orientation Date</Label>
              <SmartDateInput value={journeyForm.orientationDate} onChange={v => jf('orientationDate', v)} />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={journeyForm.notes} onChange={e => jf('notes', e.target.value)} rows={3} />
            </div>
          </div>
          <SheetFooter>
            <Button data-primary onClick={handleJourneySave}>Create Journey</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══ Task Edit Sheet ═══ */}
      <Sheet open={taskSheetOpen} onOpenChange={v => { if (!v) { setTaskSheetOpen(false); setEditTask(null); } }}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Edit Task — {editTask?.title}</SheetTitle></SheetHeader>
          {editTask && (
            <div className="space-y-3 py-4" data-keyboard-form>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{PHASE_LABELS[editTask.phase]}</Badge>
                <Badge variant="outline" className={`text-[10px] ${OWNER_COLORS[editTask.owner] || ''}`}>{editTask.owner}</Badge>
                {editTask.isMandatory && (
                  <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-700 border-red-500/30">Required</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{editTask.description}</p>
              <Separator />
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea value={taskNotes} onChange={e => setTaskNotes(e.target.value)} rows={4} />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={taskStatus} onValueChange={v => setTaskStatus(v as TaskStatus)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="skipped">Skipped</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {taskStatus === 'completed' && (
                <p className="text-xs text-muted-foreground">Completed by: HR Admin</p>
              )}
            </div>
          )}
          <SheetFooter>
            <Button data-primary onClick={handleTaskSave}>Save Task</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function Onboarding() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <ERPHeader breadcrumbs={[{ label: 'Operix Core', href: '/erp/dashboard' }, { label: 'Pay Hub' }, { label: 'Onboarding' }]} showDatePicker={false} showCompany={false} />
        <div className="flex-1 overflow-auto p-6"><OnboardingPanel /></div>
      </div>
    </SidebarProvider>
  );
}
