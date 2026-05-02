/**
 * TimeEntryCapture.tsx — Project-tagged time logging (web · per Q2(b))
 * Sprint T-Phase-1.1.2-b
 */
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Plus, Edit2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProjects } from '@/hooks/useProjects';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useProjectMilestones } from '@/hooks/useProjectMilestones';
import { useSAMPersons } from '@/hooks/useSAMPersons';
import {
  TIME_ENTRY_STATUS_LABELS, TIME_ENTRY_STATUS_COLORS,
} from '@/types/projx/time-entry';
import type { TimeEntry } from '@/types/projx/time-entry';
import { dMul, round2 } from '@/lib/decimal-helpers';
import { isPeriodLocked, periodLockMessage } from '@/lib/period-lock-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const fmtINR = (n: number) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

interface FormState {
  project_id: string;
  milestone_id: string | null;
  person_id: string;
  entry_date: string;
  effective_date: string;
  hours: number;
  task_description: string;
  is_billable: boolean;
  hourly_rate: number;
}

const BLANK: FormState = {
  project_id: '', milestone_id: null, person_id: '',
  entry_date: todayISO(), effective_date: '', hours: 8,
  task_description: '', is_billable: true, hourly_rate: 1500,
};

export function TimeEntryCapturePanel() {
  const entityCode = DEFAULT_ENTITY_SHORTCODE;
  const { projects } = useProjects(entityCode);
  const { entries, createTimeEntry, updateTimeEntry, submitTimeEntry } = useTimeEntries(entityCode);
  const { milestones } = useProjectMilestones(entityCode);
  const { persons } = useSAMPersons(entityCode);

  const activeProjects = useMemo(
    () => projects.filter(p => p.is_active),
    [projects],
  );
  const activePersons = useMemo(() => persons.filter(p => p.is_active), [persons]);

  const [filterProjectId, setFilterProjectId] = useState<string>('all');
  const [filterPersonId, setFilterPersonId] = useState<string>('all');

  const filtered = useMemo(() => {
    let list = entries;
    if (filterProjectId !== 'all') list = list.filter(e => e.project_id === filterProjectId);
    if (filterPersonId !== 'all') list = list.filter(e => e.person_id === filterPersonId);
    return [...list].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
  }, [entries, filterProjectId, filterPersonId]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);

  useEffect(() => {
    if (sheetOpen) {
      if (editing) {
        setForm({
          project_id: editing.project_id,
          milestone_id: editing.milestone_id,
          person_id: editing.person_id,
          entry_date: editing.entry_date,
          effective_date: editing.effective_date ?? '',
          hours: editing.hours,
          task_description: editing.task_description,
          is_billable: editing.is_billable,
          hourly_rate: editing.hourly_rate,
        });
      } else { setForm(BLANK); }
    }
  }, [sheetOpen, editing]);

  const formProject = projects.find(p => p.id === form.project_id);
  const formMilestones = useMemo(
    () => milestones.filter(m => m.project_id === form.project_id),
    [milestones, form.project_id],
  );

  const dateLocked = useMemo(
    () => form.entry_date ? isPeriodLocked(form.entry_date, entityCode) : false,
    [form.entry_date, entityCode],
  );

  const openCreate = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (t: TimeEntry) => { setEditing(t); setSheetOpen(true); };

  const validateAndPayload = (): { ok: false; reason: string } | { ok: true; payload: Omit<TimeEntry, 'id' | 'entity_id' | 'status' | 'approved_by_id' | 'approved_by_name' | 'approved_at' | 'rejection_reason' | 'created_at' | 'updated_at'> } => {
    if (!form.project_id || !formProject) return { ok: false, reason: 'Pick a project' };
    if (!form.person_id) return { ok: false, reason: 'Pick a person' };
    if (form.hours <= 0 || form.hours > 24) return { ok: false, reason: 'Hours must be 0-24' };
    if (!form.task_description.trim()) return { ok: false, reason: 'Task description required' };
    if (form.is_billable && form.hourly_rate <= 0) return { ok: false, reason: 'Hourly rate required for billable entries' };

    // per-day total
    const sameDayPersonHours = entries
      .filter(t => t.id !== editing?.id && t.person_id === form.person_id && t.entry_date === form.entry_date)
      .reduce((s, t) => s + t.hours, 0);
    if (sameDayPersonHours + form.hours > 24) {
      return { ok: false, reason: `Total hours for this person on ${form.entry_date} would exceed 24` };
    }

    const person = activePersons.find(p => p.id === form.person_id);
    if (!person) return { ok: false, reason: 'Person not found' };

    return {
      ok: true,
      payload: {
        project_id: formProject.id,
        project_no: formProject.project_no,
        project_centre_id: formProject.project_centre_id,
        milestone_id: form.milestone_id,
        person_id: person.id,
        person_name: person.display_name,
        entry_date: form.entry_date,
        hours: form.hours,
        task_description: form.task_description,
        is_billable: form.is_billable,
        hourly_rate: form.is_billable ? form.hourly_rate : 0,
      },
    };
  };

  const handleSaveDraft = () => {
    const v = validateAndPayload();
    if (!v.ok) { toast.error(v.reason); return; }
    if (dateLocked) toast.warning('Entry date is in a locked accounting period.');

    if (editing) {
      const r = updateTimeEntry(editing.id, v.payload);
      if (!r.ok) { toast.error(r.reason); return; }
      toast.success('Time entry updated');
    } else {
      createTimeEntry({ ...v.payload, status: 'draft' });
      toast.success('Time entry saved as draft');
    }
    setSheetOpen(false);
    setEditing(null);
  };

  const handleSaveAndSubmit = () => {
    const v = validateAndPayload();
    if (!v.ok) { toast.error(v.reason); return; }
    if (dateLocked) toast.warning('Entry date is in a locked accounting period.');

    if (editing) {
      const r = updateTimeEntry(editing.id, v.payload);
      if (!r.ok) { toast.error(r.reason); return; }
      const s = submitTimeEntry(editing.id);
      if (!s.ok) { toast.error(s.reason); return; }
    } else {
      const created = createTimeEntry({ ...v.payload, status: 'draft' });
      submitTimeEntry(created.id);
    }
    toast.success('Time entry submitted for approval');
    setSheetOpen(false);
    setEditing(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-indigo-500" /> Time Entry
          </h1>
          <p className="text-sm text-muted-foreground">Capture project time · approval workflow on mobile (1.1.2-c)</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Time Entry</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Project:</Label>
          <Select value={filterProjectId} onValueChange={setFilterProjectId}>
            <SelectTrigger className="w-[260px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {activeProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_no}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Person:</Label>
          <Select value={filterPersonId} onValueChange={setFilterPersonId}>
            <SelectTrigger className="w-[220px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All People</SelectItem>
              {activePersons.map(p => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} entries</span>
      </div>

      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
          {['Date', 'Project', 'Person', 'Hours', 'Task', 'Billable', 'Rate', 'Total', 'Status', ''].map(h => (
            <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
          ))}
        </TableRow></TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground text-sm">
              No time entries yet.
            </TableCell></TableRow>
          ) : filtered.map(t => {
            const total = round2(dMul(t.hours, t.hourly_rate));
            return (
              <TableRow key={t.id} className="group">
                <TableCell className="font-mono text-xs">{t.entry_date}</TableCell>
                <TableCell><code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{t.project_no}</code></TableCell>
                <TableCell className="text-xs">{t.person_name}</TableCell>
                <TableCell className="font-mono text-xs">{t.hours}h</TableCell>
                <TableCell className="text-xs max-w-[260px] truncate">{t.task_description}</TableCell>
                <TableCell>{t.is_billable ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <span className="text-muted-foreground text-xs">No</span>}</TableCell>
                <TableCell className="font-mono text-xs">{fmtINR(t.hourly_rate)}</TableCell>
                <TableCell className="font-mono text-xs">{fmtINR(total)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${TIME_ENTRY_STATUS_COLORS[t.status]}`}>
                    {TIME_ENTRY_STATUS_LABELS[t.status]}
                  </Badge>
                  {t.status === 'rejected' && t.rejection_reason && (
                    <p className="text-[9px] text-destructive mt-0.5">{t.rejection_reason}</p>
                  )}
                </TableCell>
                <TableCell>
                  {t.status === 'draft' ? (
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => openEdit(t)}>
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => openEdit(t)} title="View (read-only)">
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground/50" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table></CardContent></Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? (editing.status === 'draft' ? 'Edit Time Entry' : 'View Time Entry') : 'New Time Entry'}</SheetTitle>
            <SheetDescription>
              {editing && editing.status !== 'draft'
                ? `Status: ${TIME_ENTRY_STATUS_LABELS[editing.status]} · cannot edit submitted entries (audit discipline)`
                : 'Save as draft or submit for approval'}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            {editing && editing.status !== 'draft' && editing.approved_by_name && (
              <Card className="bg-muted/40">
                <CardContent className="p-3 text-xs">
                  <p><strong>Approver:</strong> {editing.approved_by_name}</p>
                  {editing.approved_at && <p><strong>At:</strong> {new Date(editing.approved_at).toLocaleString('en-IN')}</p>}
                  {editing.rejection_reason && <p className="text-destructive"><strong>Reason:</strong> {editing.rejection_reason}</p>}
                </CardContent>
              </Card>
            )}
            <fieldset disabled={!!editing && editing.status !== 'draft'} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Project <span className="text-destructive">*</span></Label>
                  <Select value={form.project_id} onValueChange={v => setForm(f => ({ ...f, project_id: v, milestone_id: null }))}>
                    <SelectTrigger><SelectValue placeholder="Pick project" /></SelectTrigger>
                    <SelectContent>
                      {activeProjects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.project_no} · {p.project_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Milestone (optional)</Label>
                  <Select value={form.milestone_id ?? '__none__'} onValueChange={v => setForm(f => ({ ...f, milestone_id: v === '__none__' ? null : v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {formMilestones.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.milestone_no} · {m.milestone_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Person <span className="text-destructive">*</span></Label>
                <Select value={form.person_id} onValueChange={v => setForm(f => ({ ...f, person_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pick person" /></SelectTrigger>
                  <SelectContent>
                    {activePersons.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.display_name} ({p.person_code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} />
                  {dateLocked && (
                    <p className="text-[10px] text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Period locked</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Hours (0.25 step)</Label>
                  <Input type="number" min={0} max={24} step={0.25} value={form.hours}
                    onChange={e => setForm(f => ({ ...f, hours: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Task Description <span className="text-destructive">*</span></Label>
                <Textarea rows={2} value={form.task_description}
                  onChange={e => setForm(f => ({ ...f, task_description: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm">Billable</Label>
                <Switch checked={form.is_billable} onCheckedChange={v => setForm(f => ({ ...f, is_billable: v, hourly_rate: v ? f.hourly_rate || 1500 : 0 }))} />
              </div>
              {form.is_billable && (
                <div className="space-y-1.5">
                  <Label>Hourly Rate (₹) <span className="text-destructive">*</span></Label>
                  <Input type="number" min={0} value={form.hourly_rate}
                    onChange={e => setForm(f => ({ ...f, hourly_rate: Number(e.target.value) }))} />
                  <p className="text-[10px] text-muted-foreground">Total: {fmtINR(round2(dMul(form.hours, form.hourly_rate)))}</p>
                </div>
              )}
            </fieldset>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>Close</Button>
              {(!editing || editing.status === 'draft') && (
                <>
                  <Button variant="secondary" onClick={handleSaveDraft}>Save as Draft</Button>
                  <Button onClick={handleSaveAndSubmit}>Save and Submit</Button>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
