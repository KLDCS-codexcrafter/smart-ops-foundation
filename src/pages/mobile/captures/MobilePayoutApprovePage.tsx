/**
 * @file        src/pages/mobile/captures/MobilePayoutApprovePage.tsx
 * @purpose     AM.2 · mobile-gap persona · payment requisition approvals on the go
 *              CONSUMES payment-requisition-engine · SoD honored via hardcoded routing rules
 * @sprint      AM.2 · T-AM2-Mobile-Captures · Pass 2
 * @canon       NO reimplement · delegation only
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShieldCheck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  listRequisitions,
  approveDeptLevel,
  approveAccountsLevel,
  rejectRequisition,
} from '@/lib/payment-requisition-engine';

const E = 'DEMO';

export default function MobilePayoutApprovePage(): JSX.Element {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const requisitions = useMemo(
    () =>
      listRequisitions(E).filter(
        (r) => r.status === 'pending_dept_head' || r.status === 'pending_accounts',
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  function handleApprove(id: string, status: string): void {
    const res =
      status === 'pending_dept_head'
        ? approveDeptLevel(E, id, 'Mobile approve')
        : approveAccountsLevel(E, id, 'Mobile approve');
    if (res.ok) {
      toast.success('Approved · SoD routing honored');
      setTick((t) => t + 1);
    } else {
      toast.error((res.errors ?? []).join(', ') || 'Failed');
    }
  }

  function handleReject(id: string): void {
    const res = rejectRequisition(E, id, 'Mobile reject');
    if (res.ok) {
      toast.success('Rejected');
      setTick((t) => t + 1);
    } else {
      toast.error((res.errors ?? []).join(', ') || 'Failed');
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto space-y-4">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-bold">Payout · Mobile Approve</h1>
      </header>

      <Card className="p-3 text-xs text-muted-foreground">
        Consumes <code className="font-mono">payment-requisition-engine</code> · Department-head → Accounts SoD honored
        per hardcoded ROUTING_RULES.
      </Card>

      {requisitions.length === 0 && (
        <Card className="p-4 text-center text-xs text-muted-foreground">No requisitions pending your approval.</Card>
      )}

      {requisitions.map((r) => (
        <Card key={r.id} className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs">{r.id.slice(0, 12)}</span>
            <Badge variant="outline">{r.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {r.vendor_name ?? r.employee_name ?? r.purpose} · ₹{(r.amount / 100).toFixed(2)}
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={() => handleApprove(r.id, r.status)}>
              <ShieldCheck className="h-4 w-4 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => handleReject(r.id)}>
              <X className="h-4 w-4 mr-1" /> Reject
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
