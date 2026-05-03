/**
 * @file        IndentApprovalInbox.tsx
 * @sprint      T-Phase-1.2.6f-pre-1
 * @purpose     Approval queue (Block F · scaffolded)
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

export function IndentApprovalInbox(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const [tab, setTab] = useState<Tab>('material');
  const mi = useMaterialIndents();
  const sr = useServiceRequests();
  const ci = useCapitalIndents();

  const queue = useMemo(() => {
    const all = tab === 'material' ? mi : tab === 'service' ? sr : ci;
    if (!user) return [];
    return all.filter(x => x.pending_approver_user_id === user.id || x.status.startsWith('pending_'));
  }, [tab, mi, sr, ci, user]);

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
      <h2 className="text-xl font-bold">Approval Inbox</h2>
      <div className="flex gap-2">
        {(['material', 'service', 'capital'] as const).map(t => (
          <Button key={t} size="sm" variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)}>
            {t === 'material' ? 'Material' : t === 'service' ? 'Service' : 'Capital'}
          </Button>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Pending ({queue.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {queue.length === 0 && <p className="text-xs text-muted-foreground">No pending approvals.</p>}
          {queue.map(q => (
            <div key={q.id} className="flex items-center justify-between border-b pb-2">
              <div className="text-sm">
                <div className="font-mono text-xs">{q.voucher_no}</div>
                <div className="text-xs text-muted-foreground">{q.date} · ₹{q.total_estimated_value.toLocaleString('en-IN')}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[q.status]}</Badge>
                <Button size="sm" onClick={() => act(q.id, tab, 'approve')}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => act(q.id, tab, 'reject')}>Reject</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export const IndentApprovalInboxPanel = IndentApprovalInbox;
