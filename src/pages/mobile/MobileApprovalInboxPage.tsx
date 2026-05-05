/**
 * @file        MobileApprovalInboxPage.tsx
 * @sprint      T-Phase-1.2.6f-d-2-card8-8-pre-1 · Block D · D-406
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Inbox, ClipboardCheck } from 'lucide-react';
import MobileApprovalInboxCapture from '@/components/mobile/MobileApprovalInboxCapture';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import { materialIndentsKey } from '@/types/material-indent';
import { serviceRequestsKey } from '@/types/service-request';
import { capitalIndentsKey } from '@/types/capital-indent';

function getActiveEntityCode(): string {
  try { return localStorage.getItem('active_entity_code') ?? 'DEMO'; } catch { return 'DEMO'; }
}

function countPending(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const list = JSON.parse(raw) as Array<{ status: string }>;
    return list.filter(i => i.status === 'pending_hod' || i.status === 'pending_purchase' || i.status === 'pending_finance' || i.status === 'submitted').length;
  } catch { return 0; }
}

export default function MobileApprovalInboxPage(): JSX.Element {
  const navigate = useNavigate();
  const ENTITY = getActiveEntityCode();
  const [showCapture, setShowCapture] = useState(false);
  const [pendingMaterial, setPendingMaterial] = useState(0);
  const [pendingService, setPendingService] = useState(0);
  const [pendingCapital, setPendingCapital] = useState(0);

  const refresh = useCallback((): void => {
    setPendingMaterial(countPending(materialIndentsKey(ENTITY)));
    setPendingService(countPending(serviceRequestsKey(ENTITY)));
    setPendingCapital(countPending(capitalIndentsKey(ENTITY)));
  }, [ENTITY]);

  useEffect(() => { refresh(); }, [showCapture, refresh]);

  const totalPending = pendingMaterial + pendingService + pendingCapital;

  if (showCapture) return <MobileApprovalInboxCapture onClose={() => setShowCapture(false)} />;

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <OfflineIndicator />
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        <h1 className="text-lg font-bold flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" />Approval Inbox</h1>
        <div className="w-16" />
      </div>

      <Card className="p-4 text-center">
        <Inbox className="h-8 w-8 mx-auto text-destructive mb-2" />
        <div className="text-3xl font-bold font-mono">{totalPending}</div>
        <div className="text-sm text-muted-foreground">Pending approvals</div>
        <div className="text-xs text-muted-foreground mt-2 font-mono">Material: {pendingMaterial} · Service: {pendingService} · Capital: {pendingCapital}</div>
      </Card>

      <Button className="w-full h-14 text-lg" disabled={totalPending === 0} onClick={() => setShowCapture(true)}>
        Review {totalPending} pending
      </Button>
      {totalPending === 0 && <p className="text-xs text-center text-muted-foreground">No pending indents to approve.</p>}
    </div>
  );
}
