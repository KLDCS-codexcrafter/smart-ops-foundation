/**
 * @file        MobileStoreIssuePage.tsx
 * @sprint      T-Phase-1.2.6f-d-2-card7-7-pre-3 · Block B · D-395
 * @purpose     OperixGo Stock Issue landing page · today's stats + "New Stock Issue" CTA.
 *              Pattern: MIRRORS MobileInwardReceiptPage (D-370).
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, PackageOpen, Plus, Inbox, CheckCircle2, XCircle } from 'lucide-react';
import MobileStoreIssueCapture from '@/components/mobile/MobileStoreIssueCapture';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import { listStockIssues } from '@/lib/stock-issue-engine';

function getActiveEntityCode(): string {
  try { return localStorage.getItem('active_entity_code') ?? 'DEMO'; } catch { return 'DEMO'; }
}

export default function MobileStoreIssuePage(): JSX.Element {
  const navigate = useNavigate();
  const ENTITY = getActiveEntityCode();
  const [showCapture, setShowCapture] = useState(false);
  const [issuedToday, setIssuedToday] = useState(0);
  const [drafts, setDrafts] = useState(0);
  const [cancelled, setCancelled] = useState(0);

  const refresh = (): void => {
    const list = listStockIssues(ENTITY);
    const today = new Date().toISOString().slice(0, 10);
    setIssuedToday(list.filter(i => i.status === 'issued' && (i.posted_at ?? '').slice(0, 10) === today).length);
    setDrafts(list.filter(i => i.status === 'draft').length);
    setCancelled(list.filter(i => i.status === 'cancelled').length);
  };

  useEffect(() => { refresh(); }, [showCapture]); // eslint-disable-line react-hooks/exhaustive-deps

  if (showCapture) return <MobileStoreIssueCapture onClose={() => setShowCapture(false)} />;

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}><ArrowLeft className="h-4 w-4 mr-1" />Operix Go</Button>
        <OfflineIndicator />
      </header>

      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <PackageOpen className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Store Issue</h1>
          <p className="text-xs text-muted-foreground">Mobile stock issue capture · 4-step · auto-posts Stock Journal</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <CheckCircle2 className="h-4 w-4 mx-auto text-emerald-600 mb-1" />
          <div className="font-mono text-2xl font-semibold">{issuedToday}</div>
          <div className="text-xs text-muted-foreground">Issued today</div>
        </Card>
        <Card className="p-3 text-center">
          <Inbox className="h-4 w-4 mx-auto text-warning mb-1" />
          <div className="font-mono text-2xl font-semibold">{drafts}</div>
          <div className="text-xs text-muted-foreground">Drafts</div>
        </Card>
        <Card className="p-3 text-center">
          <XCircle className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
          <div className="font-mono text-2xl font-semibold">{cancelled}</div>
          <div className="text-xs text-muted-foreground">Cancelled</div>
        </Card>
      </div>

      <Button onClick={() => setShowCapture(true)} className="w-full h-14 text-base">
        <Plus className="h-5 w-5 mr-2" />New Stock Issue
      </Button>
    </div>
  );
}
