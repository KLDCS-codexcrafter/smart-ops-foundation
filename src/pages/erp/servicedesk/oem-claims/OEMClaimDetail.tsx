/**
 * @file        src/pages/erp/servicedesk/oem-claims/OEMClaimDetail.tsx
 * @purpose     C.1d · OEM Claim Detail · transition actions · D-NEW-DJ Procure360 emission ⭐
 * @sprint      T-Phase-1.C.1d · Block D.7
 * @iso         Functional Suitability + Usability
 */
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  getOEMClaim,
  submitOEMClaimToProcure360,
  markOEMClaimApproved,
  markOEMClaimPaid,
  markOEMClaimRejected,
} from '@/lib/servicedesk-oem-engine';
import type { OEMClaimPacket } from '@/types/oem-claim';

interface Props {
  claimId: string;
  onBack: () => void;
}

function fmtParise(p: number): string {
  return `₹${(p / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function OEMClaimDetail({ claimId, onBack }: Props): JSX.Element {
  const [claim, setClaim] = useState<OEMClaimPacket | null>(null);
  const [oemClaimNo, setOemClaimNo] = useState('');
  const [approvedAmt, setApprovedAmt] = useState<string>('');
  const [paidAmt, setPaidAmt] = useState<string>('');
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    const c = getOEMClaim(claimId);
    setClaim(c);
    if (c) setApprovedAmt(String(c.total_claim_value_paise / 100));
  }, [claimId]);

  if (!claim) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <Card className="glass-card p-6 mt-4 text-center text-muted-foreground">
          Claim not found.
        </Card>
      </div>
    );
  }

  const reload = (): void => setClaim(getOEMClaim(claimId));

  const onSubmit = (): void => {
    if (!oemClaimNo) { toast.error('OEM claim no required'); return; }
    try {
      submitOEMClaimToProcure360(claim.id, 'current_user', oemClaimNo, claim.entity_id);
      toast.success('Submitted to Procure360 (D-NEW-DJ 5th consumer wire fired)');
      reload();
    } catch (e) { toast.error((e as Error).message); }
  };

  const onApprove = (): void => {
    const amt = Math.round(Number(approvedAmt) * 100);
    if (!Number.isFinite(amt) || amt <= 0) { toast.error('Invalid approved amount'); return; }
    try {
      markOEMClaimApproved(claim.id, 'current_user', amt, claim.entity_id);
      toast.success('Marked approved');
      reload();
    } catch (e) { toast.error((e as Error).message); }
  };

  const onPay = (): void => {
    const amt = Math.round(Number(paidAmt || approvedAmt) * 100);
    if (!Number.isFinite(amt) || amt <= 0) { toast.error('Invalid paid amount'); return; }
    try {
      markOEMClaimPaid(claim.id, 'current_user', amt, claim.entity_id);
      toast.success('Marked paid');
      reload();
    } catch (e) { toast.error((e as Error).message); }
  };

  const onReject = (): void => {
    if (!rejectReason) { toast.error('Reason required'); return; }
    try {
      markOEMClaimRejected(claim.id, 'current_user', rejectReason, claim.entity_id);
      toast.success('Marked rejected');
      reload();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" />Back to claims</Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{claim.claim_no}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ticket {claim.ticket_id} · OEM {claim.oem_name} · Spare {claim.spare_name}
          </p>
        </div>
        <Badge variant="outline" className="text-sm capitalize">{claim.status}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card p-4">
          <div className="text-xs text-muted-foreground">Quantity</div>
          <div className="text-xl font-mono mt-1">{claim.qty}</div>
        </Card>
        <Card className="glass-card p-4">
          <div className="text-xs text-muted-foreground">Claim Value</div>
          <div className="text-xl font-mono mt-1">{fmtParise(claim.total_claim_value_paise)}</div>
        </Card>
        <Card className="glass-card p-4">
          <div className="text-xs text-muted-foreground">Warranty</div>
          <div className="text-xl mt-1 capitalize">{claim.warranty_period_status.replace('_', ' ')}</div>
        </Card>
      </div>

      {claim.status === 'pending' && (
        <Card className="glass-card p-4 space-y-3">
          <h2 className="font-semibold">Submit to Procure360</h2>
          <div className="space-y-2">
            <Label>OEM Claim Number (assigned by OEM)</Label>
            <Input
              value={oemClaimNo}
              onChange={(e) => setOemClaimNo(e.target.value)}
              placeholder="e.g. WAR-2026-9123"
            />
          </div>
          <Button onClick={onSubmit}>Submit Claim</Button>
        </Card>
      )}

      {claim.status === 'submitted' && (
        <Card className="glass-card p-4 space-y-3">
          <h2 className="font-semibold">Mark Approved</h2>
          <div className="space-y-2">
            <Label>Approved Amount (₹)</Label>
            <Input
              type="number"
              value={approvedAmt}
              onChange={(e) => setApprovedAmt(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={onApprove}>Mark Approved</Button>
            <Button variant="destructive" onClick={() => setRejectReason('rejected_by_oem')}>Reject…</Button>
          </div>
        </Card>
      )}

      {claim.status === 'approved' && (
        <Card className="glass-card p-4 space-y-3">
          <h2 className="font-semibold">Mark Paid</h2>
          <div className="space-y-2">
            <Label>Paid Amount (₹)</Label>
            <Input
              type="number"
              value={paidAmt}
              onChange={(e) => setPaidAmt(e.target.value)}
              placeholder={String(claim.paid_amount_paise / 100)}
              className="font-mono"
            />
          </div>
          <Button onClick={onPay}>Mark Paid</Button>
        </Card>
      )}

      {(claim.status === 'submitted' || claim.status === 'approved') && (
        <Card className="glass-card p-4 space-y-3">
          <h2 className="font-semibold text-destructive">Reject Claim</h2>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection…"
            rows={3}
          />
          <Button variant="destructive" onClick={onReject}>Mark Rejected</Button>
        </Card>
      )}

      <Card className="glass-card p-4">
        <h2 className="font-semibold mb-2">Audit Trail</h2>
        <div className="space-y-1 text-xs font-mono">
          {claim.audit_trail.map((a, i) => (
            <div key={i} className="text-muted-foreground">
              [{new Date(a.at).toLocaleString('en-IN')}] {a.by} · {a.action}{a.reason ? ` · ${a.reason}` : ''}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
