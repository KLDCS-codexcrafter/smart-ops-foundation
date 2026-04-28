/**
 * MobilePipelineHealthPage.tsx — Aggregated funnel KPIs
 * Sprint T-Phase-1.1.1l-c
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type Enquiry, enquiriesKey } from '@/types/enquiry';
import { type Quotation, quotationsKey } from '@/types/quotation';
import { type Order, ordersKey } from '@/types/order';

function readSession(): MobileSession | null {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch { return null; }
}
function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export default function MobilePipelineHealthPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const data = useMemo(() => {
    if (!session) return null;
    const enquiries = loadList<Enquiry>(enquiriesKey(session.entity_code));
    const quotations = loadList<Quotation>(quotationsKey(session.entity_code));
    const orders = loadList<Order>(ordersKey(session.entity_code))
      .filter(o => o.base_voucher_type === 'Sales Order');
    const enqValue = enquiries.reduce((s, e) => s + (e.items ?? []).reduce((ss, it) => ss + (it.amount ?? 0), 0), 0);
    const quoValue = quotations.reduce((s, q) => s + (q.total_amount ?? 0), 0);
    const orderValue = orders.reduce((s, o) => s + (o.net_amount ?? 0), 0);
    return {
      enqCount: enquiries.length, enqValue,
      quoCount: quotations.length, quoValue,
      orderCount: orders.length, orderValue,
    };
  }, [session]);

  if (!session || !data) return null;

  const e2q = data.enqCount > 0 ? (data.quoCount / data.enqCount) * 100 : 0;
  const q2o = data.quoCount > 0 ? (data.orderCount / data.quoCount) * 100 : 0;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/manager')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Pipeline Health</h1>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Enquiries</p>
          <p className="text-xl font-bold font-mono">{data.enqCount}</p>
          <p className="text-[11px] text-muted-foreground font-mono">{fmtINR(data.enqValue)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Quotations</p>
          <p className="text-xl font-bold font-mono">{data.quoCount}</p>
          <p className="text-[11px] text-muted-foreground font-mono">{fmtINR(data.quoValue)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Sales Orders</p>
          <p className="text-xl font-bold font-mono">{data.orderCount}</p>
          <p className="text-[11px] text-muted-foreground font-mono">{fmtINR(data.orderValue)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Conversion</p>
          <p className="text-sm font-mono mt-1">Enq → Quo: <span className="font-bold">{e2q.toFixed(0)}%</span></p>
          <p className="text-sm font-mono">Quo → SO: <span className="font-bold">{q2o.toFixed(0)}%</span></p>
        </Card>
      </div>
    </div>
  );
}
