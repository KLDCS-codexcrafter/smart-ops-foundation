/**
 * MilestoneTracker.tsx — ProjX milestones per project · auto-creates schedule
 * Sprint T-Phase-1.1.2-b
 */
// i18n: Sprint T-Phase-1.2.5h-c2-fix · minimum-viable migration
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Milestone, Plus, ArrowRight, Sparkles, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProjects } from '@/hooks/useProjects';
import { useProjectMilestones, computeMilestoneInvoiceAmount } from '@/hooks/useProjectMilestones';
import {
  MILESTONE_STATUS_LABELS, MILESTONE_STATUS_COLORS, canTransitionMilestoneStatus,
} from '@/types/projx/project-milestone';
import type { ProjectMilestone, MilestoneStatus } from '@/types/projx/project-milestone';
import { isPeriodLocked } from '@/lib/period-lock-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import { useT } from '@/lib/i18n-engine';

const fmtINR = (n: number) =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface FormState {
  milestone_name: string;
  description: string;
  target_date: string;
  status: MilestoneStatus;
  invoice_pct: number;
  is_billed: boolean;
  actual_completion_date: string | null;
  blocks_milestone_ids: string[];
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const BLANK: FormState = {
  milestone_name: '', description: '', target_date: todayISO(),
  status: 'pending', invoice_pct: 0, is_billed: false,
  actual_completion_date: null, blocks_milestone_ids: [],
};

export function MilestoneTrackerPanel() {
  const entityCode = DEFAULT_ENTITY_SHORTCODE;
  const { projects } = useProjects(entityCode);
  const { milestones, createMilestone, updateMilestone, deleteMilestone } = useProjectMilestones(entityCode);

  const activeProjects = useMemo(
    () => projects.filter(p => p.is_active).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [projects],
  );
  const [projectId, setProjectId] = useState<string>('');
  useEffect(() => {
    if (!projectId && activeProjects.length > 0) setProjectId(activeProjects[0].id);
  }, [projectId, activeProjects]);

  const project = useMemo(() => projects.find(p => p.id === projectId) ?? null, [projects, projectId]);
  const projectMs = useMemo(
    () => milestones.filter(m => m.project_id === projectId).sort((a, b) => a.milestone_no.localeCompare(b.milestone_no)),
    [milestones, projectId],
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectMilestone | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);

  useEffect(() => {
    if (sheetOpen) {
      if (editing) {
        setForm({
          milestone_name: editing.milestone_name,
          description: editing.description,
          target_date: editing.target_date,
          status: editing.status,
          invoice_pct: editing.invoice_pct,
          is_billed: editing.is_billed,
          actual_completion_date: editing.actual_completion_date,
          blocks_milestone_ids: editing.blocks_milestone_ids,
        });
      } else {
        setForm(BLANK);
      }
    }
  }, [sheetOpen, editing]);

  const totalPct = projectMs.reduce((s, m) => s + m.invoice_pct, 0);
  const totalBilled = projectMs.filter(m => m.is_billed).reduce((s, m) => s + m.invoice_amount, 0);
  const completePct = project && project.contract_value > 0
    ? Math.round((totalBilled / project.contract_value) * 100) : 0;
  const previewAmount = project ? computeMilestoneInvoiceAmount(project.contract_value, form.invoice_pct) : 0;

  const targetLocked = useMemo(
    () => form.target_date ? isPeriodLocked(form.target_date, entityCode) : false,
    [form.target_date, entityCode],
  );

  const openCreate = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (m: ProjectMilestone) => { setEditing(m); setSheetOpen(true); };

  const handleSave = () => {
    if (!project) { toast.error('Select a project first'); return; }
    if (!form.milestone_name.trim()) { toast.error('Milestone name required'); return; }
    if (form.invoice_pct < 0 || form.invoice_pct > 100) { toast.error('Invoice % must be 0-100'); return; }

    // total pct check (excluding self when editing)
    const otherTotal = projectMs.filter(m => m.id !== editing?.id).reduce((s, m) => s + m.invoice_pct, 0);
    if (otherTotal + form.invoice_pct > 100) {
      toast.warning(`Total invoice % across milestones is now ${otherTotal + form.invoice_pct}% (>100%)`);
    }

    if (targetLocked) {
      toast.warning('Target date is in a locked accounting period — saved as warning only.');
    }

    if (editing) {
      if (form.status !== editing.status) {
        const check = canTransitionMilestoneStatus(editing.status, form.status);
        if (!check.ok) { toast.error(check.reason); return; }
      }
      const patch: Partial<ProjectMilestone> = {
        milestone_name: form.milestone_name,
        description: form.description,
        target_date: form.target_date,
        status: form.status,
        invoice_pct: form.invoice_pct,
        is_billed: form.is_billed,
        actual_completion_date: form.status === 'completed'
          ? (form.actual_completion_date ?? todayISO()) : null,
        blocks_milestone_ids: form.blocks_milestone_ids,
      };
      updateMilestone(editing.id, patch, project.contract_value);
      toast.success(`Updated ${editing.milestone_no}`);
    } else {
      const created = createMilestone({
        project_id: project.id,
        project_centre_id: project.project_centre_id,
        milestone_name: form.milestone_name,
        description: form.description,
        target_date: form.target_date,
        status: form.status,
        invoice_pct: form.invoice_pct,
        blocks_milestone_ids: form.blocks_milestone_ids,
      }, project.contract_value);
      toast.success(`Milestone ${created.milestone_no} added · invoice schedule auto-created for ${created.target_date}`);
    }
    setSheetOpen(false);
    setEditing(null);
  };

  const handleDelete = (m: ProjectMilestone) => {
    const result = deleteMilestone(m.id);
    if (!result.ok) { toast.error(result.reason); return; }
    toast.success(`Deleted ${m.milestone_no}`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Milestone className="h-6 w-6 text-indigo-500" /> Milestone Tracker
          </h1>
          <p className="text-sm text-muted-foreground">Per-project milestones · auto-creates invoice schedule entries</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"
            onClick={() => toast.info('Auto-generation from quotation lines coming in 1.5.7')}>
            <Sparkles className="h-4 w-4" /> Quick Auto-Generate
          </Button>
          <Button size="sm" className="gap-1.5" onClick={openCreate} disabled={!project}>
            <Plus className="h-4 w-4" /> Add Milestone
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground">Project:</Label>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="w-[360px] h-9"><SelectValue placeholder="Pick a project" /></SelectTrigger>
          <SelectContent>
            {activeProjects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.project_no} · {p.project_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {project && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>Contract</CardDescription>
            <CardTitle className="text-lg font-mono">{fmtINR(project.contract_value)}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Billed</CardDescription>
            <CardTitle className="text-lg font-mono text-emerald-600">{fmtINR(totalBilled)}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>% Complete</CardDescription>
            <CardTitle className="text-lg font-mono">{completePct}%</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Total Invoice %</CardDescription>
            <CardTitle className={`text-lg font-mono ${totalPct > 100 ? 'text-destructive' : ''}`}>{totalPct}%</CardTitle></CardHeader></Card>
        </div>
      )}

      {/* Horizontal timeline */}
      {projectMs.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Milestone className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-semibold text-foreground mb-1">No milestones yet</p>
          <p className="text-xs mb-4">Add a milestone to auto-create its invoice schedule entry.</p>
          {project && <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Milestone</Button>}
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-4">
          <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
            {projectMs.map((m, idx) => (
              <div key={m.id} className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => openEdit(m)}
                  className="text-left rounded-lg border bg-card hover:bg-muted/40 transition-colors p-3 w-[210px]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{m.milestone_no}</code>
                    <Badge variant="outline" className={`text-[10px] ${MILESTONE_STATUS_COLORS[m.status]}`}>
                      {MILESTONE_STATUS_LABELS[m.status]}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium truncate">{m.milestone_name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{m.target_date}</p>
                  <p className="text-xs font-mono mt-1">{fmtINR(m.invoice_amount)} <span className="text-muted-foreground">({m.invoice_pct}%)</span></p>
                  {m.is_billed && <Badge variant="outline" className="text-[9px] mt-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/30">Billed</Badge>}
                </button>
                {idx < projectMs.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? `Edit ${editing.milestone_no}` : 'New Milestone'}</SheetTitle>
            <SheetDescription>
              {editing ? 'Update milestone details · status transitions enforced.' : 'Auto-generates invoice schedule entry on save.'}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>Milestone Name <span className="text-destructive">*</span></Label>
              <Input value={form.milestone_name} onChange={e => setForm(f => ({ ...f, milestone_name: e.target.value }))} placeholder="e.g. Foundation Complete" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Target Date</Label>
                <Input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
                {targetLocked && (
                  <p className="text-[10px] text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Period locked</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as MilestoneStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MILESTONE_STATUS_LABELS) as MilestoneStatus[]).map(s => (
                      <SelectItem key={s} value={s}>{MILESTONE_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Invoice %</Label>
                <Input type="number" min={0} max={100} step={0.01} value={form.invoice_pct}
                  onChange={e => setForm(f => ({ ...f, invoice_pct: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Invoice Amount (auto)</Label>
                <Input readOnly value={fmtINR(previewAmount)} className="font-mono bg-muted/40" />
              </div>
            </div>
            {form.status === 'completed' && (
              <div className="space-y-1.5">
                <Label>Actual Completion Date</Label>
                <Input type="date" value={form.actual_completion_date ?? ''}
                  onChange={e => setForm(f => ({ ...f, actual_completion_date: e.target.value || null }))} />
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Mark as Billed</Label>
                <p className="text-[11px] text-muted-foreground">Locks the schedule entry · normally Phase 2 voucher posting does this</p>
              </div>
              <Switch checked={form.is_billed} onCheckedChange={v => setForm(f => ({ ...f, is_billed: v }))} />
            </div>
            <div className="flex justify-between items-center pt-2">
              {editing && !editing.is_billed && (
                <Button variant="ghost" size="sm" onClick={() => { handleDelete(editing); setSheetOpen(false); }} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Add Milestone'}</Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
