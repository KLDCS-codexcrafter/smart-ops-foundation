/**
 * @file        MobileStoreIssueCapture.tsx
 * @sprint      T-Phase-1.2.6f-d-2-card7-7-pre-3 · Block A · D-394
 * @purpose     OperixGo Stock Issue 4-step capture flow for Stores team.
 *              Pattern: MIRRORS MobileInwardReceiptCapture (D-369) trimmed to 4 steps
 *              (no vendor · no gate-link since Stock Issue is internal).
 *              NO [tick, setTick] + useMemo anti-pattern.
 * @decisions   D-394 · D-369 (5-step parent · trimmed to 4) · D-128 (postVoucher API only)
 * @reuses      stock-issue-engine.createStockIssue + postStockIssue (7-pre-1 · NO MODIFICATIONS)
 *              camera-bridge.capturePhoto · offline-queue-engine.enqueueWrite · OfflineIndicator
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Camera, Send, ArrowLeft, ArrowRight, FileText, PackageOpen, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { capturePhoto } from '@/lib/camera-bridge';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import { enqueueWrite } from '@/lib/offline-queue-engine';
import { createStockIssue, postStockIssue } from '@/lib/stock-issue-engine';

type Step = 1 | 2 | 3 | 4;

interface LineDraft {
  item_id: string;
  item_name: string;
  qty: number;
  uom: string;
  godown_id: string;
  godown_name: string;
}

interface FormState {
  department_id: string;
  department_name: string;
  recipient_name: string;
  purpose: string;
  lines: LineDraft[];
  photos: string[];
  notes: string;
}

const EMPTY_LINE: LineDraft = { item_id: '', item_name: '', qty: 0, uom: 'nos', godown_id: 'gd-main', godown_name: 'Main Stores' };
const EMPTY_FORM: FormState = {
  department_id: '', department_name: '', recipient_name: '', purpose: '',
  lines: [{ ...EMPTY_LINE }], photos: [], notes: '',
};

function getActiveEntityCode(): string {
  try { return localStorage.getItem('active_entity_code') ?? 'DEMO'; } catch { return 'DEMO'; }
}

function canProceed(s: FormState, step: Step): boolean {
  if (step === 1) return s.department_name.trim().length > 0 && s.recipient_name.trim().length > 0 && s.purpose.trim().length > 0;
  if (step === 2) return s.lines.length > 0 && s.lines.every(l => l.item_name.trim().length > 0 && l.qty > 0);
  return true;
}

interface Props { onClose: () => void }

export default function MobileStoreIssueCapture({ onClose }: Props): JSX.Element {
  const [step, setStep] = useState<Step>(1);
  const [s, setS] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const ENTITY = getActiveEntityCode();

  const addLine = (): void => setS(prev => ({ ...prev, lines: [...prev.lines, { ...EMPTY_LINE }] }));
  const removeLine = (i: number): void => setS(prev => ({ ...prev, lines: prev.lines.filter((_, idx) => idx !== i) }));
  const updateLine = (i: number, patch: Partial<LineDraft>): void => setS(prev => ({
    ...prev, lines: prev.lines.map((l, idx) => idx === i ? { ...l, ...patch } : l),
  }));

  const addPhoto = async (): Promise<void> => {
    const r = await capturePhoto();
    if (r.ok && r.data_url) setS(prev => ({ ...prev, photos: [...prev.photos, r.data_url as string] }));
    else toast.error(r.reason ?? 'Camera unavailable');
  };

  const submit = async (): Promise<void> => {
    setSubmitting(true);
    try {
      // [JWT] POST /api/store-hub/stock-issues
      const payload = {
        entity_id: ENTITY,
        department_id: s.department_id || s.department_name.toLowerCase().replace(/\s+/g, '-'),
        department_name: s.department_name,
        recipient_id: null,
        recipient_name: s.recipient_name,
        purpose: s.purpose,
        lines: s.lines.map(l => ({
          item_id: l.item_id || l.item_name.toLowerCase().replace(/\s+/g, '-'),
          item_code: (l.item_id || l.item_name).slice(0, 8).toUpperCase(),
          item_name: l.item_name,
          uom: l.uom,
          qty: l.qty,
          rate: 0,
          source_godown_id: l.godown_id,
          source_godown_name: l.godown_name,
        })),
        narration: s.notes || `Mobile capture · ${s.purpose}`,
        reference_no: `MOBILE:${Date.now()}`,
      };
      if (!navigator.onLine) {
        enqueueWrite(ENTITY, 'rating_submit', { kind: 'stock_issue', input: payload });
        toast.success('Stock Issue queued — will sync when online');
      } else {
        const issue = await createStockIssue(payload, ENTITY, 'mobile-stores-mgr');
        await postStockIssue(issue.id, ENTITY, 'mobile-stores-mgr');
        toast.success(`Stock Issue ${issue.issue_no} posted`);
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
          <div className="flex items-center gap-2"><PackageOpen className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Department + Recipient</h2></div>
          <div><Label>Department</Label><Input value={s.department_name} onChange={e => setS({ ...s, department_name: e.target.value })} placeholder="Production / QC / Maintenance" /></div>
          <div><Label>Recipient name</Label><Input value={s.recipient_name} onChange={e => setS({ ...s, recipient_name: e.target.value })} placeholder="Floor staff / Supervisor" /></div>
          <div><Label>Purpose</Label><Input value={s.purpose} onChange={e => setS({ ...s, purpose: e.target.value })} placeholder="Production batch / Maintenance" /></div>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Items + Quantity</h2></div>
          {s.lines.map((l, i) => (
            <div key={`si-line-${i}`} className="border rounded p-2 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Line {i + 1}</span>
                {s.lines.length > 1 && <Button size="sm" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
              <Input value={l.item_name} onChange={e => updateLine(i, { item_name: e.target.value })} placeholder="Item name" />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" value={l.qty || ''} onChange={e => updateLine(i, { qty: Number(e.target.value) })} placeholder="Qty" className="font-mono" />
                <Input value={l.uom} onChange={e => updateLine(i, { uom: e.target.value })} placeholder="UOM" />
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4 mr-1" />Add line</Button>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Photos (optional)</h2></div>
          <div className="grid grid-cols-3 gap-2">
            {s.photos.map((p, i) => <img key={`si-photo-${i}-${p.slice(-12)}`} src={p} alt={`photo ${i + 1}`} className="rounded border h-20 object-cover" />)}
            <Button variant="outline" className="h-20" onClick={addPhoto}><Camera className="h-6 w-6" /></Button>
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /><h2 className="text-lg font-semibold">Review</h2></div>
          <div className="text-sm space-y-1">
            <div><span className="text-muted-foreground">Dept:</span> <span className="font-medium">{s.department_name}</span></div>
            <div><span className="text-muted-foreground">Recipient:</span> {s.recipient_name}</div>
            <div><span className="text-muted-foreground">Purpose:</span> {s.purpose}</div>
            <div><span className="text-muted-foreground">Lines:</span> {s.lines.length} · <span className="text-muted-foreground">Photos:</span> {s.photos.length}</div>
            <div className="pt-2 border-t">
              {s.lines.map((l, i) => (
                <div key={`si-rev-${i}`} className="text-xs flex justify-between"><span>{l.item_name}</span><span className="font-mono">{l.qty} {l.uom}</span></div>
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
