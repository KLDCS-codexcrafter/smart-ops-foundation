/**
 * @file        src/pages/erp/taskflow/TaskRoomPage.tsx
 * @purpose     TaskRoom · 8-tab single-task workbench (TF-17 · S137.R1 Block R4)
 * @sprint      Sprint 137.R1 · T-TaskFlow-A641.1 · Pillar A.6.4 · TaskFlow Arc opener
 * @decisions   LIVE tabs: Summary · Sub-tasks · Activity (hash-chain + verify badge)
 *              PLACEHOLDER tabs: Discussion (comments read-only) · Checklist ·
 *              Documents · Approvals · Expenses · Evidence — labelled S138/S139/S141/S143.
 *              Reassign + Change-Due-Date dialogs (reason mandatory · UI-enforced + engine-enforced).
 *              Status transition control honors TASK_STATUS_TRANSITIONS map.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Shell } from '@/shell';
import { taskflowShellConfig } from '@/apps/erp/configs/taskflow-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, BadgeCheck, ShieldCheck, ShieldAlert } from 'lucide-react';
import {
  getTask, changeStatus, acknowledgeTask, reassignTask, changeDueDate,
  getSubTasks, getBlockingBadges, getTaskAuditChain, verifyAuditChain,
  getReassignmentTrail, getDueDateHistory, listComments, addComment,
} from '@/lib/taskflow-engine';
import {
  listApprovalChains, getTaskApprovalState, submitTaskForApproval,
  approveTaskStep, rejectTaskStep, raiseBlocked,
} from '@/lib/taskflow-governance-engine';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEmployees } from '@/hooks/useEmployees';
import type { Task, TaskStatus, TaskApprovalChain } from '@/types/taskflow';
import { TASK_STATUS_TRANSITIONS } from '@/types/taskflow';

const PLACEHOLDER_TABS = [
  { id: 'checklist',  label: 'Checklist',  arrives: 'S139' },
  { id: 'documents',  label: 'Documents',  arrives: 'S141' },
  { id: 'expenses',   label: 'Expenses',   arrives: 'S143' },
  { id: 'evidence',   label: 'Evidence',   arrives: 'S141' },
];

export default function TaskRoomPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { entityCode } = useEntityCode();
  const { employees } = useEmployees();
  const { entitlements, profile } = useCardEntitlement();
  const currentUserId = 'me'; // [JWT] integrate mock-auth current user id

  const [task, setTask] = useState<Task | null>(() =>
    id ? getTask(entityCode, id) : null,
  );
  const refresh = useCallback(() => {
    if (id) setTask(getTask(entityCode, id));
  }, [id, entityCode]);
  useEffect(() => { refresh(); }, [refresh]);

  const subTasks = useMemo(() => (id ? getSubTasks(entityCode, id) : []), [entityCode, id, task]); // eslint-disable-line react-hooks/exhaustive-deps
  const blockers = useMemo(() => (id ? getBlockingBadges(entityCode, id) : []), [entityCode, id, task]); // eslint-disable-line react-hooks/exhaustive-deps
  const auditChain = useMemo(() => (id ? getTaskAuditChain(entityCode, id) : []), [entityCode, id, task]); // eslint-disable-line react-hooks/exhaustive-deps
  const chainVerdict = useMemo(() => (id ? verifyAuditChain(entityCode, id) : { valid: true }), [entityCode, id, task]); // eslint-disable-line react-hooks/exhaustive-deps
  const reassignments = useMemo(() => (id ? getReassignmentTrail(entityCode, id) : []), [entityCode, id, task]); // eslint-disable-line react-hooks/exhaustive-deps
  const dueHistory = useMemo(() => (id ? getDueDateHistory(entityCode, id) : []), [entityCode, id, task]); // eslint-disable-line react-hooks/exhaustive-deps
  const comments = useMemo(() => (id ? listComments(entityCode, id) : []), [entityCode, id, task]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAcknowledge = (): void => {
    if (!task) return;
    try {
      acknowledgeTask(entityCode, task.id, currentUserId);
      toast.success('Task acknowledged');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Acknowledge failed');
    }
  };

  const handleStatusChange = (next: TaskStatus): void => {
    if (!task || next === task.status) return;
    try {
      changeStatus(entityCode, task.id, next, currentUserId);
      toast.message(`Status → ${next}`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Transition rejected');
    }
  };

  const renderBody = (): JSX.Element => {
    if (!task) {
      return (
        <div className="p-6">
          <Button variant="ghost" onClick={() => navigate('/erp/taskflow')} className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <p className="text-sm text-muted-foreground">Task not found.</p>
        </div>
      );
    }
    const nextStatuses = [task.status, ...TASK_STATUS_TRANSITIONS[task.status]];
    const canAcknowledge = task.assigneeId === currentUserId && !task.acknowledgedAt;

    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/erp/taskflow')} className="gap-2 mb-2">
              <ArrowLeft className="h-4 w-4" /> All Tasks
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
            <p className="font-mono text-xs text-muted-foreground mt-1">
              {task.code} · {task.category} · {task.priority}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canAcknowledge && (
              <Button variant="outline" onClick={handleAcknowledge} className="gap-2">
                <BadgeCheck className="h-4 w-4" /> Acknowledge
              </Button>
            )}
            <ReassignDialog task={task} employees={employees} entityCode={entityCode}
              currentUserId={currentUserId} onDone={refresh} />
            <ChangeDueDialog task={task} entityCode={entityCode}
              currentUserId={currentUserId} onDone={refresh} />
            <BlockedDialog task={task} employees={employees} entityCode={entityCode}
              currentUserId={currentUserId} onDone={refresh} />
            <Select value={task.status} onValueChange={(v) => handleStatusChange(v as TaskStatus)}>
              <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {nextStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="subtasks">Sub-tasks ({subTasks.length})</TabsTrigger>
            <TabsTrigger value="activity">Activity ({auditChain.length})</TabsTrigger>
            {PLACEHOLDER_TABS.map((p) => (
              <TabsTrigger key={p.id} value={p.id}>{p.label}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="summary">
            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
                <Field label="Assignee" value={task.assigneeName || '—'} />
                <Field label="Department" value={task.departmentId || '—'} />
                <Field label="Branch" value={task.branchId || '—'} />
                <Field label="Due date" value={task.dueDate ?? '—'} />
                <Field label="Estimated hours" value={String(task.estimatedHours ?? '—')} />
                <Field label="Acknowledged" value={task.acknowledgedAt ? `${task.acknowledgedBy} · ${task.acknowledgedAt}` : 'Pending'} />
                <Field label="Tags" value={task.tags.join(', ') || '—'} />
                <Field label="Watchers" value={String(task.watcherIds.length)} />
                <div className="md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="mt-1 whitespace-pre-wrap">{task.description || '—'}</p>
                </div>
                {reassignments.length > 0 && (
                  <div className="md:col-span-2">
                    <Label className="text-xs text-muted-foreground">Reassignment history</Label>
                    <ul className="mt-1 text-xs space-y-1">
                      {reassignments.map((r) => (
                        <li key={r.id} className="font-mono">
                          {r.timestamp} · {r.fromUserId ?? '—'} → {r.toUserId} · {r.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {dueHistory.length > 0 && (
                  <div className="md:col-span-2">
                    <Label className="text-xs text-muted-foreground">Due-date history</Label>
                    <ul className="mt-1 text-xs space-y-1">
                      {dueHistory.map((r) => (
                        <li key={r.id} className="font-mono">
                          {r.timestamp} · {r.oldDate ?? '—'} → {r.newDate ?? '—'} · {r.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subtasks">
            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base">Sub-tasks</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {blockers.length > 0 && (
                  <div className="rounded-lg border border-destructive/50 p-3 bg-destructive/5">
                    <p className="text-xs font-medium mb-2">Blocked by:</p>
                    <div className="flex flex-wrap gap-2">
                      {blockers.map((b) => (
                        <Badge key={b.taskId} variant="destructive" className="font-mono text-[10px]">
                          {b.code} · {b.status}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {subTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No sub-tasks.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {subTasks.map((s) => (
                      <li key={s.id} className="py-2 flex items-center justify-between">
                        <div>
                          <p className="font-mono text-xs">{s.code}</p>
                          <p className="text-sm">{s.title}</p>
                        </div>
                        <Badge variant="outline" className="font-mono">{s.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Activity · hash-chained</CardTitle>
                {chainVerdict.valid ? (
                  <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3" /> Chain verified</Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <ShieldAlert className="h-3 w-3" /> Tampering at index {chainVerdict.breakIndex}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {auditChain.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No activity.</p>
                ) : (
                  <ul className="space-y-2 text-xs font-mono">
                    {[...auditChain].reverse().map((e) => (
                      <li key={e.id} className="border border-border rounded-lg p-2">
                        <p>{e.timestamp} · {e.action} · {e.userId}</p>
                        <p className="text-muted-foreground truncate">prev: {e.prevHash.slice(0, 16)}…</p>
                        <p className="text-muted-foreground truncate">hash: {e.entryHash.slice(0, 16)}…</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {PLACEHOLDER_TABS.map((p) => (
            <TabsContent key={p.id} value={p.id}>
              <Card className="rounded-2xl">
                <CardHeader><CardTitle className="text-base">{p.label}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">Arriving {p.arrives}.</p>
                  {p.id === 'discussion' && comments.length > 0 && (
                    <ul className="divide-y divide-border mt-3">
                      {comments.map((c) => (
                        <li key={c.id} className="py-2">
                          <p className="text-xs font-mono text-muted-foreground">{c.author_name} · {c.created_at}</p>
                          <p className="text-sm">{c.body}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  };

  return (
    <Shell
      config={taskflowShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      breadcrumbs={[
        { label: 'ERP', href: '/erp/dashboard' },
        { label: 'TaskFlow', href: '/erp/taskflow' },
        { label: task?.code ?? 'Task' },
      ]}
      onSidebarItemClick={(item) => {
        if (item.id === 'landing') navigate('/erp/taskflow');
        else navigate(`/erp/taskflow#${item.id}`);
      }}
    >
      {renderBody()}
    </Shell>
  );
}

function Field({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="mt-1 font-mono">{value}</p>
    </div>
  );
}

// ── Reassign dialog ────────────────────────────────────────────────────────
interface ReassignProps {
  task: Task;
  employees: { id: string; displayName: string; empCode?: string }[];
  entityCode: string;
  currentUserId: string;
  onDone: () => void;
}
function ReassignDialog({ task, employees, entityCode, currentUserId, onDone }: ReassignProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [toUserId, setToUserId] = useState('');
  const [reason, setReason] = useState('');
  const submit = (): void => {
    if (!toUserId) { toast.error('Pick an assignee'); return; }
    if (!reason.trim()) { toast.error('Reason is required'); return; }
    try {
      const u = employees.find((e) => e.id === toUserId);
      reassignTask(entityCode, task.id, toUserId, reason, currentUserId, u?.displayName ?? '');
      toast.success('Task reassigned');
      setOpen(false); setToUserId(''); setReason(''); onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reassign failed');
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm">Reassign</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Reassign task</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <Label>New assignee</Label>
          <Select value={toUserId} onValueChange={setToUserId}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.displayName}</SelectItem>)}
            </SelectContent>
          </Select>
          <Label>Reason *</Label>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Reassign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Change due-date dialog ─────────────────────────────────────────────────
interface ChangeDueProps {
  task: Task;
  entityCode: string;
  currentUserId: string;
  onDone: () => void;
}
function ChangeDueDialog({ task, entityCode, currentUserId, onDone }: ChangeDueProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [newDate, setNewDate] = useState(task.dueDate?.slice(0, 10) ?? '');
  const [reason, setReason] = useState('');
  const submit = (): void => {
    if (!reason.trim()) { toast.error('Reason is required'); return; }
    try {
      changeDueDate(entityCode, task.id, newDate ? new Date(newDate).toISOString() : null, reason, currentUserId);
      toast.success('Due date updated');
      setOpen(false); setReason(''); onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Change failed');
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm">Due date</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Change due date</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <Label>New due date</Label>
          <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <Label>Reason *</Label>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
