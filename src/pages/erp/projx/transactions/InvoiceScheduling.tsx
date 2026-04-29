/**
 * InvoiceScheduling.tsx — Project invoice schedule view + manual ad-hoc edit
 * Sprint T-Phase-1.1.2-b
 */
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Receipt, Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProjects } from '@/hooks/useProjects';
import { useProjectInvoiceSchedule } from '@/hooks/useProjectInvoiceSchedule';
import { useProjectMilestones } from '@/hooks/useProjectMilestones';
import {
  computeScheduleStatus, INVOICE_SCHEDULE_STATUS_LABELS, INVOICE_SCHEDULE_STATUS_COLORS,
} from '@/types/projx/project-invoice-schedule';
import type { ProjectInvoiceSchedule } from '@/types/projx/project-invoice-schedule';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const fmtINR = (n: number) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

interface FormState {
  milestone_id: string | null;
  scheduled_date: string;
  amount: number;
  description: string;
  is_invoiced: boolean;
}

const BLANK: FormState = {
  milestone_id: null, scheduled_date: todayISO(),
  amount: 0, description: '', is_invoiced: false,
};

export function InvoiceSchedulingPanel() {
  const entityCode = DEFAULT_ENTITY_SHORTCODE;
  const { projects } = useProjects(entityCode);
  const { schedules, createSchedule, updateSchedule, deleteSchedule, markInvoiced } = useProjectInvoiceSchedule(entityCode);
  const { milestones } = useProjectMilestones(entityCode);

  const activeProjects = useMemo(
    () => projects.filter(p => p.is_active).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [projects],
  );
  const [projectId, setProjectId] = useState<string>('');
  useEffect(() => {
    if (!projectId && activeProjects.length > 0) setProjectId(activeProjects[0].id);
  }, [projectId, activeProjects]);

  const project = projects.find(p => p.id === projectId) ?? null;
  const projectSchedules = useMemo(
    () => schedules.filter(s => s.project_id === projectId).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)),
    [schedules, projectId],
  );
  const projectMilestones = useMemo(
    () => milestones.filter(m => m.project_id === projectId),
    [milestones, projectId],
  );

  const today = todayISO();
  const totals = useMemo(() => {
    const acc = { future: 0, due: 0, overdue: 0, invoiced: 0 };
    for (const s of projectSchedules) {
      const st = computeScheduleStatus(s, today);
      acc[st] += s.amount;
    }
    return acc;
  }, [projectSchedules, today]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectInvoiceSchedule | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);

  useEffect(() => {
    if (sheetOpen) {
      if (editing) {
        setForm({
          milestone_id: editing.milestone_id,
          scheduled_date: editing.scheduled_date,
          amount: editing.amount,
          description: editing.description,
          is_invoiced: editing.is_invoiced,
        });
      } else { setForm(BLANK); }
    }
  }, [sheetOpen, editing]);

  const openCreate = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (s: ProjectInvoiceSchedule) => { setEditing(s); setSheetOpen(true); };

  const handleSave = () => {
    if (!project) { toast.error('Pick a project'); return; }
    if (form.amount < 0) { toast.error('Amount cannot be negative'); return; }
    if (!form.description.trim()) { toast.error('Description required'); return; }

    if (editing) {
      const wasInvoiced = editing.is_invoiced;
      if (!wasInvoiced && form.is_invoiced) {
        markInvoiced(editing.id, { voucher_id: null, voucher_no: null });
        updateSchedule(editing.id, {
          milestone_id: form.milestone_id,
          scheduled_date: form.scheduled_date,
          amount: form.amount,
          description: form.description,
        });
        toast.success('Marked invoiced · Phase 2 backend will populate voucher reference');
      } else if (wasInvoiced) {
        toast.error('Cannot edit an invoiced schedule entry');
        return;
      } else {
        updateSchedule(editing.id, {
          milestone_id: form.milestone_id,
          scheduled_date: form.scheduled_date,
          amount: form.amount,
          description: form.description,
        });
        toast.success('Schedule entry updated');
      }
    } else {
      createSchedule({
        project_id: project.id,
        project_centre_id: project.project_centre_id,
        milestone_id: form.milestone_id,
        scheduled_date: form.scheduled_date,
        amount: form.amount,
        description: form.description,
      });
      toast.success('Ad-hoc schedule entry added');
    }
    setSheetOpen(false);
    setEditing(null);
  };

  const handleDelete = (s: ProjectInvoiceSchedule) => {
    const r = deleteSchedule(s.id);
    if (!r.ok) { toast.error(r.reason); return; }
    toast.success('Schedule entry deleted');
  };

  // auto-fill amount when milestone picked
  useEffect(() => {
    if (!sheetOpen || editing || !form.milestone_id) return;
    const ms = projectMilestones.find(m => m.id === form.milestone_id);
    if (ms) setForm(f => ({ ...f, amount: ms.invoice_amount, description: f.description || `Invoice for milestone ${ms.milestone_no} — ${ms.milestone_name}`, scheduled_date: f.scheduled_date || ms.target_date }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.milestone_id]);

  return (
    <div className="max-w-7xl mx-auto space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6 text-indigo-500" /> Invoice Scheduling
          </h1>
          <p className="text-sm text-muted-foreground">Auto-populated from milestones · ad-hoc entries supported</p>
        </div>
        <Button size="sm" onClick={openCreate} disabled={!project}><Plus className="h-4 w-4 mr-1" /> Add Ad-hoc Entry</Button>
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground">Project:</Label>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="w-[360px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {activeProjects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.project_no} · {p.project_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {project && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>Future</CardDescription>
            <CardTitle className="text-lg font-mono">{fmtINR(totals.future)}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Due</CardDescription>
            <CardTitle className="text-lg font-mono text-amber-600">{fmtINR(totals.due)}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Overdue</CardDescription>
            <CardTitle className="text-lg font-mono text-destructive">{fmtINR(totals.overdue)}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Invoiced</CardDescription>
            <CardTitle className="text-lg font-mono text-emerald-600">{fmtINR(totals.invoiced)}</CardTitle></CardHeader></Card>
        </div>
      )}

      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
          {['Date', 'Description', 'Milestone', 'Amount', 'Status', ''].map(h => (
            <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
          ))}
        </TableRow></TableHeader>
        <TableBody>
          {projectSchedules.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
              No schedule entries · add a milestone or an ad-hoc entry.
            </TableCell></TableRow>
          ) : projectSchedules.map(s => {
            const st = computeScheduleStatus(s, today);
            const ms = s.milestone_id ? projectMilestones.find(m => m.id === s.milestone_id) : null;
            return (
              <TableRow key={s.id} className="group">
                <TableCell className="font-mono text-xs">{s.scheduled_date}</TableCell>
                <TableCell className="text-xs max-w-[300px] truncate">{s.description}</TableCell>
                <TableCell className="text-xs">{ms ? <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{ms.milestone_no}</code> : <span className="text-muted-foreground">Ad-hoc</span>}</TableCell>
                <TableCell className="font-mono text-xs">{fmtINR(s.amount)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${INVOICE_SCHEDULE_STATUS_COLORS[st]}`}>
                    {INVOICE_SCHEDULE_STATUS_LABELS[st]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    {!s.is_invoiced && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(s)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table></CardContent></Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? (editing.is_invoiced ? 'View Invoiced Entry' : 'Edit Schedule Entry') : 'New Ad-hoc Entry'}</SheetTitle>
            <SheetDescription>This list auto-populates when milestones are added. You can edit dates, amounts, descriptions, or add ad-hoc entries here.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <fieldset disabled={!!editing && editing.is_invoiced} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Milestone (optional)</Label>
                <Select value={form.milestone_id ?? '__none__'} onValueChange={v => setForm(f => ({ ...f, milestone_id: v === '__none__' ? null : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Ad-hoc —</SelectItem>
                    {projectMilestones.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.milestone_no} · {m.milestone_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Scheduled Date</Label>
                  <Input type="date" value={form.scheduled_date}
                    onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Amount (₹)</Label>
                  <Input type="number" min={0} value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm">Mark as Invoiced</Label>
                  <p className="text-[10px] text-muted-foreground">Phase 2 backend normally does this when Sales Invoice posts</p>
                </div>
                <Switch checked={form.is_invoiced} onCheckedChange={v => setForm(f => ({ ...f, is_invoiced: v }))} />
              </div>
            </fieldset>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>Close</Button>
              {(!editing || !editing.is_invoiced) && (
                <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Add Entry'}</Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
