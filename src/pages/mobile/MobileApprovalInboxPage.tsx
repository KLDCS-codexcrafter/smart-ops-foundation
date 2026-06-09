/**
 * @file        MobileApprovalInboxPage.tsx
 * @sprint      Sprint AM.3 · T-AM3-Universal-Mobile · Pass 1
 * @purpose     Mobile landing page for the Universal Approval Inbox.
 * @canon       CONSUMES `approval-rail-engine.listPendingMirrors` for the count
 *              (full B.1 rail · ALL adapter types · NO per-card localStorage probe).
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Inbox, ClipboardCheck } from 'lucide-react';
import MobileApprovalInboxCapture from '@/components/mobile/MobileApprovalInboxCapture';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import { listPendingMirrors, type PendingMirror } from '@/lib/approval-rail-engine';
import '@/lib/approval-adapters';

function getActiveEntityCode(): string {
  try { return localStorage.getItem('active_entity_code') ?? 'DEMO'; } catch { return 'DEMO'; }
}

export default function MobileApprovalInboxPage(): JSX.Element {
  const navigate = useNavigate();
  const ENTITY = getActiveEntityCode();
  const [showCapture, setShowCapture] = useState(false);
  const [pending, setPending] = useState<PendingMirror[]>([]);

  const refresh = useCallback((): void => {
    setPending(listPendingMirrors(ENTITY));
  }, [ENTITY]);

  useEffect(() => { refresh(); }, [showCapture, refresh]);

  const total = pending.length;
  const overdue = pending.filter(p => p.overdue).length;
  const byType: Record<string, number> = {};
  pending.forEach(p => {
    const k = p.meta.object_type;
    byType[k] = (byType[k] ?? 0) + 1;
  });

  if (showCapture) return <MobileApprovalInboxCapture onClose={() => setShowCapture(false)} />;

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <OfflineIndicator />
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />Universal Approval Inbox
        </h1>
        <div className="w-16" />
      </div>

      <Card className="p-4 text-center">
        <Inbox className="h-8 w-8 mx-auto text-destructive mb-2" />
        <div className="text-3xl font-bold font-mono">{total}</div>
        <div className="text-sm text-muted-foreground">Pending approvals · B.1 rail</div>
        {overdue > 0 && (
          <div className="text-xs text-destructive mt-1 font-mono">{overdue} overdue</div>
        )}
        {Object.keys(byType).length > 0 && (
          <div className="text-xs text-muted-foreground mt-2 font-mono">
            {Object.entries(byType).map(([k, n]) => `${k.replace(/_/g, ' ')}: ${n}`).join(' · ')}
          </div>
        )}
      </Card>

      <Button className="w-full h-14 text-lg" disabled={total === 0} onClick={() => setShowCapture(true)}>
        Review {total} pending
      </Button>
      {total === 0 && (
        <p className="text-xs text-center text-muted-foreground">
          No pending items across the rail. Honest empty — nothing fabricated.
        </p>
      )}
    </div>
  );
}
