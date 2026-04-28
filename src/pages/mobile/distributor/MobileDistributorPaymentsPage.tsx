/**
 * MobileDistributorPaymentsPage.tsx — Payment intimations history for distributor
 * Sprint T-Phase-1.1.1l-d · Reads distributorIntimationsKey.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, IndianRupee } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import {
  type DistributorPaymentIntimation,
  distributorIntimationsKey,
} from '@/types/distributor-order';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

const fmtINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MobileDistributorPaymentsPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const intimations = useMemo<DistributorPaymentIntimation[]>(() => {
    if (!session) return [];
    return loadList<DistributorPaymentIntimation>(distributorIntimationsKey(session.entity_code))
      .filter(p => p.partner_id === session.user_id || !p.partner_id)
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  }, [session]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Payments</h1>
        <Badge variant="outline" className="ml-auto text-[10px]">{intimations.length}</Badge>
      </div>

      {intimations.length === 0 ? (
        <Card className="p-6 text-center">
          <IndianRupee className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No payment records yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {intimations.map(p => (
            <Card key={p.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium font-mono truncate">{p.utr_no ?? p.cheque_no ?? p.id}</p>
                  <p className="text-[10px] text-muted-foreground font-mono uppercase">
                    {p.mode} · {(p.paid_on ?? p.created_at ?? '').slice(0, 10)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono font-semibold">{fmtINR(p.amount_paise)}</p>
                  <Badge variant="outline" className="text-[9px] mt-1">{p.status}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
