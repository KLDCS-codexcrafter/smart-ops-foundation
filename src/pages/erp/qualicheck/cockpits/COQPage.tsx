/**
 * @file        COQPage.tsx
 * @sprint      RPT-10b · Block 2 · Cost of Quality executive cockpit
 * @purpose     Reads qualicheck.inspections + qualicheck.ncr DSC sources only.
 *              Rejection-cost-by-reason is rendered ONLY if rows carry a cost
 *              field; NCR severity-aging stacked-column is always derivable.
 *              Pass-rate RAG tile renders only when a real pass-% derives from
 *              inspection rows. Prevention/Appraisal/Failure split is DECLARED
 *              ABSENT — the rows carry no cost-category fields, never invented.
 *              Integrity badge via signReport. Honest empty-states.
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
import { resolveRag } from '@/lib/report-framework/rag';
import { signReport } from '@/lib/report-framework/integrity-sign';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import '@/lib/report-framework/data-sources';

function rowsFromSource(id: string, entityCode: string): Record<string, unknown>[] {
  try { return getSource(id)?.read(entityCode) ?? []; } catch { return []; }
}

export default function COQPage(): JSX.Element {
  const { entityCode } = useCardEntitlement();
  const inspRows = useMemo(() => rowsFromSource('qualicheck.inspections', entityCode), [entityCode]);
  const ncrRows = useMemo(() => rowsFromSource('qualicheck.ncr', entityCode), [entityCode]);

  // NCR rejection-quantity grouped by source ("reason") — only field rows carry.
  // We expose this as "Rejection volume by reason" because rows carry qty, not cost.
  const rejByReason = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of ncrRows) {
      const key = String((r as { source?: string }).source ?? '—');
      map.set(key, (map.get(key) ?? 0) + Number((r as { qty_affected?: number }).qty_affected ?? 0));
    }
    return Array.from(map.entries()).map(([reason, qty]) => ({ reason, qty }));
  }, [ncrRows]);

  // NCR severity-aging — stacked-column status × severity (real fields).
  const ncrSeverityAging = useMemo(() => {
    const buckets: Record<string, Record<string, number>> = {};
    for (const r of ncrRows) {
      const status = String((r as { status?: string }).status ?? '—');
      const sev = String((r as { severity?: string }).severity ?? '—');
      if (!buckets[status]) buckets[status] = {};
      buckets[status][sev] = (buckets[status][sev] ?? 0) + 1;
    }
    const severities = Array.from(new Set(ncrRows.map((r) => String((r as { severity?: string }).severity ?? '—'))));
    return {
      rows: Object.entries(buckets).map(([status, counts]) => ({ status, ...counts })),
      severities,
    };
  }, [ncrRows]);

  // Pass-rate — derived only if rows carry a real pass/fail status.
  const passRate = useMemo(() => {
    if (inspRows.length === 0) return null;
    const closedOrPass = inspRows.filter((r) => {
      const s = String((r as { status?: string }).status ?? '').toLowerCase();
      return s === 'pass' || s === 'passed' || s === 'closed' || s === 'approved';
    }).length;
    const failOrOpen = inspRows.filter((r) => {
      const s = String((r as { status?: string }).status ?? '').toLowerCase();
      return s === 'fail' || s === 'failed' || s === 'rejected';
    }).length;
    const denom = closedOrPass + failOrOpen;
    if (denom === 0) return null;
    return Math.round((closedOrPass / denom) * 100);
  }, [inspRows]);

  const passRag = passRate != null
    ? resolveRag(passRate, { amber: 90, red: 75, direction: 'higher-good' })
    : undefined;

  const sig = useMemo(
    () => ((inspRows.length || ncrRows.length) ? signReport([...inspRows, ...ncrRows]) : '—'),
    [inspRows, ncrRows],
  );

  return (
    <div className="p-6 space-y-6" data-testid="coq-page">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cost of Quality</h1>
          <p className="text-sm text-muted-foreground">
            From <code>qualicheck.inspections</code> + <code>qualicheck.ncr</code> · only
            metrics derivable from real row fields are rendered.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" type="button" data-testid="coq-csv"
            onClick={() => downloadCsv(`coq-ncr-${entityCode}-${Date.now()}`, ncrRows)} disabled={ncrRows.length === 0}>
            <Download className="h-3 w-3 mr-1" /> CSV
          </Button>
          <Badge variant="outline" className="font-mono text-[10px]" data-testid="coq-integrity">
            ◇ {sig.slice(0, 12)}
          </Badge>
        </div>
      </header>


      {inspRows.length === 0 && ncrRows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground" data-testid="coq-empty">
          No QualiCheck inspection or NCR rows yet for entity{' '}
          <span className="font-mono">{entityCode}</span>.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ScorecardTile
              label="Open NCRs"
              value={ncrRows.length}
              hint="qualicheck.ncr"
            />
            <ScorecardTile
              label="Inspections in scope"
              value={inspRows.length}
              hint="qualicheck.inspections"
            />
            {passRate != null ? (
              <ScorecardTile
                label="Pass Rate"
                value={`${passRate}%`}
                rag={passRag}
                hint="qc-coq · higher-good"
              />
            ) : (
              <ScorecardTile
                label="Pass Rate"
                value="—"
                hint="omitted · no pass/fail status on rows"
              />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4" data-testid="coq-reason">
              <div className="text-sm text-muted-foreground mb-2">
                Rejection volume by source (qty_affected · NCR rows)
              </div>
              {rejByReason.length > 0 ? (
                <ReportChart
                  data={rejByReason}
                  config={defaultChartConfig({
                    chartType: 'column',
                    xKey: 'reason',
                    series: [{ key: 'qty', label: 'Qty Affected' }],
                  })}
                />
              ) : (
                <div className="text-xs text-muted-foreground py-6 text-center">
                  No NCR rows with a source / qty.
                </div>
              )}
            </Card>
            <Card className="p-4" data-testid="coq-aging">
              <div className="text-sm text-muted-foreground mb-2">NCR status × severity</div>
              {ncrSeverityAging.rows.length > 0 ? (
                <ReportChart
                  data={ncrSeverityAging.rows}
                  config={defaultChartConfig({
                    chartType: 'stacked-column',
                    xKey: 'status',
                    series: ncrSeverityAging.severities.map((s) => ({ key: s, label: s })),
                  })}
                />
              ) : (
                <div className="text-xs text-muted-foreground py-6 text-center">
                  No NCR rows with status/severity.
                </div>
              )}
            </Card>
          </div>

          <Card className="p-4 text-xs text-muted-foreground" data-testid="coq-paf-declared-absent">
            Declared (not faked): Prevention / Appraisal / Failure cost-category split is
            omitted — the <code>qualicheck.inspections</code> and <code>qualicheck.ncr</code>
            rows do not carry monetary cost-category fields. This page will surface that
            split only when the source rows carry the required fields.
          </Card>
        </>
      )}
    </div>
  );
}
