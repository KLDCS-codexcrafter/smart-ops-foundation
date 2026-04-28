/**
 * MobileDistributorInvoicesPage.tsx — List of submitted distributor orders/invoices
 * Sprint T-Phase-1.1.1l-d · Reads from distributorOrdersKey; reverse-chrono.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type DistributorOrder, distributorOrdersKey } from '@/types/distributor-order';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

const fmtINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_COLORS: Record<DistributorOrder['status'], string> = {
  draft: 'bg-slate-500/10 text-slate-700 border-slate-500/30',
  submitted: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  approved: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  rejected: 'bg-red-500/10 text-red-700 border-red-500/30',
  invoiced: 'bg-green-500/10 text-green-700 border-green-500/30',
  cancelled: 'bg-slate-500/10 text-slate-500 border-slate-400/30',
};

export default function MobileDistributorInvoicesPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const orders = useMemo<DistributorOrder[]>(() => {
    if (!session) return [];
    return loadList<DistributorOrder>(distributorOrdersKey(session.entity_code))
      .filter(o => o.partner_id === session.user_id || !o.partner_id)
      .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
  }, [session]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Invoices & Orders</h1>
        <Badge variant="outline" className="ml-auto text-[10px]">{orders.length}</Badge>
      </div>

      {orders.length === 0 ? (
        <Card className="p-6 text-center">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No invoices yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {orders.map(o => (
            <Card key={o.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium font-mono truncate">{o.order_no}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {o.submitted_at.slice(0, 10)} · {o.lines.length} line{o.lines.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono font-semibold">{fmtINR(o.grand_total_paise)}</p>
                  <Badge variant="outline" className={`text-[9px] mt-1 ${STATUS_COLORS[o.status]}`}>
                    {o.status}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
