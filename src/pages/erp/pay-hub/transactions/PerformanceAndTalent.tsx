import React, { useState, useMemo, useCallback } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Separator } from '@/components/ui/separator';
import { Star, Grid3X3, Users, TrendingUp, Plus, Check, ChevronUp, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AppraisalCycle, PerformanceReview, KRAItem, SuccessionPlan,
  SuccessionEntry, CompensationAction, PerformanceTab, ReviewStatus,
  ReadinessLevel, CompActionType, CycleStatus } from '@/types/performance';
import { APPRAISAL_CYCLES_KEY, PERF_REVIEWS_KEY, SUCCESSION_PLANS_KEY, COMP_ACTIONS_KEY,
  REVIEW_STATUS_COLORS, READINESS_LABELS, READINESS_COLORS, get9BoxPosition } from '@/types/performance';
import type { Employee } from '@/types/employee';
import type { PayGrade } from '@/types/pay-hub';
import { EMPLOYEES_KEY } from '@/types/employee';
import { PAY_GRADES_KEY } from '@/types/pay-hub';
import { toIndianFormat, amountInputProps, onEnterNext, useCtrlS } from '@/lib/keyboard';

interface PerformanceAndTalentPanelProps { defaultTab?: PerformanceTab; }

export function PerformanceAndTalentPanel({ defaultTab = 'reviews' }: PerformanceAndTalentPanelProps) {

  // ── Cross-module reads ───────────────────────────────────────
  const activeEmployees = useMemo<Employee[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/employees
      const raw = localStorage.getItem(EMPLOYEES_KEY);
      if (raw) return (JSON.parse(raw) as Employee[]).filter(e => e.status === 'active');
    } catch { /* ignore */ }
    return [];
  }, []);

  const payGrades = useMemo<PayGrade[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/masters/pay-grades
      const raw = localStorage.getItem(PAY_GRADES_KEY);
      if (raw) return (JSON.parse(raw) as PayGrade[]).filter(g => g.status === 'active');
    } catch { /* ignore */ }
    return [];
  }, []);

  // ── Appraisal Cycles state ───────────────────────────────────
  const [cycles, setCycles] = useState<AppraisalCycle[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/performance/cycles
      const raw = localStorage.getItem(APPRAISAL_CYCLES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveCycles = (items: AppraisalCycle[]) => {
    // [JWT] PUT /api/pay-hub/performance/cycles
    localStorage.setItem(APPRAISAL_CYCLES_KEY, JSON.stringify(items));
    setCycles(items);
  };

  // ── Performance Reviews state ────────────────────────────────
  const [reviews, setReviews] = useState<PerformanceReview[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/performance/reviews
      const raw = localStorage.getItem(PERF_REVIEWS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveReviews = (items: PerformanceReview[]) => {
    // [JWT] PUT /api/pay-hub/performance/reviews
    localStorage.setItem(PERF_REVIEWS_KEY, JSON.stringify(items));
    setReviews(items);
  };

  // ── Succession Plans state ───────────────────────────────────
  const [succPlans, setSuccPlans] = useState<SuccessionPlan[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/performance/succession
      const raw = localStorage.getItem(SUCCESSION_PLANS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveSuccPlans = (items: SuccessionPlan[]) => {
    // [JWT] PUT /api/pay-hub/performance/succession
    localStorage.setItem(SUCCESSION_PLANS_KEY, JSON.stringify(items));
    setSuccPlans(items);
  };

  // ── Compensation Actions state ────────────────────────────────
  const [compActions, setCompActions] = useState<CompensationAction[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/performance/comp-actions
      const raw = localStorage.getItem(COMP_ACTIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveCompActions = (items: CompensationAction[]) => {
    // [JWT] PUT /api/pay-hub/performance/comp-actions
    localStorage.setItem(COMP_ACTIONS_KEY, JSON.stringify(items));
    setCompActions(items);
  };

  // ── Active cycle selector ─────────────────────────────────────
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const activeCycle = cycles.find(c => c.id === selectedCycleId)
    || cycles.find(c => c.status === 'active')
    || cycles[0]
    || null;

  // ── Cycle Sheet ───────────────────────────────────────────────
  const [cycleSheetOpen, setCycleSheetOpen] = useState(false);
  const BLANK_CYCLE = {
    name: '', type: 'Annual', financialYear: '', startDate: '',
    endDate: '', ratingScale: 5, status: 'draft' as CycleStatus,
  };
  const [cycleForm, setCycleForm] = useState(BLANK_CYCLE);

  const handleCycleSave = useCallback(() => {
    if (!cycleSheetOpen) return;
    if (!cycleForm.name.trim()) return toast.error('Cycle name required');
    if (!cycleForm.startDate || !cycleForm.endDate) return toast.error('Date range required');
    const now = new Date().toISOString();
    const code = `AC-${String(cycles.length + 1).padStart(6,'0')}`;
    saveCycles([...cycles, { ...cycleForm, id: `ac-${Date.now()}`, cycleCode: code, created_at: now, updated_at: now }]);
    toast.success('Appraisal cycle created');
    setCycleSheetOpen(false); setCycleForm(BLANK_CYCLE);
  }, [cycleSheetOpen, cycleForm, cycles]);

  // ── Review Sheet ──────────────────────────────────────────────
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  const [reviewEditId, setReviewEditId] = useState<string|null>(null);
  const BLANK_REVIEW = {
    cycleId: activeCycle?.id || '', cycleName: activeCycle?.name || '',
    employeeId: '', employeeCode: '', employeeName: '', designation: '',
    departmentName: '', managerId: '', managerName: '',
    kras: [] as KRAItem[],
    selfRatingOverall: 0, managerRatingOverall: 0, hrRatingFinal: 0,
    performanceScore: 0, potentialScore: 2,
    selfComments: '', managerComments: '', hrComments: '',
    developmentAreas: '', status: 'draft' as ReviewStatus,
  };
  const [reviewForm, setReviewForm] = useState(BLANK_REVIEW);
  const ruf = <K extends keyof typeof BLANK_REVIEW>(k:K, v:(typeof BLANK_REVIEW)[K]) =>
    setReviewForm(prev => ({...prev,[k]:v}));

  const handleReviewSave = useCallback(() => {
    if (!reviewSheetOpen) return;
    if (!reviewForm.employeeId) return toast.error('Select an employee');
    if (!reviewForm.cycleId) return toast.error('Select an appraisal cycle');
    const now = new Date().toISOString();
    if (reviewEditId) {
      saveReviews(reviews.map(r => r.id !== reviewEditId ? r : { ...r, ...reviewForm, updated_at: now }));
    } else {
      const code = `PR-${String(reviews.length + 1).padStart(6,'0')}`;
      saveReviews([...reviews, { ...reviewForm, id: `pr-${Date.now()}`, reviewCode: code, created_at: now, updated_at: now }]);
    }
    toast.success('Review saved');
    setReviewSheetOpen(false); setReviewEditId(null); setReviewForm(BLANK_REVIEW);
  }, [reviewSheetOpen, reviewForm, reviewEditId, reviews, activeCycle]);

  // ── Succession Sheet ──────────────────────────────────────────
  const [succSheetOpen, setSuccSheetOpen] = useState(false);
  const [succEditId, setSuccEditId] = useState<string|null>(null);
  const BLANK_SUCC = {
    targetRoleTitle: '', targetDepartment: '', currentHolderId: '',
    currentHolderName: '', riskLevel: 'High',
    successors: [] as SuccessionEntry[], notes: '',
  };
  const [succForm, setSuccForm] = useState(BLANK_SUCC);

  const handleSuccSave = useCallback(() => {
    if (!succSheetOpen) return;
    if (!succForm.targetRoleTitle.trim()) return toast.error('Target role title required');
    const now = new Date().toISOString();
    if (succEditId) {
      saveSuccPlans(succPlans.map(s => s.id !== succEditId ? s : { ...s, ...succForm, updated_at: now }));
    } else {
      const code = `SP-${String(succPlans.length + 1).padStart(6,'0')}`;
      saveSuccPlans([...succPlans, { ...succForm, id: `sp-${Date.now()}`, planCode: code, created_at: now, updated_at: now }]);
    }
    toast.success('Succession plan saved');
    setSuccSheetOpen(false); setSuccEditId(null); setSuccForm(BLANK_SUCC);
  }, [succSheetOpen, succForm, succEditId, succPlans]);

  // ── Compensation Action Sheet ─────────────────────────────────
  const [compSheetOpen, setCompSheetOpen] = useState(false);
  const BLANK_COMP = {
    actionType: 'increment' as CompActionType, employeeId: '', employeeCode: '',
    employeeName: '', effectiveDate: '', oldCTC: 0, newCTC: 0, pctChange: 0,
    oldGradeId: '', oldGradeName: '', newGradeId: '', newGradeName: '',
    oldDesignation: '', newDesignation: '', linkedReviewId: '',
    reason: '', approvedBy: '', status: 'pending' as const,
  };
  const [compForm, setCompForm] = useState(BLANK_COMP);
  const cuf = <K extends keyof typeof BLANK_COMP>(k:K, v:(typeof BLANK_COMP)[K]) =>
    setCompForm(prev => ({...prev,[k]:v}));

  const handleCompSave = useCallback(() => {
    if (!compSheetOpen) return;
    if (!compForm.employeeId) return toast.error('Select an employee');
    if (!compForm.effectiveDate) return toast.error('Effective date required');
    if (compForm.newCTC <= 0) return toast.error('New CTC must be greater than 0');
    const pctChange = compForm.oldCTC > 0
      ? Math.round(((compForm.newCTC - compForm.oldCTC) / compForm.oldCTC) * 1000) / 10
      : 0;
    const now = new Date().toISOString();
    const code = `CA-${String(compActions.length + 1).padStart(6,'0')}`;
    saveCompActions([...compActions, {
      ...compForm, pctChange, id: `ca-${Date.now()}`, actionCode: code,
      created_at: now, updated_at: now,
    }]);
    toast.success('Compensation action created');
    setCompSheetOpen(false); setCompForm(BLANK_COMP);
  }, [compSheetOpen, compForm, compActions]);

  // ── Apply compensation action → write-back to employee record ─
  const applyCompAction = (action: CompensationAction) => {
    try {
      // [JWT] GET /api/pay-hub/employees
      const raw = localStorage.getItem(EMPLOYEES_KEY);
      if (!raw) return;
      const emps: Employee[] = JSON.parse(raw);
      const updated = emps.map(e => {
        if (e.id !== action.employeeId) return e;
        const revision = {
          id: `rev-${Date.now()}`,
          revisionDate: action.effectiveDate,
          oldCTC: action.oldCTC,
          newCTC: action.newCTC,
          pctChange: action.pctChange,
          reason: `${action.actionType}: ${action.reason}`,
          revisedBy: action.approvedBy || 'HR Admin',
        };
        return {
          ...e,
          annualCTC: action.newCTC,
          designation: action.newDesignation || e.designation,
          gradeId: action.newGradeId || e.gradeId,
          gradeName: action.newGradeName || e.gradeName,
          salaryRevisions: [...e.salaryRevisions, revision],
          ctcEffectiveFrom: action.effectiveDate,
          updated_at: new Date().toISOString(),
        };
      });
      // [JWT] PUT /api/pay-hub/employees
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(updated));
      saveCompActions(compActions.map(a => a.id !== action.id ? a : {
        ...a, status: 'applied' as const, updated_at: new Date().toISOString(),
      }));
      toast.success(`Compensation applied for ${action.employeeName}`);
    } catch {
      toast.error('Failed to apply compensation action');
    }
  };

  // ── masterSave ────────────────────────────────────────────────
  const masterSave = useCallback(() => {
    if (cycleSheetOpen)  { handleCycleSave(); return; }
    if (reviewSheetOpen) { handleReviewSave(); return; }
    if (succSheetOpen)   { handleSuccSave(); return; }
    if (compSheetOpen)   { handleCompSave(); return; }
  }, [cycleSheetOpen, reviewSheetOpen, succSheetOpen, compSheetOpen,
    handleCycleSave, handleReviewSave, handleSuccSave, handleCompSave]);
  const isFormActive = true;
  useCtrlS(isFormActive ? masterSave : () => {});

  // ── Filters ───────────────────────────────────────────────────
  const [reviewStatusFilter, setReviewStatusFilter] = useState('all');
  const [reviewDeptFilter, setReviewDeptFilter] = useState('');
  const [expandedReviewId, setExpandedReviewId] = useState<string|null>(null);
  const [expandedSuccId, setExpandedSuccId] = useState<string|null>(null);
  const [compTypeFilter, setCompTypeFilter] = useState('all');
  const [compStatusFilter, setCompStatusFilter] = useState('all');
  const [selected9BoxCell, setSelected9BoxCell] = useState<{row:number;col:number}|null>(null);

  const filteredReviews = useMemo(() => {
    let items = reviews;
    if (reviewStatusFilter !== 'all') items = items.filter(r => r.status === reviewStatusFilter);
    if (reviewDeptFilter) items = items.filter(r => r.departmentName.toLowerCase().includes(reviewDeptFilter.toLowerCase()));
    return items;
  }, [reviews, reviewStatusFilter, reviewDeptFilter]);

  const filteredComp = useMemo(() => {
    let items = compActions;
    if (compTypeFilter !== 'all') items = items.filter(a => a.actionType === compTypeFilter);
    if (compStatusFilter !== 'all') items = items.filter(a => a.status === compStatusFilter);
    return items;
  }, [compActions, compTypeFilter, compStatusFilter]);

  // ── 9-Box data ────────────────────────────────────────────────
  const completedReviews = useMemo(() => reviews.filter(r => r.status === 'completed'), [reviews]);
  const latestReviewByEmp = useMemo(() => {
    const map = new Map<string, PerformanceReview>();
    completedReviews.forEach(r => {
      const existing = map.get(r.employeeId);
      if (!existing || r.updated_at > existing.updated_at) map.set(r.employeeId, r);
    });
    return map;
  }, [completedReviews]);

  const nineBoxData = useMemo(() => {
    const grid: Record<string, { review: PerformanceReview; label: string }[]> = {};
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) grid[`${r}-${c}`] = [];
    latestReviewByEmp.forEach(rev => {
      const pos = get9BoxPosition(rev.performanceScore, rev.potentialScore);
      grid[`${pos.row}-${pos.col}`].push({ review: rev, label: pos.label });
    });
    return grid;
  }, [latestReviewByEmp]);

  const notAssessedEmployees = useMemo(() => {
    return activeEmployees.filter(e => !latestReviewByEmp.has(e.id));
  }, [activeEmployees, latestReviewByEmp]);

  // ── Review status advance ─────────────────────────────────────
  const REVIEW_FLOW: ReviewStatus[] = ['draft','self_review','manager_review','hr_review','completed'];
  const advanceReview = (r: PerformanceReview) => {
    const idx = REVIEW_FLOW.indexOf(r.status);
    if (idx < REVIEW_FLOW.length - 1) {
      saveReviews(reviews.map(rv => rv.id !== r.id ? rv : { ...rv, status: REVIEW_FLOW[idx+1], updated_at: new Date().toISOString() }));
      toast.success(`Review advanced to ${REVIEW_FLOW[idx+1].replace(/_/g,' ')}`);
    }
  };

  // ── KRA helpers ───────────────────────────────────────────────
  const addKRA = () => {
    const kra: KRAItem = { id: `kra-${Date.now()}`, kra: '', metric: '', weightage: 0, targetValue: '', actualValue: '', selfRating: 0, managerRating: 0 };
    ruf('kras', [...reviewForm.kras, kra]);
  };
  const updateKRA = (id: string, field: keyof KRAItem, val: string | number) => {
    ruf('kras', reviewForm.kras.map(k => k.id !== id ? k : { ...k, [field]: val }));
  };
  const removeKRA = (id: string) => {
    ruf('kras', reviewForm.kras.filter(k => k.id !== id));
  };
  const kraWeightTotal = reviewForm.kras.reduce((s, k) => s + (k.weightage || 0), 0);

  // ── Succession successor helpers ──────────────────────────────
  const addSuccessor = () => {
    const s: SuccessionEntry = { id: `se-${Date.now()}`, successorId: '', successorCode: '', successorName: '', readiness: 'ready_1yr', notes: '' };
    setSuccForm(prev => ({ ...prev, successors: [...prev.successors, s] }));
  };
  const updateSuccessor = (id: string, field: keyof SuccessionEntry, val: string) => {
    setSuccForm(prev => ({ ...prev, successors: prev.successors.map(s => s.id !== id ? s : { ...s, [field]: val }) }));
  };
  const removeSuccessor = (id: string) => {
    setSuccForm(prev => ({ ...prev, successors: prev.successors.filter(s => s.id !== id) }));
  };

  // ── Star renderer ─────────────────────────────────────────────
  const renderStars = (score: number, max = 5) => (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} className={`h-3 w-3 ${i < Math.round(score) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );

  const potentialLabel = (s: number) => s <= 1 ? 'Low' : s <= 2 ? 'Medium' : 'High';
  const potentialColor = (s: number) => s <= 1 ? 'bg-red-500/10 text-red-700' : s <= 2 ? 'bg-amber-500/10 text-amber-700' : 'bg-green-500/10 text-green-700';

  // ── 9-Box cell colors ─────────────────────────────────────────
  const CELL_COLORS: Record<string, string> = {
    '0-0': 'bg-red-500/20', '0-1': 'bg-amber-500/20', '0-2': 'bg-amber-500/20',
    '1-0': 'bg-red-500/20', '1-1': 'bg-yellow-500/20', '1-2': 'bg-green-500/20',
    '2-0': 'bg-red-500/20', '2-1': 'bg-green-500/20', '2-2': 'bg-green-500/20',
  };
  const CELL_LABELS: Record<string, string> = {
    '0-0': 'Inconsistent Player', '0-1': 'Core Player', '0-2': 'High Professional',
    '1-0': 'Under Performer', '1-1': 'Key Player', '1-2': 'Rising Star',
    '2-0': 'Risk', '2-1': 'Solid Performer', '2-2': 'Star',
  };

  const compPctLive = compForm.oldCTC > 0 ? Math.round(((compForm.newCTC - compForm.oldCTC) / compForm.oldCTC) * 1000) / 10 : 0;

  return (
    <div className="space-y-4" data-keyboard-form>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
          <Star className="h-5 w-5 text-violet-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Performance & Talent</h2>
          <p className="text-xs text-muted-foreground">Reviews · 9-Box Grid · Succession · Compensation</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{reviews.length}</p><p className="text-[10px] text-muted-foreground">Active Reviews</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{cycles.length}</p><p className="text-[10px] text-muted-foreground">Appraisal Cycles</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{succPlans.length}</p><p className="text-[10px] text-muted-foreground">Succession Plans</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{compActions.filter(a => a.status === 'pending').length}</p><p className="text-[10px] text-muted-foreground">Pending Comp Actions</p></CardContent></Card>
      </div>

      {/* Cycle selector */}
      <div className="flex items-center gap-3">
        <Select value={activeCycle?.id || ''} onValueChange={setSelectedCycleId}>
          <SelectTrigger className="w-64 h-8 text-xs"><SelectValue placeholder="Select Appraisal Cycle" /></SelectTrigger>
          <SelectContent>{cycles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setCycleForm(BLANK_CYCLE); setCycleSheetOpen(true); }}>
          <Plus className="h-3 w-3 mr-1" /> New Cycle
        </Button>
      </div>
      {activeCycle && (
        <div className="bg-violet-500/10 border border-violet-500/30 rounded-md px-3 py-1.5 text-xs text-violet-700 dark:text-violet-300">
          Active: <strong>{activeCycle.name}</strong> — ends {activeCycle.endDate || 'TBD'}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="h-9">
          <TabsTrigger value="reviews" className="text-xs gap-1"><Star className="h-3 w-3" /> Performance Reviews</TabsTrigger>
          <TabsTrigger value="9box" className="text-xs gap-1"><Grid3X3 className="h-3 w-3" /> 9-Box Grid</TabsTrigger>
          <TabsTrigger value="succession" className="text-xs gap-1"><Users className="h-3 w-3" /> Succession Planning</TabsTrigger>
          <TabsTrigger value="compensation" className="text-xs gap-1"><TrendingUp className="h-3 w-3" /> Compensation Actions</TabsTrigger>
        </TabsList>

        {/* ════════ TAB: Reviews ════════ */}
        <TabsContent value="reviews" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={reviewStatusFilter} onValueChange={setReviewStatusFilter}>
                <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="self_review">Self Review</SelectItem>
                  <SelectItem value="manager_review">Manager Review</SelectItem>
                  <SelectItem value="hr_review">HR Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Filter by department…" value={reviewDeptFilter} onChange={e => setReviewDeptFilter(e.target.value)} className="h-8 text-xs w-48" onKeyDown={onEnterNext} />
            </div>
            <Button size="sm" className="h-8 text-xs" onClick={() => { setReviewEditId(null); setReviewForm({ ...BLANK_REVIEW, cycleId: activeCycle?.id || '', cycleName: activeCycle?.name || '' }); setReviewSheetOpen(true); }}>
              <Plus className="h-3 w-3 mr-1" /> New Review
            </Button>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs">Review Code</TableHead>
              <TableHead className="text-xs">Employee</TableHead>
              <TableHead className="text-xs">Dept</TableHead>
              <TableHead className="text-xs">Cycle</TableHead>
              <TableHead className="text-xs">Performance</TableHead>
              <TableHead className="text-xs">Potential</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filteredReviews.map(r => (
                <React.Fragment key={r.id}>
                  <TableRow className="cursor-pointer hover:bg-muted/40" onClick={() => setExpandedReviewId(expandedReviewId === r.id ? null : r.id)}>
                    <TableCell className="text-xs font-mono">{r.reviewCode}</TableCell>
                    <TableCell className="text-xs">{r.employeeName}</TableCell>
                    <TableCell className="text-xs">{r.departmentName}</TableCell>
                    <TableCell className="text-xs">{r.cycleName}</TableCell>
                    <TableCell className="text-xs"><div className="flex items-center gap-1">{renderStars(r.performanceScore)} <span>{r.performanceScore}/5</span></div></TableCell>
                    <TableCell className="text-xs"><Badge variant="outline" className={potentialColor(r.potentialScore)}>{potentialLabel(r.potentialScore)}</Badge></TableCell>
                    <TableCell className="text-xs"><Badge variant="outline" className={REVIEW_STATUS_COLORS[r.status]}>{r.status.replace(/_/g,' ')}</Badge></TableCell>
                    <TableCell className="text-xs" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                          setReviewEditId(r.id);
                          setReviewForm({ cycleId: r.cycleId, cycleName: r.cycleName, employeeId: r.employeeId, employeeCode: r.employeeCode, employeeName: r.employeeName, designation: r.designation, departmentName: r.departmentName, managerId: r.managerId, managerName: r.managerName, kras: r.kras, selfRatingOverall: r.selfRatingOverall, managerRatingOverall: r.managerRatingOverall, hrRatingFinal: r.hrRatingFinal, performanceScore: r.performanceScore, potentialScore: r.potentialScore, selfComments: r.selfComments, managerComments: r.managerComments, hrComments: r.hrComments, developmentAreas: r.developmentAreas, status: r.status });
                          setReviewSheetOpen(true);
                        }}><Edit className="h-3 w-3" /></Button>
                        {r.status !== 'completed' && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-600" onClick={() => advanceReview(r)}>
                            <ChevronUp className="h-3 w-3 mr-0.5" /> Advance
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedReviewId === r.id && r.kras.length > 0 && (
                    <TableRow><TableCell colSpan={8} className="bg-muted/20 px-4 py-2">
                      <p className="text-xs font-semibold mb-1">KRAs — {r.employeeName}</p>
                      <Table><TableHeader><TableRow>
                        <TableHead className="text-[10px]">KRA</TableHead>
                        <TableHead className="text-[10px]">Weight %</TableHead>
                        <TableHead className="text-[10px]">Target</TableHead>
                        <TableHead className="text-[10px]">Actual</TableHead>
                        <TableHead className="text-[10px]">Self</TableHead>
                        <TableHead className="text-[10px]">Manager</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>{r.kras.map(k => (
                        <TableRow key={k.id}>
                          <TableCell className="text-[10px]">{k.kra}</TableCell>
                          <TableCell className="text-[10px]">{k.weightage}%</TableCell>
                          <TableCell className="text-[10px]">{k.targetValue}</TableCell>
                          <TableCell className="text-[10px]">{k.actualValue}</TableCell>
                          <TableCell className="text-[10px]">{k.selfRating}</TableCell>
                          <TableCell className="text-[10px]">{k.managerRating}</TableCell>
                        </TableRow>
                      ))}</TableBody></Table>
                    </TableCell></TableRow>
                  )}
                </React.Fragment>
              ))}
              {filteredReviews.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">No reviews found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ════════ TAB: 9-Box ════════ */}
        <TabsContent value="9box" className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Performance →</p>
            <div className="flex-1" />
          </div>
          <div className="flex gap-4">
            {/* Y-axis label */}
            <div className="flex flex-col justify-between items-center py-2">
              <span className="text-[10px] text-muted-foreground font-semibold writing-mode-vertical transform -rotate-180" style={{ writingMode: 'vertical-rl' }}>← POTENTIAL</span>
            </div>
            {/* 3×3 Grid */}
            <div className="flex-1">
              <div className="grid grid-cols-3 gap-0.5 text-center mb-1">
                <span className="text-[10px] text-muted-foreground">Low</span>
                <span className="text-[10px] text-muted-foreground">Medium</span>
                <span className="text-[10px] text-muted-foreground">High</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[0,1,2].map(row => [0,1,2].map(col => {
                  const key = `${row}-${col}`;
                  const items = nineBoxData[key] || [];
                  const isSelected = selected9BoxCell?.row === row && selected9BoxCell?.col === col;
                  return (
                    <div key={key}
                      className={`${CELL_COLORS[key]} border rounded-md p-2 min-h-[80px] cursor-pointer transition-all ${isSelected ? 'ring-2 ring-violet-500' : ''}`}
                      onClick={() => setSelected9BoxCell(isSelected ? null : { row, col })}
                    >
                      <p className="text-[10px] font-semibold mb-1">{CELL_LABELS[key]}</p>
                      <div className="flex flex-wrap gap-1">
                        {items.slice(0, 3).map(i => (
                          <Badge key={i.review.employeeId} variant="outline" className="text-[8px] px-1 py-0">{i.review.employeeCode}</Badge>
                        ))}
                        {items.length > 3 && <Badge variant="outline" className="text-[8px] px-1 py-0">+{items.length - 3}</Badge>}
                      </div>
                    </div>
                  );
                }))}
              </div>
              <div className="grid grid-cols-3 gap-0.5 text-center mt-1">
                <span className="text-[10px] text-muted-foreground">Low Perf</span>
                <span className="text-[10px] text-muted-foreground">Med Perf</span>
                <span className="text-[10px] text-muted-foreground">High Perf</span>
              </div>
              {/* Y-axis labels on the right */}
              <div className="absolute right-0 top-0 flex flex-col justify-between h-full py-2">
              </div>
            </div>
            {/* Y-axis right labels */}
            <div className="flex flex-col justify-around items-center py-2">
              <span className="text-[10px] text-muted-foreground">High</span>
              <span className="text-[10px] text-muted-foreground">Med</span>
              <span className="text-[10px] text-muted-foreground">Low</span>
            </div>
          </div>

          {/* Selected cell detail */}
          {selected9BoxCell && (
            <Card>
              <CardHeader className="py-2 px-3"><CardTitle className="text-sm">{CELL_LABELS[`${selected9BoxCell.row}-${selected9BoxCell.col}`]} — Employees</CardTitle></CardHeader>
              <CardContent className="px-3 pb-3">
                {(nineBoxData[`${selected9BoxCell.row}-${selected9BoxCell.col}`] || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No employees in this cell</p>
                ) : (
                  <div className="space-y-1">
                    {(nineBoxData[`${selected9BoxCell.row}-${selected9BoxCell.col}`] || []).map(i => (
                      <div key={i.review.employeeId} className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="font-mono text-[10px]">{i.review.employeeCode}</Badge>
                        <span>{i.review.employeeName}</span>
                        <span className="text-muted-foreground">— Perf: {i.review.performanceScore}/5, Potential: {potentialLabel(i.review.potentialScore)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Not Assessed */}
          {notAssessedEmployees.length > 0 && (
            <Card>
              <CardHeader className="py-2 px-3"><CardTitle className="text-sm">Not Assessed ({notAssessedEmployees.length})</CardTitle></CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="flex flex-wrap gap-1">
                  {notAssessedEmployees.map(e => (
                    <Badge key={e.id} variant="outline" className="text-[10px]">{e.empCode} — {e.displayName || `${e.firstName} ${e.lastName}`}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ════════ TAB: Succession ════════ */}
        <TabsContent value="succession" className="space-y-3">
          <div className="flex items-center justify-between">
            <Card className="flex-1 mr-3"><CardContent className="p-3 text-xs text-muted-foreground">Identify and develop successors for key/critical roles. Succession planning ensures business continuity.</CardContent></Card>
            <Button size="sm" className="h-8 text-xs" onClick={() => { setSuccEditId(null); setSuccForm(BLANK_SUCC); setSuccSheetOpen(true); }}>
              <Plus className="h-3 w-3 mr-1" /> New Plan
            </Button>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs">Plan Code</TableHead>
              <TableHead className="text-xs">Target Role</TableHead>
              <TableHead className="text-xs">Department</TableHead>
              <TableHead className="text-xs">Current Holder</TableHead>
              <TableHead className="text-xs">Risk</TableHead>
              <TableHead className="text-xs">Successors</TableHead>
              <TableHead className="text-xs">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {succPlans.map(s => (
                <React.Fragment key={s.id}>
                  <TableRow className="cursor-pointer hover:bg-muted/40" onClick={() => setExpandedSuccId(expandedSuccId === s.id ? null : s.id)}>
                    <TableCell className="text-xs font-mono">{s.planCode}</TableCell>
                    <TableCell className="text-xs font-semibold">{s.targetRoleTitle}</TableCell>
                    <TableCell className="text-xs">{s.targetDepartment}</TableCell>
                    <TableCell className="text-xs">{s.currentHolderName}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className={s.riskLevel === 'High' ? 'bg-red-500/10 text-red-700 border-red-500/30' : s.riskLevel === 'Medium' ? 'bg-amber-500/10 text-amber-700 border-amber-500/30' : 'bg-green-500/10 text-green-700 border-green-500/30'}>{s.riskLevel}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{s.successors.map(sc => sc.successorName).join(', ') || '—'}</TableCell>
                    <TableCell className="text-xs" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                        setSuccEditId(s.id);
                        setSuccForm({ targetRoleTitle: s.targetRoleTitle, targetDepartment: s.targetDepartment, currentHolderId: s.currentHolderId, currentHolderName: s.currentHolderName, riskLevel: s.riskLevel, successors: s.successors, notes: s.notes });
                        setSuccSheetOpen(true);
                      }}><Edit className="h-3 w-3" /></Button>
                    </TableCell>
                  </TableRow>
                  {expandedSuccId === s.id && s.successors.length > 0 && (
                    <TableRow><TableCell colSpan={7} className="bg-muted/20 px-4 py-2">
                      <p className="text-xs font-semibold mb-1">Successors</p>
                      <div className="space-y-1">
                        {s.successors.map(sc => (
                          <div key={sc.id} className="flex items-center gap-2 text-xs">
                            <span className="font-mono">{sc.successorCode}</span>
                            <span>{sc.successorName}</span>
                            <Badge variant="outline" className={READINESS_COLORS[sc.readiness]}>{READINESS_LABELS[sc.readiness]}</Badge>
                            {sc.notes && <span className="text-muted-foreground">— {sc.notes}</span>}
                          </div>
                        ))}
                      </div>
                    </TableCell></TableRow>
                  )}
                </React.Fragment>
              ))}
              {succPlans.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">No succession plans yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ════════ TAB: Compensation ════════ */}
        <TabsContent value="compensation" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={compTypeFilter} onValueChange={setCompTypeFilter}>
                <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="increment">Increment</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                  <SelectItem value="grade_change">Grade Change</SelectItem>
                  <SelectItem value="correction">Correction</SelectItem>
                </SelectContent>
              </Select>
              <Select value={compStatusFilter} onValueChange={setCompStatusFilter}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="h-8 text-xs" onClick={() => { setCompForm(BLANK_COMP); setCompSheetOpen(true); }}>
              <Plus className="h-3 w-3 mr-1" /> New Action
            </Button>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs">Action Code</TableHead>
              <TableHead className="text-xs">Employee</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Old CTC</TableHead>
              <TableHead className="text-xs">New CTC</TableHead>
              <TableHead className="text-xs">% Change</TableHead>
              <TableHead className="text-xs">Effective</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filteredComp.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs font-mono">{a.actionCode}</TableCell>
                  <TableCell className="text-xs">{a.employeeName}</TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className={a.actionType === 'increment' ? 'bg-blue-500/10 text-blue-700' : a.actionType === 'promotion' ? 'bg-violet-500/10 text-violet-700' : a.actionType === 'grade_change' ? 'bg-amber-500/10 text-amber-700' : 'bg-slate-500/10 text-slate-600'}>{a.actionType.replace(/_/g,' ')}</Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono">₹{toIndianFormat(a.oldCTC)}</TableCell>
                  <TableCell className="text-xs font-mono">₹{toIndianFormat(a.newCTC)}</TableCell>
                  <TableCell className={`text-xs font-mono ${a.pctChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>{a.pctChange >= 0 ? '+' : ''}{a.pctChange}%</TableCell>
                  <TableCell className="text-xs">{a.effectiveDate}</TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className={a.status === 'pending' ? 'bg-amber-500/10 text-amber-700' : a.status === 'approved' ? 'bg-blue-500/10 text-blue-700' : 'bg-green-500/10 text-green-700'}>{a.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1">
                      {a.status === 'pending' && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-600" onClick={() => {
                          saveCompActions(compActions.map(ca => ca.id !== a.id ? ca : { ...ca, status: 'approved' as const, updated_at: new Date().toISOString() }));
                          toast.success('Action approved');
                        }}><Check className="h-3 w-3 mr-0.5" /> Approve</Button>
                      )}
                      {a.status === 'approved' && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-green-600" onClick={() => applyCompAction(a)}>
                          Apply →
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredComp.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-8">No compensation actions found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* ═══════ CYCLE SHEET ═══════ */}
      <Sheet open={cycleSheetOpen} onOpenChange={setCycleSheetOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>New Appraisal Cycle</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4" data-keyboard-form>
            <div><Label className="text-xs">Cycle Name *</Label><Input className="h-8 text-xs" value={cycleForm.name} onChange={e => setCycleForm(p => ({ ...p, name: e.target.value }))} onKeyDown={onEnterNext} /></div>
            <div><Label className="text-xs">Type</Label>
              <Select value={cycleForm.type} onValueChange={v => setCycleForm(p => ({ ...p, type: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Annual">Annual</SelectItem>
                  <SelectItem value="Mid-Year">Mid-Year</SelectItem>
                  <SelectItem value="Probation">Probation</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Financial Year</Label><Input className="h-8 text-xs" placeholder="2025-26" value={cycleForm.financialYear} onChange={e => setCycleForm(p => ({ ...p, financialYear: e.target.value }))} onKeyDown={onEnterNext} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Start Date *</Label><SmartDateInput value={cycleForm.startDate} onChange={v => setCycleForm(p => ({ ...p, startDate: v }))} /></div>
              <div><Label className="text-xs">End Date *</Label><SmartDateInput value={cycleForm.endDate} onChange={v => setCycleForm(p => ({ ...p, endDate: v }))} /></div>
            </div>
            <div><Label className="text-xs">Rating Scale</Label>
              <Select value={String(cycleForm.ratingScale)} onValueChange={v => setCycleForm(p => ({ ...p, ratingScale: Number(v) }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3-Point</SelectItem>
                  <SelectItem value="5">5-Point</SelectItem>
                  <SelectItem value="10">10-Point</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Status</Label>
              <Select value={cycleForm.status} onValueChange={v => setCycleForm(p => ({ ...p, status: v as CycleStatus }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter><Button data-primary className="w-full" onClick={handleCycleSave}>Create Cycle</Button></SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══════ REVIEW SHEET ═══════ */}
      <Sheet open={reviewSheetOpen} onOpenChange={v => { setReviewSheetOpen(v); if (!v) setReviewEditId(null); }}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>{reviewEditId ? 'Edit Review' : 'New Performance Review'}</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4" data-keyboard-form>
            <div><Label className="text-xs">Appraisal Cycle *</Label>
              <Select value={reviewForm.cycleId} onValueChange={v => { const c = cycles.find(x => x.id === v); ruf('cycleId', v); ruf('cycleName', c?.name || ''); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select cycle" /></SelectTrigger>
                <SelectContent>{cycles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Employee *</Label>
              <Select value={reviewForm.employeeId} onValueChange={v => {
                const emp = activeEmployees.find(e => e.id === v);
                if (emp) {
                  ruf('employeeId', emp.id); ruf('employeeCode', emp.empCode);
                  ruf('employeeName', emp.displayName || `${emp.firstName} ${emp.lastName}`);
                  ruf('designation', emp.designation); ruf('departmentName', emp.departmentName);
                  ruf('managerId', emp.reportingManagerId); ruf('managerName', emp.reportingManagerName);
                }
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName || `${e.firstName} ${e.lastName}`}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Performance Score (1-5)</Label><Input type="number" min={0} max={5} step={0.5} className="h-8 text-xs" value={reviewForm.performanceScore || ''} onChange={e => ruf('performanceScore', Number(e.target.value))} onKeyDown={onEnterNext} /></div>
              <div><Label className="text-xs">Potential Score</Label>
                <Select value={String(reviewForm.potentialScore)} onValueChange={v => ruf('potentialScore', Number(v))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 — Low</SelectItem>
                    <SelectItem value="2">2 — Medium</SelectItem>
                    <SelectItem value="3">3 — High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Status</Label>
              <Select value={reviewForm.status} onValueChange={v => ruf('status', v as ReviewStatus)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="self_review">Self Review</SelectItem>
                  <SelectItem value="manager_review">Manager Review</SelectItem>
                  <SelectItem value="hr_review">HR Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Self Comments</Label><Textarea className="text-xs" rows={2} value={reviewForm.selfComments} onChange={e => ruf('selfComments', e.target.value)} /></div>
            <div><Label className="text-xs">Manager Comments</Label><Textarea className="text-xs" rows={2} value={reviewForm.managerComments} onChange={e => ruf('managerComments', e.target.value)} /></div>
            <div><Label className="text-xs">HR Comments</Label><Textarea className="text-xs" rows={2} value={reviewForm.hrComments} onChange={e => ruf('hrComments', e.target.value)} /></div>
            <div><Label className="text-xs">Development Areas</Label><Textarea className="text-xs" rows={2} value={reviewForm.developmentAreas} onChange={e => ruf('developmentAreas', e.target.value)} /></div>

            <Separator />
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">KRAs</p>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] ${kraWeightTotal === 100 ? 'text-green-600' : 'text-amber-600'}`}>{kraWeightTotal}% / 100%</span>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addKRA}><Plus className="h-3 w-3 mr-0.5" /> Add KRA</Button>
              </div>
            </div>
            {reviewForm.kras.map(k => (
              <div key={k.id} className="border rounded-md p-2 space-y-1.5">
                <div className="flex items-center gap-1">
                  <Input placeholder="KRA title" className="h-7 text-xs flex-1" value={k.kra} onChange={e => updateKRA(k.id, 'kra', e.target.value)} onKeyDown={onEnterNext} />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => removeKRA(k.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
                <Input placeholder="Metric" className="h-7 text-xs" value={k.metric} onChange={e => updateKRA(k.id, 'metric', e.target.value)} onKeyDown={onEnterNext} />
                <div className="grid grid-cols-5 gap-1">
                  <Input type="number" placeholder="Weight %" className="h-7 text-xs" value={k.weightage || ''} onChange={e => updateKRA(k.id, 'weightage', Number(e.target.value))} onKeyDown={onEnterNext} />
                  <Input placeholder="Target" className="h-7 text-xs" value={k.targetValue} onChange={e => updateKRA(k.id, 'targetValue', e.target.value)} onKeyDown={onEnterNext} />
                  <Input placeholder="Actual" className="h-7 text-xs" value={k.actualValue} onChange={e => updateKRA(k.id, 'actualValue', e.target.value)} onKeyDown={onEnterNext} />
                  <Input type="number" placeholder="Self" className="h-7 text-xs" value={k.selfRating || ''} onChange={e => updateKRA(k.id, 'selfRating', Number(e.target.value))} onKeyDown={onEnterNext} />
                  <Input type="number" placeholder="Manager" className="h-7 text-xs" value={k.managerRating || ''} onChange={e => updateKRA(k.id, 'managerRating', Number(e.target.value))} onKeyDown={onEnterNext} />
                </div>
              </div>
            ))}
          </div>
          <SheetFooter><Button data-primary className="w-full" onClick={handleReviewSave}>{reviewEditId ? 'Update Review' : 'Create Review'}</Button></SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══════ SUCCESSION SHEET ═══════ */}
      <Sheet open={succSheetOpen} onOpenChange={v => { setSuccSheetOpen(v); if (!v) setSuccEditId(null); }}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>{succEditId ? 'Edit Succession Plan' : 'New Succession Plan'}</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4" data-keyboard-form>
            <div><Label className="text-xs">Target Role Title *</Label><Input className="h-8 text-xs" value={succForm.targetRoleTitle} onChange={e => setSuccForm(p => ({ ...p, targetRoleTitle: e.target.value }))} onKeyDown={onEnterNext} /></div>
            <div><Label className="text-xs">Department</Label><Input className="h-8 text-xs" value={succForm.targetDepartment} onChange={e => setSuccForm(p => ({ ...p, targetDepartment: e.target.value }))} onKeyDown={onEnterNext} /></div>
            <div><Label className="text-xs">Current Role Holder</Label>
              <Select value={succForm.currentHolderId} onValueChange={v => {
                const emp = activeEmployees.find(e => e.id === v);
                setSuccForm(p => ({ ...p, currentHolderId: v, currentHolderName: emp ? (emp.displayName || `${emp.firstName} ${emp.lastName}`) : '' }));
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName || `${e.firstName} ${e.lastName}`}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Risk Level</Label>
              <Select value={succForm.riskLevel} onValueChange={v => setSuccForm(p => ({ ...p, riskLevel: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">Successors</p>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addSuccessor}><Plus className="h-3 w-3 mr-0.5" /> Add Successor</Button>
            </div>
            {succForm.successors.map(s => (
              <div key={s.id} className="border rounded-md p-2 space-y-1.5">
                <div className="flex items-center gap-1">
                  <Select value={s.successorId} onValueChange={v => {
                    const emp = activeEmployees.find(e => e.id === v);
                    if (emp) { updateSuccessor(s.id, 'successorId', v); updateSuccessor(s.id, 'successorCode', emp.empCode); updateSuccessor(s.id, 'successorName', emp.displayName || `${emp.firstName} ${emp.lastName}`); }
                  }}>
                    <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Select successor" /></SelectTrigger>
                    <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName || `${e.firstName} ${e.lastName}`}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => removeSuccessor(s.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <Select value={s.readiness} onValueChange={v => updateSuccessor(s.id, 'readiness', v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ready_now">Ready Now</SelectItem>
                      <SelectItem value="ready_1yr">Ready in 1 Year</SelectItem>
                      <SelectItem value="ready_2yr">Ready in 2 Years</SelectItem>
                      <SelectItem value="not_ready">Not Ready</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Notes" className="h-7 text-xs" value={s.notes} onChange={e => updateSuccessor(s.id, 'notes', e.target.value)} onKeyDown={onEnterNext} />
                </div>
              </div>
            ))}
            <div><Label className="text-xs">Notes</Label><Textarea className="text-xs" rows={2} value={succForm.notes} onChange={e => setSuccForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <SheetFooter><Button data-primary className="w-full" onClick={handleSuccSave}>{succEditId ? 'Update Plan' : 'Create Plan'}</Button></SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══════ COMPENSATION SHEET ═══════ */}
      <Sheet open={compSheetOpen} onOpenChange={setCompSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>New Compensation Action</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4" data-keyboard-form>
            <div><Label className="text-xs">Action Type *</Label>
              <Select value={compForm.actionType} onValueChange={v => cuf('actionType', v as CompActionType)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="increment">Increment</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                  <SelectItem value="grade_change">Grade Change</SelectItem>
                  <SelectItem value="correction">Correction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Employee *</Label>
              <Select value={compForm.employeeId} onValueChange={v => {
                const emp = activeEmployees.find(e => e.id === v);
                if (emp) {
                  cuf('employeeId', emp.id); cuf('employeeCode', emp.empCode);
                  cuf('employeeName', emp.displayName || `${emp.firstName} ${emp.lastName}`);
                  cuf('oldCTC', emp.annualCTC); cuf('oldGradeId', emp.gradeId);
                  cuf('oldGradeName', emp.gradeName); cuf('oldDesignation', emp.designation);
                }
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName || `${e.firstName} ${e.lastName}`}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Effective Date *</Label><SmartDateInput value={compForm.effectiveDate} onChange={v => cuf('effectiveDate', v)} /></div>
            <div><Label className="text-xs">Old CTC (auto-filled)</Label><Input className="h-8 text-xs bg-muted" readOnly value={compForm.oldCTC ? `₹${toIndianFormat(compForm.oldCTC)}` : ''} /></div>
            <div>
              <Label className="text-xs">New CTC *</Label>
              <Input className="h-8 text-xs" {...amountInputProps} value={compForm.newCTC || ''} onChange={e => cuf('newCTC', Number(e.target.value.replace(/[^0-9]/g,'')))} onKeyDown={onEnterNext} />
              {compForm.oldCTC > 0 && compForm.newCTC > 0 && (
                <p className={`text-[10px] mt-0.5 ${compPctLive >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Increment: {compPctLive >= 0 ? '+' : ''}{compPctLive}%
                </p>
              )}
            </div>
            <div><Label className="text-xs">New Grade (optional)</Label>
              <Select value={compForm.newGradeId} onValueChange={v => { const g = payGrades.find(x => x.id === v); cuf('newGradeId', v); cuf('newGradeName', g?.name || ''); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Same grade" /></SelectTrigger>
                <SelectContent>{payGrades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">New Designation (optional)</Label><Input className="h-8 text-xs" value={compForm.newDesignation} onChange={e => cuf('newDesignation', e.target.value)} onKeyDown={onEnterNext} /></div>
            <div><Label className="text-xs">Link to Review (optional)</Label>
               <Select value={compForm.linkedReviewId || '_none'} onValueChange={v => cuf('linkedReviewId', v === '_none' ? '' : v)}>
                 <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="_none">None</SelectItem>
                  {completedReviews.filter(r => r.employeeId === compForm.employeeId).map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.reviewCode} — {r.cycleName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Reason *</Label><Textarea className="text-xs" rows={2} value={compForm.reason} onChange={e => cuf('reason', e.target.value)} /></div>
            <div><Label className="text-xs">Approved By</Label><Input className="h-8 text-xs" value={compForm.approvedBy} onChange={e => cuf('approvedBy', e.target.value)} onKeyDown={onEnterNext} /></div>
          </div>
          <SheetFooter><Button data-primary className="w-full" onClick={handleCompSave}>Create Action</Button></SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function PerformanceAndTalent() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <ERPHeader breadcrumbs={[{label:'Operix Core',href:'/erp/dashboard'},{label:'Pay Hub'},{label:'Performance & Talent'}]} showDatePicker={false} showCompany={false}/>
        <div className="flex-1 overflow-auto p-6"><PerformanceAndTalentPanel /></div>
      </div>
    </SidebarProvider>
  );
}
