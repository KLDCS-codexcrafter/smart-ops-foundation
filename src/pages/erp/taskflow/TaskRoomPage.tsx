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
import {
  listChecklistItems, addChecklistItem, toggleChecklistItem, removeChecklistItem,
  getChecklistProgress, listWorkflows, applyWorkflowToTask, getWorkflowProgress,
} from '@/lib/taskflow-workflow-engine';
import { listMessages, sendMessage } from '@/lib/operix-chat-engine';
import { ensureTaskConversation } from './ensureTaskConversation';
import {
  listExpensesForTask, createExpense, submitExpense, approveExpense,
  rejectExpense, markReimbursed, getTaskExpenseTotals,
  listEvidenceForTask, createEvidence, evaluateClosePolicy,
  listIndiaGstRates, listTdsSections,
} from '@/lib/taskflow-accountability-engine';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEmployees } from '@/hooks/useEmployees';
import type {
  Task, TaskStatus, TaskApprovalChain, TaskWorkflowTemplate,
  TaskExpense, TaskEvidence,
} from '@/types/taskflow';
import type { Conversation, ChatMessage } from '@/types/operix-chat';
import { TASK_STATUS_TRANSITIONS } from '@/types/taskflow';

const PLACEHOLDER_TABS = [
  { id: 'documents',  label: 'Documents',  arrives: 'S143' },
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
            <TabsTrigger value="discussion">Discussion ({comments.length})</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
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

          <TabsContent value="discussion">
            <DiscussionTab task={task} entityCode={entityCode}
              currentUserId={currentUserId} comments={comments} onDone={refresh} />
          </TabsContent>

          <TabsContent value="approvals">
            <ApprovalsTab task={task} entityCode={entityCode}
              currentUserId={currentUserId} onDone={refresh} />
          </TabsContent>

          <TabsContent value="checklist">
            <ChecklistTab task={task} entityCode={entityCode}
              currentUserId={currentUserId} onDone={refresh} />
          </TabsContent>

          <TabsContent value="chat">
            <ChatTab task={task} entityCode={entityCode} currentUserId={currentUserId} />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpensesTab task={task} entityCode={entityCode} currentUserId={currentUserId} />
          </TabsContent>

          <TabsContent value="evidence">
            <EvidenceTab task={task} entityCode={entityCode} currentUserId={currentUserId} />
          </TabsContent>



          {PLACEHOLDER_TABS.map((p) => (
            <TabsContent key={p.id} value={p.id}>
              <Card className="rounded-2xl">
                <CardHeader><CardTitle className="text-base">{p.label}</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Arriving {p.arrives}.</p>
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

// ═════════════════════════════════════════════════════════════════════════
// S138.T1 · Discussion tab · TaskCommentModel + @mention picker + internal toggle
// ═════════════════════════════════════════════════════════════════════════
interface DiscussionProps {
  task: Task;
  entityCode: string;
  currentUserId: string;
  comments: { id: string; userId: string; createdAt: string; content: string; isInternal: boolean; mentions: string[] }[];
  onDone: () => void;
}
function DiscussionTab({ task, entityCode, currentUserId, comments, onDone }: DiscussionProps): JSX.Element {
  const { employees } = useEmployees();
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [mentions, setMentions] = useState<string[]>([]);
  const addMention = (id: string): void => {
    if (!id || mentions.includes(id)) return;
    setMentions((m) => [...m, id]);
  };
  const removeMention = (id: string): void => {
    setMentions((m) => m.filter((x) => x !== id));
  };
  const post = (): void => {
    if (!body.trim()) { toast.error('Comment required'); return; }
    try {
      addComment(entityCode, task.id, body, currentUserId, currentUserId, {
        isInternal, mentions,
      });
      setBody(''); setIsInternal(false); setMentions([]);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Post failed');
    }
  };
  const nameFor = (id: string): string =>
    employees.find((e) => e.id === id)?.displayName ?? id;
  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle className="text-base">Discussion ({comments.length})</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Textarea rows={3} value={body} placeholder="Write a comment…"
            onChange={(e) => setBody(e.target.value)} />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)} />
              Internal note
            </label>
            <Select value="" onValueChange={addMention}>
              <SelectTrigger className="h-8 w-48"><SelectValue placeholder="@mention…" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mentions.map((id) => (
              <Badge key={id} variant="outline" className="cursor-pointer"
                onClick={() => removeMention(id)}>
                @{nameFor(id)} ×
              </Badge>
            ))}
            <div className="ml-auto">
              <Button size="sm" onClick={post}>Post comment</Button>
            </div>
          </div>
        </div>
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No comments yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {[...comments].reverse().map((c) => (
              <li key={c.id} className="py-2">
                <p className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                  <span>{nameFor(c.userId)} · {c.createdAt}</span>
                  {c.isInternal && <Badge variant="secondary" className="text-[10px]">internal</Badge>}
                </p>
                <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                {c.mentions.length > 0 && (
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">
                    mentions: {c.mentions.map(nameFor).map((n) => `@${n}`).join(' ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// S138 · Approvals tab · chain picker + submit + step-level approve/reject
// ═════════════════════════════════════════════════════════════════════════
interface ApprovalsProps {
  task: Task;
  entityCode: string;
  currentUserId: string;
  onDone: () => void;
}
function ApprovalsTab({ task, entityCode, currentUserId, onDone }: ApprovalsProps): JSX.Element {
  const chains = useMemo(() => listApprovalChains(entityCode), [entityCode]);
  const [chainId, setChainId] = useState<string>('');
  const [state, setState] = useState(() => getTaskApprovalState(entityCode, task.id));
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');

  const refresh = (): void => {
    setState(getTaskApprovalState(entityCode, task.id));
    onDone();
  };

  const submit = (): void => {
    if (!chainId) { toast.error('Pick a chain'); return; }
    try {
      submitTaskForApproval(entityCode, task.id, chainId, currentUserId);
      toast.success('Submitted for approval');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submit failed');
    }
  };

  const approve = (): void => {
    try {
      const r = approveTaskStep(entityCode, task.id, currentUserId, comments);
      toast.success(r.final ? 'Final approval recorded' : 'Step approved · next step opened');
      setComments('');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approve failed');
    }
  };

  const reject = (): void => {
    if (!reason.trim()) { toast.error('Reason required'); return; }
    try {
      rejectTaskStep(entityCode, task.id, currentUserId, reason);
      toast.success('Rejected');
      setReason('');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reject failed');
    }
  };

  const canSubmit = task.status === 'in_review' && state.steps.length === 0;
  const currentStep = state.steps.find((s) => s.id === state.currentStepId) ?? null;

  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle className="text-base">Approvals</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {state.steps.length === 0 && (
          <div className="space-y-2">
            <Label>Approval chain</Label>
            <Select value={chainId} onValueChange={setChainId}>
              <SelectTrigger><SelectValue placeholder={chains.length === 0 ? 'No chains configured' : 'Select…'} /></SelectTrigger>
              <SelectContent>
                {chains.map((c: TaskApprovalChain) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.isDefault ? ' · default' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end">
              <Button disabled={!canSubmit || !chainId} onClick={submit}>
                Submit for approval
              </Button>
            </div>
            {!canSubmit && (
              <p className="text-xs text-muted-foreground">
                Submit requires task status = in_review (current: {task.status}).
              </p>
            )}
          </div>
        )}

        {state.steps.length > 0 && (
          <>
            <ul className="space-y-2">
              {state.steps.map((s) => (
                <li key={s.id} className="flex items-center justify-between border border-border rounded-lg p-2">
                  <div>
                    <p className="text-sm">Step #{s.order} · approver {s.approverId}</p>
                    {s.comments && <p className="text-xs text-muted-foreground">“{s.comments}”</p>}
                  </div>
                  <Badge variant={s.status === 'approved' ? 'secondary'
                    : s.status === 'rejected' ? 'destructive' : 'outline'}>
                    {s.status}
                  </Badge>
                </li>
              ))}
            </ul>

            {currentStep && (
              <div className="grid gap-3 border border-border rounded-lg p-3">
                <p className="text-sm font-medium">Decide step #{currentStep.order}</p>
                <Label>Comments (optional for approve)</Label>
                <Textarea rows={2} value={comments} onChange={(e) => setComments(e.target.value)} />
                <Label>Reason (required for reject)</Label>
                <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <Button variant="destructive" onClick={reject}>Reject</Button>
                  <Button onClick={approve}>Approve</Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// S138 · I'm-Blocked dialog (TF-33)
// ═════════════════════════════════════════════════════════════════════════
interface BlockedDialogProps {
  task: Task;
  employees: { id: string; displayName: string; empCode?: string }[];
  entityCode: string;
  currentUserId: string;
  onDone: () => void;
}
function BlockedDialog({ task, employees, entityCode, currentUserId, onDone }: BlockedDialogProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [blockedByUserId, setBlockedByUserId] = useState('');
  const [blockedByDep, setBlockedByDep] = useState('');
  const [reason, setReason] = useState('');
  const [moveToOnHold, setMoveToOnHold] = useState(false);
  const submit = (): void => {
    if (!reason.trim()) { toast.error('Reason is required'); return; }
    if (!blockedByUserId && !blockedByDep.trim()) {
      toast.error('Specify blocker user or dependency'); return;
    }
    try {
      raiseBlocked(entityCode, {
        taskId: task.id,
        reason,
        raisedByUserId: currentUserId,
        blockedByUserId: blockedByUserId || null,
        blockedByDependency: blockedByDep.trim() || null,
        moveToOnHold,
      });
      toast.success('Blocker raised');
      setOpen(false); setReason(''); setBlockedByUserId(''); setBlockedByDep(''); setMoveToOnHold(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Raise blocked failed');
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm">I’m Blocked</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Raise blocker</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <Label>Blocked by (user)</Label>
          <Select value={blockedByUserId} onValueChange={setBlockedByUserId}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.displayName}</SelectItem>)}
            </SelectContent>
          </Select>
          <Label>Blocked by (dependency · free text)</Label>
          <Input value={blockedByDep} onChange={(e) => setBlockedByDep(e.target.value)} />
          <Label>Reason *</Label>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={moveToOnHold}
              onChange={(e) => setMoveToOnHold(e.target.checked)} />
            Also move task to on_hold (if legal from current status)
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Raise blocker</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// S139 · Checklist tab · TF-14-full (live · dependency-enforced · workflow apply)
// ═════════════════════════════════════════════════════════════════════════
interface ChecklistProps {
  task: Task;
  entityCode: string;
  currentUserId: string;
  onDone: () => void;
}
function ChecklistTab({ task, entityCode, currentUserId, onDone }: ChecklistProps): JSX.Element {
  const [items, setItems] = useState(() => listChecklistItems(entityCode, task.id));
  const [progress, setProgress] = useState(() => getChecklistProgress(entityCode, task.id));
  const [workflows, setWorkflows] = useState<TaskWorkflowTemplate[]>(() => listWorkflows(entityCode));
  const [wfProgress, setWfProgress] = useState(() => getWorkflowProgress(entityCode, task.id));
  const refresh = useCallback((): void => {
    setItems(listChecklistItems(entityCode, task.id));
    setProgress(getChecklistProgress(entityCode, task.id));
    setWorkflows(listWorkflows(entityCode));
    setWfProgress(getWorkflowProgress(entityCode, task.id));
    onDone();
  }, [entityCode, task.id, onDone]);
  useEffect(() => { refresh(); }, [refresh]);

  const [title, setTitle] = useState('');
  const [isMilestone, setIsMilestone] = useState(false);
  const [dependsOn, setDependsOn] = useState('');
  const [workflowId, setWorkflowId] = useState('');

  const add = (): void => {
    if (!title.trim()) { toast.error('Title required'); return; }
    try {
      addChecklistItem(entityCode, {
        taskId: task.id, title, isMilestone,
        dependsOn: dependsOn || undefined,
      }, currentUserId);
      setTitle(''); setIsMilestone(false); setDependsOn('');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Add failed');
    }
  };

  const toggle = (id: string): void => {
    try {
      toggleChecklistItem(entityCode, id, currentUserId);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Toggle blocked');
    }
  };

  const remove = (id: string): void => {
    removeChecklistItem(entityCode, id, currentUserId);
    refresh();
  };

  const applyWf = (): void => {
    if (!workflowId) return;
    try {
      const spawned = applyWorkflowToTask(entityCode, task.id, workflowId, currentUserId);
      toast.success(`Workflow applied · ${spawned.length} stage${spawned.length === 1 ? '' : 's'} added`);
      setWorkflowId('');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Apply failed');
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
          <span>Checklist ({progress.done}/{progress.total})</span>
          <div className="flex items-center gap-2 text-xs">
            {progress.milestonesPending > 0 && (
              <Badge variant="destructive" className="font-mono">{progress.milestonesPending} milestone(s) pending</Badge>
            )}
            {wfProgress && (
              <Badge variant="outline" className="font-mono">
                Workflow {wfProgress.done}/{wfProgress.total}{wfProgress.pendingStage ? ` · ${wfProgress.pendingStage}` : ''}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {workflows.length > 0 && !wfProgress && (
          <div className="flex items-end gap-2 border border-border rounded-lg p-3">
            <div className="flex-1">
              <Label className="text-xs">Apply workflow</Label>
              <Select value={workflowId} onValueChange={setWorkflowId}>
                <SelectTrigger><SelectValue placeholder="Select workflow…" /></SelectTrigger>
                <SelectContent>
                  {workflows.filter((w) => w.isActive).map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name} · {w.stages.length} stage(s)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" disabled={!workflowId} onClick={applyWf}>Apply</Button>
          </div>
        )}
        <div className="grid gap-2 border border-border rounded-lg p-3">
          <Label className="text-xs">Add checklist item</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing…" />
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={isMilestone}
                onChange={(e) => setIsMilestone(e.target.checked)} />
              Milestone (blocks task completion)
            </label>
            <Select value={dependsOn} onValueChange={setDependsOn}>
              <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Depends on (optional)" /></SelectTrigger>
              <SelectContent>
                {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="ml-auto">
              <Button size="sm" onClick={add}>Add</Button>
            </div>
          </div>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No checklist items yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((i) => {
              const pred = i.dependsOn ? items.find((x) => x.id === i.dependsOn) : null;
              return (
                <li key={i.id} className="py-2 flex items-start gap-3">
                  <input type="checkbox" checked={i.isCompleted}
                    onChange={() => toggle(i.id)} className="mt-1" />
                  <div className="flex-1">
                    <p className={`text-sm ${i.isCompleted ? 'line-through text-muted-foreground' : ''}`}>{i.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {i.isMilestone && <Badge variant="destructive" className="text-[10px]">milestone</Badge>}
                      {pred && (
                        <Badge variant="outline" className="text-[10px] font-mono">depends on: {pred.title}</Badge>
                      )}
                      {i.completedAt && (
                        <span className="text-[10px] font-mono text-muted-foreground">{i.completedAt}</span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive"
                    onClick={() => remove(i.id)}>Remove</Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// S140.T1 · Chat tab · finishes the TaskRoom ⇄ OperixChat bridge
// Finds-or-creates a task-linked conversation; idempotent on re-mount.
// ═════════════════════════════════════════════════════════════════════════
interface ChatTabProps {
  task: Task;
  entityCode: string;
  currentUserId: string;
}

// ensureTaskConversation lives in ./ensureTaskConversation (kept out of this file
// for react-refresh/only-export-components compliance).


function ChatTab({ task, entityCode, currentUserId }: ChatTabProps): JSX.Element {
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');

  const reload = useCallback((conv: Conversation): void => {
    setMessages(listMessages(entityCode, conv.id));
  }, [entityCode]);

  useEffect(() => {
    const conv = ensureTaskConversation(task, entityCode, currentUserId);
    setConversation(conv);
    setMessages(listMessages(entityCode, conv.id));
  }, [task, entityCode, currentUserId]);

  const handleSend = (): void => {
    if (!conversation) return;
    if (!draft.trim()) { toast.error('Message required'); return; }
    try {
      sendMessage(entityCode, conversation.id, {
        senderId: currentUserId, type: 'text', content: draft.trim(),
      });
      setDraft('');
      reload(conversation);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed');
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">
          Chat {conversation ? `· ${conversation.title}` : ''}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => navigate('/erp/taskflow#chat')}>
          Open in Inbox
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No messages yet.</p>
        ) : (
          <ul className="divide-y divide-border max-h-80 overflow-y-auto">
            {messages.map((m) => (
              <li key={m.id} className="py-2">
                <p className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                  <span>{m.senderId} · {m.createdAt}</span>
                  {m.isInternalNote && <Badge variant="secondary" className="text-[10px]">internal</Badge>}
                  {m.type === 'voice' && <Badge variant="outline" className="text-[10px]">voice</Badge>}
                </p>
                {m.deletedAt ? (
                  <p className="text-sm italic text-muted-foreground">[deleted]</p>
                ) : m.type === 'voice' ? (
                  <audio controls src={m.content} className="mt-1 h-8" />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-end gap-2">
          <Textarea rows={2} value={draft} placeholder="Write a message…"
            onChange={(e) => setDraft(e.target.value)} />
          <Button size="sm" onClick={handleSend}>Send</Button>
        </div>
      </CardContent>
    </Card>
  );
}
