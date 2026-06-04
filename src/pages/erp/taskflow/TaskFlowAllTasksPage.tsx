/**
 * @file        src/pages/erp/taskflow/TaskFlowAllTasksPage.tsx
 * @purpose     TaskFlow list + kanban + filters + create dialog (S137.R1 corrective)
 * @sprint      Sprint 137.R1 · T-TaskFlow-A641.1 · Pillar A.6.4 · TaskFlow Arc opener · Block R4
 * @decisions   FR-44 SSOT pickers: useEmployees · useOrgStructure · loadPartiesByType
 *              R1 corrective: 12-state board (compact grouping of terminals · DESIGN-DECISION-FLAG R1-1)
 *              Filters: category (incl. internal_audit/external_audit) · branch · department
 *              Department default = current-user dept + "All" toggle (TF-15)
 *              Eslint R1 fix: bag listTasks result in state so we don't need a `tick` dep.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Search, ListChecks, LayoutGrid, List as ListIcon } from 'lucide-react';
import {
  createTask, listTasks, changeStatus, listDueWithin24h,
} from '@/lib/taskflow-engine';
import { getOpenBlocked, listEscalations } from '@/lib/taskflow-governance-engine';
import type { Task, TaskPriority, TaskStatus, TaskCategory } from '@/types/taskflow';
import { TASK_STATUS_TRANSITIONS } from '@/types/taskflow';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEmployees } from '@/hooks/useEmployees';
import { useOrgStructure } from '@/hooks/useOrgStructure';
import { loadPartiesByType } from '@/lib/party-master-engine';

type Filter = 'all' | 'my' | 'due-soon' | 'completed';
type ViewMode = 'list' | 'board';

const PRIORITIES: TaskPriority[] = ['critical', 'high', 'medium', 'low'];
const CATEGORIES: TaskCategory[] = [
  'operations','finance','compliance','hr','it','sales','marketing','support','general',
  'internal_audit','external_audit',
];

// DESIGN-DECISION-FLAG R1-1 · Kanban groupings: 5 active lanes + 1 compacted terminal
const BOARD_LANES: { id: string; label: string; statuses: TaskStatus[] }[] = [
  { id: 'open',      label: 'Open',         statuses: ['draft', 'open'] },
  { id: 'wip',       label: 'In Progress',  statuses: ['in_progress', 'rework'] },
  { id: 'review',    label: 'Review',       statuses: ['in_review', 'pending_approval', 'approved'] },
  { id: 'wait',      label: 'Waiting',      statuses: ['on_hold', 'escalated'] },
  { id: 'closed',    label: 'Closed',       statuses: ['completed', 'cancelled', 'rejected'] },
];

const statusVariant = (s: TaskStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (s === 'completed' || s === 'approved') return 'secondary';
  if (s === 'cancelled' || s === 'rejected' || s === 'escalated') return 'destructive';
  if (s === 'in_progress' || s === 'in_review') return 'default';
  return 'outline';
};

const fmtDate = (iso: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
};

interface Props {
  filter?: Filter;
  currentUserId?: string;
  /** DESIGN-DECISION-FLAG R1-2 · current-user dept resolution = prop (mock-auth bridge owner; read-only for R1) */
  currentUserDepartmentId?: string;
}

export default function TaskFlowAllTasksPage({
  filter = 'all',
  currentUserId = 'me',
  currentUserDepartmentId,
}: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const { employees } = useEmployees();
  const { departments } = useOrgStructure();
  const customers = useMemo(() => loadPartiesByType(entityCode, 'customer'), [entityCode]);
  const vendors = useMemo(() => loadPartiesByType(entityCode, 'vendor'), [entityCode]);

  // R1 eslint fix: hold tasks in state, refetch on action — no `tick` dep needed.
  const [tasks, setTasks] = useState<Task[]>(() => listTasks(entityCode));
  const [dueSoonIds, setDueSoonIds] = useState<Set<string>>(
    () => new Set(listDueWithin24h(entityCode).map((t) => t.id)),
  );
  const refresh = useCallback(() => {
    setTasks(listTasks(entityCode));
    setDueSoonIds(new Set(listDueWithin24h(entityCode).map((t) => t.id)));
  }, [entityCode]);
  useEffect(() => { refresh(); }, [refresh]);

  const [view, setView] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | TaskCategory>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [deptMode, setDeptMode] = useState<'mine' | 'all'>(currentUserDepartmentId ? 'mine' : 'all');

  const branches = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => { if (t.branchId) set.add(t.branchId); });
    return Array.from(set);
  }, [tasks]);

  const filtered = useMemo(() => {
    let rows = tasks;
    if (filter === 'my') rows = rows.filter((t) => t.assigneeId === currentUserId);
    if (filter === 'due-soon') rows = rows.filter((t) => dueSoonIds.has(t.id));
    if (filter === 'completed') rows = rows.filter((t) => t.status === 'completed');
    if (categoryFilter !== 'all') rows = rows.filter((t) => t.category === categoryFilter);
    if (branchFilter !== 'all') rows = rows.filter((t) => t.branchId === branchFilter);
    if (deptMode === 'mine' && currentUserDepartmentId) {
      rows = rows.filter((t) => t.departmentId === currentUserDepartmentId);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (t) => t.title.toLowerCase().includes(s)
          || t.code.toLowerCase().includes(s)
          || t.assigneeName.toLowerCase().includes(s),
      );
    }
    return rows;
  }, [tasks, filter, currentUserId, dueSoonIds, search, categoryFilter, branchFilter, deptMode, currentUserDepartmentId]);

  // ── Create dialog ─────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '',
    assigneeId: '', departmentId: '', branchId: '',
    clientId: '', vendorId: '',
    parentTaskId: '', tags: '',
    estimatedHours: '',
    watcherIds: [] as string[],
    priority: 'medium' as TaskPriority,
    category: 'operations' as TaskCategory,
    dueDate: '',
  });
  useEffect(() => {
    if (!open) setForm((f) => ({ ...f, title: '', description: '', tags: '', parentTaskId: '' }));
  }, [open]);

  const handleCreate = (): void => {
    if (!entityCode) { toast.error('Select a company to continue'); return; }
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    const assignee = employees.find((e) => e.id === form.assigneeId);
    try {
      const task = createTask(entityCode, {
        title: form.title,
        description: form.description,
        assigneeId: form.assigneeId || null,
        assigneeName: assignee?.displayName ?? 'Unassigned',
        creatorId: currentUserId,
        departmentId: form.departmentId || null,
        branchId: form.branchId || null,
        clientId: form.clientId || null,
        vendorId: form.vendorId || null,
        parentTaskId: form.parentTaskId || null,
        watcherIds: form.watcherIds,
        tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : null,
        priority: form.priority,
        category: form.category,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        entityId: entityCode,
      });
      toast.success(`Task ${task.code} created`, {
        description: assignee ? `Assigned to ${assignee.displayName}` : 'Unassigned — pick an owner later',
      });
      setOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create task');
    }
  };

  const handleStatusChange = (task: Task, next: TaskStatus): void => {
    if (next === task.status) return;
    try {
      const updated = changeStatus(entityCode, task.id, next, currentUserId);
      toast.message(`${updated.code} · ${task.status} → ${next}`, { description: updated.title });
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Status change rejected');
    }
  };

  const titleText = filter === 'my' ? 'My Tasks'
    : filter === 'due-soon' ? 'Due Soon (24h)'
    : filter === 'completed' ? 'Completed' : 'All Tasks';

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            {titleText}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            {filtered.length} of {tasks.length}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none gap-1"
              onClick={() => setView('list')}
            >
              <ListIcon className="h-4 w-4" /> List
            </Button>
            <Button
              variant={view === 'board' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none gap-1"
              onClick={() => setView('board')}
            >
              <LayoutGrid className="h-4 w-4" /> Board
            </Button>
          </div>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="pl-8 w-56 rounded-lg"
            />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-lg gap-2"><Plus className="h-4 w-4" /> New Task</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto">
                <div className="grid gap-2">
                  <Label htmlFor="tf-title">Title *</Label>
                  <Input id="tf-title" value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Reconcile vendor invoices for March" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tf-desc">Description</Label>
                  <Textarea id="tf-desc" rows={3} value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <PickerField label="Assignee" value={form.assigneeId}
                    onChange={(v) => setForm({ ...form, assigneeId: v })}
                    options={employees.map((e) => ({ value: e.id, label: `${e.displayName} · ${e.empCode}` }))} />
                  <PickerField label="Department" value={form.departmentId}
                    onChange={(v) => setForm({ ...form, departmentId: v })}
                    options={departments.map((d) => ({ value: d.id, label: `${d.name} · ${d.code}` }))} />
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as TaskCategory })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as TaskPriority })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tf-branch">Branch</Label>
                    <Input id="tf-branch" value={form.branchId}
                      onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                      placeholder="e.g. BR-MUM-01" />
                  </div>
                  <PickerField label="Parent task (optional)" value={form.parentTaskId}
                    onChange={(v) => setForm({ ...form, parentTaskId: v })}
                    options={tasks.map((t) => ({ value: t.id, label: `${t.code} · ${t.title}` }))} />
                  <PickerField label="Customer" value={form.clientId}
                    onChange={(v) => setForm({ ...form, clientId: v })}
                    options={customers.map((p) => ({ value: p.id, label: `${p.party_name} · ${p.party_code}` }))} />
                  <PickerField label="Vendor" value={form.vendorId}
                    onChange={(v) => setForm({ ...form, vendorId: v })}
                    options={vendors.map((p) => ({ value: p.id, label: `${p.party_name} · ${p.party_code}` }))} />
                  <div className="grid gap-2">
                    <Label htmlFor="tf-hrs">Estimated hours</Label>
                    <Input id="tf-hrs" type="number" min="0" step="0.5" value={form.estimatedHours}
                      onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tf-due">Due date</Label>
                    <Input id="tf-due" type="date" value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                  </div>
                  <div className="grid gap-2 col-span-2">
                    <Label htmlFor="tf-tags">Tags (comma-separated)</Label>
                    <Input id="tf-tags" value={form.tags}
                      onChange={(e) => setForm({ ...form, tags: e.target.value })}
                      placeholder="audit, q4, urgent" />
                  </div>
                  <div className="grid gap-2 col-span-2">
                    <Label>Watchers</Label>
                    <Select
                      value=""
                      onValueChange={(v) => {
                        setForm((f) => ({
                          ...f,
                          watcherIds: f.watcherIds.includes(v) ? f.watcherIds : [...f.watcherIds, v],
                        }));
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Add watcher…" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.displayName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.watcherIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {form.watcherIds.map((id) => {
                          const e = employees.find((x) => x.id === id);
                          return (
                            <Badge key={id} variant="outline" className="cursor-pointer"
                              onClick={() => setForm((f) => ({ ...f, watcherIds: f.watcherIds.filter((x) => x !== id) }))}>
                              {e?.displayName ?? id} ×
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate}>Create Task</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Filter strip */}
      <Card className="rounded-2xl">
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as 'all' | TaskCategory)}>
              <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Branch</Label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {currentUserDepartmentId && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Department</Label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <Button size="sm" variant={deptMode === 'mine' ? 'default' : 'ghost'}
                  className="rounded-none" onClick={() => setDeptMode('mine')}>
                  My dept
                </Button>
                <Button size="sm" variant={deptMode === 'all' ? 'default' : 'ghost'}
                  className="rounded-none" onClick={() => setDeptMode('all')}>
                  All
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {view === 'list' ? (
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-base">Tasks</CardTitle></CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No tasks yet. Click <span className="font-medium">New Task</span> to create one.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => {
                    const nextStatuses = [t.status, ...TASK_STATUS_TRANSITIONS[t.status]];
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">
                          <Link to={`/erp/taskflow/task/${t.id}`} className="hover:underline">{t.code}</Link>
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link to={`/erp/taskflow/task/${t.id}`} className="hover:underline">{t.title}</Link>
                        </TableCell>
                        <TableCell className="text-sm">{t.assigneeName || '—'}</TableCell>
                        <TableCell className="text-xs font-mono">{t.category}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono">{t.priority}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{fmtDate(t.dueDate)}</TableCell>
                        <TableCell>
                          <Select value={t.status} onValueChange={(v) => handleStatusChange(t, v as TaskStatus)}>
                            <SelectTrigger className="h-8 w-[160px]">
                              <SelectValue>
                                <Badge variant={statusVariant(t.status)} className="font-mono">{t.status}</Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {nextStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {BOARD_LANES.map((lane) => {
            const cards = filtered.filter((t) => lane.statuses.includes(t.status));
            return (
              <Card key={lane.id} className="rounded-2xl">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{lane.label}</span>
                    <Badge variant="outline" className="font-mono">{cards.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-3">
                  {cards.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Empty</p>
                  )}
                  {cards.map((t) => (
                    <Link key={t.id} to={`/erp/taskflow/task/${t.id}`}
                      className="block p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                      <p className="font-mono text-xs text-muted-foreground">{t.code}</p>
                      <p className="text-sm font-medium mt-1">{t.title}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant={statusVariant(t.status)} className="font-mono text-[10px]">{t.status}</Badge>
                        <span className="text-[10px] font-mono text-muted-foreground">{t.priority}</span>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PickerField({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }): JSX.Element {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
        <SelectContent>
          {options.length === 0 && <SelectItem value="__none" disabled>No options</SelectItem>}
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
