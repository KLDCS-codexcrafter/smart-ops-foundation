/**
 * @file        src/pages/erp/eximx/export/BuyerReliabilityDashboard.tsx
 * @purpose     Cross-customer Buyer Reliability analytics · Moat #18 FOUNDATION dashboard
 * @sprint      T-Phase-1.EX-7a-ExportPO-ForeignCustomer-DocPack
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, ShieldCheck } from 'lucide-react';
import { ReportChart, ScorecardTile } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig, resolveRag } from '@/lib/report-framework';
import { FOREIGN_CUSTOMER_LOCALSTORAGE_KEY } from '@/types/foreign-customer';
import type { ForeignCustomer } from '@/types/foreign-customer';
import { aggregateReliabilityForDashboard } from '@/lib/buyer-reliability-engine';
import { BUYER_RELIABILITY_THRESHOLDS } from '@/types/buyer-reliability-score';

export function BuyerReliabilityDashboard(): JSX.Element {
  const entityCode = 'sinha-trading';
  const [customers, setCustomers] = useState<ForeignCustomer[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FOREIGN_CUSTOMER_LOCALSTORAGE_KEY(entityCode));
      setCustomers(raw ? (JSON.parse(raw) as ForeignCustomer[]) : []);
    } catch { /* ignore */ }
  }, []);
  const agg = aggregateReliabilityForDashboard(customers);

  const classColor = (k: string) =>
    k === 'excellent' ? 'bg-success text-success-foreground'
      : k === 'good' ? 'bg-primary text-primary-foreground'
      : k === 'attention' ? 'bg-warning text-warning-foreground'
      : 'bg-destructive text-destructive-foreground';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Buyer Reliability Index</h1>
        <p className="text-sm text-muted-foreground">Moat #18 FOUNDATION · 0-100 score · country risk overlay · feedback loop closes EX-7c with e-BRC realization data</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold font-mono">{agg.total}</div><div className="text-xs text-muted-foreground">Foreign Customers</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold font-mono">{agg.avg_score}</div><div className="text-xs text-muted-foreground">Avg Score</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-success font-mono">{agg.by_class.excellent}</div><div className="text-xs text-muted-foreground">Excellent (90-100)</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-destructive font-mono">{agg.high_risk_count}</div><div className="text-xs text-muted-foreground"><Award className="w-3 h-3 inline mr-1" />Risk (&lt;50)</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Distribution by Class</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(['excellent', 'good', 'attention', 'risk'] as const).map((k) => (
              <div key={k} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Badge className={classColor(k)}>{k}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">{BUYER_RELIABILITY_THRESHOLDS[k].description}</p>
                </div>
                <div className="font-bold text-lg font-mono">{agg.by_class[k]}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
            <strong>Phase 2</strong>: e-BRC realization data (EX-7c) feeds payment_history_delta. Sanctions watchlist (EX-9) auto-zeros score for hits.
          </div>
        </CardContent>
      </Card>

      {(() => {
        const classes = ['excellent', 'good', 'attention', 'risk'] as const;
        const chartRows = classes.map((c) => ({ class: c, count: agg.by_class[c] }));
        const pct = agg.avg_score;
        const kpi = getKpi('ex-buyer-reliability');
        const chartConfig = kpi?.defaultChart ?? defaultChartConfig({
          chartType: 'column', xKey: 'class',
          series: [{ key: 'count', label: 'Customers' }],
          title: 'Buyer reliability distribution',
        });
        const rag = resolveRag(pct, kpi?.thresholds ?? { amber: 80, red: 60, direction: 'higher-good' });
        const sig = signReport(chartRows);
        return (
          <section className="space-y-3" data-testid="rpt2biv-buyer-reliability-section">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ScorecardTile label="Buyer reliability index" value={`${pct}`} rag={rag} hint="Avg score across customers" />
              <ScorecardTile label="High-risk customers" value={agg.high_risk_count} hint="Score < 50" />
              <Card className="p-3 flex items-center gap-2" data-testid="integrity-badge-buyer-reliability">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Integrity</span>
                <span className="font-mono text-xs">{sig.slice(0, 12)}</span>
              </Card>
            </div>
            <Card className="p-4">
              <div className="h-72">
                <ReportChart data={chartRows} config={chartConfig} />
              </div>
            </Card>
          </section>
        );
      })()}
    </div>
  );
}

