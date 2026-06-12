/**
 * MobileTransporterPaymentsPage.tsx — Read-only payment status.
 * CONSUMES transporterInvoicesKey (status field) — the existing freight payment ledger.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type TransporterInvoice, transporterInvoicesKey } from '@/types/transporter-invoice';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

const fmtINR = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function MobileTransporterPaymentsPage(): JSX.Element {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const list = useMemo<TransporterInvoice[]>(() => {
    if (!session) return [];
    return loadList<TransporterInvoice>(transporterInvoicesKey(session.entity_code))
      .sort((a, b) => b.invoice_date.localeCompare(a.invoice_date));
  }, [session]);

  if (!session) return <div className="p-6 text-center text-sm text-muted-foreground">Session required</div>;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-base font-semibold">Payments</h1>
        <Badge variant="outline" className="ml-auto text-[10px]">{list.length}</Badge>
      </div>
      <p className="text-[11px] text-muted-foreground">Read-only · payment lifecycle from buyer's bill-passing.</p>
      {list.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No invoices submitted</Card>
      ) : (
        <div className="space-y-2">
          {list.map(inv => (
            <Card key={inv.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-mono truncate">{inv.invoice_no}</p>
                  <p className="text-[10px] text-muted-foreground">{inv.logistic_name} · {inv.invoice_date.slice(0, 10)}</p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <p className="text-sm font-mono">{fmtINR(inv.grand_total)}</p>
                  <Badge variant="outline" className="text-[9px] block">{inv.status}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
