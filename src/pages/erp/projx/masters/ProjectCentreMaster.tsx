/**
 * ProjectCentreMaster.tsx — ProjX Project Centre master
 * Sprint T-Phase-1.1.2-a · Tier 1 Card #1 · sister to AssetCentreMaster
 *
 * Two surfaces:
 *  - ProjectCentreMasterPanel — embedded inside Command Center under "Project Masters"
 *  - ProjectCentreMasterPage  — standalone route /erp/projx/masters/project-centres
 */
import { useMemo, useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Briefcase, Plus, Edit2, Trash2, Search, Database, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';
import { useProjectCentres } from '@/hooks/useProjectCentres';
import { useOrgStructure } from '@/hooks/useOrgStructure';
import type { ProjectCentre, ProjectCentreCategory } from '@/types/projx/project-centre';
import { PROJECT_CENTRE_CATEGORY_LABELS, projectCentresKey, PROJECT_CENTRE_SEQ_KEY } from '@/types/projx/project-centre';
import { DEMO_PROJECT_CENTRES } from '@/data/demo-projects';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

interface FormState {
  name: string;
  category: ProjectCentreCategory;
  parent_project_centre_id: string | null;
  division_id: string | null;
  department_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  status: 'active' | 'inactive';
  description: string;
  entity_id: string | null;
}

const BLANK: FormState = {
  name: '', category: 'product_implementation', parent_project_centre_id: null,
  division_id: null, department_id: null, customer_id: null, customer_name: null,
  status: 'active', description: '', entity_id: null,
};

interface CustomerLite { id: string; name: string }

function loadCustomers(): CustomerLite[] {
  try {
    // [JWT] GET /api/masters/customers
    const raw = localStorage.getItem('erp_group_customer_master');
    if (!raw) return [];
    const arr = JSON.parse(raw) as Array<{ id?: string; name?: string }>;
    return arr.filter(c => c?.id && c?.name).map(c => ({ id: String(c.id), name: String(c.name) }));
  } catch { return []; }
}

export function ProjectCentreMasterPanel() {
  const entityCode = DEFAULT_ENTITY_SHORTCODE;
  const { centres, createProjectCentre, updateProjectCentre, deleteProjectCentre, toggleActive, refresh } =
    useProjectCentres(entityCode);
  const { divisions, departments } = useOrgStructure();
  const customers = useMemo(() => loadCustomers(), []);

  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectCentre | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);
  const [delTarget, setDelTarget] = useState<ProjectCentre | null>(null);

  useEffect(() => {
    if (sheetOpen) {
      if (editing) {
        setForm({
          name: editing.name, category: editing.category,
          parent_project_centre_id: editing.parent_project_centre_id,
          division_id: editing.division_id, department_id: editing.department_id,
          customer_id: editing.customer_id, customer_name: editing.customer_name,
          status: editing.status, description: editing.description,
          entity_id: editing.entity_id,
        });
      } else {
        setForm(BLANK);
      }
    }
  }, [sheetOpen, editing]);

  const stats = useMemo(() => {
    const active = centres.filter(c => c.status === 'active').length;
    const inactive = centres.length - active;
    const byCat = new Map<ProjectCentreCategory, number>();
    centres.forEach(c => byCat.set(c.category, (byCat.get(c.category) ?? 0) + 1));
    return { total: centres.length, active, inactive, categories: byCat.size };
  }, [centres]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return centres;
    return centres.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.customer_name ?? '').toLowerCase().includes(q),
    );
  }, [centres, search]);

  const activeDivisions = useMemo(() => divisions.filter(d => d.status === 'active'), [divisions]);
  const filteredDepartments = useMemo(() => {
    if (!form.division_id) return departments.filter(d => d.status === 'active');
    return departments.filter(d => d.status === 'active' && d.division_id === form.division_id);
  }, [departments, form.division_id]);

  const parentOptions = useMemo(() =>
    centres.filter(c => c.status === 'active' && c.id !== editing?.id),
  [centres, editing]);

  const centreById = useMemo(() => {
    const m = new Map<string, ProjectCentre>();
    centres.forEach(c => m.set(c.id, c));
    return m;
  }, [centres]);
  const divisionById = useMemo(() => {
    const m = new Map<string, string>();
    divisions.forEach(d => m.set(d.id, d.name));
    return m;
  }, [divisions]);
  const departmentById = useMemo(() => {
    const m = new Map<string, string>();
    departments.forEach(d => m.set(d.id, d.name));
    return m;
  }, [departments]);

  const openCreate = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (pc: ProjectCentre) => { setEditing(pc); setSheetOpen(true); };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (editing) {
      updateProjectCentre(editing.id, form);
      toast.success(`Updated ${editing.code}`);
    } else {
      const created = createProjectCentre(form);
      toast.success(`Created ${created.code} — ${created.name}`);
    }
    setSheetOpen(false);
    setEditing(null);
  };

  const handleDelete = () => {
    if (!delTarget) return;
    deleteProjectCentre(delTarget.id);
    toast.success(`Deactivated ${delTarget.code}`);
    setDelTarget(null);
  };

  const seedDemo = () => {
    if (centres.length > 0) { toast.error('Project Centres already exist — cannot seed'); return; }
    localStorage.setItem(projectCentresKey(entityCode), JSON.stringify(DEMO_PROJECT_CENTRES));
    localStorage.setItem(PROJECT_CENTRE_SEQ_KEY(entityCode), String(DEMO_PROJECT_CENTRES.length));
    refresh();
    toast.success(`Seeded ${DEMO_PROJECT_CENTRES.length} demo Project Centres`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 p-6" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-indigo-500" />
            Project Centres
          </h1>
          <p className="text-sm text-muted-foreground">
            ProjX master · project cost-tagging (D-218 two-master architecture · sister to Asset Centres)
          </p>
        </div>
        <div className="flex gap-2">
          {centres.length === 0 && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={seedDemo}>
              <Database className="h-4 w-4" /> Seed Demo Data
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Project Centre
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total</CardDescription>
          <CardTitle className="text-2xl font-mono">{stats.total}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Active</CardDescription>
          <CardTitle className="text-2xl font-mono text-emerald-600">{stats.active}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Inactive</CardDescription>
          <CardTitle className="text-2xl font-mono text-muted-foreground">{stats.inactive}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Categories</CardDescription>
          <CardTitle className="text-2xl font-mono">{stats.categories}</CardTitle></CardHeader></Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search code, name, customer..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} centres</span>
      </div>

      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
          {['Code', 'Name', 'Category', 'Parent', 'Customer', 'Division / Dept', 'Status', ''].map(h => (
            <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
          ))}
        </TableRow></TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
              <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold text-foreground mb-1">
                {centres.length === 0 ? 'No Project Centres yet' : 'No matches'}
              </p>
              <p className="text-xs mb-4">
                {centres.length === 0
                  ? "Click 'Add Project Centre' to create the first one."
                  : 'Try a different search term.'}
              </p>
              {centres.length === 0 && (
                <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Project Centre</Button>
              )}
            </TableCell></TableRow>
          ) : filtered.map(pc => {
            const parent = pc.parent_project_centre_id ? centreById.get(pc.parent_project_centre_id) : null;
            const divName = pc.division_id ? divisionById.get(pc.division_id) : null;
            const deptName = pc.department_id ? departmentById.get(pc.department_id) : null;
            return (
              <TableRow key={pc.id} className="group">
                <TableCell><code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{pc.code}</code></TableCell>
                <TableCell className="font-medium text-sm max-w-[200px] truncate">{pc.name}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{PROJECT_CENTRE_CATEGORY_LABELS[pc.category]}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {parent ? <span className="font-mono">{parent.code}</span> : '—'}
                </TableCell>
                <TableCell className="text-xs">{pc.customer_name ?? '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {divName || deptName ? `${divName ?? '—'}${deptName ? ' / ' + deptName : ''}` : '—'}
                </TableCell>
                <TableCell>
                  <Badge className={pc.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-700 text-xs'
                    : 'bg-muted text-muted-foreground text-xs'}>
                    {pc.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Toggle active" onClick={() => toggleActive(pc.id)}>
                      <Switch checked={pc.status === 'active'} className="scale-75 pointer-events-none" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => openEdit(pc)}>
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Deactivate" onClick={() => setDelTarget(pc)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table></CardContent></Card>

      {/* Add/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? `Edit ${editing.code}` : 'New Project Centre'}</SheetTitle>
            <SheetDescription>
              {editing ? 'Update Project Centre details.' : 'Code auto-generates as PCT-NNNN on save.'}
            </SheetDescription>
          </SheetHeader>
          <div data-keyboard-form className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Acme Coal Conveyor System" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as ProjectCentreCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROJECT_CENTRE_CATEGORY_LABELS) as ProjectCentreCategory[]).map(cat => (
                    <SelectItem key={cat} value={cat}>{PROJECT_CENTRE_CATEGORY_LABELS[cat]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Parent Project Centre</Label>
              <Select value={form.parent_project_centre_id ?? 'none'}
                onValueChange={v => setForm(f => ({ ...f, parent_project_centre_id: v === 'none' ? null : v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {parentOptions.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select value={form.customer_id ?? 'none'}
                onValueChange={v => {
                  if (v === 'none') {
                    setForm(f => ({ ...f, customer_id: null, customer_name: null }));
                  } else {
                    const c = customers.find(x => x.id === v);
                    setForm(f => ({ ...f, customer_id: v, customer_name: c?.name ?? null }));
                  }
                }}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Division</Label>
                <Select value={form.division_id ?? 'none'}
                  onValueChange={v => setForm(f => ({ ...f, division_id: v === 'none' ? null : v, department_id: null }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {activeDivisions.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={form.department_id ?? 'none'}
                  onValueChange={v => setForm(f => ({ ...f, department_id: v === 'none' ? null : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {filteredDepartments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Status</Label>
                <p className="text-xs text-muted-foreground">Active centres appear in voucher + project pickers</p>
              </div>
              <Switch checked={form.status === 'active'}
                onCheckedChange={v => setForm(f => ({ ...f, status: v ? 'active' : 'inactive' }))} />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} placeholder="Notes / context..." value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <AlertDialog open={!!delTarget} onOpenChange={v => !v && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Project Centre?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? Vouchers / Projects using <span className="font-mono font-semibold">{delTarget?.code}</span> will
              retain the reference but reports may show inactive Centre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ProjectCentreMasterPage() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <main className="flex-1"><ProjectCentreMasterPanel /></main>
      </div>
    </SidebarProvider>
  );
}
