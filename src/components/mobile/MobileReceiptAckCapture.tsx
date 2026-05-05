/**
 * @file        MobileReceiptAckCapture.tsx
 * @sprint      T-Phase-1.2.6f-d-2-card7-7-pre-3 · Block C · D-396
 * @purpose     OperixGo Receipt Ack 4-step capture flow.
 * @reuses      stock-receipt-ack-engine (NO MODIFICATIONS) · listReleasedReceiptsAwaitingStock
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Camera, Send, ArrowLeft, ArrowRight, FileText, CheckCircle2, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { capturePhoto } from '@/lib/camera-bridge';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import { enqueueWrite } from '@/lib/offline-queue-engine';
import { createReceiptAck, postReceiptAck, listReleasedReceiptsAwaitingStock } from '@/lib/stock-receipt-ack-engine';
import type { InwardReceipt } from '@/types/inward-receipt';

type Step = 1 | 2 | 3 | 4;

interface AckLineDraft {
  inward_line_id: string;
  item_id: string; item_code: string; item_name: string; uom: string;
  qty_received: number; qty_acknowledged: number; variance_qty: number;
}

interface FormState {
  ir: InwardReceipt | null;
  lines: AckLineDraft[];
  photos: string[];
  notes: string;
}

const EMPTY_FORM: FormState = { ir: null, lines: [], photos: [], notes: '' };

function getActiveEntityCode(): string {
  try { return localStorage.getItem('active_entity_code') ?? 'DEMO'; } catch { return 'DEMO'; }
}

function canProceed(s: FormState, step: Step): boolean {
  if (step === 1) return s.ir !== null;
  if (step === 2) return s.lines.length > 0 && s.lines.every(l => l.qty_acknowledged >= 0);
  return true;
}

interface Props { onClose: () => void }

export default function MobileReceiptAckCapture({ onClose }: Props): JSX.Element {
  const [step, setStep] = useState<Step>(1);
  const [s, setS] = useState<FormState>(EMPTY_FORM);
  const [queue, setQueue] = useState<InwardReceipt[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const ENTITY = getActiveEntityCode();

  useEffect(() => { setQueue(listReleasedReceiptsAwaitingStock(ENTITY)); }, [ENTITY]);

  const pickIR = (ir: InwardReceipt): void => {
    const lines: AckLineDraft[] = ir.lines.map(l => ({
      inward_line_id: l.id,
      item_id: l.item_id, item_code: l.item_code, item_name: l.item_name, uom: l.uom,
      qty_received: l.received_qty,
      qty_acknowledged: l.received_qty,
      variance_qty: 0,
    }));
    setS(prev => ({ ...prev, ir, lines }));
  };

  const updateLineAck = (i: number, qty: number): void => {
    setS(prev => ({
      ...prev,
      lines: prev.lines.map((l, idx) => idx === i ? { ...l, qty_acknowledged: qty, variance_qty: qty - l.qty_received } : l),
    }));
  };

  const addPhoto = async (): Promise<void> => {
    const r = await capturePhoto();
    if (r.ok && r.data_url) setS(prev => ({ ...prev, photos: [...prev.photos, r.data_url as string] }));
    else toast.error(r.reason ?? 'Camera unavailable');
  };

  const submit = async (): Promise<void> => {
    if (!s.ir) return;
    setSubmitting(true);
    try {
      // [JWT] POST /api/store-hub/receipt-acks
      const payload = {
        entity_id: ENTITY,
        inward_receipt_id: s.ir.id,
        inward_receipt_no: s.ir.receipt_no,
        vendor_id: s.ir.vendor_id ?? null,
        vendor_name: s.ir.vendor_name,
        acknowledged_by_id: 'mobile-stores-mgr',
        acknowledged_by_name: 'Mobile Stores',
        lines: s.lines.map(l => ({
          inward_line_id: l.inward_line_id,
          item_id: l.item_id, item_code: l.item_code, item_name: l.item_name, uom: l.uom,
          qty_inward: l.qty_received,
          qty_acknowledged: l.qty_acknowledged,
          source_godown_id: s.ir!.godown_id,
          source_godown_name: s.ir!.godown_name,
          dest_godown_id: 'gd-stores',
          dest_godown_name: 'Main Stores',
        })),
        narration: s.notes || `Mobile capture · IR ${s.ir.receipt_no}`,
        reference_no: `MOBILE:${Date.now()}`,
      };
      if (!navigator.onLine) {
        enqueueWrite(ENTITY, 'rating_submit', { kind: 'stock_receipt_ack', input: payload });
        toast.success('Receipt Ack queued — will sync when online');
      } else {
        const ack = await createReceiptAck(payload, ENTITY, 'mobile-stores-mgr');
        await postReceiptAck(ack.id, ENTITY, 'mobile-stores-mgr');
        toast.success(`Receipt Ack ${ack.ack_no} posted`);
      }
      setS(EMPTY_FORM); setStep(1); onClose();
    } catch (e) {
      toast.error(`Submit failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-4 max-w-md mx-auto">
      <OfflineIndicator />
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onClose}><ArrowLeft className="h-4 w-4 mr-1" />Cancel</Button>
        <Badge variant="outline">Step {step} of 4</Badge>
      </div>
      <Progress value={(step / 4) * 100} className="h-2" />

      {step === 1 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2"><Inbox className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Pick Inward Receipt</h2></div>
          {queue.length === 0 ? <p className="text-sm text-muted-foreground">No released IRs awaiting stock acknowledgment.</p> : (
            <div className="space-y-2">{queue.map(ir => (
              <Card key={ir.id} className={`p-3 cursor-pointer ${s.ir?.id === ir.id ? 'border-primary bg-primary/5' : ''}`} onClick={() => pickIR(ir)}>
                <div className="flex justify-between items-center">
                  <div><div className="font-medium text-sm font-mono">{ir.receipt_no}</div><div className="text-xs text-muted-foreground">{ir.vendor_name}</div></div>
                  <Badge variant="outline">{ir.lines.length} lines</Badge>
                </div>
              </Card>
            ))}</div>
          )}
        </Card>
      )}

      {step === 2 && s.ir && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Acknowledge Quantities</h2></div>
          <div className="text-xs text-muted-foreground font-mono">IR {s.ir.receipt_no} · {s.ir.vendor_name}</div>
          {s.lines.map((l, i) => (
            <div key={`ra-${i}`} className="border rounded p-2 space-y-2">
              <div className="text-sm font-medium">{l.item_name}</div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Received</Label><div className="text-sm font-mono">{l.qty_received} {l.uom}</div></div>
                <div><Label className="text-xs">Acknowledged</Label><Input type="number" value={l.qty_acknowledged || ''} onChange={e => updateLineAck(i, Number(e.target.value))} className="font-mono" /></div>
              </div>
              {l.variance_qty !== 0 && <Badge variant={l.variance_qty < 0 ? 'destructive' : 'secondary'}>Variance: {l.variance_qty > 0 ? '+' : ''}{l.variance_qty} {l.uom}</Badge>}
            </div>
          ))}
        </Card>
      )}

      {step === 3 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Photos (optional)</h2></div>
          <div className="grid grid-cols-3 gap-2">
            {s.photos.map((p, i) => <img key={`ra-photo-${i}-${p.slice(-12)}`} src={p} alt={`photo ${i + 1}`} className="rounded border h-20 object-cover" />)}
            <Button variant="outline" className="h-20" onClick={addPhoto}><Camera className="h-6 w-6" /></Button>
          </div>
        </Card>
      )}

      {step === 4 && s.ir && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /><h2 className="text-lg font-semibold">Review</h2></div>
          <div className="text-sm space-y-1">
            <div><span className="text-muted-foreground">IR:</span> <span className="font-medium font-mono">{s.ir.receipt_no}</span></div>
            <div><span className="text-muted-foreground">Vendor:</span> {s.ir.vendor_name}</div>
            <div><span className="text-muted-foreground">Lines:</span> {s.lines.length} · <span className="text-muted-foreground">Photos:</span> {s.photos.length}</div>
            <div className="pt-2 border-t">
              {s.lines.map((l, i) => (
                <div key={`ra-rev-${i}`} className="text-xs flex justify-between">
                  <span>{l.item_name}</span>
                  <span className="font-mono">{l.qty_acknowledged}/{l.qty_received} {l.uom}{l.variance_qty !== 0 ? ` (${l.variance_qty > 0 ? '+' : ''}${l.variance_qty})` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="flex gap-2">
        {step > 1 && <Button variant="outline" onClick={() => setStep(p => (p - 1) as Step)}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>}
        {step < 4 && <Button className="flex-1" disabled={!canProceed(s, step)} onClick={() => setStep(p => (p + 1) as Step)}>Next<ArrowRight className="h-4 w-4 ml-1" /></Button>}
        {step === 4 && <Button className="flex-1" disabled={submitting} onClick={submit}><Send className="h-4 w-4 mr-1" />{submitting ? 'Submitting…' : 'Submit & Post'}</Button>}
      </div>
    </div>
  );
}
