/**
 * @file        MobileReceiptAckPage.tsx
 * @sprint      T-Phase-1.2.6f-d-2-card7-7-pre-3 · Block D · D-397
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Truck, Plus, Inbox, CheckCircle2 } from 'lucide-react';
import MobileReceiptAckCapture from '@/components/mobile/MobileReceiptAckCapture';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import { listReceiptAcks, listReleasedReceiptsAwaitingStock } from '@/lib/stock-receipt-ack-engine';

function getActiveEntityCode(): string {
  try { return localStorage.getItem('active_entity_code') ?? 'DEMO'; } catch { return 'DEMO'; }
}

export default function MobileReceiptAckPage(): JSX.Element {
  const navigate = useNavigate();
  const ENTITY = getActiveEntityCode();
  const [showCapture, setShowCapture] = useState(false);
  const [ackedToday, setAckedToday] = useState(0);
  const [drafts, setDrafts] = useState(0);
  const [pending, setPending] = useState(0);

  const refresh = (): void => {
    const list = listReceiptAcks(ENTITY);
    const today = new Date().toISOString().slice(0, 10);
    setAckedToday(list.filter(a => a.status === 'acknowledged' && (a.posted_at ?? '').slice(0, 10) === today).length);
    setDrafts(list.filter(a => a.status === 'draft').length);
    setPending(listReleasedReceiptsAwaitingStock(ENTITY).length);
  };

  useEffect(() => { refresh(); }, [showCapture]); // eslint-disable-line react-hooks/exhaustive-deps

  if (showCapture) return <MobileReceiptAckCapture onClose={() => setShowCapture(false)} />;

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}><ArrowLeft className="h-4 w-4 mr-1" />Operix Go</Button>
        <OfflineIndicator />
      </header>

      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Truck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Receipt Ack</h1>
          <p className="text-xs text-muted-foreground">Mobile receipt acknowledgment · 4-step · cross-card consumer</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <CheckCircle2 className="h-4 w-4 mx-auto text-emerald-600 mb-1" />
          <div className="font-mono text-2xl font-semibold">{ackedToday}</div>
          <div className="text-xs text-muted-foreground">Ack'd today</div>
        </Card>
        <Card className="p-3 text-center">
          <Inbox className="h-4 w-4 mx-auto text-warning mb-1" />
          <div className="font-mono text-2xl font-semibold">{drafts}</div>
          <div className="text-xs text-muted-foreground">Drafts</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="font-mono text-2xl font-semibold text-destructive">{pending}</div>
          <div className="text-xs text-muted-foreground">Pending IRs</div>
        </Card>
      </div>

      <Button onClick={() => setShowCapture(true)} disabled={pending === 0} className="w-full h-14 text-base">
        <Plus className="h-5 w-5 mr-2" />New Receipt Ack
      </Button>
      {pending === 0 && <p className="text-xs text-center text-muted-foreground">No released IRs awaiting acknowledgment.</p>}
    </div>
  );
}
