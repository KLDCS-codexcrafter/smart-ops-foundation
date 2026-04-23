/**
 * EngagementReport.tsx — 'Mood of the Month' distributor engagement
 * KPIs: active distributors, orders 30d, avg orders/dist, NPS proxy.
 * Chart: 30-day line chart of daily orders.
 * Module id: dh-r-engagement
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Smile, TrendingUp, LogIn } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { distributorsKey, type Distributor } from '@/types/distributor';
import { distributorOrdersKey, type DistributorOrder } from '@/types/distributor-order';
import { ratingsKey, type RatingEntry } from '@/types/distributor-rating';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const ENTITY = DEFAULT_ENTITY_SHORTCODE;

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function EngagementReportPanel() {
  const data = useMemo(() => {
    // [JWT] GET /api/reports/distributor-engagement?days=30
    const distributors = readList<Distributor>(distributorsKey(ENTITY));
    const orders = readList<DistributorOrder>(distributorOrdersKey(ENTITY));
    const ratings = readList<RatingEntry>(ratingsKey(ENTITY));

    const now = Date.now();
    const cutoff = now - 30 * 86_400_000;
    const recentOrders = orders.filter(o => {
      const ts = new Date(o.submitted_at ?? o.created_at ?? 0).getTime();
      return ts >= cutoff;
    });

    const happy = ratings.filter(r => r.direction === 'tenant_to_distributor' && r.stars >= 4).length;
    const total = ratings.filter(r => r.direction === 'tenant_to_distributor').length;
    const nps = total > 0 ? Math.round((happy / total) * 100) : 0;

    const series: { day: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86_400_000);
      const key = d.toISOString().slice(5, 10);
      const count = recentOrders.filter(o => {
        const od = new Date(o.submitted_at ?? o.created_at ?? 0);
        return od.toDateString() === d.toDateString();
      }).length;
      series.push({ day: key, count });
    }

    return {
      activeDistributors: distributors.filter(d => d.status === 'active').length,
      ordersLast30: recentOrders.length,
      avgOrdersPerDist: distributors.length
        ? (recentOrders.length / distributors.length).toFixed(1)
        : '0',
      npsProxy: nps,
      series,
    };
  }, []);

  const exportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Active distributors', String(data.activeDistributors)],
      ['Orders last 30d', String(data.ordersLast30)],
      ['Avg orders per distributor', data.avgOrdersPerDist],
      ['NPS proxy (%)', String(data.npsProxy)],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'engagement.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Engagement — Mood of the Month</h2>
          <p className="text-sm text-muted-foreground">30-day distributor engagement snapshot.</p>
        </div>
        <Button onClick={exportCSV} variant="outline" size="sm">
          <Download className="h-3.5 w-3.5 mr-1" />CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Active</span>
            <LogIn className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold font-mono">{data.activeDistributors}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Orders 30d</span>
            <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold font-mono">{data.ordersLast30}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <span className="text-xs text-muted-foreground">Avg orders/distributor</span>
          <p className="text-2xl font-bold font-mono">{data.avgOrdersPerDist}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">NPS proxy</span>
            <Smile className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-mono">{data.npsProxy}%</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Orders — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default EngagementReportPanel;
