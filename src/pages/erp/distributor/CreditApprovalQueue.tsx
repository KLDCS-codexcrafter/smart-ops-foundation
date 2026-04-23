/**
 * CreditApprovalQueue.tsx — Tenant-side · approve/reject distributor credit requests
 * Sprint 11a. Route: /erp/distributor-hub/credit-approvals
 * Indigo-600 accent. Panel export.
 * [JWT] PATCH /api/distributor/credit-requests/{id}
 */
import { useMemo, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle, IndianRupee, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { formatINR } from '@/lib/india-validations';
import {
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
  creditRequestsKey, CREDIT_REQUEST_STATUS_COLOURS,
  type CreditIncreaseRequest,
} from '@/types/credit-increase-request';

interface CustomerLite { id: string; partyName: string; creditLimit: number; }

function ls<T>(k: string): T[] {
  try {
    // [JWT] GET /api/{key}
    const r = localStorage.getItem(k);
    return r ? (JSON.parse(r) as T[]) : [];
  } catch { return []; }
}
function setLs<T>(k: string, v: T[]): void {
  // [JWT] POST /api/{key}
  localStorage.setItem(k, JSON.stringify(v));
}

interface PanelProps { entityCode?: string; }

export function CreditApprovalQueuePanel({ entityCode = DEFAULT_ENTITY_SHORTCODE }: PanelProps) {
  const [requests, setRequests] = useState<CreditIncreaseRequest[]>(
    () => ls<CreditIncreaseRequest>(creditRequestsKey(entityCode)),
  );
  const [reviewing, setReviewing] = useState<CreditIncreaseRequest | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const pending = useMemo(
    () => requests.filter(r => r.status === 'submitted' || r.status === 'under_review')
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [requests],
  );

  const persist = (next: CreditIncreaseRequest[]) => {
    setLs(creditRequestsKey(entityCode), next);
    setRequests(next);
  };

  const decide = (mode: 'approve_full' | 'approve_partial' | 'reject') => {
    if (!reviewing) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      let approved: number | null = null;
      let rejection: string | null = null;
      if (mode === 'approve_full') approved = reviewing.requested_limit_paise;
      if (mode === 'approve_partial') {
        const lakhs = parseFloat(partialAmount);
        if (isNaN(lakhs) || lakhs <= 0) { toast.error('Enter partial amount in lakhs'); setBusy(false); return; }
        const paise = Math.floor(lakhs * 100000 * 100);
        if (paise <= reviewing.current_limit_paise || paise > reviewing.requested_limit_paise) {
          toast.error('Partial must be > current and ≤ requested'); setBusy(false); return;
        }
        approved = paise;
      }
      if (mode === 'reject') {
        if (rejectReason.trim().length < 10) { toast.error('Reason min 10 chars'); setBusy(false); return; }
        rejection = rejectReason.trim();
      }
      const next = requests.map(r => r.id === reviewing.id
        ? {
            ...r,
            status: (mode === 'reject' ? 'rejected' : 'approved') as CreditIncreaseRequest['status'],
            reviewed_by: 'tenant_user',
            reviewed_at: now,
            approved_limit_paise: approved,
            rejection_reason: rejection,
            updated_at: now,
          }
        : r,
      );
      persist(next);

      // Update CustomerMaster.creditLimit on approval
      if (approved != null) {
        try {
          const custKey = 'erp_group_customer_master';
          const cs = ls<CustomerLite>(custKey).map(c =>
            c.id === reviewing.customer_id ? { ...c, creditLimit: approved! / 100 } : c,
          );
          setLs(custKey, cs);
        } catch { /* noop */ }
      }

      toast.success(mode === 'reject' ? 'Rejected' : 'Approved');
      setReviewing(null);
      setPartialAmount(''); setRejectReason('');
    } finally {
      setBusy(false);
    }
  };

  useCtrlS(reviewing ? () => decide('approve_full') : () => { /* noop */ });

  return (
    <>
      <div className="space-y-4 animate-fade-in" data-keyboard-form>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-indigo-600" />Pending Credit Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pending.length === 0
              ? <p className="text-xs text-muted-foreground py-6 text-center">Nothing pending.</p>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="py-2 px-2 font-medium">Request No</th>
                        <th className="py-2 px-2 font-medium">Date</th>
                        <th className="py-2 px-2 font-medium">Customer</th>
                        <th className="py-2 px-2 font-medium text-right">Current</th>
                        <th className="py-2 px-2 font-medium text-right">Requested</th>
                        <th className="py-2 px-2 font-medium">Urgency</th>
                        <th className="py-2 px-2 font-medium">Status</th>
                        <th className="py-2 px-2 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pending.map(r => (
                        <tr key={r.id} className="border-b hover:bg-muted/40">
                          <td className="py-2 px-2 font-mono">{r.request_no}</td>
                          <td className="py-2 px-2">{r.request_date}</td>
                          <td className="py-2 px-2 font-mono">{r.customer_id.slice(0, 8)}</td>
                          <td className="py-2 px-2 font-mono text-right">{formatINR(r.current_limit_paise)}</td>
                          <td className="py-2 px-2 font-mono text-right">{formatINR(r.requested_limit_paise)}</td>
                          <td className="py-2 px-2">{r.urgency}</td>
                          <td className="py-2 px-2">
                            <Badge variant="outline" className={`${CREDIT_REQUEST_STATUS_COLOURS[r.status]} text-[9px]`}>
                              {r.status}
                            </Badge>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <Button
                              size="sm"
                              data-primary
                              className="h-7 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white"
                              onClick={() => setReviewing(r)}
                            >
                              Review
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!reviewing} onOpenChange={o => { if (!o) setReviewing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Review Credit Request</DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded border p-2">
                  <p className="text-[10px] text-muted-foreground">Current limit</p>
                  <p className="font-mono font-semibold">{formatINR(reviewing.current_limit_paise)}</p>
                </div>
                <div className="rounded border p-2 bg-indigo-600/5">
                  <p className="text-[10px] text-muted-foreground">Requested</p>
                  <p className="font-mono font-semibold text-indigo-700">{formatINR(reviewing.requested_limit_paise)}</p>
                </div>
                <div className="rounded border p-2">
                  <p className="text-[10px] text-muted-foreground">Outstanding</p>
                  <p className="font-mono">{formatINR(reviewing.current_outstanding_paise)}</p>
                </div>
                <div className="rounded border p-2">
                  <p className="text-[10px] text-muted-foreground">Overdue</p>
                  <p className="font-mono text-destructive">{formatINR(reviewing.current_overdue_paise)}</p>
                </div>
                <div className="rounded border p-2">
                  <p className="text-[10px] text-muted-foreground">6m purchases</p>
                  <p className="font-mono">{formatINR(reviewing.last_6m_purchase_paise)}</p>
                </div>
                <div className="rounded border p-2">
                  <p className="text-[10px] text-muted-foreground">Avg days to pay</p>
                  <p className="font-mono">{reviewing.avg_days_to_pay}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs">Justification (read-only)</Label>
                <p className="text-[11px] p-2 rounded bg-muted/40 mt-1">{reviewing.justification}</p>
              </div>
              <div>
                <Label className="text-xs">Approve Partial (₹ lakhs)</Label>
                <Input
                  className="h-9 text-xs"
                  value={partialAmount}
                  onKeyDown={onEnterNext}
                  onChange={e => setPartialAmount(e.target.value)}
                  placeholder="e.g. 15"
                />
              </div>
              <div>
                <Label className="text-xs">Rejection Reason (if rejecting)</Label>
                <Textarea
                  className="text-xs"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => decide('reject')} disabled={busy}>
              <XCircle className="h-3.5 w-3.5 mr-1" />Reject
            </Button>
            <Button variant="outline" onClick={() => decide('approve_partial')} disabled={busy}>
              Partial
            </Button>
            <Button
              data-primary
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => decide('approve_full')}
              disabled={busy}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
              Approve Full
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function CreditApprovalQueue() {
  return <CreditApprovalQueuePanel entityCode={DEFAULT_ENTITY_SHORTCODE} />;
}
