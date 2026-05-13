/**
 * @file        src/pages/erp/servicedesk/amc-pipeline/AMCProposalDetail.tsx
 * @purpose     Q-LOCK-2 · 5-state machine + transition-actor audit (T2 AC-T2-1)
 * @sprint      T-Phase-1.C.1b · Block D.3
 * @iso        Functional Suitability + Usability
 */
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { listAMCProposals, transitionProposalStatus } from '@/lib/servicedesk-engine';
import { emitRenewalEmailToTemplateEngine } from '@/lib/servicedesk-bridges';
import type { AMCProposal, AMCProposalStatus } from '@/types/servicedesk';

const ALLOWED: Record<AMCProposalStatus, AMCProposalStatus[]> = {
  draft: ['sent'],
  sent: ['negotiating', 'accepted', 'rejected'],
  negotiating: ['accepted', 'rejected'],
  accepted: [],
  rejected: [],
};

interface Props {
  proposalId: string;
  onBack?: () => void;
}

export function AMCProposalDetail({ proposalId, onBack }: Props): JSX.Element {
  const [proposal, setProposal] = useState<AMCProposal | null>(null);
  const [target, setTarget] = useState<AMCProposalStatus | null>(null);
  const [actor, setActor] = useState('current_user');
  const [reason, setReason] = useState('');

  const refresh = (): void => {
    const found = listAMCProposals().find((p) => p.id === proposalId) ?? null;
    setProposal(found);
  };
  useEffect(refresh, [proposalId]);

  if (!proposal) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Card className="p-12 mt-4 text-center text-sm text-muted-foreground">Proposal not found.</Card>
      </div>
    );
  }

  const next = ALLOWED[proposal.status];

  const onConfirm = (): void => {
    if (!target) return;
    try {
      transitionProposalStatus(proposal.id, target, actor.trim() || 'current_user', reason);
      toast.success(`Transitioned to ${target}`);
      setTarget(null);
      setReason('');
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onSendEmail = (): void => {
    emitRenewalEmailToTemplateEngine({
      amc_record_id: proposal.amc_record_id,
      customer_id: proposal.customer_id,
      template_id: proposal.email_template_id ?? 'default',
      cascade_stage: 'first',
      language: proposal.language,
    });
    toast.success('Renewal email queued');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>← Back</Button>
        <h1 className="text-2xl font-bold">Proposal {proposal.proposal_code}</h1>
        <Badge variant="outline">{proposal.status}</Badge>
      </div>
      <Card className="p-5 space-y-2 text-sm">
        <div><span className="text-muted-foreground">Customer:</span> {proposal.customer_id}</div>
        <div><span className="text-muted-foreground">OEM:</span> {proposal.oem_name}</div>
        <div><span className="text-muted-foreground">Value:</span> ₹{(proposal.proposed_value_paise / 100).toLocaleString('en-IN')}</div>
        <div><span className="text-muted-foreground">Period:</span> {proposal.proposed_start} → {proposal.proposed_end}</div>
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold mb-2">Lifecycle</h2>
        <div className="flex gap-2 flex-wrap items-center text-xs font-mono">
          {(['draft', 'sent', 'negotiating', 'accepted', 'rejected'] as AMCProposalStatus[]).map((s) => (
            <Badge key={s} variant={s === proposal.status ? 'default' : 'outline'}>{s}</Badge>
          ))}
        </div>
        <div className="flex gap-2 mt-4 flex-wrap">
          {next.map((s) => (
            <Button key={s} size="sm" onClick={() => setTarget(s)}>→ {s}</Button>
          ))}
          <Button size="sm" variant="outline" onClick={onSendEmail}>Send Email</Button>
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold mb-2">Audit Trail</h2>
        <ul className="text-xs space-y-1 font-mono max-h-64 overflow-auto">
          {proposal.audit_trail.map((a, i) => (
            <li key={`${a.at}_${i}`} className="text-muted-foreground">
              {a.at} · {a.by} · {a.action}{a.reason ? ` · ${a.reason}` : ''}
            </li>
          ))}
        </ul>
      </Card>
      <Dialog open={!!target} onOpenChange={(v) => !v && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transition to {target}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="actor">Transitioned by</Label>
              <Input id="actor" value={actor} onChange={(e) => setActor(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="reason">Reason / notes</Label>
              <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
            <Button onClick={onConfirm}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
