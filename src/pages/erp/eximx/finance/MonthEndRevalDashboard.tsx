/**
 * @file        src/pages/erp/eximx/finance/MonthEndRevalDashboard.tsx
 * @purpose     Month-End Reval run dashboard · consumes EX-7c seeds · D-NEW-FG voucher runtime
 * @sprint      T-Phase-1.EX-8-TT-Hedge-MonthEnd-DayBook-VoucherRuntime
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Play, TrendingUp, TrendingDown, ShieldCheck } from 'lucide-react';
import { loadRealisations } from '@/lib/export-realisation-engine';
import { runMonthEndReval, getLastRevalRun, type MonthEndRevalRun } from '@/lib/month-end-reval-engine';
import type { ExportRealisation } from '@/types/export-realisation';
import { ReportChart, ScorecardTile } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig, resolveRag } from '@/lib/report-framework';

export function MonthEndRevalDashboard(): JSX.Element {
  const entityCode = 'sinha-trading';
  const [rs, setRs] = useState<ExportRealisation[]>([]);
  const [lastRun, setLastRun] = useState<{ period: string; run_at: string } | null>(null);
  const [latestRunResult, setLatestRunResult] = useState<MonthEndRevalRun | null>(null);

  useEffect(() => {
    setRs(loadRealisations(entityCode));
    setLastRun(getLastRevalRun(entityCode));
  }, []);

  const triggerRun = (): void => {
    const period = new Date().toISOString().slice(0, 7);
    const rates = { USD: 85.50, AED: 23.30, JPY: 0.57, EUR: 92.70, SGD: 62.80 };
    const result = runMonthEndReval(entityCode, period, rates);
    setLatestRunResult(result);
    setRs(loadRealisations(entityCode));
    setLastRun(getLastRevalRun(entityCode));
  };

  const pendingReval = rs.filter((r) => r.status !== 'fully_realised');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold"><Calendar className="w-5 h-5 inline mr-2" />Month-End Revaluation</h2>
          <p className="text-sm text-muted-foreground">Consumes EX-7c seed fields · uses D-NEW-FG voucher runtime engine</p>
        </div>
        <Button onClick={triggerRun}><Play className="w-4 h-4 mr-2" />Run Reval for current month</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{pendingReval.length}</div><div className="text-xs text-muted-foreground">Pending Reval</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm font-medium">{lastRun?.period ?? 'Never'}</div><div className="text-xs text-muted-foreground">Last Run Period</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs font-mono">{lastRun?.run_at?.slice(0, 16) ?? '—'}</div><div className="text-xs text-muted-foreground">Last Run At</div></CardContent></Card>
      </div>

      {latestRunResult && (
        <Card className="border-success">
          <CardHeader><CardTitle className="text-sm">Latest Run Result · {latestRunResult.period}</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>Realisations revalued: <strong>{latestRunResult.realisations_revalued}</strong></div>
            <div>Vouchers posted (D-NEW-FG runtime): <strong>{latestRunResult.vouchers_posted.length}</strong></div>
            <div>Total variance: {latestRunResult.total_variance_inr >= 0
              ? <span className="text-success font-bold"><TrendingUp className="w-4 h-4 inline" /> +₹{latestRunResult.total_variance_inr.toLocaleString('en-IN')}</span>
              : <span className="text-destructive font-bold"><TrendingDown className="w-4 h-4 inline" /> ₹{latestRunResult.total_variance_inr.toLocaleString('en-IN')}</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {(() => {
        const byCurrency = new Map<string, { revalued: number; pending: number }>();
        for (const r of rs) {
          const cur = r.currency_code;
          const slot = byCurrency.get(cur) ?? { revalued: 0, pending: 0 };
          if (r.status === 'fully_realised') slot.revalued += 1; else slot.pending += 1;
          byCurrency.set(cur, slot);
        }
        const chartRows = Array.from(byCurrency.entries()).map(([currency, v]) => ({
          currency, revalued: v.revalued, pending: v.pending,
        }));
        const revaluedTotal = rs.length - pendingReval.length;
        const pct = rs.length > 0 ? Math.round((revaluedTotal * 100) / rs.length) : 100;
        const kpi = getKpi('ex-monthend-reval');
        const chartConfig = kpi?.defaultChart ?? defaultChartConfig({
          chartType: 'column', xKey: 'currency',
          series: [
            { key: 'revalued', label: 'Revalued' },
            { key: 'pending', label: 'Pending' },
          ],
          title: 'FX reval coverage by currency',
        });
        const rag = resolveRag(pct, kpi?.thresholds ?? { amber: 95, red: 80, direction: 'higher-good' });
        const sig = signReport(chartRows);
        return (
          <section className="space-y-3" data-testid="rpt2biii-monthend-reval-section">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ScorecardTile label="Month-end reval coverage %" value={`${pct}%`} rag={rag} hint="Revalued vs total" />
              <ScorecardTile label="Pending reval" value={pendingReval.length} hint="Awaiting next run" />
              <Card className="p-3 flex items-center gap-2" data-testid="integrity-badge-monthend-reval">
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
