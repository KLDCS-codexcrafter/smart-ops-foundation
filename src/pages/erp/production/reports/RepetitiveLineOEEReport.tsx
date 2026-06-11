/**
 * @file     RepetitiveLineOEEReport.tsx
 * @sprint   T-Phase-3.PROD-4.5 · Theme A
 * @purpose  Lists repetitive ProductionOrders with line metrics · OEE breakdown.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useProductionOrders } from '@/hooks/useProductionOrders';

// RPT-6a chart-enable additions
import { ShieldCheck } from 'lucide-react';
import { TableChartToggle } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';

export default function RepetitiveLineOEEReport(): JSX.Element {
  const { entityCode } = useEntityCode();
  // [JWT] GET /api/production/orders?mode=repetitive
  const { orders } = useProductionOrders();
  const [sortKey] = useState<'oee_total' | 'units'>('oee_total');

  const rows = useMemo(() => {
    return (orders ?? [])
      .filter((po) => po.repetitive_line_metrics != null)
      .map((po) => ({ po, m: po.repetitive_line_metrics! }))
      .sort((a, b) => {
        if (sortKey === 'oee_total') return (b.m.oee_total ?? -1) - (a.m.oee_total ?? -1);
        return b.m.units_produced_this_run - a.m.units_produced_this_run;
      });
  }, [orders, sortKey]);

  // RPT-6a · toggle recipe (additive) + real Avg OEE % scorecard
  const chartRows = useMemo(() => rows.map(({ po, m }) => ({ line: m.line_id, oee_pct: m.oee_total ?? 0, po_no: po.doc_no })), [rows]);
  const chartConfig = getKpi('prod-line-oee')?.defaultChart ?? defaultChartConfig({ chartType: 'column', xKey: 'line', series: [{ key: 'oee_pct', label: 'OEE %' }], title: 'Repetitive line OEE %' });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);
  const avgOEE = useMemo(() => {
    const vals = chartRows.map((r) => r.oee_pct).filter((v) => v > 0);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  }, [chartRows]);
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Repetitive Line · OEE Report</h1>
        <p className="text-sm text-muted-foreground">Entity: <span className="font-mono">{entityCode}</span></p>
      </div>

      <Card>
        <CardHeader><CardTitle>Lines ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground p-8 text-center">
              No production orders with repetitive line metrics yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Line</TableHead>
                  <TableHead className="font-mono">Avail</TableHead>
                  <TableHead className="font-mono">Perf</TableHead>
                  <TableHead className="font-mono">Qual</TableHead>
                  <TableHead className="font-mono">OEE</TableHead>
                  <TableHead className="font-mono">Units</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ po, m }) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono">{po.doc_no}</TableCell>
                    <TableCell>{m.line_id}</TableCell>
                    <TableCell className="font-mono">{m.oee_availability ?? '—'}</TableCell>
                    <TableCell className="font-mono">{m.oee_performance ?? '—'}</TableCell>
                    <TableCell className="font-mono">{m.oee_quality ?? '—'}</TableCell>
                    <TableCell className="font-mono">
                      <Badge variant={(m.oee_total ?? 0) >= 75 ? 'default' : 'secondary'}>
                        {m.oee_total ?? '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {m.units_produced_this_run}/{m.units_target_this_run}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="p-3 space-y-2" data-testid="prod-line-oee-toggle-host">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] font-mono" data-testid="prod-line-oee-integrity-badge" title={integrityHash}>
            <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
          </Badge>
          <Badge variant={avgOEE >= 75 ? 'default' : 'secondary'} className="text-[10px] font-mono" data-testid="prod-line-oee-scorecard">
            Avg OEE {avgOEE.toFixed(1)}%
          </Badge>
        </div>
        <TableChartToggle
          rows={chartRows}
          columns={[{ key: 'line', label: 'Line' }, { key: 'oee_pct', label: 'OEE %', align: 'right' }, { key: 'po_no', label: 'PO' }]}
          chartConfig={chartConfig}
          defaultView="table"
          emptyLabel="No repetitive lines"
        />
      </Card>
    </div>
  );
}
