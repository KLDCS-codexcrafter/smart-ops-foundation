/**
 * MobileLRQueuePage.tsx — Transporter LR queue (list → record view).
 * CONSUMES lrAcceptancesKey. Mounts the FROZEN ReportSendHeader on the LR record view.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type LRAcceptance, lrAcceptancesKey } from '@/types/logistic-portal';
import { ReportSendHeader } from '@/components/operix-core/report-framework/ReportSendHeader';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

export default function MobileLRQueuePage(): JSX.Element {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const [selected, setSelected] = useState<string | null>(null);

  const lrs = useMemo<LRAcceptance[]>(() => {
    if (!session) return [];
    return loadList<LRAcceptance>(lrAcceptancesKey(session.entity_code))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [session]);

  const detail = useMemo(() => lrs.find(l => l.id === selected) ?? null, [lrs, selected]);

  if (!session) return <div className="p-6 text-center text-sm text-muted-foreground">Session required</div>;

  if (detail) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-base font-semibold">LR {detail.lr_no ?? detail.dln_voucher_no}</h1>
        </div>
        <Card className="p-3 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">DLN</span><span className="font-mono">{detail.dln_voucher_no}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Status</span><Badge variant="outline">{detail.status}</Badge></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Created</span><span className="font-mono">{detail.created_at.slice(0, 10)}</span></div>
          {detail.accepted_at && (
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Accepted</span><span className="font-mono">{detail.accepted_at.slice(0, 10)}</span></div>
          )}
          {detail.rejection_reason && <p className="text-xs text-red-600">Rejection: {detail.rejection_reason}</p>}
          {detail.notes && <p className="text-xs text-muted-foreground">{detail.notes}</p>}
        </Card>
        <ReportSendHeader
          title={`LR ${detail.lr_no ?? detail.dln_voucher_no}`}
          rows={[{ dln: detail.dln_voucher_no, status: detail.status, age_days: 1 }]}
        />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-base font-semibold">LR Queue</h1>
        <Badge variant="outline" className="ml-auto text-[10px]">{lrs.length}</Badge>
      </div>
      {lrs.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No LRs in queue</Card>
      ) : (
        <div className="space-y-2">
          {lrs.map(l => (
            <Card key={l.id} className="p-3 cursor-pointer hover:border-primary/40" onClick={() => setSelected(l.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-mono truncate">{l.dln_voucher_no}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{l.lr_no ?? '—'} · {l.created_at.slice(0, 10)}</p>
                </div>
                <Badge variant="outline" className="text-[9px]">{l.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
