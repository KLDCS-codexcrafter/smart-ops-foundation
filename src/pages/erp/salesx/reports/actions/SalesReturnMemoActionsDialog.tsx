/**
 * SalesReturnMemoActionsDialog.tsx — UPRA-1 Phase B · workflow shell extracted from
 * SalesReturnMemoRegister.tsx (399 LOC) per Q-LOCK M12.
 *
 * BEHAVIOUR PARITY ATTESTATION:
 * - Approve action: state 'pending' → 'approved' · approved_by_user='Current User' ·
 *   approved_at=now · approval_notes=trim()||null · updated_at=now · toast text preserved
 *   (`Memo ${memo_no} approved`)
 * - Reject action: requires reject_reason ≥ 10 chars; state 'pending' → 'rejected' ·
 *   rejection_reason=trim() · updated_at=now · toast text preserved
 *   (`Memo ${memo_no} rejected`) · validation toast preserved
 *   ('Please provide a rejection reason (min. 10 characters)')
 * - Convert-to-CN action: navigate(`/erp/accounting/vouchers/credit-note?from_memo=${id}`)
 *   preserved verbatim (no CN engine modification)
 * - Send-to-Customer: not present in source-of-truth Register (no helper call existed)
 *
 * All `localStorage.setItem(salesReturnMemosKey(entity), ...)` calls preserved verbatim.
 * Source-of-truth fidelity verified at commit time.
 *
 * [JWT] PATCH /api/salesx/sales-return-memos/:id (approve/reject)
 */

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Send } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import {
  salesReturnMemosKey,
  type SalesReturnMemo,
} from '@/types/sales-return-memo';

export type SalesReturnMemoAction = 'approve' | 'reject' | 'convert';

export interface SalesReturnMemoActionsDialogProps {
  entityCode: string;
  memo: SalesReturnMemo | null;
  action: SalesReturnMemoAction | null;
  open: boolean;
  onClose: () => void;
  onActionComplete?: (updatedMemo: SalesReturnMemo) => void;
}

function ls<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]') as T[]; }
  catch { return []; }
}

export function SalesReturnMemoActionsDialog(
  props: SalesReturnMemoActionsDialogProps,
): JSX.Element | null {
  const { entityCode, memo, action, open, onClose, onActionComplete } = props;
  const navigate = useNavigate();
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const resetAndClose = useCallback(() => {
    setApproveNotes('');
    setRejectReason('');
    onClose();
  }, [onClose]);

  const persistAll = useCallback((next: SalesReturnMemo[]) => {
    // [JWT] PATCH /api/salesx/sales-return-memos
    localStorage.setItem(salesReturnMemosKey(entityCode), JSON.stringify(next));
  }, [entityCode]);

  const handleApprove = useCallback(() => {
    if (!memo) return;
    const all = ls<SalesReturnMemo>(salesReturnMemosKey(entityCode));
    const idx = all.findIndex(m => m.id === memo.id);
    if (idx < 0) return;
    const now = new Date().toISOString();
    all[idx] = {
      ...all[idx],
      status: 'approved',
      approved_by_user: 'Current User',
      approved_at: now,
      approval_notes: approveNotes.trim() || null,
      updated_at: now,
    };
    persistAll(all);
    toast.success(`Memo ${all[idx].memo_no} approved`);
    onActionComplete?.(all[idx]);
    resetAndClose();
  }, [memo, approveNotes, entityCode, persistAll, onActionComplete, resetAndClose]);

  const handleReject = useCallback(() => {
    if (!memo) return;
    if (rejectReason.trim().length < 10) {
      toast.error('Please provide a rejection reason (min. 10 characters)');
      return;
    }
    const all = ls<SalesReturnMemo>(salesReturnMemosKey(entityCode));
    const idx = all.findIndex(m => m.id === memo.id);
    if (idx < 0) return;
    const now = new Date().toISOString();
    all[idx] = {
      ...all[idx],
      status: 'rejected',
      rejection_reason: rejectReason.trim(),
      updated_at: now,
    };
    persistAll(all);
    toast.success(`Memo ${all[idx].memo_no} rejected`);
    onActionComplete?.(all[idx]);
    resetAndClose();
  }, [memo, rejectReason, entityCode, persistAll, onActionComplete, resetAndClose]);

  const handleConvert = useCallback(() => {
    if (!memo) return;
    navigate(`/erp/accounting/vouchers/credit-note?from_memo=${memo.id}`);
    resetAndClose();
  }, [memo, navigate, resetAndClose]);

  if (!memo || !action) return null;

  if (action === 'approve') {
    return (
      <Dialog open={open} onOpenChange={o => !o && resetAndClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Sales Return Memo</DialogTitle>
            <DialogDescription>Approval notes are optional but recommended.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={approveNotes}
            onChange={e => setApproveNotes(e.target.value)}
            onKeyDown={onEnterNext as unknown as React.KeyboardEventHandler<HTMLTextAreaElement>}
            placeholder="Notes for the team (optional)"
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
            <Button data-primary onClick={handleApprove} className="bg-orange-500 hover:bg-orange-600">
              <Check className="h-4 w-4 mr-1" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (action === 'reject') {
    return (
      <Dialog open={open} onOpenChange={o => !o && resetAndClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Sales Return Memo</DialogTitle>
            <DialogDescription>Provide a clear reason (minimum 10 characters).</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            onKeyDown={onEnterNext as unknown as React.KeyboardEventHandler<HTMLTextAreaElement>}
            placeholder="Why is this memo being rejected?"
            className="min-h-[100px]"
          />
          <p className="text-[10px] text-muted-foreground">
            {rejectReason.trim().length}/10 characters minimum
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>
              <X className="h-4 w-4 mr-1" /> Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // convert
  return (
    <Dialog open={open} onOpenChange={o => !o && resetAndClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert to Credit Note</DialogTitle>
          <DialogDescription>
            You will be taken to the Credit Note voucher screen with memo {memo.memo_no} prefilled.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
          <Button data-primary onClick={handleConvert} className="bg-orange-500 hover:bg-orange-600">
            <Send className="h-4 w-4 mr-1" /> Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SalesReturnMemoActionsDialog;
