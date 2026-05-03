/**
 * @file        IndentApprovalInbox.tsx
 * @sprint      T-Phase-1.2.6f-pre-1-fix · FIX-3 (deepened from 78 → ~350 LOC)
 * @purpose     OOB-13 Connected Approver UX · split-pane · requester history · budget impact
 * @decisions   D-218, D-220
 * @disciplines SD-15, SD-16
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMaterialIndents } from '@/hooks/useMaterialIndents';
import { useServiceRequests } from '@/hooks/useServiceRequests';
import { useCapitalIndents } from '@/hooks/useCapitalIndents';
import { approveIndent, rejectIndent, type IndentKind } from '@/lib/request-engine';
import { STATUS_LABEL } from '@/types/requisition-common';

type Tab = 'material' | 'service' | 'capital';

interface QueueRow {
  id: string;
  voucher_no: string;
  date: string;
  total_estimated_value: number;
  status: keyof typeof STATUS_LABEL;
  priority: string;
  approval_tier: 1 | 2 | 3;
  requested_by_user_id: string;
  requested_by_name: string;
  originating_department_id: string;
  originating_department_name: string;
  pending_approver_user_id: string | null;
}

export function IndentApprovalInbox(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const [tab, setTab] = useState<Tab>('material');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mi = useMaterialIndents();
  const sr = useServiceRequests();
  const ci = useCapitalIndents();

  const allForTab: QueueRow[] = useMemo(() => {
    const src = tab === 'material' ? mi : tab === 'service' ? sr : ci;
    return src as unknown as QueueRow[];
  }, [tab, mi, sr, ci]);

  const queue = useMemo(() => {
    if (!user) return [] as QueueRow[];
    return allForTab.filter(x => x.pending_approver_user_id === user.id || x.status.startsWith('pending_'));
  }, [allForTab, user]);

  const requesterHistory = useMemo(() => {
    if (!selectedId) return null;
    const selected = allForTab.find(x => x.id === selectedId);
    if (!selected) return null;

    const recent = allForTab
      .filter(x => x.requested_by_user_id === selected.requested_by_user_id && x.id !== selected.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);

    const deptTotal = allForTab
      .filter(x => x.originating_department_id === selected.originating_department_id
        && x.status !== 'rejected' && x.status !== 'cancelled')
      .reduce((sum, x) => sum + x.total_estimated_value, 0);

    const sameRequester = allForTab.filter(x => x.requested_by_user_id === selected.requested_by_user_id);
    const approvedCount = sameRequester.filter(x => x.status === 'approved' || x.status === 'closed').length;
    const approvalRate = sameRequester.length > 0 ? Math.round((approvedCount / sameRequester.length) * 100) : 0;

    return { selected, recent, deptTotal, approvalRate };
  }, [selectedId, allForTab]);

  const act = (id: string, kind: IndentKind, action: 'approve' | 'reject'): void => {
    if (!user) return;
    const ok = action === 'approve'
      ? approveIndent(id, kind, user.id, user.role, entityCode, 'Approved')
      : rejectIndent(id, kind, user.id, user.role, 'Rejected', entityCode);
    if (ok) toast.success(`${action === 'approve' ? 'Approved' : 'Rejected'} successfully`);
    else toast.error('Transition not allowed');
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold">Approval Inbox</h2>
        <p className="text-xs text-muted-foreground">OOB-13 Connected Approver UX · context-rich approval in single screen</p>
      </div>

      <div className="flex gap-2">
        {(['material', 'service', 'capital'] as const).map(t => (
          <Button key={t} size="sm" variant={tab === t ? 'default' : 'outline'} onClick={() => { setTab(t); setSelectedId(null); }}>
            {t === 'material' ? 'Material' : t === 'service' ? 'Service' : 'Capital'}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-5">
          <Card>
            <CardHeader><CardTitle className="text-sm">Pending Queue ({queue.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {queue.length === 0 && <p className="text-xs text-muted-foreground">No pending approvals.</p>}
              {queue.map(q => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setSelectedId(q.id)}
                  className={`flex w-full items-center justify-between border-b pb-2 text-left p-2 rounded transition-colors ${selectedId === q.id ? 'bg-accent' : 'hover:bg-accent/50'}`}
                >
                  <div className="text-sm">
                    <div className="font-mono text-xs">{q.voucher_no}</div>
                    <div className="text-xs text-muted-foreground">{q.requested_by_name} · {q.date}</div>
                    <div className="text-xs font-mono mt-0.5">₹{q.total_estimated_value.toLocaleString('en-IN')}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[q.status]}</Badge>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-7">
          {!requesterHistory && (
            <Card>
              <CardContent className="py-12 text-center text-xs text-muted-foreground">
                Select an indent from the left to see context + approve
              </CardContent>
            </Card>
          )}
          {requesterHistory && (
            <div className="space-y-3">
              <Card>
                <CardHeader><CardTitle className="text-sm">{requesterHistory.selected.voucher_no} · Details</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground">Requester:</span> {requesterHistory.selected.requested_by_name}</div>
                    <div><span className="text-muted-foreground">Department:</span> {requesterHistory.selected.originating_department_name}</div>
                    <div><span className="text-muted-foreground">Date:</span> {requesterHistory.selected.date}</div>
                    <div><span className="text-muted-foreground">Priority:</span> <Badge variant="outline" className="text-[10px]">{requesterHistory.selected.priority}</Badge></div>
                    <div><span className="text-muted-foreground">Total:</span> <span className="font-mono">₹{requesterHistory.selected.total_estimated_value.toLocaleString('en-IN')}</span></div>
                    <div><span className="text-muted-foreground">Tier:</span> {requesterHistory.selected.approval_tier}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Requester History · Last 5 Indents</CardTitle></CardHeader>
                <CardContent>
                  {requesterHistory.recent.length === 0 && <p className="text-xs text-muted-foreground">No prior indents from this requester.</p>}
                  {requesterHistory.recent.map(r => (
                    <div key={r.id} className="flex items-center justify-between border-b py-1.5 text-xs">
                      <span className="font-mono">{r.voucher_no}</span>
                      <span className="text-muted-foreground">{r.date}</span>
                      <span className="font-mono">₹{r.total_estimated_value.toLocaleString('en-IN')}</span>
                      <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[r.status]}</Badge>
                    </div>
                  ))}
                  <div className="mt-2 pt-2 border-t text-xs">
                    <span className="text-muted-foreground">Approval rate: </span>
                    <span className="font-semibold">{requesterHistory.approvalRate}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Department Budget Impact</CardTitle></CardHeader>
                <CardContent className="text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">YTD spend ({requesterHistory.selected.originating_department_name}):</span>
                    <span className="font-mono">₹{requesterHistory.deptTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">This indent adds:</span>
                    <span className="font-mono">₹{requesterHistory.selected.total_estimated_value.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1.5">
                    <span>Approval impact:</span>
                    <span className="font-mono text-warning">₹{(requesterHistory.deptTotal + requesterHistory.selected.total_estimated_value).toLocaleString('en-IN')}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-3 flex gap-2">
                  <Button size="sm" onClick={() => { act(requesterHistory.selected.id, tab, 'approve'); setSelectedId(null); }}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => { act(requesterHistory.selected.id, tab, 'reject'); setSelectedId(null); }}>Reject</Button>
                  <Button size="sm" variant="ghost" disabled>Send Back</Button>
                  <Button size="sm" variant="ghost" disabled>Hold</Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const IndentApprovalInboxPanel = IndentApprovalInbox;
