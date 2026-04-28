/**
 * MobileSalesmanCommissionPage.tsx — Current month commission breakdown (read-only)
 * Sprint T-Phase-1.1.1l-a · Reads CommissionEntry from localStorage
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, IndianRupee } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type CommissionEntry, commissionRegisterKey } from '@/types/commission-register';

function readSession(): MobileSession | null {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch { return null; }
}

function loadEntries(entityCode: string): CommissionEntry[] {
  try {
    const raw = localStorage.getItem(commissionRegisterKey(entityCode));
    return raw ? (JSON.parse(raw) as CommissionEntry[]) : [];
  } catch { return []; }
}

function fmtINR(n: number): string {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function MobileSalesmanCommissionPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const myEntries = useMemo(() => {
    if (!session) return [];
    const all = loadEntries(session.entity_code);
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return all.filter(e => e.person_id === session.user_id && e.voucher_date.startsWith(ym));
  }, [session]);

  const totals = useMemo(() => {
    let base = 0, tds = 0, paid = 0;
    for (const e of myEntries) {
      base += e.net_total_commission ?? e.total_commission ?? 0;
      tds += e.tds_deducted_to_date ?? 0;
      paid += e.net_paid_to_date ?? 0;
    }
    return { base, tds, net: base - tds, paid };
  }, [myEntries]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/salesman')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Commission</h1>
      </div>

      <Card className="p-4 space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">This month</p>
        <p className="text-2xl font-bold font-mono text-orange-600">{fmtINR(totals.net)}</p>
        <div className="grid grid-cols-3 gap-2 pt-2 border-t text-[11px]">
          <div>
            <p className="text-muted-foreground">Base</p>
            <p className="font-mono font-semibold">{fmtINR(totals.base)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">TDS</p>
            <p className="font-mono font-semibold text-red-600">{fmtINR(totals.tds)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Paid</p>
            <p className="font-mono font-semibold text-green-600">{fmtINR(totals.paid)}</p>
          </div>
        </div>
      </Card>

      <div>
        <p className="text-xs font-semibold mb-2">Contributing transactions ({myEntries.length})</p>
        {myEntries.length === 0 ? (
          <Card className="p-6 text-center">
            <IndianRupee className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No commission this month</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {myEntries.slice(0, 50).map(e => (
              <Card key={e.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] text-muted-foreground">{e.voucher_no}</p>
                    <p className="text-sm font-medium truncate">{e.customer_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Inv: {fmtINR(e.net_invoice_amount ?? e.invoice_amount)} · Rate: {e.commission_rate}%
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono font-semibold text-orange-600">
                      {fmtINR(e.net_total_commission ?? e.total_commission)}
                    </p>
                    <Badge variant="outline" className="text-[10px] capitalize mt-1">{e.status}</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
