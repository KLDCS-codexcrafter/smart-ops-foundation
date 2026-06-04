/**
 * @file        src/pages/erp/taskflow/TaskFlowAllTasksPage.tsx
 * @purpose     TaskFlow CRUD UI · list + create dialog + status changes · Block 4/5
 * @sprint      Sprint 137 · T-TaskFlow-A641.1 · Phase 8 OPENER · Pass 2
 * @decisions   FR-44 SSOT pickers: useEmployees · useOrgStructure · loadPartiesByType
 *              Block 5 sonner toasts on assigned + status changed (2 events)
 *              Filter prop drives 'all' / 'my' / 'due-soon' / 'completed' variants
 */
import { useMemo, useState, useEffect } from 'react';
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
import { Plus, Search, ListChecks } from 'lucide-react';
import {
  createTask, listTasks, changeStatus, listDueWithin24h,
} from '@/lib/taskflow-engine';
import type { Task, TaskPriority, TaskStatus } from '@/types/taskflow';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEmployees } from '@/hooks/useEmployees';
import { useOrgStructure } from '@/hooks/useOrgStructure';
import { loadPartiesByType } from '@/lib/party-master-engine';

type Filter = 'all' | 'my' | 'due-soon' | 'completed';

const PRIORITIES: TaskPriority[] = ['p0', 'p1', 'p2', 'p3'];
const NEXT_STATUSES: TaskStatus[] = ['open', 'in_progress', 'blocked', 'done'];

const statusVariant = (s: TaskStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (s === 'done') return 'secondary';
  if (s === 'blocked') return 'destructive';
  if (s === 'in_progress') return 'default';
  return 'outline';
};

const fmtDate = (iso: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
};

interface Props {
  filter?: Filter;
  currentUserId?: string;
}

export default function TaskFlowAllTasksPage({ filter = 'all', currentUserId = 'me' }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const { employees } = useEmployees();
  const { departments } = useOrgStructure();
  const customers = useMemo(() => loadPartiesByType(entityCode, 'customer'), [entityCode]);
  const vendors = useMemo(() => loadPartiesByType(entityCode, 'vendor'), [entityCode]);

  const [tick, setTick] = useState(0);
  const refresh = (): void => setTick((n) => n + 1);

  const allTasks = useMemo<Task[]>(() => listTasks(entityCode), [entityCode, tick]);
  const dueSoonIds = useMemo(
    () => new Set(listDueWithin24h(entityCode).map((t) => t.id)),
    [entityCode, tick],
  );

  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    let rows = allTasks;
    if (filter === 'my') rows = rows.filter((t) => t.assignee_id === currentUserId);
    if (filter === 'due-soon') rows = rows.filter((t) => dueSoonIds.has(t.id));
    if (filter === 'completed') rows = rows.filter((t) => t.status === 'done');
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.title.toLowerCase().includes(s) ||
          t.code.toLowerCase().includes(s) ||
          t.assignee_name.toLowerCase().includes(s),
      );
    }
    return rows;
  }, [allTasks, filter, currentUserId, dueSoonIds, search]);

  // Create dialog state
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '',
    assignee_id: '', department_code: '',
    customer_id: '', vendor_id: '',
    priority: 'p2' as TaskPriority,
    due_at: '',
  });

  useEffect(() => { if (!open) setForm((f) => ({ ...f, title: '', description: '' })); }, [open]);

  const handleCreate = (): void => {
    if (!entityCode) {
      toast.error('Select a company to continue');
      return;
    }
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    const assignee = employees.find((e) => e.id === form.assignee_id);
    try {
      const task = createTask(entityCode, {
        title: form.title,
        description: form.description,
        assignee_id: form.assignee_id || null,
        assignee_name: assignee?.displayName ?? 'Unassigned',
        department_code: form.department_code || null,
        customer_id: form.customer_id || null,
        vendor_id: form.vendor_id || null,
        priority: form.priority,
        due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
        entity_id: entityCode,
        created_by: currentUserId,
      });
      // Block-5 event #1 · assigned
      toast.success(`Task ${task.code} created`, {
        description: assignee
          ? `Assigned to ${assignee.displayName}`
          : 'Unassigned — pick an owner later',
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
      const updated = changeStatus(entityCode, task.id, next);
      // Block-5 event #2 · status changed
      toast.message(`${updated.code} · ${task.status} → ${next}`, {
        description: updated.title,
      });
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Status change rejected');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            {filter === 'my' ? 'My Tasks'
              : filter === 'due-soon' ? 'Due Soon (24h)'
              : filter === 'completed' ? 'Completed'
              : 'All Tasks'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            {filtered.length} of {allTasks.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="pl-8 w-64 rounded-lg"
            />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-lg gap-2">
                <Plus className="h-4 w-4" /> New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Create Task</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="tf-title">Title *</Label>
                  <Input
                    id="tf-title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Reconcile vendor invoices for March"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tf-desc">Description</Label>
                  <Textarea
                    id="tf-desc"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Assignee</Label>
                    <Select
                      value={form.assignee_id}
                      onValueChange={(v) => setForm({ ...form, assignee_id: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {employees.length === 0 && (
                          <SelectItem value="__none" disabled>No employees</SelectItem>
                        )}
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.displayName} · {e.empCode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Department</Label>
                    <Select
                      value={form.department_code}
                      onValueChange={(v) => setForm({ ...form, department_code: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {departments.length === 0 && (
                          <SelectItem value="__none" disabled>No departments</SelectItem>
                        )}
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.code}>
                            {d.name} · {d.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Customer</Label>
                    <Select
                      value={form.customer_id}
                      onValueChange={(v) => setForm({ ...form, customer_id: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>
                        {customers.length === 0 && (
                          <SelectItem value="__none" disabled>No customers</SelectItem>
                        )}
                        {customers.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.party_name} · {p.party_code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Vendor</Label>
                    <Select
                      value={form.vendor_id}
                      onValueChange={(v) => setForm({ ...form, vendor_id: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>
                        {vendors.length === 0 && (
                          <SelectItem value="__none" disabled>No vendors</SelectItem>
                        )}
                        {vendors.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.party_name} · {p.party_code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Priority</Label>
                    <Select
                      value={form.priority}
                      onValueChange={(v) => setForm({ ...form, priority: v as TaskPriority })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tf-due">Due date</Label>
                    <Input
                      id="tf-due"
                      type="date"
                      value={form.due_at}
                      onChange={(e) => setForm({ ...form, due_at: e.target.value })}
                    />
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

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Tasks</CardTitle>
        </CardHeader>
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
                  <TableHead>Priority</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.code}</TableCell>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell className="text-sm">{t.assignee_name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        {t.priority.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{fmtDate(t.due_at)}</TableCell>
                    <TableCell>
                      <Select
                        value={t.status}
                        onValueChange={(v) => handleStatusChange(t, v as TaskStatus)}
                      >
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue>
                            <Badge variant={statusVariant(t.status)} className="font-mono">
                              {t.status}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {NEXT_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
