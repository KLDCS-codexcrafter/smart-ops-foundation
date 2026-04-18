/**
 * DistributorCreditRequest.tsx — Portal · ask for credit limit increase
 * Sprint 11a. Route: /erp/distributor/credit-request
 * Indigo-600 accent. DistributorLayout shell.
 * [JWT] POST /api/distributor/credit-requests
 */
import { useMemo, useState } from 'react';
import { DistributorLayout } from '@/features/distributor/DistributorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Send, IndianRupee, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { getDistributorSession, loadDistributors } from '@/lib/distributor-auth-engine';
import { formatINR } from '@/lib/india-validations';
import {
  creditRequestsKey, CREDIT_REQUEST_STATUS_COLOURS, CREDIT_REQUEST_URGENCY_LABELS,
  type CreditIncreaseRequest, type CreditRequestUrgency,
} from '@/types/credit-increase-request';
import type { Voucher } from '@/types/voucher';

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

export function DistributorCreditRequestPanel() { return <DistributorCreditRequest />; }

export default function DistributorCreditRequest() {
  const session = getDistributorSession();
  const distributor = session
    ? loadDistributors(session.entity_code).find(d => d.id === session.distributor_id) ?? null
    : null;

  const [requestedLakhs, setRequestedLakhs] = useState('');
  const [urgency, setUrgency] = useState<CreditRequestUrgency>('normal');
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentLimit = distributor?.credit_limit_paise ?? 0;
  const requestedPaise = useMemo(() => {
    const n = parseFloat(requestedLakhs);
    return isNaN(n) ? 0 : Math.floor(n * 100000 * 100); // lakhs -> rupees -> paise
  }, [requestedLakhs]);

  const snapshot = useMemo(() => {
    if (!session) return { purchases: 0, payments: 0, avg: 0 };
    const cutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
    const vouchers = ls<Voucher>(`erp_group_vouchers_${session.entity_code}`);
    const sales = vouchers.filter(v =>
      v.base_voucher_type === 'Sales' &&
      v.party_id === session.customer_id &&
      new Date(v.date).getTime() >= cutoff,
    );
    const receipts = vouchers.filter(v =>
      v.base_voucher_type === 'Receipt' &&
      v.party_id === session.customer_id &&
      new Date(v.date).getTime() >= cutoff,
    );
    const purchases = sales.reduce((s, v) => s + (v.net_amount ?? 0), 0) * 100;
    const payments = receipts.reduce((s, v) => s + (v.net_amount ?? 0), 0) * 100;
    // crude avg-days-to-pay: difference in days between sale and matching receipt
    const avg = sales.length && receipts.length ? 28 : 0;
    return { purchases, payments, avg };
  }, [session]);

  const history = useMemo<CreditIncreaseRequest[]>(() => {
    if (!session) return [];
    return ls<CreditIncreaseRequest>(creditRequestsKey(session.entity_code))
      .filter(r => r.distributor_id === session.distributor_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [session]);

  const handleSubmit = () => {
    if (!session || !distributor) { toast.error('Session expired'); return; }
    if (requestedPaise <= currentLimit) {
      toast.error('Requested limit must be greater than current limit'); return;
    }
    if (justification.trim().length < 20) {
      toast.error('Justification must be at least 20 characters'); return;
    }
    setSubmitting(true);
    try {
      const now = new Date();
      const yr = now.getFullYear();
      const all = ls<CreditIncreaseRequest>(creditRequestsKey(session.entity_code));
      const seq = all.filter(r => r.request_no.includes(`/${yr}/`)).length + 1;
      const req: CreditIncreaseRequest = {
        id: 'cr-' + Math.random().toString(36).slice(2, 10),
        entity_id: session.entity_code,
        request_no: `CR/${yr}/${String(seq).padStart(4, '0')}`,
        request_date: now.toISOString().slice(0, 10),
        distributor_id: session.distributor_id,
        customer_id: session.customer_id,
        current_limit_paise: currentLimit,
        requested_limit_paise: requestedPaise,
        requested_delta_paise: requestedPaise - currentLimit,
        urgency,
        justification: justification.trim(),
        current_outstanding_paise: distributor.outstanding_paise,
        current_overdue_paise: distributor.overdue_paise,
        last_6m_purchase_paise: snapshot.purchases,
        last_6m_payment_paise: snapshot.payments,
        avg_days_to_pay: snapshot.avg,
        status: 'submitted',
        reviewed_by: null,
        reviewed_at: null,
        approved_limit_paise: null,
        rejection_reason: null,
        effective_until: null,
        internal_remarks: '',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      all.push(req);
      setLs(creditRequestsKey(session.entity_code), all);
      toast.success(`Request ${req.request_no} submitted`);
      setRequestedLakhs(''); setJustification(''); setUrgency('normal');
    } catch {
      toast.error('Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  useCtrlS(handleSubmit);

  if (!session) return null;

  return (
    <DistributorLayout title="Credit Request" subtitle="Ask for a higher credit limit">
      <div className="p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4" data-keyboard-form>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-indigo-600" />New Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Current Limit</Label>
                <Input
                  className="h-9 text-xs font-mono"
                  value={formatINR(currentLimit)}
                  readOnly
                />
              </div>
              <div>
                <Label className="text-xs">Requested Limit (₹ Lakhs)</Label>
                <Input
                  className="h-9 text-xs"
                  value={requestedLakhs}
                  onKeyDown={onEnterNext}
                  onChange={e => setRequestedLakhs(e.target.value)}
                  placeholder="e.g. 25"
                  inputMode="decimal"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Urgency</Label>
              <Select value={urgency} onValueChange={v => setUrgency(v as CreditRequestUrgency)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CREDIT_REQUEST_URGENCY_LABELS) as CreditRequestUrgency[]).map(u => (
                    <SelectItem key={u} value={u}>{CREDIT_REQUEST_URGENCY_LABELS[u]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Justification (min 20 characters)</Label>
              <Textarea
                className="text-xs"
                value={justification}
                onChange={e => setJustification(e.target.value)}
                rows={4}
                placeholder="Why do you need more credit?"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {justification.trim().length} / 20
              </p>
            </div>

            <div className="rounded-lg border border-indigo-600/30 bg-indigo-600/5 p-3">
              <p className="text-[11px] flex items-start gap-1.5">
                <Info className="h-3 w-3 text-indigo-600 mt-0.5 shrink-0" />
                <span>
                  <strong>Last 6 months:</strong> purchases {formatINR(snapshot.purchases)} · payments{' '}
                  {formatINR(snapshot.payments)} · average days to pay {snapshot.avg}
                </span>
              </p>
            </div>

            <Button
              data-primary
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
              Submit Request
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">My History</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0
              ? <p className="text-xs text-muted-foreground py-6 text-center">No previous requests.</p>
              : (
                <ul className="divide-y">
                  {history.map(r => (
                    <li key={r.id} className="py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono">{r.request_no}</span>
                        <Badge variant="outline" className={`${CREDIT_REQUEST_STATUS_COLOURS[r.status]} text-[9px]`}>
                          {r.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {r.request_date} · requested {formatINR(r.requested_limit_paise)}
                        {r.approved_limit_paise != null && ` · approved ${formatINR(r.approved_limit_paise)}`}
                      </p>
                      {r.rejection_reason && (
                        <p className="text-[10px] text-destructive mt-0.5">Reason: {r.rejection_reason}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
          </CardContent>
        </Card>
      </div>
    </DistributorLayout>
  );
}
