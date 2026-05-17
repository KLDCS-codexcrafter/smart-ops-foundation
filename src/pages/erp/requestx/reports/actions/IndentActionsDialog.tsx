/**
 * IndentActionsDialog.tsx — UPRA-4 Phase C · M12 canonical precedent (final UPRA arc)
 *
 * Workflow shell extracted byte-identical from IndentRegister.tsx (legacy lines 118-130 + 211-229).
 *
 * BEHAVIOUR PARITY ATTESTATION:
 * - Cancel: identical to source `handleCancel` · cancelIndent(id, kind, 'current-user',
 *   'department_head', cancelReason, entityCode) · 6-arg byte-identical · result.ok/reason
 *   discriminated handling · toast.success(`${voucher_no} cancelled`) or
 *   toast.error(`Cancel failed: ${reason ?? 'unknown'}`) verbatim
 * - 500-char Textarea maxLength preserved
 * - Cancel button disabled condition: cancelling || !cancelReason.trim() preserved
 * - Button label conditional: cancelling ? 'Cancelling...' : 'Confirm Cancel' preserved
 *
 * [JWT] PATCH /api/requestx/{kind}-indents/:id/cancel
 */

import { useCallback, useState } from 'react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cancelIndent, type IndentKind } from '@/lib/request-engine';
import type { IndentUnionRow } from '../IndentRegister';

export type IndentAction =
  | { kind: 'cancel'; record: IndentUnionRow };

export interface IndentActionsDialogProps {
  action: IndentAction | null;
  open: boolean;
  entityCode: string;
  onClose: () => void;
  onActionComplete?: () => void;
}

export function IndentActionsDialog({
  action, open, entityCode, onClose, onActionComplete,
}: IndentActionsDialogProps): JSX.Element | null {
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const resetAndClose = useCallback(() => {
    setCancelReason('');
    onClose();
  }, [onClose]);

  // M12 byte-identical extraction · matches legacy IndentRegister.tsx lines 118-130
  const handleCancel = useCallback((): void => {
    if (!action || action.kind !== 'cancel') return;
    if (!cancelReason.trim()) return;
    setCancelling(true);
    const result = cancelIndent(
      action.record.id,
      action.record.kind as IndentKind,
      'current-user',
      'department_head',
      cancelReason,
      entityCode,
    );
    if (result.ok) {
      toast.success(`${action.record.voucher_no} cancelled`);
      setCancelReason('');
      onActionComplete?.();
      onClose();
    } else {
      toast.error(`Cancel failed: ${result.reason ?? 'unknown'}`);
    }
    setCancelling(false);
  }, [action, cancelReason, entityCode, onActionComplete, onClose]);

  if (!action || action.kind !== 'cancel') return null;

  return (
    <Dialog open={open} onOpenChange={o => !o && resetAndClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel {action.record.voucher_no}</DialogTitle>
        </DialogHeader>
        <Textarea
          value={cancelReason}
          onChange={e => setCancelReason(e.target.value)}
          placeholder="Reason for cancellation (required · max 500 chars)"
          maxLength={500}
        />
        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>Back</Button>
          <Button variant="destructive" disabled={cancelling || !cancelReason.trim()} onClick={handleCancel}>
            {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
