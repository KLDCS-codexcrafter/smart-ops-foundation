/**
 * @file        MobileApprovalInboxCapture.tsx
 * @sprint      T-Phase-1.2.6f-d-2-card8-8-pre-1 · Block C · D-405
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Send, ArrowLeft, CheckCircle2, XCircle, ClipboardList, IndianRupee, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import { enqueueWrite } from '@/lib/offline-queue-engine';
import { approveIndent, rejectIndent, type IndentKind } from '@/lib/request-engine';
import { materialIndentsKey } from '@/types/material-indent';
import { serviceRequestsKey } from '@/types/service-request';
import { capitalIndentsKey } from '@/types/capital-indent';
import { STATUS_LABEL } from '@/types/requisition-common';
import type { IndentStatus } from '@/types/material-indent';

type Step = 1 | 2;
type Action = 'approve' | 'reject';

interface PendingIndent {
  id: string; voucher_no: string; total_estimated_value: number;
  originating_department_name: string; priority: string; status: IndentStatus;
  kind: IndentKind;
}

interface RawIndent {
  id: string; voucher_no: string; total_estimated_value: number;
  originating_department_name: string; priority: string; status: IndentStatus;
}

function getActiveEntityCode(): string {
  try { return localStorage.getItem('active_entity_code') ?? 'DEMO'; } catch { return 'DEMO'; }
}

function readPending(key: string, kind: IndentKind): PendingIndent[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const list = JSON.parse(raw) as RawIndent[];
    return list
      .filter(i => i.status === 'pending_hod' || i.status === 'pending_purchase' || i.status === 'pending_finance' || i.status === 'submitted')
      .map(i => ({
        id: i.id, voucher_no: i.voucher_no, total_estimated_value: i.total_estimated_value,
        originating_department_name: i.originating_department_name, priority: i.priority, status: i.status, kind,
      }));
  } catch { return []; }
}

interface Props { onClose: () => void }

export default function MobileApprovalInboxCapture({ onClose }: Props): JSX.Element {
  const [step, setStep] = useState<Step>(1);
  const [queue, setQueue] = useState<PendingIndent[]>([]);
  const [picked, setPicked] = useState<PendingIndent | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const ENTITY = getActiveEntityCode();

  useEffect(() => {
    const all: PendingIndent[] = [
      ...readPending(materialIndentsKey(ENTITY), 'material'),
      ...readPending(serviceRequestsKey(ENTITY), 'service'),
      ...readPending(capitalIndentsKey(ENTITY), 'capital'),
    ];
    setQueue(all);
  }, [ENTITY]);

  const submit = async (): Promise<void> => {
    if (!picked || !action) return;
    if (action === 'reject' && !remarks.trim()) {
      toast.error('Reject reason required');
      return;
    }
    setSubmitting(true);
    try {
      // [JWT] PATCH /api/requestx/{kind}-indents/:id/{approve|reject}
      const ok = action === 'approve'
        ? approveIndent(picked.id, picked.kind, 'mobile-approver', 'department_head', ENTITY, remarks)
        : rejectIndent(picked.id, picked.kind, 'mobile-approver', 'department_head', remarks, ENTITY);
      if (!ok) {
        toast.error('Action rejected by state machine');
      } else {
        enqueueWrite(ENTITY, 'rating_submit', { kind: `${picked.kind}_indent_${action}`, id: picked.id });
        toast.success(`${picked.voucher_no} ${action === 'approve' ? 'approved' : 'rejected'}`);
        setPicked(null); setAction(null); setRemarks(''); setStep(1); onClose();
      }
    } catch (e) {
      toast.error(`Submit failed: ${String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <OfflineIndicator />
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onClose}><ArrowLeft className="h-4 w-4 mr-1" />Cancel</Button>
        <Badge variant="outline">Step {step} of 2</Badge>
      </div>

      {step === 1 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Pending Approvals</h2></div>
          {queue.length === 0 ? <p className="text-sm text-muted-foreground">No pending indents.</p> : (
            <div className="space-y-2">{queue.map(i => (
              <Card key={`${i.kind}-${i.id}`} className={`p-3 cursor-pointer ${picked?.id === i.id ? 'border-primary ring-2 ring-primary/30' : ''}`} onClick={() => { setPicked(i); setStep(2); }}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-sm font-mono">{i.voucher_no}</div>
                    <div className="text-xs text-muted-foreground">{i.originating_department_name} · {i.kind}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant={i.priority === 'urgent' || i.priority === 'critical_shutdown' ? 'destructive' : 'outline'}>{i.priority}</Badge>
                    <div className="text-sm font-semibold mt-1 flex items-center gap-1 font-mono"><IndianRupee className="h-3 w-3" />{i.total_estimated_value.toLocaleString('en-IN')}</div>
                  </div>
                </div>
                <div className="text-xs text-warning mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{STATUS_LABEL[i.status] ?? i.status}</div>
              </Card>
            ))}</div>
          )}
        </Card>
      )}

      {step === 2 && picked && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /><h2 className="text-lg font-semibold">Decide</h2></div>
          <div className="text-sm space-y-1 pb-2 border-b">
            <div><span className="text-muted-foreground">Voucher:</span> <span className="font-medium font-mono">{picked.voucher_no}</span></div>
            <div><span className="text-muted-foreground">Dept:</span> {picked.originating_department_name}</div>
            <div><span className="text-muted-foreground">Value:</span> <span className="font-mono">₹{picked.total_estimated_value.toLocaleString('en-IN')}</span></div>
          </div>
          <div className="flex gap-2">
            <Button variant={action === 'approve' ? 'default' : 'outline'} className="flex-1" onClick={() => setAction('approve')}><CheckCircle2 className="h-4 w-4 mr-1" />Approve</Button>
            <Button variant={action === 'reject' ? 'destructive' : 'outline'} className="flex-1" onClick={() => setAction('reject')}><XCircle className="h-4 w-4 mr-1" />Reject</Button>
          </div>
          <div>
            <Label>{action === 'reject' ? 'Reject reason (required)' : 'Remarks (optional)'}</Label>
            <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder={action === 'reject' ? 'Reason for rejection' : 'Optional remarks'} />
          </div>
        </Card>
      )}

      <div className="flex gap-2">
        {step === 2 && <Button variant="outline" onClick={() => { setStep(1); setAction(null); setRemarks(''); }}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>}
        {step === 2 && action && <Button className="flex-1" disabled={submitting} onClick={submit}><Send className="h-4 w-4 mr-1" />{submitting ? 'Submitting...' : `Confirm ${action}`}</Button>}
      </div>
    </div>
  );
}
