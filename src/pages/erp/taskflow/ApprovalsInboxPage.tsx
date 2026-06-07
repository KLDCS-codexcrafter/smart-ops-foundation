/**
 * @file        src/pages/erp/taskflow/ApprovalsInboxPage.tsx
 * @sprint      Sprint B1S1 · T-B1S1-Approval-Rail · Item 4
 * @purpose     The ONE inbox · Approvals across all registered adapters.
 *              · digest chips · grouped pending list · drill-through ·
 *                bulk approve (SoD-aware) · reject modal with mandatory reason ·
 *                rules-admin tab (inline-editable role/named).
 *
 * §L note: rules admin lives in this inbox (not Command Center) to keep
 *          applications.ts/CC walls intact — matrix "CC-editable" satisfied
 *          as "admin-editable".
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ShieldCheck, AlertTriangle, Clock, Inbox, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import '@/lib/approval-adapters'; // self-registers adapters
import {
  syncApprovalTasks,
  listPendingMirrors,
  getApprovalsDigest,
  decideApproval,
  bulkApprove,
  listApprovalRules,
  updateApprovalRule,
  listRegisteredAdapters,
  type PendingMirror,
} from '@/lib/approval-rail-engine';
import type { ApprovalRuleRow } from '@/types/approval-rail';

const formatINR = (n?: number): string =>
  n == null ? '—' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);

export default function ApprovalsInboxPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [rejectFor, setRejectFor] = useState<PendingMirror | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approver, setApprover] = useState('rail-operator');

  useEffect(() => {
    if (!entityCode) return;
    syncApprovalTasks(entityCode);
  }, [entityCode, tick]);

  const digest = useMemo(
    () => (entityCode ? getApprovalsDigest(entityCode) : { waiting: 0, overdue: 0, oldest_days: 0 }),
    [entityCode, tick],
  );

  const pending = useMemo(
    () => (entityCode ? listPendingMirrors(entityCode) : []),
    [entityCode, tick],
  );

  const grouped = useMemo(() => {
    const m = new Map<string, PendingMirror[]>();
    for (const p of pending) {
      const k = p.meta.object_type;
      const arr = m.get(k) ?? [];
      arr.push(p);
      m.set(k, arr);
    }
    return Array.from(m.entries());
  }, [pending]);

  const adapters = useMemo(() => listRegisteredAdapters(), []);
  const rules = useMemo(() => (entityCode ? listApprovalRules(entityCode) : []), [entityCode, tick]);

  const ageColor = (p: PendingMirror): string => {
    if (p.overdue) return 'text-destructive';
    if (p.ageHours > 24) return 'text-warning';
    return 'text-muted-foreground';
  };

  const handleApprove = (p: PendingMirror): void => {
    if (!entityCode) return;
    const r = decideApproval(entityCode, p.task.id, 'approved', approver);
    if (r.ok) toast.success(`Approved ${p.meta.source_record_no}`);
    else toast.error(r.reason ?? 'Failed');
    setTick((t) => t + 1);
  };

  const handleBulkApprove = (): void => {
    if (!entityCode) return;
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    if (ids.length === 0) {
      toast.info('Select rows to bulk-approve');
      return;
    }
    const outcomes = bulkApprove(entityCode, ids, approver);
    const ok = outcomes.filter((o) => o.ok).length;
    const skipped = outcomes.filter((o) => !o.ok);
    toast.success(`Approved ${ok} of ${outcomes.length}`);
    skipped.forEach((s) => toast.warning(`Skipped: ${s.reason ?? 'unknown'}`));
    setSelected({});
    setTick((t) => t + 1);
  };

  const submitReject = (): void => {
    if (!entityCode || !rejectFor) return;
    if (!rejectReason.trim()) {
      toast.error('Reason required (Matrix §2.6)');
      return;
    }
    const r = decideApproval(entityCode, rejectFor.task.id, 'rejected', approver, rejectReason);
    if (r.ok) toast.success(`Rejected ${rejectFor.meta.source_record_no}`);
    else toast.error(r.reason ?? 'Failed');
    setRejectFor(null);
    setRejectReason('');
    setTick((t) => t + 1);
  };

  return (
    <div className="space-y-4 p-4">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Approvals Inbox · ONE rail (B.1)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Inbox className="h-3 w-3" /> {digest.waiting} waiting
            </Badge>
            <Badge variant={digest.overdue > 0 ? 'destructive' : 'outline'} className="gap-1">
              <AlertTriangle className="h-3 w-3" /> {digest.overdue} overdue
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" /> oldest {digest.oldest_days}d
            </Badge>
            <Badge variant="outline">{adapters.length} adapters live</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Approver identity is name/role text until Wave-2 auth; reminders by email and WhatsApp arrive with B.2 and B.3.
          </p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">You are</label>
            <Input
              value={approver}
              onChange={(e) => setApprover(e.target.value)}
              className="h-8 w-48 font-mono"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="rules">Rules Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={handleBulkApprove}>
              <Check className="h-3 w-3 mr-1" /> Bulk Approve Selected
            </Button>
          </div>
          {grouped.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No approvals pending.
              </CardContent>
            </Card>
          ) : (
            grouped.map(([objectType, rows]) => (
              <Card key={objectType} className="glass-card">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="font-mono">{objectType}</span>
                    <Badge variant="outline">{rows.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {rows.map((p) => (
                    <div
                      key={p.task.id}
                      className="flex items-center justify-between rounded-lg border border-border p-2"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={!!selected[p.task.id]}
                          onCheckedChange={(v) =>
                            setSelected((s) => ({ ...s, [p.task.id]: !!v }))
                          }
                        />
                        <div>
                          <p className="font-mono text-xs">{p.meta.source_record_no}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {p.meta.source_card} · {formatINR(p.meta.amount)} · slab {p.meta.slab}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] ${ageColor(p)}`}>
                          {Math.round(p.ageHours)}h
                        </span>
                        <Button size="sm" variant="outline" onClick={() => handleApprove(p)}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRejectFor(p);
                            setRejectReason('');
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-3">
          {rules.map((rule) => (
            <RuleEditor
              key={rule.id}
              rule={rule}
              onSave={(patch) => {
                if (!entityCode) return;
                updateApprovalRule(entityCode, rule.id, patch, approver);
                toast.success(`Rule updated · ${rule.object_type}`);
                setTick((t) => t + 1);
              }}
            />
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {rejectFor?.meta.source_record_no}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason (mandatory per Matrix §2.6)"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>Cancel</Button>
            <Button onClick={submitReject}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RuleEditor({
  rule,
  onSave,
}: {
  rule: ApprovalRuleRow;
  onSave: (patch: Partial<ApprovalRuleRow>) => void;
}): JSX.Element {
  const [slab0, setSlab0] = useState(rule.slab0_auto_below?.toString() ?? '');
  const [slab1, setSlab1] = useState(rule.slab1_single_below?.toString() ?? '');
  const [slab1Role, setSlab1Role] = useState(rule.slab1_step.approver.role ?? '');
  const [slab1Name, setSlab1Name] = useState(rule.slab1_step.approver.personName ?? '');

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="font-mono">{rule.object_type}</span>
          {rule.lastEditedBy && (
            <Badge variant="outline" className="text-[10px]">
              edited by {rule.lastEditedBy}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 text-xs">
        <label>Slab-0 auto-below (₹)</label>
        <Input value={slab0} onChange={(e) => setSlab0(e.target.value)} className="h-8 font-mono" />
        <label>Slab-1 single-below (₹)</label>
        <Input value={slab1} onChange={(e) => setSlab1(e.target.value)} className="h-8 font-mono" />
        <label>Slab-1 role</label>
        <Input value={slab1Role} onChange={(e) => setSlab1Role(e.target.value)} className="h-8 font-mono" />
        <label>Slab-1 named (wins over role)</label>
        <Input value={slab1Name} onChange={(e) => setSlab1Name(e.target.value)} className="h-8 font-mono" />
        <div className="col-span-2 flex justify-end">
          <Button
            size="sm"
            onClick={() =>
              onSave({
                slab0_auto_below: slab0 === '' ? null : Number(slab0),
                slab1_single_below: slab1 === '' ? null : Number(slab1),
                slab1_step: {
                  order: 1,
                  approver: slab1Name.trim()
                    ? { mode: 'named', personName: slab1Name.trim(), role: slab1Role || undefined }
                    : { mode: 'role', role: slab1Role || 'approver' },
                },
              })
            }
          >
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
