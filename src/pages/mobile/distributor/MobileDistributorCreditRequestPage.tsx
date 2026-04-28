/**
 * MobileDistributorCreditRequestPage.tsx — Mobile credit-limit request
 * Sprint T-Phase-1.1.1l-d · Writes to localStorage `erp_distributor_credit_requests_{entity}`.
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CreditCard, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';

interface CreditRequest {
  id: string;
  partner_id: string;
  partner_name: string;
  entity_code: string;
  requested_amount_paise: number;
  reason: string;
  status: 'submitted' | 'approved' | 'rejected';
  created_at: string;
}
const creditRequestsKey = (e: string) => `erp_distributor_credit_requests_${e}`;

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

const fmtINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MobileDistributorCreditRequestPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const myRequests = useMemo<CreditRequest[]>(() => {
    if (!session) return [];
    return loadList<CreditRequest>(creditRequestsKey(session.entity_code))
      .filter(r => r.partner_id === session.user_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, reloadKey]);

  const handleSubmit = useCallback(() => {
    if (!session) return;
    const amountN = Number(amount);
    if (!amountN || amountN <= 0) { toast.error('Enter a valid amount'); return; }
    if (!reason.trim()) { toast.error('Reason required'); return; }

    setBusy(true);
    const all = loadList<CreditRequest>(creditRequestsKey(session.entity_code));
    const req: CreditRequest = {
      id: `cr-${Date.now()}`,
      partner_id: session.user_id ?? '',
      partner_name: session.display_name,
      entity_code: session.entity_code,
      requested_amount_paise: Math.round(amountN * 100),
      reason: reason.trim(),
      status: 'submitted',
      created_at: new Date().toISOString(),
    };
    // [JWT] POST /api/distributor/credit-requests
    localStorage.setItem(creditRequestsKey(session.entity_code), JSON.stringify([req, ...all]));
    setAmount(''); setReason(''); setBusy(false);
    setReloadKey(k => k + 1);
    toast.success('Credit request submitted');
  }, [session, amount, reason]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Credit Request</h1>
      </div>

      <Card className="p-3 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Requested Amount (₹)</Label>
          <Input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="50000" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Reason</Label>
          <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Festive season stocking, expanding territory, etc." />
        </div>
        <Button className="w-full" disabled={busy} onClick={handleSubmit}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Submit Request
        </Button>
      </Card>

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
                  <p className="text-sm font-mono font-semibold">{fmtINR(r.requested_amount_paise)}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{r.reason}</p>
                </div>
                <Badge variant="outline" className="text-[9px] shrink-0">{r.status}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-1">{r.created_at.slice(0, 10)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
