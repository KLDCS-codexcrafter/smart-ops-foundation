/**
 * @file     QCEntryWizard.tsx
 * @sprint   T-Phase-1.3-3b-pre-2 · Block F · D-631 · Q53=a (wizard mode)
 * @purpose  Step-by-step guided QC entry · 1 step per inspection line.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { updateInspectionLine } from '@/lib/qa-inspection-engine';
import type { QaInspectionRecord } from '@/types/qa-inspection';

export interface QCEntryWizardProps {
  inspection: QaInspectionRecord;
  onLineUpdate: () => void;
}

export function QCEntryWizard({ inspection, onLineUpdate }: QCEntryWizardProps): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const [step, setStep] = useState(0);
  const lines = inspection.lines;
  const total = lines.length;
  const line = lines[step];

  const [qtyPassed, setQtyPassed] = useState<string>(String(line?.qty_passed ?? 0));
  const [qtyFailed, setQtyFailed] = useState<string>(String(line?.qty_failed ?? 0));
  const [reason, setReason] = useState<string>(line?.failure_reason ?? '');
  const [saving, setSaving] = useState(false);

  if (total === 0) {
    return <div className="p-6 text-center text-sm text-muted-foreground">No inspection lines.</div>;
  }

  const goTo = (next: number): void => {
    const target = lines[next];
    if (!target) return;
    setStep(next);
    setQtyPassed(String(target.qty_passed ?? 0));
    setQtyFailed(String(target.qty_failed ?? 0));
    setReason(target.failure_reason ?? '');
  };

  const saveCurrent = async (): Promise<boolean> => {
    const qp = Number(qtyPassed) || 0;
    const qf = Number(qtyFailed) || 0;
    if (qp + qf > line.qty_inspected) {
      toast.error(`Pass + Fail cannot exceed inspected qty (${line.qty_inspected})`);
      return false;
    }
    setSaving(true);
    try {
      await updateInspectionLine(
        inspection.id, line.id, qp, qf,
        reason.trim() || null,
        entityCode, user?.id ?? 'demo-user',
      );
      onLineUpdate();
      return true;
    } catch (e) {
      toast.error(`Save failed: ${(e as Error).message}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async (): Promise<void> => {
    const ok = await saveCurrent();
    if (ok && step < total - 1) goTo(step + 1);
    else if (ok) toast.success('All steps complete · proceed to Finalize.');
  };

  const handlePrev = async (): Promise<void> => {
    const ok = await saveCurrent();
    if (ok && step > 0) goTo(step - 1);
  };

  const progress = ((step + 1) / total) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Step {step + 1} of {total}</span>
        <span className="font-medium text-foreground">{line.item_name}</span>
      </div>
      <Progress value={progress} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Inspected</Label>
          <Input value={String(line.qty_inspected)} readOnly className="h-9 font-mono bg-muted/30" />
        </div>
        <div>
          <Label className="text-xs">Quantity Passed</Label>
          <Input type="number" value={qtyPassed} onChange={e => setQtyPassed(e.target.value)} className="h-9 font-mono" />
        </div>
        <div>
          <Label className="text-xs">Quantity Failed</Label>
          <Input type="number" value={qtyFailed} onChange={e => setQtyFailed(e.target.value)} className="h-9 font-mono" />
        </div>
        <div>
          <Label className="text-xs">Failure Reason</Label>
          <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="(none)" className="h-9" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" size="sm" onClick={handlePrev} disabled={saving || step === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <Button size="sm" onClick={handleNext} disabled={saving}>
          {step === total - 1
            ? <><CheckCircle2 className="h-4 w-4 mr-1" /> Save Last</>
            : <>Next <ChevronRight className="h-4 w-4 ml-1" /></>}
        </Button>
      </div>
    </div>
  );
}
