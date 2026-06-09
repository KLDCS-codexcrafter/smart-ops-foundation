/**
 * @file        MobileApprovalInboxCapture.tsx
 * @sprint      Sprint AM.3 · T-AM3-Universal-Mobile · Pass 1 · Universal Mobile Approval
 * @purpose     One inbox for ALL approval types over the B.1 rail.
 * @canon       CONSUMES `approval-rail-engine` (listPendingMirrors + decideApproval) +
 *              the registered set of `approval-adapters` (object_type per pending
 *              mirror). NO rail re-implementation. SoD-1/SoD-2 honored inside
 *              `decideApproval`. Reject reason mandatory inside the rail.
 * @[JWT]       PATCH /api/approval-rail/tasks/:id (Wave-2 · today: in-tree rail)
 */
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Send, ArrowLeft, CheckCircle2, XCircle, ClipboardList, IndianRupee, AlertTriangle, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import { enqueueWrite } from '@/lib/offline-queue-engine';
import {
  listPendingMirrors,
  decideApproval,
  type PendingMirror,
} from '@/lib/approval-rail-engine';
// Self-registers all adapters on import (registerAllApprovalAdapters auto-fires).
import '@/lib/approval-adapters';

type Step = 1 | 2;
type Action = 'approve' | 'reject';

function getActiveEntityCode(): string {
  try { return localStorage.getItem('active_entity_code') ?? 'DEMO'; } catch { return 'DEMO'; }
}

function getApproverName(): string {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    if (raw) {
      const s = JSON.parse(raw) as { display_name?: string };
      if (s.display_name) return s.display_name;
    }
  } catch { /* ignore */ }
  return 'mobile-approver';
}

interface Props { onClose: () => void }

export default function MobileApprovalInboxCapture({ onClose }: Props): JSX.Element {
  const [step, setStep] = useState<Step>(1);
  const [queue, setQueue] = useState<PendingMirror[]>([]);
  const [picked, setPicked] = useState<PendingMirror | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<string>('__all__');
  const ENTITY = getActiveEntityCode();

  useEffect(() => {
    // [JWT] GET /api/approval-rail/pending?entityCode=... — today: listPendingMirrors
    setQueue(listPendingMirrors(ENTITY));
  }, [ENTITY]);

  const types = useMemo(() => {
    const set = new Set<string>();
    queue.forEach(m => set.add(m.meta.object_type));
    return Array.from(set).sort();
  }, [queue]);

  const filtered = useMemo(() => {
    if (filterType === '__all__') return queue;
    return queue.filter(m => m.meta.object_type === filterType);
  }, [queue, filterType]);

  const submit = async (): Promise<void> => {
    if (!picked || !action) return;
    if (action === 'reject' && !remarks.trim()) {
      toast.error('Reject reason required (Matrix §2.6)');
      return;
    }
    setSubmitting(true);
    try {
      // [JWT] PATCH /api/approval-rail/tasks/:id — today: decideApproval (B.1 rail)
      const by = getApproverName();
      const result = decideApproval(
        ENTITY,
        picked.task.id,
        action === 'approve' ? 'approved' : 'rejected',
        by,
        remarks || undefined,
      );
      if (!result.ok) {
        toast.error(result.reason ?? 'Decision refused by rail');
      } else {
        enqueueWrite(ENTITY, 'rating_submit', {
          kind: `approval_${picked.meta.object_type}_${action}`,
          id: picked.meta.source_record_id,
        });
        toast.success(`${picked.meta.source_record_no} ${action === 'approve' ? 'approved' : 'rejected'}`);
        setPicked(null); setAction(null); setRemarks(''); setStep(1);
        setQueue(listPendingMirrors(ENTITY));
        onClose();
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
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-1" />Cancel
        </Button>
        <Badge variant="outline">Step {step} of 2</Badge>
      </div>

      {step === 1 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Pending Approvals · B.1 Rail</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            One inbox · all cards. Decisions are gated by SoD-1 (creator ≠ approver)
            and SoD-2 (cross-object same-liability) inside the rail.
          </p>

          {types.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <Button
                variant={filterType === '__all__' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('__all__')}
              >
                All ({queue.length})
              </Button>
              {types.map(t => (
                <Button
                  key={t}
                  variant={filterType === t ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType(t)}
                >
                  {t.replace(/_/g, ' ')} ({queue.filter(q => q.meta.object_type === t).length})
                </Button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending items.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(m => (
                <Card
                  key={m.task.id}
                  className={`p-3 cursor-pointer ${picked?.task.id === m.task.id ? 'border-primary ring-2 ring-primary/30' : ''}`}
                  onClick={() => { setPicked(m); setStep(2); }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm font-mono truncate">{m.meta.source_record_no}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {m.meta.object_type.replace(/_/g, ' ')}
                        {m.meta.creator_name ? ` · by ${m.meta.creator_name}` : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={m.overdue ? 'destructive' : 'outline'}>
                        slab {m.meta.slab}
                      </Badge>
                      {typeof m.meta.amount === 'number' && (
                        <div className="text-sm font-semibold mt-1 flex items-center gap-1 font-mono justify-end">
                          <IndianRupee className="h-3 w-3" />
                          {m.meta.amount.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                  </div>
                  {m.overdue && (
                    <div className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />Overdue · {m.ageHours.toFixed(0)}h old
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </Card>
      )}

      {step === 2 && picked && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <h2 className="text-lg font-semibold">Decide</h2>
          </div>
          <div className="text-sm space-y-1 pb-2 border-b">
            <div><span className="text-muted-foreground">Record:</span> <span className="font-medium font-mono">{picked.meta.source_record_no}</span></div>
            <div><span className="text-muted-foreground">Type:</span> {picked.meta.object_type}</div>
            <div><span className="text-muted-foreground">Slab:</span> {picked.meta.slab}</div>
            {typeof picked.meta.amount === 'number' && (
              <div><span className="text-muted-foreground">Value:</span> <span className="font-mono">₹{picked.meta.amount.toLocaleString('en-IN')}</span></div>
            )}
            {picked.meta.creator_name && (
              <div><span className="text-muted-foreground">Creator:</span> {picked.meta.creator_name}</div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant={action === 'approve' ? 'default' : 'outline'} className="flex-1" onClick={() => setAction('approve')}>
              <CheckCircle2 className="h-4 w-4 mr-1" />Approve
            </Button>
            <Button variant={action === 'reject' ? 'destructive' : 'outline'} className="flex-1" onClick={() => setAction('reject')}>
              <XCircle className="h-4 w-4 mr-1" />Reject
            </Button>
          </div>
          <div>
            <Label>{action === 'reject' ? 'Reject reason (required · Matrix §2.6)' : 'Remarks (optional)'}</Label>
            <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder={action === 'reject' ? 'Reason for rejection' : 'Optional remarks'} />
          </div>
        </Card>
      )}

      <div className="flex gap-2">
        {step === 2 && (
          <Button variant="outline" onClick={() => { setStep(1); setAction(null); setRemarks(''); }}>
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
        )}
        {step === 2 && action && (
          <Button className="flex-1" disabled={submitting} onClick={submit}>
            <Send className="h-4 w-4 mr-1" />{submitting ? 'Submitting...' : `Confirm ${action}`}
          </Button>
        )}
      </div>
    </div>
  );
}
