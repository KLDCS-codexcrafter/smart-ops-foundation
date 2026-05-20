/**
 * @file        src/pages/erp/eximx/import/CICustomsRevaluationDialog.tsx
 * @purpose     Modal · CICustomeVal edit · captures justification + gazette ref · cross-writes MLGIT reconciliation event
 * @sprint      T-Phase-1.EX-5-CommercialInvoice-6PartAllocation-CIFWaterfall
 * @decisions   EX-5-Q4=a editable + emits ReconciliationEvent · Moat #15 FULL ANCHOR
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { computeReconciliationVariance } from '@/types/reconciliation-event';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ciNumber: string;
  lineNo: number;
  mlgitNumber: string | null;
  currentActualCIF: number;
  onCommit: (newActualCIF: number, justification: string, gazetteRef: string) => void;
}

export function CICustomsRevaluationDialog({
  open, onOpenChange, ciNumber, lineNo, mlgitNumber, currentActualCIF, onCommit,
}: Props): JSX.Element {
  const [newValue, setNewValue] = useState<string>(currentActualCIF.toFixed(2));
  const [justification, setJustification] = useState<string>('');
  const [gazetteRef, setGazetteRef] = useState<string>('');

  const parsed = Number(newValue);
  const valid = !Number.isNaN(parsed) && parsed > 0 && justification.trim().length > 5 && gazetteRef.trim().length > 0;
  const variance = computeReconciliationVariance(currentActualCIF, Number.isNaN(parsed) ? currentActualCIF : parsed);

  function submit(): void {
    if (!valid) return;
    onCommit(parsed, justification.trim(), gazetteRef.trim());
    toast.success(`CICustomeVal updated · ReconciliationEvent emitted${mlgitNumber ? ` on ${mlgitNumber}` : ''}`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>CICustomeVal Revaluation · {ciNumber} · Line {lineNo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline">Moat #15 · Audit Trail</Badge>
            {mlgitNumber && <Badge variant="outline" className="font-mono">→ MLGIT {mlgitNumber}</Badge>}
          </div>

          <div>
            <Label className="text-xs">Current Actual CIF (₹)</Label>
            <div className="font-mono text-sm mt-1">₹{currentActualCIF.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          </div>

          <div>
            <Label htmlFor="newval" className="text-xs">New Actual CIF (₹)</Label>
            <Input id="newval" type="number" inputMode="decimal" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="font-mono" />
            {!Number.isNaN(parsed) && parsed > 0 && (
              <div className="text-xs mt-1 text-muted-foreground">
                Variance: ₹{variance.variance_inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ({variance.variance_pct.toFixed(3)}% · {variance.verdict})
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="just" className="text-xs">Justification (mandatory)</Label>
            <Textarea id="just" value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="e.g., Customs Officer revaluation per CBIC NTF-2026-04 · UAE-CEPA Self-Cert validity" rows={3} />
          </div>

          <div>
            <Label htmlFor="gaz" className="text-xs">Gazette Reference (mandatory)</Label>
            <Input id="gaz" value={gazetteRef} onChange={(e) => setGazetteRef(e.target.value)} placeholder="e.g., CBIC-NTF-2026-04" className="font-mono" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!valid} onClick={submit}>Commit + Emit Event</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
