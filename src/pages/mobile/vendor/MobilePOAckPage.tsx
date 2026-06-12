/**
 * MobilePOAckPage.tsx — Vendor acknowledges PO via the existing PoFollowup ledger.
 * CONSUMES purchaseOrdersKey. The desktop portal/Procure360 reads `followups[]`;
 * writing a followup with outcome='committed' is the SAME field the desktop reads.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import { type PurchaseOrderRecord, type PoFollowup, purchaseOrdersKey } from '@/types/po';
import { ReportSendHeader } from '@/components/operix-core/report-framework/ReportSendHeader';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

export default function MobilePOAckPage(): JSX.Element {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [committedDate, setCommittedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [version, setVersion] = useState(0);

  const pos = useMemo<PurchaseOrderRecord[]>(() => {
    if (!session) return [];
    return loadList<PurchaseOrderRecord>(purchaseOrdersKey(session.entity_code))
      .filter(p => p.status === 'approved' || p.status === 'sent_to_vendor' || p.status === 'partially_received');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, version]);

  const selected = pos.find(p => p.id === selectedId) ?? null;
  const alreadyAcked = selected?.followups.some(f => f.outcome === 'committed' && (f.notes || '').toLowerCase().includes('po acknowledged')) ?? false;

  function submit(): void {
    if (!session || !selected) return;
    const followup: PoFollowup = {
      id: `fu_${Date.now()}`,
      po_id: selected.id,
      channel: 'whatsapp',
      outcome: 'committed',
      notes: `PO acknowledged by vendor${committedDate ? ` · committed delivery ${committedDate}` : ''}${notes ? ` · ${notes}` : ''}`,
      next_action_due: committedDate || null,
      created_by_user_id: session.user_id || 'vendor-mobile',
      created_at: new Date().toISOString(),
    };
    const key = purchaseOrdersKey(session.entity_code);
    const list = loadList<PurchaseOrderRecord>(key);
    const idx = list.findIndex(p => p.id === selected.id);
    if (idx < 0) { toast.error('PO not found'); return; }
    list[idx] = { ...list[idx], followups: [...list[idx].followups, followup], updated_at: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(list));
    toast.success(`PO ${selected.po_no} acknowledged`);
    setSelectedId(null); setCommittedDate(''); setNotes('');
    setVersion(v => v + 1);
  }

  if (!session) return <div className="p-6 text-center text-sm text-muted-foreground">Session required</div>;

  if (selected) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-base font-semibold">Acknowledge PO</h1>
        </div>
        <Card className="p-3 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">PO</span><span className="font-mono">{selected.po_no}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-mono">{selected.po_date.slice(0,10)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Lines</span><span className="font-mono">{selected.lines.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-mono">₹{selected.total_after_tax.toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant="outline">{selected.status}</Badge></div>
          {alreadyAcked && <p className="text-[11px] text-amber-600">Already acknowledged at least once.</p>}
        </Card>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Committed delivery date</label>
          <Input type="date" value={committedDate} onChange={e => setCommittedDate(e.target.value)} />
          <Textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <Button className="w-full" onClick={submit}><Check className="h-4 w-4 mr-1" />Acknowledge</Button>
        <ReportSendHeader title={`PO ${selected.po_no}`}
          rows={[{ po_no: selected.po_no, vendor: selected.vendor_name, total: selected.total_after_tax }]} />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-base font-semibold">PO Acknowledge</h1>
        <Badge variant="outline" className="ml-auto text-[10px]">{pos.length}</Badge>
      </div>
      {pos.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No POs awaiting acknowledgement</Card>
      ) : (
        <div className="space-y-2">
          {pos.map(p => (
            <Card key={p.id} className="p-3 cursor-pointer hover:border-primary/40" onClick={() => setSelectedId(p.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-mono truncate">{p.po_no}</p>
                  <p className="text-[10px] text-muted-foreground">{p.vendor_name} · {p.lines.length} line</p>
                </div>
                <Badge variant="outline" className="text-[9px]">{p.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
