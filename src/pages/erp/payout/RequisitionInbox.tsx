/**
 * @file     RequisitionInbox.tsx
 * @purpose  PayOut · 2-tab inbox · Department-head queue + Accounts queue ·
 *           approve/reject/hold · detail dialog with full audit trail.
 * @sprint   T-T8.4-Requisition-Universal · Group B Sprint B.4
 *
 * Per Q-HH (a) · ANY operator can act as approver in Phase 1 · RBAC deferred.
 * [DEFERRED · Support & Back Office] dept-scoped filtering · email/SMS triggers ·
 *   inbox count badge in sidebar (Phase 1 = view count on this page only).
 *   See Future_Task_Register · Capabilities 1-3.
 */
import { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Inbox, Check, X, Pause, Play, FileText, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  PAYMENT_TYPE_LABELS, REQUISITION_STATUS_COLORS,
  type PaymentRequisition,
} from '@/types/payment-requisition';
import {
  listRequisitions, approveDeptLevel, approveAccountsLevel,
  rejectRequisition, holdRequisition, resumeRequisition,
} from '@/lib/payment-requisition-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

type ActionKind = 'approve' | 'reject' | 'hold';

export default function RequisitionInbox() {
  const entityCode = DEFAULT_ENTITY_SHORTCODE;
  const [refreshTick, setRefreshTick] = useState(0);
  const [tab, setTab] = useState<'dept' | 'accounts'>('dept');
  const [selected, setSelected] = useState<PaymentRequisition | null>(null);
  const [action, setAction] = useState<ActionKind | null>(null);
  const [comment, setComment] = useState('');

  const refresh = useCallback(() => setRefreshTick(t => t + 1), []);

  // `refreshTick` is an intentional cache-buster — bumping it must re-run listRequisitions.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const all = useMemo<PaymentRequisition[]>(
    () => listRequisitions(entityCode),
    [entityCode, refreshTick],
  );

  const deptQueue = all.filter(r => r.status === 'pending_dept_head');
  const accountsQueue = all.filter(r => r.status === 'pending_accounts');
  const onHoldQueue = all.filter(r => r.status === 'on_hold');

  const openAction = (req: PaymentRequisition, kind: ActionKind) => {
    setSelected(req); setAction(kind); setComment('');
  };

  const confirmAction = () => {
    if (!selected || !action) return;
    let result;
    if (action === 'approve') {
      result = selected.status === 'pending_dept_head'
        ? approveDeptLevel(entityCode, selected.id, comment)
        : approveAccountsLevel(entityCode, selected.id, comment);
    } else if (action === 'reject') {
      if (!comment.trim()) { toast.error('Reason required for rejection'); return; }
      result = rejectRequisition(entityCode, selected.id, comment);
    } else {
      if (!comment.trim()) { toast.error('Reason required for hold'); return; }
      result = holdRequisition(entityCode, selected.id, comment);
    }
    if (!result.ok) {
      toast.error(result.errors?.join('; ') ?? 'Action failed');
      return;
    }
    toast.success(
      action === 'approve' && result.voucherNo
        ? `Approved · voucher ${result.voucherNo} created`
        : action === 'approve' ? 'Approved'
        : action === 'reject' ? 'Rejected'
        : 'Put on hold'
    );
    setSelected(null); setAction(null); setComment('');
    refresh();
  };

  const handleResume = (req: PaymentRequisition) => {
    const r = resumeRequisition(entityCode, req.id);
    if (!r.ok) { toast.error(r.errors?.join('; ') ?? 'Failed'); return; }
    toast.success('Resumed');
    refresh();
  };

  const renderRows = (rows: PaymentRequisition[], showResume = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">Req ID</TableHead>
          <TableHead className="text-xs">Type</TableHead>
          <TableHead className="text-xs text-right">Amount</TableHead>
          <TableHead className="text-xs">Purpose</TableHead>
          <TableHead className="text-xs">Department</TableHead>
          <TableHead className="text-xs">Requested by</TableHead>
          <TableHead className="text-xs">Status</TableHead>
          <TableHead className="text-xs">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8 text-xs">No requisitions in this queue</TableCell></TableRow>
        )}
        {rows.map(req => (
          <TableRow key={req.id} className="hover:bg-muted/30">
            <TableCell className="font-mono text-[10px]">{req.id.slice(0, 18)}…</TableCell>
            <TableCell className="text-xs">{PAYMENT_TYPE_LABELS[req.request_type]}</TableCell>
            <TableCell className="text-xs text-right font-mono">₹{req.amount.toLocaleString('en-IN')}</TableCell>
            <TableCell className="text-xs max-w-48 truncate">{req.purpose}</TableCell>
            <TableCell className="text-xs">{req.department_name}</TableCell>
            <TableCell className="text-xs">{req.requested_by_name}</TableCell>
            <TableCell>
              <Badge variant="outline" className={REQUISITION_STATUS_COLORS[req.status] + ' text-[10px]'}>
                {req.status.replace(/_/g, ' ')}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 px-2"
                  onClick={() => { setSelected(req); setAction(null); }}>
                  <FileText className="h-3.5 w-3.5" />
                </Button>
                {!showResume && (
                  <>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600"
                      onClick={() => openAction(req, 'approve')}><Check className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600"
                      onClick={() => openAction(req, 'reject')}><X className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-orange-600"
                      onClick={() => openAction(req, 'hold')}><Pause className="h-3.5 w-3.5" /></Button>
                  </>
                )}
                {showResume && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-600"
                    onClick={() => handleResume(req)}><Play className="h-3.5 w-3.5" /></Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Inbox className="h-5 w-5 text-violet-500" /> Requisition Inbox
          </h1>
          <p className="text-xs text-muted-foreground">
            Department-head ({deptQueue.length}) · Accounts ({accountsQueue.length}) · On hold ({onHoldQueue.length})
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as 'dept' | 'accounts')}>
        <TabsList>
          <TabsTrigger value="dept">Department-head <Badge variant="outline" className="ml-2 text-[9px]">{deptQueue.length}</Badge></TabsTrigger>
          <TabsTrigger value="accounts">Accounts <Badge variant="outline" className="ml-2 text-[9px]">{accountsQueue.length}</Badge></TabsTrigger>
          <TabsTrigger value="on_hold">On Hold <Badge variant="outline" className="ml-2 text-[9px]">{onHoldQueue.length}</Badge></TabsTrigger>
        </TabsList>
        <TabsContent value="dept" className="mt-3">
          <Card className="rounded-2xl"><CardContent className="p-0">{renderRows(deptQueue)}</CardContent></Card>
        </TabsContent>
        <TabsContent value="accounts" className="mt-3">
          <Card className="rounded-2xl"><CardContent className="p-0">{renderRows(accountsQueue)}</CardContent></Card>
        </TabsContent>
        <TabsContent value="on_hold" className="mt-3">
          <Card className="rounded-2xl"><CardContent className="p-0">{renderRows(onHoldQueue, true)}</CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Detail / action dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setAction(null); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approve' : action === 'reject' ? 'Reject' : action === 'hold' ? 'Put on Hold' : 'Requisition Details'}
              {' · '}{selected ? PAYMENT_TYPE_LABELS[selected.request_type] : ''}
            </DialogTitle>
            <DialogDescription className="font-mono text-[10px]">{selected?.id}</DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-3 text-xs">
              <Card className="rounded-xl"><CardHeader className="pb-2"><CardTitle className="text-xs">Summary</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Amount:</span> <span className="font-mono font-semibold">₹{selected.amount.toLocaleString('en-IN')}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className={REQUISITION_STATUS_COLORS[selected.status]}>{selected.status}</Badge></div>
                  <div><span className="text-muted-foreground">Department:</span> {selected.department_name}</div>
                  <div><span className="text-muted-foreground">Requested by:</span> {selected.requested_by_name}</div>
                  {selected.vendor_name && <div className="col-span-2"><span className="text-muted-foreground">Vendor:</span> {selected.vendor_name}</div>}
                  {selected.employee_name && <div className="col-span-2"><span className="text-muted-foreground">Employee:</span> {selected.employee_name}</div>}
                  <div className="col-span-2"><span className="text-muted-foreground">Purpose:</span> {selected.purpose}</div>
                  {selected.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {selected.notes}</div>}
                  {selected.linked_payment_voucher_no && (
                    <div className="col-span-2"><span className="text-muted-foreground">Voucher:</span> <span className="font-mono">{selected.linked_payment_voucher_no}</span></div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl"><CardHeader className="pb-2"><CardTitle className="text-xs">Audit trail · {selected.approval_chain.length} entries</CardTitle></CardHeader>
                <CardContent className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selected.approval_chain.map((e, i) => (
                    <div key={`${selected.id}-${i}`} className="flex items-start justify-between text-[10px] border-b border-border/40 pb-1">
                      <div>
                        <span className="font-semibold">L{e.level} · {e.action}</span>
                        <span className="text-muted-foreground"> · {e.approver_role} · {e.approver_name}</span>
                        {e.comment && <p className="text-muted-foreground mt-0.5">{e.comment}</p>}
                      </div>
                      <span className="font-mono text-muted-foreground">{e.timestamp.slice(0, 19).replace('T', ' ')}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {action && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">
                    {action === 'approve' ? 'Approval comment (optional)' : action === 'reject' ? 'Rejection reason *' : 'Hold reason *'}
                  </label>
                  <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelected(null); setAction(null); }}>Close</Button>
            {action && (
              <Button data-primary onClick={confirmAction}>
                Confirm {action}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
