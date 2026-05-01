/**
 * ResourceAllocation.tsx — ProjX person allocation per project
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
import { Users, Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProjects } from '@/hooks/useProjects';
import { useProjectResources } from '@/hooks/useProjectResources';
import { useSAMPersons } from '@/hooks/useSAMPersons';
import type { ProjectResource } from '@/types/projx/project-resource';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const fmtINR = (n: number) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

interface FormState {
  person_id: string;
  role_on_project: string;
  allocation_pct: number;
  allocated_from: string;
  allocated_until: string | null;
  daily_cost_rate: number;
  is_active: boolean;
}

const BLANK: FormState = {
  person_id: '', role_on_project: '', allocation_pct: 100,
  allocated_from: todayISO(), allocated_until: null,
  daily_cost_rate: 2000, is_active: true,
};

export function ResourceAllocationPanel() {
  const entityCode = DEFAULT_ENTITY_SHORTCODE;
  const { projects } = useProjects(entityCode);
  const { resources, createResource, updateResource, deleteResource, checkOverlap } = useProjectResources(entityCode);
  const { persons } = useSAMPersons(entityCode);

  const activePersons = useMemo(() => persons.filter(p => p.is_active), [persons]);
  const activeProjects = useMemo(
    () => projects.filter(p => p.is_active).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [projects],
  );
  const [projectId, setProjectId] = useState<string>('');
  useEffect(() => {
    if (!projectId && activeProjects.length > 0) setProjectId(activeProjects[0].id);
  }, [projectId, activeProjects]);

  const project = projects.find(p => p.id === projectId) ?? null;
  const projectResources = useMemo(
    () => resources.filter(r => r.project_id === projectId),
    [resources, projectId],
  );
  const burnRate = projectResources
    .filter(r => r.is_active)
    .reduce((s, r) => s + (r.daily_cost_rate * r.allocation_pct / 100), 0);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectResource | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);

  useEffect(() => {
    if (sheetOpen) {
      if (editing) {
        setForm({
          person_id: editing.person_id,
          role_on_project: editing.role_on_project,
          allocation_pct: editing.allocation_pct,
          allocated_from: editing.allocated_from,
          allocated_until: editing.allocated_until,
          daily_cost_rate: editing.daily_cost_rate,
          is_active: editing.is_active,
        });
      } else { setForm(BLANK); }
    }
  }, [sheetOpen, editing]);

  const openCreate = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (r: ProjectResource) => { setEditing(r); setSheetOpen(true); };

  const handleSave = () => {
    if (!project) { toast.error('Pick a project'); return; }
    if (!form.person_id) { toast.error('Select a person'); return; }
    if (!form.role_on_project.trim()) { toast.error('Role required'); return; }
    if (form.allocation_pct < 0 || form.allocation_pct > 100) { toast.error('Allocation must be 0-100%'); return; }

    const overlap = checkOverlap(form.person_id, project.id, form.allocated_from, form.allocated_until, editing?.id);
    if (overlap) toast.warning('Overlapping allocation exists for this person — proceeding anyway.');

    const person = activePersons.find(p => p.id === form.person_id);
    if (!person) { toast.error('Person not found'); return; }

    if (editing) {
      updateResource(editing.id, {
        role_on_project: form.role_on_project,
        allocation_pct: form.allocation_pct,
        allocated_from: form.allocated_from,
        allocated_until: form.allocated_until,
        daily_cost_rate: form.daily_cost_rate,
        is_active: form.is_active,
      });
      toast.success('Resource updated');
    } else {
      createResource({
        project_id: project.id,
        project_centre_id: project.project_centre_id,
        person_id: person.id,
        person_code: person.person_code,
        person_name: person.display_name,
        role_on_project: form.role_on_project,
        allocation_pct: form.allocation_pct,
        allocated_from: form.allocated_from,
        allocated_until: form.allocated_until,
        daily_cost_rate: form.daily_cost_rate,
        is_active: form.is_active,
      });
      toast.success(`${person.display_name} allocated to ${project.project_no}`);
    }
    setSheetOpen(false);
    setEditing(null);
  };

  const handleDelete = (r: ProjectResource) => {
    deleteResource(r.id);
    toast.success(`Removed ${r.person_name}`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-500" /> Resource Allocation
          </h1>
          <p className="text-sm text-muted-foreground">Assign people to projects · daily burn rate live</p>
        </div>
        <Button size="sm" onClick={openCreate} disabled={!project}>
          <Plus className="h-4 w-4 mr-1" /> Allocate Resource
        </Button>
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>Allocated People</CardDescription>
            <CardTitle className="text-2xl font-mono">{projectResources.filter(r => r.is_active).length}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Daily Burn Rate</CardDescription>
            <CardTitle className="text-lg font-mono text-amber-600">{fmtINR(burnRate)}/day</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Total Allocation %</CardDescription>
            <CardTitle className="text-2xl font-mono">{projectResources.filter(r => r.is_active).reduce((s, r) => s + r.allocation_pct, 0)}%</CardTitle></CardHeader></Card>
        </div>
      )}

      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
          {['Person', 'Code', 'Role', 'Alloc %', 'From', 'Until', 'Daily Rate', 'Status', ''].map(h => (
            <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
          ))}
        </TableRow></TableHeader>
        <TableBody>
          {projectResources.length === 0 ? (
            <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
              No resources allocated to this project yet.
            </TableCell></TableRow>
          ) : projectResources.map(r => (
            <TableRow key={r.id} className="group">
              <TableCell className="text-sm font-medium">{r.person_name}</TableCell>
              <TableCell><code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{r.person_code}</code></TableCell>
              <TableCell className="text-xs">{r.role_on_project}</TableCell>
              <TableCell className="font-mono text-xs">{r.allocation_pct}%</TableCell>
              <TableCell className="font-mono text-xs">{r.allocated_from}</TableCell>
              <TableCell className="font-mono text-xs">{r.allocated_until ?? '—'}</TableCell>
              <TableCell className="font-mono text-xs">{fmtINR(r.daily_cost_rate)}</TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-[10px] ${r.is_active ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' : 'bg-slate-500/10 text-slate-700 border-slate-500/30'}`}>
                  {r.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(r)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Allocation' : 'Allocate Resource'}</SheetTitle>
            <SheetDescription>Project Managers (PM) appear with a badge for quick identification.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>Person <span className="text-destructive">*</span></Label>
              <Select value={form.person_id} onValueChange={v => setForm(f => ({ ...f, person_id: v }))} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="Pick a person" /></SelectTrigger>
                <SelectContent>
                  {[...activePersons]
                    .sort((a, b) => {
                      const aPM = a.person_type === 'project_manager' ? 0 : 1;
                      const bPM = b.person_type === 'project_manager' ? 0 : 1;
                      if (aPM !== bPM) return aPM - bPM;
                      return a.display_name.localeCompare(b.display_name);
                    })
                    .map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          {p.person_type === 'project_manager' && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-purple-500/30 bg-purple-500/10 text-purple-700">PM</Badge>
                          )}
                          {p.display_name} ({p.person_code})
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Role on Project</Label>
              <Input value={form.role_on_project} onChange={e => setForm(f => ({ ...f, role_on_project: e.target.value }))} placeholder="e.g. Lead Engineer" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Allocation %</Label>
                <Input type="number" min={0} max={100} value={form.allocation_pct}
                  onChange={e => setForm(f => ({ ...f, allocation_pct: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Daily Cost Rate (₹)</Label>
                <Input type="number" min={0} value={form.daily_cost_rate}
                  onChange={e => setForm(f => ({ ...f, daily_cost_rate: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Allocated From</Label>
                <Input type="date" value={form.allocated_from}
                  onChange={e => setForm(f => ({ ...f, allocated_from: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Allocated Until (optional)</Label>
                <Input type="date" value={form.allocated_until ?? ''}
                  onChange={e => setForm(f => ({ ...f, allocated_until: e.target.value || null }))} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="text-sm">Active</Label>
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Allocate'}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
