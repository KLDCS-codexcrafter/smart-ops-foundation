/**
 * @file        SpendFunnelPage.tsx
 * @sprint      RPT-10a · Block 4 · Spend Funnel executive cockpit
 * @purpose     From procure.purchase-orders + procure.budget-utilization:
 *              funnel by status (only stages the data actually carries —
 *              missing stages declared, not faked), budget-vs-actual combo,
 *              top-vendor concentration. NO synthetic data.
 * @[JWT]       N/A — pure consumption
 */
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { downloadCsv } from '@/lib/report-framework/export-csv';
import {
  ReportChart, ScorecardTile,
} from '@/components/operix-core/report-framework';
import { getSource } from '@/lib/report-framework/data-source-catalog';
import { defaultChartConfig } from '@/lib/report-framework/chart-config';
import { signReport } from '@/lib/report-framework/integrity-sign';
import '@/lib/report-framework/data-sources';

interface Props { entityCode: string }

// Canonical funnel stages (top→bottom). A stage is rendered ONLY if the
// purchase-orders rows carry the matching status value at least once.
const FUNNEL_STAGES: Array<{ key: string; label: string; statuses: string[] }> = [
  { key: 'indent', label: 'Indent / Draft', statuses: ['indent', 'draft', 'requested'] },
  { key: 'po',     label: 'PO Issued',      statuses: ['po', 'issued', 'approved', 'open', 'released'] },
  { key: 'grn',    label: 'GRN Received',   statuses: ['grn', 'received', 'partially_received'] },
  { key: 'billed', label: 'Billed',         statuses: ['billed', 'invoiced', 'fcpi_drafted', 'closed', 'completed'] },
];

function rowsFromSource(id: string, entityCode: string): Record<string, unknown>[] {
  try { return getSource(id)?.read(entityCode) ?? []; } catch { return []; }
}

export default function SpendFunnelPage({ entityCode }: Props): JSX.Element {
  const poRows = useMemo(() => rowsFromSource('procure.purchase-orders', entityCode), [entityCode]);
  const budgetRows = useMemo(() => rowsFromSource('procure.budget-utilization', entityCode), [entityCode]);

  // Build funnel only from stages with real data — missing stages declared.
  const funnel = useMemo(() => {
    const present: Array<{ stage: string; count: number; value: number }> = [];
    const missing: string[] = [];
    for (const s of FUNNEL_STAGES) {
      const matching = poRows.filter((r) =>
        s.statuses.includes(String((r as { status?: string }).status ?? '').toLowerCase()),
      );
      if (matching.length === 0) { missing.push(s.label); continue; }
      const value = matching.reduce(
        (sum, r) => sum + Number((r as { total_value?: number }).total_value ?? 0),
        0,
      );
      present.push({ stage: s.label, count: matching.length, value });
    }
    return { present, missing };
  }, [poRows]);

  // Top vendor concentration
  const topVendors = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of poRows) {
      const v = String((r as { vendor_name?: string }).vendor_name ?? '—');
      map.set(v, (map.get(v) ?? 0) + Number((r as { total_value?: number }).total_value ?? 0));
    }
    return Array.from(map.entries())
      .map(([vendor, spend]) => ({ vendor, spend }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 10);
  }, [poRows]);

  const totalSpend = topVendors.reduce((s, v) => s + v.spend, 0);
  const top3Share = totalSpend > 0
    ? Math.round((topVendors.slice(0, 3).reduce((s, v) => s + v.spend, 0) / totalSpend) * 100)
    : 0;

  // Budget vs actual (combo) — allocated vs (committed+consumed) per scope ref
  const budgetCombo = useMemo(() => {
    return budgetRows.map((b) => ({
      scope: String((b as { scope_ref_label?: string }).scope_ref_label ?? '—'),
      allocated: Number((b as { allocated_amount?: number }).allocated_amount ?? 0),
      actual:
        Number((b as { committed_amount?: number }).committed_amount ?? 0) +
        Number((b as { consumed_amount?: number }).consumed_amount ?? 0),
    }));
  }, [budgetRows]);

  const sig = useMemo(
    () => (poRows.length || budgetRows.length ? signReport([...poRows, ...budgetRows]) : '—'),
    [poRows, budgetRows],
  );

  return (
    <div className="space-y-6 p-6" data-testid="spend-funnel-page">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Spend Funnel</h1>
          <p className="text-sm text-muted-foreground">
            Indent → PO → GRN → Billed funnel from <code>procure.purchase-orders</code>
            {' + '}<code>procure.budget-utilization</code>. Only stages with real data render.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ReportSendHeader title="Spend Funnel" rows={poRows as unknown as Record<string, unknown>[]} />
          <Button size="sm" variant="outline" type="button" data-testid="spend-funnel-csv"
            onClick={() => downloadCsv(`spend-funnel-${entityCode}-${Date.now()}`, poRows)} disabled={poRows.length === 0}>
            <Download className="h-3 w-3 mr-1" /> CSV
          </Button>
          <Badge variant="outline" className="font-mono text-[10px]" data-testid="spend-funnel-integrity">
            ◇ {sig.slice(0, 12)}
          </Badge>
        </div>
      </header>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ScorecardTile label="POs in scope" value={poRows.length} hint="procure.purchase-orders" />
        <ScorecardTile label="Total Spend" value={`₹${Math.round(totalSpend).toLocaleString('en-IN')}`} hint="sum of top-10 vendors" />
        <ScorecardTile
          label="Top-3 Concentration"
          value={`${top3Share}%`}
          hint="pr-vendor-concentration"
        />
      </div>

      {poRows.length === 0 ? (
        <Card className="p-8 text-sm text-muted-foreground text-center" data-testid="spend-funnel-empty">
          No purchase-order rows yet for entity <span className="font-mono">{entityCode}</span>.
        </Card>
      ) : (
        <>
          <Card className="p-4" data-testid="spend-funnel-funnel">
            <div className="text-sm text-muted-foreground mb-2">
              Funnel · {funnel.present.length} of {FUNNEL_STAGES.length} stages present
            </div>
            {funnel.present.length > 0 ? (
              <ReportChart
                data={funnel.present}
                config={defaultChartConfig({
                  chartType: 'stacked-column',
                  xKey: 'stage',
                  series: [{ key: 'value', label: 'Value ₹' }],
                })}
              />
            ) : (
              <div className="text-xs text-muted-foreground py-6 text-center">
                No PO status maps to any funnel stage yet.
              </div>
            )}
            {funnel.missing.length > 0 && (
              <p
                className="mt-2 text-[10px] text-muted-foreground"
                data-testid="spend-funnel-missing-declared"
              >
                Declared (not faked): missing stages — {funnel.missing.join(' · ')}
              </p>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4" data-testid="spend-funnel-budget">
              <div className="text-sm text-muted-foreground mb-2">Budget vs Actual</div>
              {budgetCombo.length > 0 ? (
                <ReportChart
                  data={budgetCombo}
                  config={defaultChartConfig({
                    chartType: 'combo',
                    xKey: 'scope',
                    series: [
                      { key: 'allocated', label: 'Allocated' },
                      { key: 'actual',    label: 'Actual' },
                    ],
                  })}
                />
              ) : (
                <div className="text-xs text-muted-foreground py-6 text-center">
                  No active budget allocations.
                </div>
              )}
            </Card>
            <Card className="p-4" data-testid="spend-funnel-top-vendors">
              <div className="text-sm text-muted-foreground mb-2">Top-10 Vendor Concentration</div>
              <ReportChart
                data={topVendors}
                config={defaultChartConfig({
                  chartType: 'column',
                  xKey: 'vendor',
                  series: [{ key: 'spend', label: 'Spend ₹' }],
                })}
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
