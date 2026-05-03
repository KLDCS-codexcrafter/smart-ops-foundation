/**
 * @file        ApprovalActionPanel.tsx
 * @sprint      T-Phase-1.2.6f-b-2-fix-1 · Block M · per D-269 OOB-12 3-Tier Approval
 * @purpose     Approve/Reject actions gated by APPROVAL_MATRIX role + tier.
 * @decisions   D-269 (existing matrix reuse) · OOB-12 (3-tier · canonical thresholds)
 * @reuses      APPROVAL_MATRIX from requisition-common.ts · ApprovalTimelinePanel
 * @disciplines FR-25 (Department-Scoped) · FR-58 Shell pattern
 * @[JWT]       POST /api/procurement-enquiries/:id/approvals
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { APPROVAL_MATRIX } from '@/types/requisition-common';
import { ApprovalTimelinePanel } from '@/components/uth/ApprovalTimelinePanel';
import { appendAuditEntry } from '@/lib/audit-trail-hash-chain';
import { toast } from 'sonner';

export interface ApprovalRecord {
  role: string;
  approved_at: string;
  approved_by: string;
}

interface Props {
  enquiryId: string;
  enquiryNo: string;
  totalEstimatedValue: number;
  isCapex: boolean;
  currentApprovals: ApprovalRecord[];
  currentUserRole: string;
  entityCode: string;
  entityId: string;
  onApprove: (tier: 1 | 2 | 3, role: string) => void;
  onReject: (reason: string) => void;
}

export const tierFor = (value: number, isCapex: boolean): 1 | 2 | 3 => {
  if (isCapex) return 3;
  for (const t of APPROVAL_MATRIX) {
    if (value >= t.min_value && value <= t.max_value) return t.tier;
  }
  return 3;
};

export function ApprovalActionPanel({
  enquiryId, enquiryNo, totalEstimatedValue, isCapex,
  currentApprovals, currentUserRole, entityCode, entityId,
  onApprove, onReject,
}: Props): JSX.Element {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const tier = tierFor(totalEstimatedValue, isCapex);
  const tierConfig = APPROVAL_MATRIX[tier - 1];

  const approvedRoles = new Set(currentApprovals.map(a => a.role));
  const requiredRoles = tierConfig.required_approvals.map(r => r.role);
  const pendingRoles = requiredRoles.filter(r => !approvedRoles.has(r));

  const canApprove = pendingRoles.includes(currentUserRole);
  const isFullyApproved = pendingRoles.length === 0;

  const handleApprove = (): void => {
    void appendAuditEntry({
      entityCode,
      entityId,
      voucherId: enquiryId,
      voucherKind: 'procurement_enquiry',
      action: 'enquiry.approve',
      actorUserId: 'mock-user',
      payload: { tier, role: currentUserRole, enquiry_no: enquiryNo },
    }).catch(() => { /* best-effort */ });
    onApprove(tier, currentUserRole);
    toast.success(`Approved as ${currentUserRole}`);
  };

  const handleReject = (): void => {
    if (!rejectReason.trim()) {
      toast.error('Reason required');
      return;
    }
    void appendAuditEntry({
      entityCode,
      entityId,
      voucherId: enquiryId,
      voucherKind: 'procurement_enquiry',
      action: 'enquiry.reject',
      actorUserId: 'mock-user',
      payload: { reason: rejectReason, role: currentUserRole, enquiry_no: enquiryNo },
    }).catch(() => { /* best-effort */ });
    onReject(rejectReason);
    toast.info(`Rejected: ${rejectReason}`);
    setRejectReason('');
    setShowRejectInput(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle>Approval Required · {enquiryNo}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <ApprovalTimelinePanel totalEstimatedValue={totalEstimatedValue} forceFinanceGate={isCapex} />

        <div className="text-sm space-y-2">
          <p><strong>Tier {tier}</strong> · {tierConfig.threshold_label}</p>
          <p className="text-muted-foreground">Required sequence: {requiredRoles.join(' → ')}</p>
          <div className="flex gap-2 flex-wrap">
            {requiredRoles.map(r => {
              const done = approvedRoles.has(r);
              return (
                <Badge key={r} variant={done ? 'default' : 'outline'}>
                  {done ? '✓ ' : ''}{r}
                </Badge>
              );
            })}
          </div>
        </div>

        {!isFullyApproved && (
          <div className="flex gap-2">
            <Button onClick={handleApprove} disabled={!canApprove}>
              Approve as {currentUserRole}
              {!canApprove && pendingRoles.length > 0 && ` (waiting for ${pendingRoles[0]})`}
            </Button>
            <Button variant="destructive" onClick={() => setShowRejectInput(true)}>
              Reject
            </Button>
          </div>
        )}

        {showRejectInput && (
          <div className="space-y-2">
            <Textarea
              placeholder="Rejection reason (required)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={handleReject}>Submit Rejection</Button>
              <Button variant="ghost" onClick={() => { setShowRejectInput(false); setRejectReason(''); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isFullyApproved && (
          <p className="text-sm text-success font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Fully approved · ready to send RFQs
          </p>
        )}
      </CardContent>
    </Card>
  );
}
