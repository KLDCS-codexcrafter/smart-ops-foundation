/**
 * @file     PayOutDashboard.tsx
 * @purpose  PayOut landing dashboard — 4 KPI cards + recent activity + actions.
 * @sprint   T-T8.2-Foundation (Group B Sprint B.2)
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Clock, AlertTriangle, ArrowRightCircle, Plus, ListChecks } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { vouchersKey } from '@/lib/finecore-engine';
import type { Voucher } from '@/types/voucher';

function ls<T>(key: string): T[] {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

const inr = (paise: number) =>
  '₹' + (paise || 0).toLocaleString('en-IN');

export default function PayOutDashboard() {
  const { entityCode } = useEntityCode();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const vouchers = ls<Voucher>(vouchersKey(entityCode))
      .filter(v => v.base_voucher_type === 'Payment');
    const today = new Date().toISOString().slice(0, 10);
    const drafts = vouchers.filter(v => v.status === 'draft');
    const todays = vouchers.filter(v => v.date === today && v.status === 'posted');
    const advances = vouchers.flatMap(v => (v.bill_references ?? []).filter(b => b.type === 'advance'));
    const recent = [...vouchers]
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, 5);
    return {
      pendingCount: drafts.length,
      todaysOutflow: todays.reduce((s, v) => s + (v.net_amount || 0), 0),
      msmePlaceholder: 0, // [B.5] populated by MSME 43B(h) engine
      openAdvances: advances.length,
      recent,
    };
  }, [entityCode]);

  const cards = [
    { label: 'Pending Payments', value: String(stats.pendingCount), icon: Clock, tone: 'text-amber-600', sub: 'Drafts awaiting post' },
    { label: "Today's Outflow",  value: inr(stats.todaysOutflow), icon: ArrowRightCircle, tone: 'text-violet-600', sub: 'Posted today' },
    { label: 'MSME Alerts',      value: String(stats.msmePlaceholder), icon: AlertTriangle, tone: 'text-muted-foreground', sub: 'B.5 — 43B(h) tracker' },
    { label: 'Open Advances',    value: String(stats.openAdvances), icon: Wallet, tone: 'text-blue-600', sub: 'Vendor advances pending settlement' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">PayOut Dashboard</h1>
          <p className="text-sm text-muted-foreground">Vendor payments · accounts payable command centre</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/erp/payout/vendor-payment')} className="bg-violet-600 hover:bg-violet-700">
            <Plus className="h-4 w-4 mr-1" /> New Vendor Payment
          </Button>
          <Button variant="outline" onClick={() => navigate('/erp/payout/payment-register')}>
            <ListChecks className="h-4 w-4 mr-1" /> View Payment Register
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <Card key={card.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.tone}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{card.value}</div>
              <p className="text-[10px] text-muted-foreground mt-1">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Payment Vouchers</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No payment vouchers yet. Click "New Vendor Payment" to start.</p>
          ) : (
            <div className="space-y-2">
              {stats.recent.map(v => (
                <div key={v.id} className="flex items-center justify-between text-xs border-b pb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-muted-foreground">{v.voucher_no}</span>
                    <span>{v.party_name ?? '—'}</span>
                    <Badge variant="outline" className="text-[9px]">{v.status}</Badge>
                  </div>
                  <span className="font-mono">{inr(v.net_amount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
