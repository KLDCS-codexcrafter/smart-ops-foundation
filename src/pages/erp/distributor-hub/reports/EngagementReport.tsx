/**
 * EngagementReport.tsx — 'Mood of the Month' distributor engagement
 * KPIs: active distributors, orders 30d, avg orders/dist, NPS proxy.
 * Chart: 30-day line chart of daily orders.
 * Module id: dh-r-engagement
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Smile, TrendingUp, LogIn, ShieldCheck } from 'lucide-react';
import { ReportChart } from '@/components/operix-core/report-framework';
import { defaultChartConfig, signReport } from '@/lib/report-framework';
import { Badge } from '@/components/ui/badge';
import { distributorsKey, type Distributor } from '@/types/distributor';
import { distributorOrdersKey, type DistributorOrder } from '@/types/distributor-order';
import { ratingsKey, type RatingEntry } from '@/types/distributor-rating';
function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function EngagementReportPanel() {
  const { entityCode } = useEntityCode();
  const data = useMemo(() => {
    // [JWT] GET /api/reports/distributor-engagement?days=30
    const distributors = readList<Distributor>(distributorsKey(entityCode));
    const orders = readList<DistributorOrder>(distributorOrdersKey(entityCode));
    const ratings = readList<RatingEntry>(ratingsKey(entityCode));

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

      {(() => {
        const hash = signReport(data.series);
        const short = hash.replace('fnv1a:', '').slice(0, 10);
        return (
          <Card data-testid="db-engagement-chart-host">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Orders — last 30 days</CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono" data-testid="db-engagement-integrity-badge" title={hash}>
                <ShieldCheck className="h-3 w-3 mr-1" />{short}
              </Badge>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 240 }}>
                <ReportChart
                  data={data.series}
                  config={defaultChartConfig({
                    chartType: 'line', xKey: 'day',
                    series: [{ key: 'count', label: 'Orders' }],
                  })}
                />
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}

export default EngagementReportPanel;
