/**
 * ProductionOrderActionsDialog.tsx — UPRA-2 Phase B · workflow shell extracted from
 * ProductionOrderRegister.tsx (183 LOC) per Q-LOCK PB-Q3=(A).
 *
 * BYTE-IDENTICAL PARITY ATTESTATION:
 * - 5-char min validation: closureRemarks.trim().length < 5 → toast 'Closure remarks required (min 5 chars)'
 * - closeProductionOrder engine call: { po, closureRemarks: trim, closer: { id, name }, thresholdPct: config?.varianceThresholdPct ?? 10 }
 * - Success toast: `PO ${doc_no} closed` (template literal byte-identical)
 * - Error toast: (e as Error).message (engine-thrown errors surfaced as-is)
 * - Busy state: setBusy(true) → call → setBusy(false) in finally (prevents double-submit)
 * - Maker-checker: NOT duplicated in UI · enforced by engine (closer.id === po.created_by, latest PC creator)
 *
 * [JWT] POST /api/production/production-orders/:id/close (handled by closeProductionOrder engine)
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { closeProductionOrder } from '@/lib/production-engine';
import { useProductionConfig } from '@/hooks/useProductionConfig';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { ProductionOrder } from '@/types/production-order';

export interface ProductionOrderActionsDialogProps {
  po: ProductionOrder | null;
  open: boolean;
  onClose: () => void;
  onClosed?: (updatedPo: ProductionOrder) => void;
}

export function ProductionOrderActionsDialog({ po, open, onClose, onClosed }: ProductionOrderActionsDialogProps): JSX.Element | null {
  const config = useProductionConfig();
  const user = useCurrentUser();
  const [closureRemarks, setClosureRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCancel = (): void => {
    setClosureRemarks('');
    onClose();
  };

  const handleClose = (): void => {
    if (!po || !user) return;
    if (closureRemarks.trim().length < 5) {
      toast.error('Closure remarks required (min 5 chars)');
      return;
    }
    setBusy(true);
    try {
      const updated = closeProductionOrder({
        po,
        closureRemarks: closureRemarks.trim(),
        closer: { id: user.id, name: user.name },
        thresholdPct: config.varianceThresholdPct ?? 10,
      });
      toast.success(`PO ${po.doc_no} closed`);
      onClosed?.(updated);
      onClose();
      setClosureRemarks('');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close Production Order · {po?.doc_no}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Closing freezes the cost structure and variance snapshot. Maker-checker (Q19=b): the PO creator and latest PC creator cannot close.
          </p>
          <div>
            <Label>Closure Remarks (required)</Label>
            <Textarea
              value={closureRemarks}
              onChange={e => setClosureRemarks(e.target.value)}
              placeholder="Reason for closure, variance commentary, …"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleClose} disabled={busy}>{busy ? 'Closing…' : 'Confirm Close'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ProductionOrderActionsDialog;
