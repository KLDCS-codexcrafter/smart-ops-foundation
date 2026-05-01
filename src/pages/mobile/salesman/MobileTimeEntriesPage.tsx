/**
 * MobileTimeEntriesPage.tsx — Salesman logs time against allocated projects
 * Sprint T-Phase-1.1.2-c · D-222 (mobile time-entry capture)
 * [JWT] /api/projx/time-entries
 */
import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Send, Save, Clock, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import { useProjects } from '@/hooks/useProjects';
import { useProjectResources } from '@/hooks/useProjectResources';
import { useProjectMilestones } from '@/hooks/useProjectMilestones';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { TIME_ENTRY_STATUS_COLORS, TIME_ENTRY_STATUS_LABELS } from '@/types/projx/time-entry';
import { cn } from '@/lib/utils';

function readSession(): MobileSession | null {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch { return null; }
}

const fmtINR = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

type FilterTab = 'today' | 'week' | 'all';

export default function MobileTimeEntriesPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const entityCode = session?.entity_code ?? '';

  const { projects } = useProjects(entityCode);
  const { getResourcesByPerson } = useProjectResources(entityCode);
  const { milestones } = useProjectMilestones(entityCode);
  const {
    entries, createTimeEntry, submitTimeEntry, getEntriesByPerson,
  } = useTimeEntries(entityCode);

  const personId = session?.user_id ?? '';
  const myAllocations = useMemo(
    () => personId ? getResourcesByPerson(personId) : [],
    [personId, getResourcesByPerson],
  );
  const allocatedProjectIds = useMemo(
    () => new Set(myAllocations.map(r => r.project_id)),
    [myAllocations],
  );
  const allocatedProjects = useMemo(
    () => projects.filter(p => allocatedProjectIds.has(p.id) && p.is_active),
    [projects, allocatedProjectIds],
  );

  const myEntries = useMemo(
    () => personId
      ? [...getEntriesByPerson(personId)].sort((a, b) => b.entry_date.localeCompare(a.entry_date))
      : [],
    [personId, entries, getEntriesByPerson], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [tab, setTab] = useState<FilterTab>('week');

  const filteredEntries = useMemo(() => {
    const today = todayISO();
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoISO = weekAgo.toISOString().slice(0, 10);
    return myEntries.filter(e => {
      if (tab === 'today') return e.entry_date === today;
      if (tab === 'week') return e.entry_date >= weekAgoISO;
      return true;
    });
  }, [myEntries, tab]);

  const hoursThisWeek = useMemo(() => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoISO = weekAgo.toISOString().slice(0, 10);
    return myEntries
      .filter(e => e.entry_date >= weekAgoISO && e.status !== 'rejected')
      .reduce((s, e) => s + e.hours, 0);
  }, [myEntries]);

  const pendingCount = useMemo(
    () => myEntries.filter(e => e.status === 'submitted').length,
    [myEntries],
  );

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [milestoneId, setMilestoneId] = useState<string>('__none__');
  const [entryDate, setEntryDate] = useState(todayISO());
  const [hours, setHours] = useState('1');
  const [taskDescription, setTaskDescription] = useState('');
  const [isBillable, setIsBillable] = useState(true);
  const [hourlyRate, setHourlyRate] = useState('0');

  const projectMilestones = useMemo(
    () => milestones.filter(m => m.project_id === projectId),
    [milestones, projectId],
  );

  const resetForm = useCallback(() => {
    setProjectId('');
    setMilestoneId('__none__');
    setEntryDate(todayISO());
    setHours('1');
    setTaskDescription('');
    setIsBillable(true);
    setHourlyRate('0');
    setShowForm(false);
  }, []);

  const handlePickProject = useCallback((pid: string) => {
    setProjectId(pid);
    setMilestoneId('__none__');
    const allocation = myAllocations.find(r => r.project_id === pid);
    if (allocation && isBillable) {
      // pre-fill hourly rate from daily_cost_rate / 8
      setHourlyRate(String(Math.round(allocation.daily_cost_rate / 8)));
    }
  }, [myAllocations, isBillable]);

  const validate = useCallback((): { ok: boolean; reason?: string } => {
    if (!projectId) return { ok: false, reason: 'Pick a project' };
    const h = Number(hours);
    if (!h || h < 0.25) return { ok: false, reason: 'Hours must be at least 0.25' };
    if (h > 24) return { ok: false, reason: 'Hours cannot exceed 24' };
    if (taskDescription.trim().length < 10) return { ok: false, reason: 'Task description min 10 characters' };
    if (isBillable && Number(hourlyRate) <= 0) return { ok: false, reason: 'Hourly rate required for billable entries' };
    // Day-total check
    const dayTotal = myEntries
      .filter(e => e.entry_date === entryDate && e.status !== 'rejected')
      .reduce((s, e) => s + e.hours, 0);
    if (dayTotal + h > 24) return { ok: false, reason: `Day total would exceed 24h (currently ${dayTotal}h)` };
    return { ok: true };
  }, [projectId, hours, taskDescription, isBillable, hourlyRate, entryDate, myEntries]);

  const buildPayload = useCallback(() => {
    const project = projects.find(p => p.id === projectId);
    if (!project || !session) return null;
    return {
      project_id: project.id,
      project_no: project.project_no,
      project_centre_id: project.project_centre_id,
      milestone_id: milestoneId === '__none__' ? null : milestoneId,
      person_id: session.user_id ?? '',
      person_name: session.display_name,
      entry_date: entryDate,
      hours: Number(hours),
      task_description: taskDescription.trim(),
      is_billable: isBillable,
      hourly_rate: isBillable ? Number(hourlyRate) : 0,
    };
  }, [projects, projectId, milestoneId, session, entryDate, hours, taskDescription, isBillable, hourlyRate]);

  const handleSaveDraft = useCallback(() => {
    const v = validate();
    if (!v.ok) { toast.error(v.reason ?? 'Invalid entry'); return; }
    const payload = buildPayload();
    if (!payload) return;
    // [JWT] POST /api/projx/time-entries (status=draft)
    createTimeEntry({ ...payload, status: 'draft' });
    toast.success('Saved as draft');
    resetForm();
  }, [validate, buildPayload, createTimeEntry, resetForm]);

  const handleSaveSubmit = useCallback(() => {
    const v = validate();
    if (!v.ok) { toast.error(v.reason ?? 'Invalid entry'); return; }
    const payload = buildPayload();
    if (!payload) return;
    const created = createTimeEntry({ ...payload, status: 'draft' });
    const result = submitTimeEntry(created.id);
    if (!result.ok) { toast.error(result.reason); return; }
    toast.success('Submitted for approval');
    resetForm();
  }, [validate, buildPayload, createTimeEntry, submitTimeEntry, resetForm]);

  const handleSubmitDraft = useCallback((id: string) => {
    const result = submitTimeEntry(id);
    if (!result.ok) { toast.error(result.reason); return; }
    toast.success('Submitted for approval');
  }, [submitTimeEntry]);

  if (!session) return null;

  if (allocatedProjects.length === 0) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-semibold">My Time Entries</h1>
        </div>
        <Card className="p-6 text-center space-y-2">
          <AlertTriangle className="h-8 w-8 mx-auto text-amber-500" />
          <p className="text-sm font-medium">No project allocations</p>
          <p className="text-xs text-muted-foreground">
            You have no active project allocations. Contact your project manager.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-24">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">My Time Entries</h1>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Hours This Week</p>
          <p className="text-base font-mono font-semibold">{hoursThisWeek.toFixed(2)}h</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Pending Approval</p>
          <p className="text-base font-mono font-semibold text-amber-700">{pendingCount}</p>
        </Card>
      </div>

      <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
        {(['today', 'week', 'all'] as FilterTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 text-xs py-1.5 rounded-md capitalize',
              tab === t ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground',
            )}
          >
            {t === 'week' ? 'This Week' : t}
          </button>
        ))}
      </div>

      {!showForm ? (
        <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> Log Time
        </Button>
      ) : (
        <Card className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">New Time Entry</p>
            <Button variant="ghost" size="sm" onClick={resetForm}><X className="h-4 w-4" /></Button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Project *</Label>
            <Select value={projectId} onValueChange={handlePickProject}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {allocatedProjects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-mono text-xs">{p.project_no}</span> · {p.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {projectId && projectMilestones.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Milestone (optional)</Label>
              <Select value={milestoneId} onValueChange={setMilestoneId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {projectMilestones.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.milestone_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hours</Label>
              <Input type="number" inputMode="decimal" step="0.25" min="0.25" max="24"
                value={hours} onChange={e => setHours(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Task Description *</Label>
            <Textarea rows={2} value={taskDescription}
              onChange={e => setTaskDescription(e.target.value)}
              placeholder="What did you work on? (min 10 chars)" />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-2">
            <div>
              <Label className="text-xs">Billable</Label>
              <p className="text-[10px] text-muted-foreground">Counts toward project P&amp;L</p>
            </div>
            <Switch checked={isBillable} onCheckedChange={setIsBillable} />
          </div>

          {isBillable && (
            <div className="space-y-1.5">
              <Label className="text-xs">Hourly Rate (₹)</Label>
              <Input type="number" inputMode="decimal" min="0"
                value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} />
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleSaveDraft}>
              <Save className="h-4 w-4 mr-1.5" /> Save Draft
            </Button>
            <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={handleSaveSubmit}>
              <Send className="h-4 w-4 mr-1.5" /> Save &amp; Submit
            </Button>
          </div>
        </Card>
      )}

      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        Entries ({filteredEntries.length})
      </p>

      {filteredEntries.length === 0 ? (
        <Card className="p-6 text-center">
          <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No entries in this period</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredEntries.map(e => {
            const project = projects.find(p => p.id === e.project_id);
            const milestone = e.milestone_id ? milestones.find(m => m.id === e.milestone_id) : null;
            return (
              <Card key={e.id} className="p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-mono border-purple-500/30 bg-purple-500/10 text-purple-700">
                        {project?.project_no ?? e.project_no}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground truncate">{project?.project_name}</span>
                    </div>
                    {milestone && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">→ {milestone.milestone_name}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono font-semibold">{e.hours}h</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{e.entry_date}</p>
                  </div>
                </div>

                <p className="text-xs text-foreground/80 line-clamp-2">{e.task_description}</p>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={cn('text-[9px]', TIME_ENTRY_STATUS_COLORS[e.status])}>
                      {TIME_ENTRY_STATUS_LABELS[e.status]}
                    </Badge>
                    {e.is_billable && (
                      <Badge variant="outline" className="text-[9px] font-mono">
                        {fmtINR(e.hourly_rate)}/h
                      </Badge>
                    )}
                  </div>
                  {e.status === 'draft' && (
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                      onClick={() => handleSubmitDraft(e.id)}>
                      <Send className="h-3 w-3 mr-1" /> Submit
                    </Button>
                  )}
                </div>

                {e.status === 'rejected' && e.rejection_reason && (
                  <div className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-800 rounded p-1.5">
                    <span className="font-semibold">Rejected:</span> {e.rejection_reason}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
