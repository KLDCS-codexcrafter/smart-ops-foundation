/**
 * @file        src/pages/mobile/captures/MobileProcureApprovePage.tsx
 * @purpose     AM.2 · mobile-gap persona · on-the-go procure approvals
 *              CONSUMES approval-rail-engine (B.1 SoD) read + decide · no logic re-implemented
 * @sprint      AM.2 · T-AM2-Mobile-Captures · Pass 2
 * @canon       Delegation only · CameraCapture for on-site vendor proof
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShieldCheck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { listPendingMirrors, decideApproval } from '@/lib/approval-rail-engine';
import { CameraCapture } from '@/components/mobile/CameraCapture';

const E = 'DEMO';
const APPROVER = 'mobile_approver';

export default function MobileProcureApprovePage(): JSX.Element {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);

  const mirrors = useMemo(
    () =>
      listPendingMirrors(E).filter((m) => {
        const src = String(m.meta.source_module ?? '').toLowerCase();
        return src.includes('procure') || src.includes('po') || src.includes('purchase');
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  function handleDecision(taskId: string, decision: 'approved' | 'rejected'): void {
    const res = decideApproval(
      E,
      taskId,
      decision,
      APPROVER,
      decision === 'rejected' ? 'Mobile reject' : undefined,
    );
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

      <Card className="p-3 text-xs text-muted-foreground">
        Consumes <code className="font-mono">approval-rail-engine</code> (B.1 SoD honored) — listPendingMirrors +
        decideApproval. No engine logic re-implemented in this page.
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Pending approvals ({mirrors.length})</h2>
        {mirrors.length === 0 && (
          <Card className="p-4 text-center text-xs text-muted-foreground">No pending procure approvals.</Card>
        )}
        {mirrors.map((m) => (
          <Card key={m.task.id} className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs">{m.task.title}</span>
              <Badge variant="outline">{String(m.meta.source_module ?? 'procure')}</Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => handleDecision(m.task.id, 'approved')}>
                <ShieldCheck className="h-4 w-4 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => handleDecision(m.task.id, 'rejected')}>
                <X className="h-4 w-4 mr-1" /> Reject
              </Button>
            </div>
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
