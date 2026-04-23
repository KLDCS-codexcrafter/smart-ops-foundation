/**
 * DistributorDisputeQueue.tsx — Tenant-side · review distributor invoice disputes
 * Sprint 11a. Route: /erp/distributor-hub/disputes
 * Indigo-600 accent. Panel export.
 * [JWT] PATCH /api/distributor/disputes/{id}
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
import { AlertTriangle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { formatINR } from '@/lib/india-validations';
import {
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
  disputesKey, DISPUTE_REASON_LABELS, DISPUTE_STATUS_COLOURS, DISPUTE_STATUS_LABELS,
  type InvoiceDispute, type DisputeStatus,
} from '@/types/invoice-dispute';

const FILTERS: { value: 'all' | DisputeStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'credit_noted', label: 'Credit Noted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'partial', label: 'Partial' },
];

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

export function DistributorDisputeQueuePanel({ entityCode = DEFAULT_ENTITY_SHORTCODE }: PanelProps) {
  const [disputes, setDisputes] = useState<InvoiceDispute[]>(
    () => ls<InvoiceDispute>(disputesKey(entityCode)),
  );
  const [filter, setFilter] = useState<'all' | DisputeStatus>('all');
  const [reviewing, setReviewing] = useState<InvoiceDispute | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () => disputes
      .filter(d => filter === 'all' || d.status === filter)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [disputes, filter],
  );

  const persist = (next: InvoiceDispute[]) => {
    setLs(disputesKey(entityCode), next);
    setDisputes(next);
  };

  const decide = (mode: 'approve_full' | 'approve_partial' | 'reject') => {
    if (!reviewing) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      let status: DisputeStatus = 'rejected';
      let approved: number | null = null;
      let resolution: 'credit_note' | 'replacement' | 'rejection' | null = 'rejection';
      let reason: string | null = null;

      if (mode === 'approve_full') {
        status = 'credit_noted';
        approved = reviewing.disputed_amount_paise;
        resolution = 'credit_note';
      } else if (mode === 'approve_partial') {
        const rs = parseFloat(partialAmount);
        if (isNaN(rs) || rs <= 0) { toast.error('Enter partial amount in ₹'); setBusy(false); return; }
        approved = Math.floor(rs * 100);
        if (approved >= reviewing.disputed_amount_paise) {
          toast.error('Partial must be < disputed amount'); setBusy(false); return;
        }
        status = 'partial';
        resolution = 'credit_note';
      } else {
        if (rejectReason.trim().length < 10) { toast.error('Reason min 10 chars'); setBusy(false); return; }
        reason = rejectReason.trim();
      }

      const next = disputes.map(d => d.id === reviewing.id
        ? {
            ...d, status,
            reviewed_by: 'tenant_user',
            reviewed_at: now,
            approved_amount_paise: approved,
            resolution_type: resolution,
            rejection_reason: reason,
            credit_note_voucher_id: status === 'credit_noted' || status === 'partial' ? `cn-${Date.now()}` : null,
            updated_at: now,
          }
        : d,
      );
      persist(next);
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
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <Button
              key={f.value}
              size="sm"
              variant={filter === f.value ? 'default' : 'outline'}
              className={filter === f.value
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white h-7 text-[10px]'
                : 'h-7 text-[10px]'}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-indigo-600" />Invoice Disputes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0
              ? <p className="text-xs text-muted-foreground py-6 text-center">No disputes match this filter.</p>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="py-2 px-2 font-medium">Dispute No</th>
                        <th className="py-2 px-2 font-medium">Date</th>
                        <th className="py-2 px-2 font-medium">Invoice</th>
                        <th className="py-2 px-2 font-medium">Reason</th>
                        <th className="py-2 px-2 font-medium text-right">Amount</th>
                        <th className="py-2 px-2 font-medium">Status</th>
                        <th className="py-2 px-2 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(d => (
                        <tr key={d.id} className="border-b hover:bg-muted/40">
                          <td className="py-2 px-2 font-mono">{d.dispute_no}</td>
                          <td className="py-2 px-2">{d.dispute_date}</td>
                          <td className="py-2 px-2 font-mono">{d.voucher_no}</td>
                          <td className="py-2 px-2">{DISPUTE_REASON_LABELS[d.reason]}</td>
                          <td className="py-2 px-2 font-mono text-right">{formatINR(d.disputed_amount_paise)}</td>
                          <td className="py-2 px-2">
                            <Badge variant="outline" className={`${DISPUTE_STATUS_COLOURS[d.status]} text-[9px]`}>
                              {DISPUTE_STATUS_LABELS[d.status]}
                            </Badge>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <Button
                              size="sm"
                              data-primary
                              className="h-7 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white"
                              onClick={() => setReviewing(d)}
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
            <DialogTitle className="text-base">Review Dispute</DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded border p-2">
                  <p className="text-[10px] text-muted-foreground">Reason</p>
                  <p className="font-semibold">{DISPUTE_REASON_LABELS[reviewing.reason]}</p>
                </div>
                <div className="rounded border p-2">
                  <p className="text-[10px] text-muted-foreground">Invoice</p>
                  <p className="font-mono">{reviewing.voucher_no}</p>
                </div>
                <div className="rounded border p-2">
                  <p className="text-[10px] text-muted-foreground">Billed qty</p>
                  <p className="font-mono">{reviewing.billed_quantity}</p>
                </div>
                <div className="rounded border p-2">
                  <p className="text-[10px] text-muted-foreground">Received qty</p>
                  <p className="font-mono">{reviewing.received_quantity}</p>
                </div>
                <div className="rounded border p-2 bg-indigo-600/5 col-span-2">
                  <p className="text-[10px] text-muted-foreground">Disputed amount</p>
                  <p className="font-mono font-semibold text-indigo-700">
                    {formatINR(reviewing.disputed_amount_paise)}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-xs">Distributor remarks</Label>
                <p className="text-[11px] p-2 rounded bg-muted/40 mt-1">{reviewing.distributor_remarks}</p>
              </div>
              {reviewing.photo_urls.length > 0 && (
                <div>
                  <Label className="text-xs">Photos ({reviewing.photo_urls.length})</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {reviewing.photo_urls.slice(0, 3).map((url, i) => (
                      <img key={i} src={url} alt="dispute" className="rounded border h-20 w-full object-cover" />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs">Approve Partial (₹)</Label>
                <Input
                  className="h-9 text-xs"
                  value={partialAmount}
                  onKeyDown={onEnterNext}
                  onChange={e => setPartialAmount(e.target.value)}
                  placeholder="Partial credit note amount"
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
              Partial CN
            </Button>
            <Button
              data-primary
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => decide('approve_full')}
              disabled={busy}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
              Approve & Issue CN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function DistributorDisputeQueue() {
  return <DistributorDisputeQueuePanel entityCode={DEFAULT_ENTITY_SHORTCODE} />;
}
