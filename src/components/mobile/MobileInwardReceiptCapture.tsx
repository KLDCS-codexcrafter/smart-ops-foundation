/**
 * MobileInwardReceiptCapture.tsx — Sprint 6-pre-3 · Block A · D-369
 * OperixGo Inward Receipt 5-step capture flow for warehouse staff.
 *
 * Pattern: MIRRORS MobileGateGuardCapture (4-pre-3 · D-312) and
 * MobileQualiCheckCapture (5-pre-3 · D-346) EXACTLY · Step type · setStep state ·
 * 5 sequential steps · NO [tick, setTick] + useMemo anti-pattern.
 *
 * Step 1 = Vendor name (free-text · matches Indian SME walk-in vendor pattern)
 * Step 2 = Gate Pass auto-link (from listInwardQueue · optional)
 * Step 3 = Items list with received qty + condition
 * Step 4 = Photos (optional · camera-bridge stub · per item)
 * Step 5 = Review + Submit → inward-receipt-engine.createInwardReceipt
 *
 * Reuses (read-only / public API · NO modifications):
 *   - inward-receipt-engine.createInwardReceipt (6-pre-1 CORE BYTE-IDENTICAL)
 *   - gateflow-engine.listInwardQueue (4-pre-1 CORE BYTE-IDENTICAL)
 *   - camera-bridge.capturePhoto (Sprint 14c stub)
 *   - offline-queue-engine.enqueueWrite (Sprint 15)
 *   - OfflineIndicator (Sprint 14c)
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import {
  Camera, Send, ArrowLeft, ArrowRight, FileText, PackageOpen, Truck, Plus, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { capturePhoto } from '@/lib/camera-bridge';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import { enqueueWrite } from '@/lib/offline-queue-engine';
import { createInwardReceipt } from '@/lib/inward-receipt-engine';
import { listInwardQueue } from '@/lib/gateflow-engine';
import type { GatePass } from '@/types/gate-pass';
import {
  canProceedInward, EMPTY_INWARD_FORM_STATE,
  type InwardCaptureFormState, type InwardCaptureLine, type InwardStep,
} from '@/lib/mobile-inward-capture-validation';

function getActiveEntityCode(): string {
  try { return localStorage.getItem('active_entity_code') ?? 'DEMO'; }
  catch { return 'DEMO'; }
}

const EMPTY_LINE: InwardCaptureLine = {
  item_id: '', item_code: '', item_name: '', uom: 'NOS',
  expected_qty: 0, received_qty: 0, condition: 'ok', photo_urls: [],
};

export default function MobileInwardReceiptCapture(): JSX.Element {
  const ENTITY = getActiveEntityCode();
  const [step, setStep] = useState<InwardStep>(1);
  const [s, setS] = useState<InwardCaptureFormState>(EMPTY_INWARD_FORM_STATE);
  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setGatePasses(listInwardQueue(ENTITY));
  }, [ENTITY]);

  const update = (patch: Partial<InwardCaptureFormState>): void =>
    setS(prev => ({ ...prev, ...patch }));

  const linkGatePass = (gp: GatePass): void => {
    update({
      gate_pass_id: gp.id,
      gate_pass_no: gp.gate_pass_no,
      vehicle_no: gp.vehicle_no,
      vendor_name: s.vendor_name || gp.linked_voucher_no || gp.driver_name,
    });
    toast.success(`Linked ${gp.gate_pass_no}`);
  };

  const addLine = (): void => {
    setS(prev => ({ ...prev, lines: [...prev.lines, { ...EMPTY_LINE }] }));
  };

  const updateLine = (idx: number, patch: Partial<InwardCaptureLine>): void => {
    setS(prev => ({
      ...prev,
      lines: prev.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    }));
  };

  const removeLine = (idx: number): void => {
    setS(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== idx) }));
  };

  const capturePhotoForLine = async (idx: number): Promise<void> => {
    const r = await capturePhoto();
    if (!r.ok || !r.data_url) { toast.error(r.reason ?? 'Camera failed'); return; }
    setS(prev => ({
      ...prev,
      lines: prev.lines.map((l, i) =>
        i === idx ? { ...l, photo_urls: [...l.photo_urls, r.data_url as string] } : l,
      ),
    }));
    toast.success('Photo captured');
  };

  const submit = async (): Promise<void> => {
    if (!s.vendor_name || s.lines.length === 0) {
      toast.error('Vendor + at least one line required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        entity_id: ENTITY,
        vendor_id: s.vendor_id || `walkin-${Date.now()}`,
        vendor_name: s.vendor_name,
        gate_entry_id: s.gate_pass_id,
        gate_entry_no: s.gate_pass_no,
        vehicle_no: s.vehicle_no || null,
        godown_id: s.godown_id,
        godown_name: s.godown_name,
        received_by_id: 'mobile-warehouse',
        received_by_name: 'Warehouse Staff',
        lines: s.lines.map(l => ({
          item_id: l.item_id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          item_code: l.item_code || l.item_name.slice(0, 8).toUpperCase(),
          item_name: l.item_name,
          uom: l.uom,
          expected_qty: l.expected_qty || l.received_qty,
          received_qty: l.received_qty,
        })),
        narration: s.narration,
      };
      if (!navigator.onLine) {
        // [JWT] Offline queue · matches MobileGateGuardCapture / MobileQualiCheckCapture pattern
        enqueueWrite(ENTITY, 'rating_submit', { kind: 'inward_receipt', input: payload });
        toast.success('Inward receipt queued — will sync when online');
      } else {
        const ir = await createInwardReceipt(payload, ENTITY, 'mobile-warehouse');
        toast.success(`Inward Receipt ${ir.receipt_no} created · ${ir.status}`);
      }
      setS(EMPTY_INWARD_FORM_STATE);
      setStep(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-4 max-w-md mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Inward Receipt</h1>
        <div className="flex items-center gap-2">
          <OfflineIndicator />
          <Badge variant="outline">Step {step} / 5</Badge>
        </div>
      </header>
      <Progress value={(step / 5) * 100} className="h-2" />

      {step === 1 && (
        <div className="space-y-3">
          <Label>Vendor name</Label>
          <Input
            value={s.vendor_name}
            onChange={e => update({ vendor_name: e.target.value })}
            placeholder="e.g. Bharat Steel Suppliers"
          />
          <Label>Vehicle No (optional)</Label>
          <Input
            value={s.vehicle_no}
            onChange={e => update({ vehicle_no: e.target.value.toUpperCase() })}
            placeholder="KA-01-AB-1234"
            className="font-mono"
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <Label>Auto-link Gate Pass (optional)</Label>
          {gatePasses.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              <Truck className="h-6 w-6 mx-auto mb-2" />
              No open inward gate passes. You can proceed without linking.
            </Card>
          ) : (
            <div className="space-y-2">
              {gatePasses.slice(0, 8).map(gp => (
                <Card
                  key={gp.id}
                  onClick={() => linkGatePass(gp)}
                  className={`p-3 cursor-pointer transition-colors ${
                    s.gate_pass_id === gp.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-xs">{gp.gate_pass_no}</div>
                      <div className="text-sm truncate">{gp.vehicle_no} · {gp.driver_name}</div>
                    </div>
                    <Badge variant="outline">{gp.status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Items received ({s.lines.length})</Label>
            <Button size="sm" variant="outline" onClick={addLine}>
              <Plus className="h-4 w-4 mr-1" />Add line
            </Button>
          </div>
          {s.lines.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              <PackageOpen className="h-6 w-6 mx-auto mb-2" />
              No lines added. Tap Add line to capture received items.
            </Card>
          ) : (
            s.lines.map((l, i) => (
              <Card key={`line-${i}-${l.item_name}`} className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-mono">Line #{i + 1}</span>
                  <Button size="sm" variant="ghost" onClick={() => removeLine(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Input
                  value={l.item_name}
                  onChange={e => updateLine(i, { item_name: e.target.value })}
                  placeholder="Item name"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Received qty</Label>
                    <Input
                      type="number" min={0}
                      value={l.received_qty}
                      onChange={e => updateLine(i, { received_qty: Math.max(0, Number(e.target.value) || 0) })}
                      className="font-mono"
                      inputMode="numeric"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">UOM</Label>
                    <Input
                      value={l.uom}
                      onChange={e => updateLine(i, { uom: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  {(['ok', 'damaged', 'short'] as const).map(c => (
                    <Button
                      key={c}
                      size="sm"
                      variant={l.condition === c ? 'default' : 'outline'}
                      onClick={() => updateLine(i, { condition: c })}
                      className="flex-1 capitalize"
                    >
                      {c}
                    </Button>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          {s.lines.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              No lines to photograph.
            </Card>
          ) : (
            s.lines.map((l, i) => (
              <Card key={`photo-${i}-${l.item_name}`} className="p-3 space-y-2">
                <div className="text-sm font-medium">{l.item_name || `Line ${i + 1}`}</div>
                <Button onClick={() => capturePhotoForLine(i)} variant="outline" className="w-full">
                  <Camera className="h-4 w-4 mr-2" />
                  Capture photo ({l.photo_urls.length})
                </Button>
                {l.photo_urls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {l.photo_urls.map((url, pi) => (
                      <img
                        key={`ir-photo-${i}-${pi}-${url.slice(-12)}`}
                        src={url}
                        alt={`Line ${i + 1} evidence ${pi + 1}`}
                        className="rounded border"
                      />
                    ))}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {step === 5 && (
        <div className="space-y-3 text-sm">
          <Card className="p-3 space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-semibold">Review</span>
            </div>
            <div><span className="text-muted-foreground">Vendor:</span> {s.vendor_name}</div>
            {s.gate_pass_no && (
              <div className="font-mono"><span className="text-muted-foreground font-sans">Gate Pass:</span> {s.gate_pass_no}</div>
            )}
            {s.vehicle_no && (
              <div className="font-mono"><span className="text-muted-foreground font-sans">Vehicle:</span> {s.vehicle_no}</div>
            )}
            <div><span className="text-muted-foreground">Lines:</span> {s.lines.length}</div>
            <div className="font-mono">
              <span className="text-muted-foreground font-sans">Total qty:</span>{' '}
              {s.lines.reduce((a, l) => a + l.received_qty, 0)}
            </div>
            <div>
              <span className="text-muted-foreground">Photos:</span>{' '}
              {s.lines.reduce((a, l) => a + l.photo_urls.length, 0)}
            </div>
          </Card>
          <Label>Narration (optional)</Label>
          <Input
            value={s.narration}
            onChange={e => update({ narration: e.target.value })}
            placeholder="Notes for QA / receiving team"
          />
          <Button onClick={submit} disabled={submitting} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            {submitting ? 'Submitting…' : 'Submit Inward Receipt'}
          </Button>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        {step > 1 && (
          <Button
            variant="outline"
            onClick={() => setStep((step - 1) as InwardStep)}
            className="flex-1"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
        )}
        {step < 5 && (
          <Button
            onClick={() => setStep((step + 1) as InwardStep)}
            disabled={!canProceedInward(s, step)}
            className="flex-1"
          >
            Next<ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
