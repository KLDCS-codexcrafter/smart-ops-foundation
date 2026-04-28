/**
 * MobileRevenueTrendPage.tsx — 14-day daily SO value trend
 * Sprint T-Phase-1.1.1l-c · CSS-width bars (no chart lib)
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
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

export default function MobileRevenueTrendPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const { days, total, max } = useMemo(() => {
    if (!session) return { days: [] as { date: string; value: number }[], total: 0, max: 0 };
    const orders = loadList<Order>(ordersKey(session.entity_code))
      .filter(o => o.base_voucher_type === 'Sales Order');
    const days: { date: string; value: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const value = orders.filter(o => o.date === ds).reduce((s, o) => s + (o.net_amount ?? 0), 0);
      days.push({ date: ds, value });
    }
    const total = days.reduce((s, d) => s + d.value, 0);
    const max = Math.max(1, ...days.map(d => d.value));
    return { days, total, max };
  }, [session]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/manager')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Revenue Trend (14d)</h1>
      </div>

      <Card className="p-3">
        <p className="text-[10px] uppercase text-muted-foreground">Total last 14 days</p>
        <p className="text-2xl font-bold font-mono">{fmtINR(total)}</p>
      </Card>

      {total === 0 && (
        <Card className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <TrendingUp className="h-8 w-8" />
          No sales orders booked in last 14 days.
        </Card>
      )}

      <div className="space-y-1">
        {days.map(d => (
          <div key={d.date} className="flex items-center gap-2 text-[11px]">
            <span className="font-mono w-16 text-muted-foreground">{d.date.slice(5)}</span>
            <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
            <span className="font-mono w-20 text-right">{fmtINR(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
