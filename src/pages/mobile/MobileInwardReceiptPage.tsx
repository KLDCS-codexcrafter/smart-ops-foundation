/**
 * MobileInwardReceiptPage.tsx — Sprint 6-pre-3 · Block B · D-370
 * OperixGo Inward Receipt landing page · today's stats + "New Inward Receipt" CTA.
 *
 * Pattern note: NO [tick, setTick] + useMemo · uses [list, setList] + refresh() pattern.
 * Mirrors MobileQualiCheckPage 5-pre-3 D-346 EXACTLY.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, PackageOpen, Plus, Inbox, ShieldAlert, CheckCircle2 } from 'lucide-react';
import MobileInwardReceiptCapture from '@/components/mobile/MobileInwardReceiptCapture';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import { listInwardReceipts, listQuarantineQueue } from '@/lib/inward-receipt-engine';

function getActiveEntityCode(): string {
  try { return localStorage.getItem('active_entity_code') ?? 'DEMO'; }
  catch { return 'DEMO'; }
}

export default function MobileInwardReceiptPage(): JSX.Element {
  const navigate = useNavigate();
  const ENTITY = getActiveEntityCode();
  const [showCapture, setShowCapture] = useState(false);
  const [today, setToday] = useState<number>(0);
  const [quarantine, setQuarantine] = useState<number>(0);
  const [released, setReleased] = useState<number>(0);

  const refresh = (): void => {
    const all = listInwardReceipts(ENTITY);
    const todayStr = new Date().toISOString().slice(0, 10);
    setToday(all.filter(r => (r.arrival_date ?? '').slice(0, 10) === todayStr).length);
    setQuarantine(listQuarantineQueue(ENTITY).length);
    setReleased(
      all.filter(r => r.status === 'released' && (r.released_at ?? '').slice(0, 10) === todayStr).length,
    );
  };

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 5000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (showCapture) {
    return (
      <div>
        <div className="max-w-md mx-auto p-2">
          <Button variant="ghost" size="sm" onClick={() => { setShowCapture(false); refresh(); }}>
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
        </div>
        <MobileInwardReceiptCapture />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Operix Go
        </Button>
        <OfflineIndicator />
      </header>

      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <PackageOpen className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Inward Receipt</h1>
          <p className="text-xs text-muted-foreground">Mobile vendor arrival capture · 5-step · offline-resilient</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <Inbox className="h-4 w-4 mx-auto text-primary mb-1" />
          <div className="font-mono text-2xl font-semibold">{today}</div>
          <div className="text-xs text-muted-foreground">Today</div>
        </Card>
        <Card className="p-3 text-center">
          <ShieldAlert className="h-4 w-4 mx-auto text-warning mb-1" />
          <div className="font-mono text-2xl font-semibold">{quarantine}</div>
          <div className="text-xs text-muted-foreground">Quarantine</div>
        </Card>
        <Card className="p-3 text-center">
          <CheckCircle2 className="h-4 w-4 mx-auto text-emerald-600 mb-1" />
          <div className="font-mono text-2xl font-semibold">{released}</div>
          <div className="text-xs text-muted-foreground">Released</div>
        </Card>
      </div>

      <Button onClick={() => setShowCapture(true)} className="w-full h-14 text-base">
        <Plus className="h-5 w-5 mr-2" />New Inward Receipt
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Auto-routes to Quarantine if QA plan attached · Auto-release for tolerance-pass items.
      </p>
    </div>
  );
}
