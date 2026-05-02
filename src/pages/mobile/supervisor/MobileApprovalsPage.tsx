/**
 * MobileApprovalsPage.tsx — Pending approvals (Sprint 2.7-b · Q4-c)
 * Wires existing approval-workflow-engine · closes 1.1.1l-c era TODO.
 *
 * Lists pending records across all transaction types where current user
 * has approval authority. One-click approve/reject with reason capture.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { getCurrentUser } from '@/lib/auth-helpers';
import {
  loadAllPendingApprovals,
  patchPendingApprovalRecord,
  type PendingApproval,
} from '@/lib/pending-approvals-loader';

const FALLBACK_ROLES = ['stores_manager', 'sales_head', 'finance_head'];

export default function MobileApprovalsPage() {
  const navigate = useNavigate();
  const { entityCode } = useEntityCode();
  const user = getCurrentUser();
  const userRoles = useMemo<string[]>(() => {
    const u = user as unknown as { roles?: string[] };
    return Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : FALLBACK_ROLES;
  }, [user]);

  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<PendingApproval | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const refresh = useCallback(() => {
    if (entityCode) {
      setApprovals(loadAllPendingApprovals(entityCode, userRoles));
    }
  }, [entityCode, userRoles]);

  useEffect(() => { refresh(); }, [refresh]);

  const onApprove = async (a: PendingApproval) => {
    setBusy(a.record_id);
    try {
      const ok = patchPendingApprovalRecord(entityCode, a.record_type, a.record_id, {
        status: 'approved',
        approved_at: new Date().toISOString(),
        approver_id: user.id,
        approver_name: user.displayName,
      });
      if (ok) {
        toast.success(`${a.record_no} approved`);
        setApprovals(prev => prev.filter(p => p.record_id !== a.record_id));
      } else {
        toast.error('Failed to approve · record not found');
      }
    } finally {
      setBusy(null);
    }
  };

  const submitReject = () => {
    if (!rejectFor) return;
    const trimmed = rejectReason.trim();
    if (trimmed.length < 10) {
      toast.error('Reject reason must be at least 10 characters');
      return;
    }
    setBusy(rejectFor.record_id);
    try {
      const ok = patchPendingApprovalRecord(entityCode, rejectFor.record_type, rejectFor.record_id, {
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        approver_id: user.id,
        approver_name: user.displayName,
        rejection_reason: trimmed,
      });
      if (ok) {
        toast.success(`${rejectFor.record_no} rejected`);
        setApprovals(prev => prev.filter(p => p.record_id !== rejectFor.record_id));
      } else {
        toast.error('Failed to reject · record not found');
      }
      setRejectFor(null);
      setRejectReason('');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/supervisor')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Approvals</h1>
        <Badge variant="outline" className="ml-auto font-mono">{approvals.length}</Badge>
      </div>

      {approvals.length === 0 ? (
        <Card className="p-6 flex flex-col items-center text-center gap-3">
          <ShieldCheck className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">No pending approvals</p>
          <p className="text-xs text-muted-foreground">
            Records submitted for approval will appear here.
          </p>
        </Card>
      ) : (
        approvals.map(a => (
          <Card key={`${a.record_type}-${a.record_id}`} className="p-3 space-y-2">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{a.record_no}</p>
                <p className="text-xs text-muted-foreground">
                  {a.record_type.replace(/_/g, ' ')} · {a.party_name}
                </p>
                {a.voucher_type_name && (
                  <p className="text-xs text-muted-foreground">{a.voucher_type_name}</p>
                )}
              </div>
              <Badge variant="outline" className="font-mono text-xs shrink-0">
                ₹{a.total_amount.toLocaleString('en-IN')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Submitted: {a.submitted_at?.slice(0, 10) || '—'} by {a.submitted_by}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                onClick={() => onApprove(a)}
                disabled={busy === a.record_id}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={() => { setRejectFor(a); setRejectReason(''); }}
                disabled={busy === a.record_id}
              >
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
            </div>
          </Card>
        ))
      )}

      <Dialog open={!!rejectFor} onOpenChange={(o) => { if (!o) { setRejectFor(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {rejectFor?.record_no}</DialogTitle>
            <DialogDescription>Provide a reason (minimum 10 characters).</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="m-reject-reason">Reason</Label>
            <Textarea
              id="m-reject-reason"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground font-mono">{rejectReason.trim().length} / 10 chars</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectFor(null); setRejectReason(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={submitReject} disabled={rejectReason.trim().length < 10}>
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
