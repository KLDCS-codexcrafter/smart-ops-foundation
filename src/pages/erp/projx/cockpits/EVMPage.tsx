/**
 * @file        EVMPage.tsx
 * @sprint      RPT-10b · Block 3 · Earned Value Management cockpit
 * @purpose     PV/EV/AC legs derived ONLY from fields the DSC rows carry.
 *              - PV (Planned Value): projx.projects.current_contract_value
 *              - EV (Earned Value):  projx.projects.billed_to_date
 *              - AC (Actual Cost):   ABSENT in projx.projects / projx.financials
 *                rows — DECLARED, never synthesised.
 *              CPI = EV/AC → cannot compute (AC absent) → tile DECLARED ABSENT.
 *              SPI = EV/PV → computed when both legs present, RAG via thresholds.
 *              S-curve = milestone invoice_amount over target_date per project.
 * @[JWT]       N/A — pure consumption
 */
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { downloadCsv } from '@/lib/report-framework/export-csv';
import {
  ReportChart, ScorecardTile, ReportSendHeader,
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

export default function EVMPage(): JSX.Element {
  const { entityCode } = useCardEntitlement();
  const projects = useMemo(() => rowsFromSource('projx.projects', entityCode), [entityCode]);
  const milestones = useMemo(() => rowsFromSource('projx.financials', entityCode), [entityCode]);

  // PV + EV per project (legs that DO exist on the rows).
  const projectLegs = useMemo(() => projects.map((p) => {
    const name = String((p as { project_name?: string }).project_name ?? (p as { project_no?: string }).project_no ?? '—');
    const pv = Number((p as { current_contract_value?: number }).current_contract_value ?? 0);
    const ev = Number((p as { billed_to_date?: number }).billed_to_date ?? 0);
    return { project: name, pv, ev };
  }), [projects]);

  // AC leg DECLARED absent — rows carry no actual-cost field today.
  const acLegPresent = false;

  const totalPV = projectLegs.reduce((s, r) => s + r.pv, 0);
  const totalEV = projectLegs.reduce((s, r) => s + r.ev, 0);
  const spi = totalPV > 0 ? totalEV / totalPV : null;
  const spiPct = spi != null ? Math.round(spi * 100) : null;

  // SPI RAG · higher-good · 0.9 amber · 0.75 red (industry convention).
  const spiRag = spiPct != null
    ? resolveRag(spiPct, { amber: 90, red: 75, direction: 'higher-good' })
    : undefined;

  // S-curve per project — milestone invoice_amount cumulative by target_date.
  const sCurve = useMemo(() => {
    const sorted = [...milestones].sort((a, b) =>
      String((a as { target_date?: string }).target_date ?? '').localeCompare(
        String((b as { target_date?: string }).target_date ?? ''),
      ),
    );
    let cum = 0;
    return sorted.map((m) => {
      const amt = Number((m as { invoice_amount?: number }).invoice_amount ?? 0);
      cum += amt;
      return {
        date: String((m as { target_date?: string }).target_date ?? '—'),
        cumulative: cum,
      };
    });
  }, [milestones]);

  const sig = useMemo(
    () => ((projects.length || milestones.length) ? signReport([...projects, ...milestones]) : '—'),
    [projects, milestones],
  );

  return (
    <div className="p-6 space-y-6" data-testid="evm-page">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Earned Value (EVM)</h1>
          <p className="text-sm text-muted-foreground">
            From <code>projx.projects</code> + <code>projx.financials</code>. PV/EV legs
            from real row fields. AC leg DECLARED absent — never synthesised.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ReportSendHeader title="Earned Value (EVM)" rows={projectLegs as unknown as Record<string, unknown>[]} />
          <Button size="sm" variant="outline" type="button" data-testid="evm-csv"
            onClick={() => downloadCsv(`evm-${entityCode}-${Date.now()}`, projectLegs as unknown as Record<string, unknown>[])} disabled={projectLegs.length === 0}>
            <Download className="h-3 w-3 mr-1" /> CSV
          </Button>
          <Badge variant="outline" className="font-mono text-[10px]" data-testid="evm-integrity">
            ◇ {sig.slice(0, 12)}
          </Badge>
        </div>
      </header>


      {projects.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground" data-testid="evm-empty">
          No project rows yet for entity <span className="font-mono">{entityCode}</span>.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ScorecardTile
              label="Planned Value (PV)"
              value={`₹${Math.round(totalPV).toLocaleString('en-IN')}`}
              hint="projx.projects.current_contract_value"
            />
            <ScorecardTile
              label="Earned Value (EV)"
              value={`₹${Math.round(totalEV).toLocaleString('en-IN')}`}
              hint="projx.projects.billed_to_date"
            />
            <ScorecardTile
              label="Actual Cost (AC)"
              value="—"
              hint="DECLARED absent · no AC field on source rows"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {spiPct != null ? (
              <ScorecardTile
                label="SPI · Schedule Performance Index"
                value={`${(spi ?? 0).toFixed(2)} (${spiPct}%)`}
                rag={spiRag}
                hint="px-spi · EV/PV · higher-good"
              />
            ) : (
              <ScorecardTile
                label="SPI · Schedule Performance Index"
                value="—"
                hint="omitted · PV = 0"
              />
            )}
            <ScorecardTile
              label="CPI · Cost Performance Index"
              value="—"
              hint="DECLARED absent · AC leg unavailable"
            />
          </div>

          <Card className="p-4" data-testid="evm-pvev-chart">
            <div className="text-sm text-muted-foreground mb-2">PV vs EV per project</div>
            <ReportChart
              data={projectLegs}
              config={defaultChartConfig({
                chartType: 'column',
                xKey: 'project',
                series: [
                  { key: 'pv', label: 'PV ₹' },
                  { key: 'ev', label: 'EV ₹' },
                ],
              })}
            />
          </Card>

          <Card className="p-4" data-testid="evm-s-curve">
            <div className="text-sm text-muted-foreground mb-2">
              S-Curve · cumulative milestone invoice ₹
            </div>
            {sCurve.length > 0 ? (
              <ReportChart
                data={sCurve}
                config={defaultChartConfig({
                  chartType: 'line',
                  xKey: 'date',
                  series: [{ key: 'cumulative', label: 'Cumulative ₹' }],
                })}
              />
            ) : (
              <div className="text-xs text-muted-foreground py-6 text-center">
                No milestone rows yet.
              </div>
            )}
          </Card>

          <Card className="p-4 text-xs text-muted-foreground" data-testid="evm-absent-declaration">
            Declared (not faked): the AC (Actual Cost) leg is not present on
            <code>projx.projects</code> or <code>projx.financials</code> rows today.
            CPI = EV/AC therefore cannot be computed. Both will surface automatically
            once an AC-bearing field is added to the source rows.{' '}
            <span data-testid="evm-ac-absent">AC absent: {String(!acLegPresent)}</span>
          </Card>
        </>
      )}
    </div>
  );
}
