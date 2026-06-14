/**
 * DisputeStatsReport.tsx — Dispute volume, resolution time, per-reason breakdown
 * Module id: dh-r-dispute-stats · RPT-12c chart-layer swap · wires db-disputes
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { ReportChart } from '@/components/operix-core/report-framework';
import { getKpi, defaultChartConfig, signReport } from '@/lib/report-framework';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import {
  disputesKey, DISPUTE_REASON_LABELS,
  type InvoiceDispute,
} from '@/types/invoice-dispute';

const RESOLVED_STATUSES = new Set(['credit_noted', 'rejected', 'partial']);

export function DisputeStatsReportPanel() {
  const { entityCode } = useEntityCode();
  const stats = useMemo(() => {
    let disputes: InvoiceDispute[] = [];
    try {
      // [JWT] GET /api/reports/distributor-disputes
      const raw = localStorage.getItem(disputesKey(entityCode));
      disputes = raw ? JSON.parse(raw) : [];
    } catch { /* ignore */ }

    const open = disputes.filter(d => d.status === 'open' || d.status === 'under_review').length;
    const resolved = disputes.filter(d => RESOLVED_STATUSES.has(d.status)).length;

    const byReason = new Map<string, number>();
    for (const d of disputes) {
      const label = DISPUTE_REASON_LABELS[d.reason] ?? d.reason;
      byReason.set(label, (byReason.get(label) ?? 0) + 1);
    }
    const reasonSeries = Array.from(byReason.entries()).map(([reason, count]) => ({ reason, count }));

    const resolvedWithDates = disputes.filter(d =>
      RESOLVED_STATUSES.has(d.status) && d.reviewed_at && d.created_at,
    );
    const avgDays = resolvedWithDates.length === 0
      ? 0
      : Math.round(resolvedWithDates.reduce((sum, d) =>
          sum + (new Date(d.reviewed_at!).getTime() - new Date(d.created_at).getTime()) / 86_400_000,
        0) / resolvedWithDates.length * 10) / 10;

    return { total: disputes.length, open, resolved, avgDays, reasonSeries };
  }, []);

  const hash = useMemo(() => signReport(stats.reasonSeries), [stats.reasonSeries]);
  const short = hash.replace('fnv1a:', '').slice(0, 10);
  const cfg = getKpi('db-disputes')?.defaultChart ?? defaultChartConfig({
    chartType: 'column', xKey: 'reason',
    series: [{ key: 'count', label: 'Disputes' }],
    title: 'Disputes by reason',
  });

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Dispute Statistics</h2>
          <p className="text-sm text-muted-foreground">Volume, resolution time, reason breakdown.</p>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono" data-testid="db-disputes-integrity-badge" title={hash}>
          <ShieldCheck className="h-3 w-3 mr-1" />{short}
        </Badge>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3">
          <span className="text-xs text-muted-foreground">Total</span>
          <p className="text-2xl font-bold font-mono">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <span className="text-xs text-muted-foreground">Open</span>
          <p className="text-2xl font-bold font-mono text-amber-600">{stats.open}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <span className="text-xs text-muted-foreground">Resolved</span>
          <p className="text-2xl font-bold font-mono text-emerald-600">{stats.resolved}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <span className="text-xs text-muted-foreground">Avg resolution (days)</span>
          <p className="text-2xl font-bold font-mono">{stats.avgDays}</p>
        </CardContent></Card>
      </div>
      <Card data-testid="db-disputes-chart-host">
        <CardHeader className="pb-2"><CardTitle className="text-base">By reason</CardTitle></CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: 260 }}>
            {stats.reasonSeries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No disputes recorded yet.
              </div>
            ) : (
              <ReportChart data={stats.reasonSeries} config={cfg} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DisputeStatsReportPanel;
