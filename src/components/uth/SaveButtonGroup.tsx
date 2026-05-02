/**
 * @file     SaveButtonGroup.tsx — OOB-7 · Q3-d context-aware save buttons
 * @sprint   T-Phase-2.7-b
 * @purpose  Renders one or more save buttons based on:
 *             - User's role (does user have approval authority for this VT?)
 *             - Threshold breach (does record value exceed approval_threshold_value?)
 *             - Current record status (draft / submitted / approved)
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, Send, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { NonFineCoreVoucherType } from '@/lib/non-finecore-voucher-type-registry';

export type SaveButtonStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'posted' | 'cancelled' | undefined;

interface Props {
  voucherType: NonFineCoreVoucherType | null;
  recordValue: number;
  recordStatus: SaveButtonStatus;
  userRoles: string[];
  onSaveDraft: () => void;
  onSaveAndPost: () => void;
  onSubmitForApproval: () => void;
  onApproveAndPost: () => void;
  onReject: (reason: string) => void;
  saving?: boolean;
  className?: string;
}

export function SaveButtonGroup({
  voucherType, recordValue, recordStatus, userRoles,
  onSaveDraft, onSaveAndPost, onSubmitForApproval, onApproveAndPost, onReject,
  saving, className,
}: Props) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const threshold = voucherType?.approval_threshold_value ?? 0;
  const requiredRole = voucherType?.approval_role ?? null;
  const breached = threshold > 0 && recordValue >= threshold;
  // Phase 1 fallback: if no roles list available, treat user as approver (mock auth pre-RBAC).
  const isApprover = !requiredRole || userRoles.length === 0 || userRoles.includes(requiredRole);

  const submitReject = () => {
    const trimmed = rejectReason.trim();
    if (trimmed.length < 10) {
      toast.error('Reject reason must be at least 10 characters');
      return;
    }
    onReject(trimmed);
    setRejectOpen(false);
    setRejectReason('');
  };

  // Status-driven button selection
  if (recordStatus === 'submitted') {
    if (isApprover) {
      return (
        <>
          <div className={`flex gap-2 flex-wrap items-center ${className ?? ''}`}>
            <Badge variant="outline" className="self-center font-mono">
              Pending · ₹{recordValue.toLocaleString('en-IN')}
            </Badge>
            <Button onClick={onApproveAndPost} disabled={saving} className="bg-success hover:bg-success/90 text-success-foreground">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Approve & Post
            </Button>
            <Button variant="destructive" onClick={() => setRejectOpen(true)} disabled={saving}>
              <XCircle className="h-4 w-4 mr-2" /> Reject with Reason
            </Button>
          </div>
          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject record</DialogTitle>
                <DialogDescription>Provide a reason (minimum 10 characters). This will be recorded in the audit trail.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="reject-reason">Reason</Label>
                <Textarea
                  id="reject-reason"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={4}
                  placeholder="Why is this record being rejected?"
                />
                <p className="text-xs text-muted-foreground font-mono">{rejectReason.trim().length} / 10 chars</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={submitReject} disabled={rejectReason.trim().length < 10}>
                  Confirm Reject
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      );
    }
    return (
      <Badge variant="secondary" className={`px-3 py-2 ${className ?? ''}`}>
        Awaiting approval from {requiredRole}
      </Badge>
    );
  }

  if (recordStatus === 'approved' || recordStatus === 'posted') {
    return (
      <Badge variant="outline" className={`px-3 py-2 ${className ?? ''}`}>
        {recordStatus === 'posted' ? 'Posted' : 'Approved'}
      </Badge>
    );
  }

  if (recordStatus === 'rejected') {
    return (
      <Badge variant="destructive" className={`px-3 py-2 ${className ?? ''}`}>
        Rejected
      </Badge>
    );
  }

  // Draft / new record buttons
  return (
    <div className={`flex gap-2 flex-wrap ${className ?? ''}`}>
      <Button variant="outline" onClick={onSaveDraft} disabled={saving}>
        <Save className="h-4 w-4 mr-2" /> Save Draft
      </Button>
      {!breached && (
        <Button onClick={onSaveAndPost} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> Save & Post
        </Button>
      )}
      {breached && !isApprover && (
        <Button onClick={onSubmitForApproval} disabled={saving}>
          <Send className="h-4 w-4 mr-2" /> Submit for Approval
          <Badge variant="outline" className="ml-2 text-xs">requires {requiredRole}</Badge>
        </Button>
      )}
      {breached && isApprover && (
        <>
          <Button variant="outline" onClick={onSubmitForApproval} disabled={saving}>
            <Send className="h-4 w-4 mr-2" /> Submit for Approval
          </Button>
          <Button onClick={onApproveAndPost} disabled={saving} className="bg-success hover:bg-success/90 text-success-foreground">
            <CheckCircle2 className="h-4 w-4 mr-2" /> Approve & Post
          </Button>
        </>
      )}
    </div>
  );
}
