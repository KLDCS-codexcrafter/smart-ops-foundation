/**
 * MobileDistributorCreditRequestPage.tsx — Mobile credit-limit request
 * Sprint T-Phase-1.1.1l-d · Audit fix round 1.
 * Writes real CreditIncreaseRequest rows to creditRequestsKey() so submissions
 * appear in the existing CreditApprovalQueue web page.
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, CreditCard, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import {
  creditRequestsKey, CREDIT_REQUEST_STATUS_COLOURS, CREDIT_REQUEST_URGENCY_LABELS,
  type CreditIncreaseRequest, type CreditRequestUrgency,
} from '@/types/credit-increase-request';
import { loadDistributors } from '@/lib/distributor-auth-engine';
import type { Distributor } from '@/types/distributor';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

const fmtINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MobileDistributorCreditRequestPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const distributor = useMemo<Distributor | null>(() => {
    if (!session || !session.user_id) return null;
    return loadDistributors(session.entity_code).find(d => d.id === session.user_id) ?? null;
  }, [session]);

  const [requestedLakhs, setRequestedLakhs] = useState('');
  const [urgency, setUrgency] = useState<CreditRequestUrgency>('normal');
  const [justification, setJustification] = useState('');
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const myRequests = useMemo<CreditIncreaseRequest[]>(() => {
    if (!session || !distributor) return [];
    return loadList<CreditIncreaseRequest>(creditRequestsKey(session.entity_code))
      .filter(r => r.distributor_id === distributor.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, distributor, reloadKey]);

  const currentLimit = distributor?.credit_limit_paise ?? 0;
  const requestedPaise = Math.round((Number(requestedLakhs) || 0) * 100000 * 100);

  const handleSubmit = useCallback(() => {
    if (!session || !distributor) { toast.error('Distributor profile unavailable'); return; }
    if (requestedPaise <= currentLimit) { toast.error('Requested limit must exceed current limit'); return; }
    if (justification.trim().length < 20) { toast.error('Justification must be at least 20 characters'); return; }

    setBusy(true);
    try {
      const now = new Date();
      const yr = now.getFullYear();
      const all = loadList<CreditIncreaseRequest>(creditRequestsKey(session.entity_code));
      const seq = all.filter(r => r.request_no.includes(`/${yr}/`)).length + 1;
      const req: CreditIncreaseRequest = {
        id: 'cr-' + Math.random().toString(36).slice(2, 10),
        entity_id: session.entity_code,
        request_no: `CR/${yr}/${String(seq).padStart(4, '0')}`,
        request_date: now.toISOString().slice(0, 10),
        distributor_id: distributor.id,
        customer_id: distributor.customer_id,
        current_limit_paise: currentLimit,
        requested_limit_paise: requestedPaise,
        requested_delta_paise: requestedPaise - currentLimit,
        urgency,
        justification: justification.trim(),
        current_outstanding_paise: distributor.outstanding_paise,
        current_overdue_paise: distributor.overdue_paise,
        last_6m_purchase_paise: 0,
        last_6m_payment_paise: 0,
        avg_days_to_pay: 0,
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
      // [JWT] POST /api/distributor/credit-requests
      localStorage.setItem(creditRequestsKey(session.entity_code), JSON.stringify([req, ...all]));
      setRequestedLakhs(''); setJustification(''); setUrgency('normal');
      setReloadKey(k => k + 1);
      toast.success(`Request ${req.request_no} submitted`);
    } catch {
      toast.error('Submit failed');
    } finally {
      setBusy(false);
    }
  }, [session, distributor, requestedPaise, currentLimit, urgency, justification]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Credit Request</h1>
      </div>

      {!distributor ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Distributor profile unavailable.
        </Card>
      ) : (
        <>
          <Card className="p-3 space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Current Limit</p>
            <p className="text-base font-mono font-bold">{fmtINR(currentLimit)}</p>
            <p className="text-[10px] text-muted-foreground font-mono">
              Outstanding: {fmtINR(distributor.outstanding_paise)} · Overdue: {fmtINR(distributor.overdue_paise)}
            </p>
          </Card>

          <Card className="p-3 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Requested Limit (₹ Lakhs)</Label>
              <Input type="number" inputMode="decimal" value={requestedLakhs}
                onChange={e => setRequestedLakhs(e.target.value)} placeholder="50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Urgency</Label>
              <Select value={urgency} onValueChange={v => setUrgency(v as CreditRequestUrgency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CREDIT_REQUEST_URGENCY_LABELS) as CreditRequestUrgency[]).map(u => (
                    <SelectItem key={u} value={u}>{CREDIT_REQUEST_URGENCY_LABELS[u]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Justification (min 20 chars)</Label>
              <Textarea rows={3} value={justification} onChange={e => setJustification(e.target.value)}
                placeholder="Festive season stocking, expanding to new territory…" />
            </div>
            <Button className="w-full" disabled={busy} onClick={handleSubmit}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Submit Request
            </Button>
          </Card>
        </>
      )}

      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        My Requests ({myRequests.length})
      </p>
      {myRequests.length === 0 ? (
        <Card className="p-6 text-center">
          <CreditCard className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No requests yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {myRequests.map(r => (
            <Card key={r.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground font-mono">{r.request_no}</p>
                  <p className="text-sm font-mono font-semibold">{fmtINR(r.requested_limit_paise)}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{r.justification}</p>
                </div>
                <Badge variant="outline" className={`text-[9px] shrink-0 ${CREDIT_REQUEST_STATUS_COLOURS[r.status]}`}>
                  {r.status}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-1">{r.request_date}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
