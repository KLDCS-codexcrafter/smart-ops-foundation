/**
 * @file        src/pages/mobile/captures/MobileProcureApprovePage.tsx
 * @purpose     AM.2 · mobile-gap persona · on-the-go procure approvals
 *              CONSUMES approval-rail-engine (B.1) · CONSUMES request-engine.getPendingPurchaseIndents
 * @sprint      AM.2 · T-AM2-Mobile-Captures · Pass 2
 * @canon       NO reimplement · delegation only · CameraCapture for on-site vendor proof
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShieldCheck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { listPendingMirrors, decideApproval } from '@/lib/approval-rail-engine';
import { getPendingPurchaseIndents } from '@/lib/request-engine';
import { CameraCapture } from '@/components/mobile/CameraCapture';

const E = 'DEMO';
const APPROVER = 'mobile_approver';

export default function MobileProcureApprovePage(): JSX.Element {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);

  const mirrors = useMemo(
    () => listPendingMirrors(E).filter((m) => m.source_module === 'procure' || m.source_module === 'procurement'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );
  const indents = useMemo(() => getPendingPurchaseIndents(E).slice(0, 5), [tick]);

  function handleDecision(id: string, decision: 'approved' | 'rejected'): void {
    const res = decideApproval(E, id, decision, APPROVER, decision === 'rejected' ? 'Mobile reject' : undefined);
    if (res.ok) {
      toast.success(`Approval ${decision}`);
      setTick((t) => t + 1);
    } else {
      toast.error(res.reason ?? 'Failed');
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto space-y-4">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-bold">Procure · Mobile Approve</h1>
      </header>

      <Card className="p-3 space-y-1">
        <p className="text-xs text-muted-foreground">
          Consumes <code className="font-mono">approval-rail-engine</code> (B.1 SoD honored) and{' '}
          <code className="font-mono">request-engine.getPendingPurchaseIndents</code> · no logic re-implemented here.
        </p>
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Pending approvals ({mirrors.length})</h2>
        {mirrors.length === 0 && (
          <Card className="p-4 text-center text-xs text-muted-foreground">No pending approvals.</Card>
        )}
        {mirrors.map((m) => (
          <Card key={m.task_id} className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs">{m.title}</span>
              <Badge variant="outline">{m.source_module}</Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => handleDecision(m.task_id, 'approved')}>
                <ShieldCheck className="h-4 w-4 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => handleDecision(m.task_id, 'rejected')}>
                <X className="h-4 w-4 mr-1" /> Reject
              </Button>
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Pending purchase indents ({indents.length})</h2>
        {indents.map((i) => (
          <Card key={i.id} className="p-2 text-xs font-mono">
            {i.voucher_no} · ₹{(i.total_estimated_value / 100).toFixed(2)}
          </Card>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">On-site vendor proof (optional)</h2>
        <CameraCapture label="Site / vendor photo" />
      </section>
    </div>
  );
}
