/**
 * @file        ThreeWayMatchStatusPanel.tsx
 * @purpose     3-way / 4-way match status pivot · clean / variance / awaiting-qa / qa-failed.
 * @who         Procurement · Bill Passing operator
 * @when        Sprint T-Phase-1.A.3.b-T1-Bill-Passing-Reports-Wiring · Block E
 * @sprint      T-Phase-1.A.3.b-T1-Bill-Passing-Reports-Wiring
 * @iso         25010 · Functional Suitability
 * @decisions   D-NEW-AK · D-NEW-AL
 * @reuses      bill-passing-engine.listBillPassing · runMatch · useEntityCode · useCurrentUser
 * @[JWT]       GET /api/bill-passing — localStorage-backed in Phase 1
 */
import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { listBillPassing, runMatch } from '@/lib/bill-passing-engine';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { ReportChart } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';

const STATUS_LABEL: Record<string, string> = {
  matched_clean: 'Clean',
  matched_with_variance: 'Variance',
  awaiting_qa: 'Awaiting QA',
  qa_failed: 'QA Failed',
  pending_match: 'Pending',
  approved_for_fcpi: 'Approved',
  fcpi_drafted: 'PI Drafted',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const STATUS_TONE: Record<string, string> = {
  matched_clean: 'bg-success/15 text-success',
  matched_with_variance: 'bg-warning/15 text-warning',
  awaiting_qa: 'bg-warning/15 text-warning',
  qa_failed: 'bg-destructive/15 text-destructive',
};

export function ThreeWayMatchStatusPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const [tick, setTick] = useState(0);

  const bills = useMemo(() => {
    void tick;
    return listBillPassing(entityCode);
  }, [entityCode, tick]);

  const kpiClean = bills.filter((b) => b.status === 'matched_clean').length;
  const kpiVariance = bills.filter((b) => b.status === 'matched_with_variance').length;
  const kpiAwaitingQa = bills.filter((b) => b.status === 'awaiting_qa').length;
  const kpiQaFailed = bills.filter((b) => b.status === 'qa_failed').length;

  // RPT-5c · dashboard recipe (additive)
  const chartRows = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bills) m.set(b.status, (m.get(b.status) ?? 0) + 1);
    return Array.from(m.entries()).map(([status, count]) => ({
      status: STATUS_LABEL[status] ?? status,
      count,
    }));
  }, [bills]);
  const chartConfig = getKpi('pr-three-way-match')?.defaultChart ?? defaultChartConfig({
    chartType: 'doughnut', xKey: 'status',
    series: [{ key: 'count', label: 'Bills' }],
    title: '3-way match status mix',
  });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);

  async function handleRunMatch(billId: string): Promise<void> {
    try {
      await runMatch(billId, entityCode, user?.id ?? 'system');
      setTick((n) => n + 1);
      toast.success('Match recomputed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Run match failed');
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">3-Way Match Status</h1>
        <p className="text-sm text-muted-foreground">PO · GRN · Invoice (+ QC) match across all bills.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Clean</div>
          <div className="text-2xl font-mono font-bold mt-1 text-success">{kpiClean}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">With Variance</div>
          <div className="text-2xl font-mono font-bold mt-1 text-warning">{kpiVariance}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Awaiting QA</div>
          <div className="text-2xl font-mono font-bold mt-1 text-warning">{kpiAwaitingQa}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">QA Failed</div>
          <div className="text-2xl font-mono font-bold mt-1 text-destructive">{kpiQaFailed}</div>
        </CardContent></Card>
      </div>

      <Card className="p-3 space-y-2" data-testid="pr-three-way-match-dashboard-host">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] font-mono" data-testid="pr-three-way-match-integrity-badge" title={integrityHash}>
            <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
          </Badge>
        </div>
        {chartRows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No bills yet</div>
        ) : (
          <div className="w-full h-72" data-testid="pr-three-way-match-chart-host">
            <ReportChart data={chartRows} config={chartConfig} />
          </div>
        )}
      </Card>

      <Card>
        <CardContent className="p-0">
          {bills.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No bills yet.</div>
          ) : (
            <table className="w-full text-sm table-fixed">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2 w-[120px]">Bill #</th>
                  <th className="text-left p-2 w-[120px]">PO #</th>
                  <th className="text-left p-2 w-[120px]">GRN #</th>
                  <th className="text-left p-2 w-[140px]">Invoice #</th>
                  <th className="text-left p-2 w-[140px]">Status</th>
                  <th className="text-right p-2 w-[100px]">Variance %</th>
                  <th className="text-center p-2 w-[80px]">QC</th>
                  <th className="text-center p-2 w-[100px]">Action</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => {
                  const tone = STATUS_TONE[b.status] ?? 'bg-muted text-muted-foreground';
                  const qcLine = b.lines.find((l) => l.requires_inspection);
                  const qcLabel = !qcLine ? '—'
                    : qcLine.qa_passed === true ? 'Pass'
                    : qcLine.qa_passed === false ? 'Fail'
                    : 'Pending';
                  return (
                    <tr key={b.id} className="border-t hover:bg-accent">
                      <td className="p-2 font-mono">{b.bill_no}</td>
                      <td className="p-2 font-mono">{b.po_no}</td>
                      <td className="p-2 font-mono">{b.git_id ?? '—'}</td>
                      <td className="p-2 font-mono">{b.vendor_invoice_no}</td>
                      <td className="p-2">
                        <span className={`text-xs px-2 py-0.5 rounded-lg ${tone}`}>
                          {STATUS_LABEL[b.status] ?? b.status}
                        </span>
                      </td>
                      <td className="p-2 text-right font-mono">{b.variance_pct.toFixed(2)}%</td>
                      <td className="p-2 text-xs text-center">{qcLabel}</td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          className="text-xs px-2 py-0.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25"
                          onClick={() => { void handleRunMatch(b.id); }}
                        >
                          Run Match
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
