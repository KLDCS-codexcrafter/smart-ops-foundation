/**
 * @file        OEEBoardPage.tsx
 * @sprint      RPT-10b · Block 1 · OEE Board executive cockpit
 * @purpose     Consumes computeOEE from src/lib/oee-engine.ts using the SAME
 *              data wiring as OEEDashboard (factories + machines + job cards +
 *              DWR entries → buildOEESourceData → computeOEE). The legacy
 *              OEEDashboard panel stays 0-DIFF.
 *              Renders: per-line OEE columns · A/P/Q stacked column · RAG tiles
 *              via resolveRag against `prod-line-oee` thresholds (RPT-6a seed) ·
 *              signReport integrity badge · honest empty-state when no run data.
 * @[JWT]       N/A — pure consumption
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ReportChart, ScorecardTile,
} from '@/components/operix-core/report-framework';
import { defaultChartConfig } from '@/lib/report-framework/chart-config';
import { resolveRag } from '@/lib/report-framework/rag';
import { signReport } from '@/lib/report-framework/integrity-sign';
import { getKpi } from '@/lib/report-framework/kpi-registry';
import { useFactories } from '@/hooks/useFactories';
import { useMachines } from '@/hooks/useMachines';
import { useJobCards } from '@/hooks/useJobCards';
import { useDailyWorkRegister } from '@/hooks/useDailyWorkRegister';
import { buildOEESourceData, computeOEE } from '@/lib/oee-engine';
import { MANUFACTURING_TEMPLATES } from '@/config/manufacturing-templates';

export default function OEEBoardPage(): JSX.Element {
  const { factories } = useFactories();
  const { machines } = useMachines();
  const { allJobCards } = useJobCards();
  const { entries: dwrEntries } = useDailyWorkRegister();

  const [factoryId, setFactoryId] = useState<string>(factories[0]?.id ?? '');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const template = MANUFACTURING_TEMPLATES[0];

  const factoryMachines = useMemo(
    () => machines.filter((m) => m.factory_id === factoryId),
    [machines, factoryId],
  );

  // SAME wiring as OEEDashboard — single source of truth (computeOEE).
  const oeeRows = useMemo(() => {
    return factoryMachines.map((m) => {
      const source = buildOEESourceData({
        entity_id: m.entity_id,
        factory_id: factoryId,
        machine: m,
        date,
        shift_id: null,
        job_cards: allJobCards,
        dwr_entries: dwrEntries,
        template,
      });
      const result = computeOEE(source, 'classic_apq', template);
      return { machine: m, source, result };
    });
  }, [factoryMachines, factoryId, date, allJobCards, dwrEntries, template]);

  // Line-level OEE column data
  const lineOEE = useMemo(
    () => oeeRows.map((r) => ({ line: r.machine.name, oee_pct: Math.round(r.result.oee_pct) })),
    [oeeRows],
  );

  // A/P/Q breakdown (stacked-column)
  const apqBreakdown = useMemo(
    () => oeeRows.slice(0, 12).map((r) => ({
      line: r.machine.name,
      availability: Math.round(r.result.availability_pct ?? 0),
      performance: Math.round(r.result.performance_pct ?? 0),
      quality: Math.round(r.result.quality_pct ?? 0),
    })),
    [oeeRows],
  );

  // RAG thresholds from seeded KPI (RPT-6a · prod-line-oee · higher-good).
  const lineKpi = getKpi('prod-line-oee');
  const ragThresholds = lineKpi?.thresholds ?? { amber: 75, red: 60, direction: 'higher-good' as const };

  const avgOEE = lineOEE.length
    ? Math.round(lineOEE.reduce((s, r) => s + r.oee_pct, 0) / lineOEE.length)
    : 0;
  const avgRag = resolveRag(avgOEE, ragThresholds);

  const sig = useMemo(
    () => (oeeRows.length ? signReport(oeeRows.map((r) => r.result as unknown as Record<string, unknown>)) : '—'),
    [oeeRows],
  );

  return (
    <div className="p-6 space-y-6" data-testid="oee-board-page">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">OEE Board</h1>
          <p className="text-sm text-muted-foreground">
            Shop-floor board · consumes <code>computeOEE</code> from{' '}
            <code>src/lib/oee-engine.ts</code> — same wiring as the legacy OEE Dashboard.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-[10px]" data-testid="oee-board-integrity">
          ◇ {sig.slice(0, 12)}
        </Badge>
      </header>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Factory</label>
          <Select value={factoryId} onValueChange={setFactoryId}>
            <SelectTrigger><SelectValue placeholder="Select factory" /></SelectTrigger>
            <SelectContent>
              {factories.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full text-sm p-2 border rounded-md bg-background"
          />
        </div>
        <div className="flex items-end">
          <div className="text-xs text-muted-foreground">
            Machines in scope: <span className="font-mono text-foreground">{factoryMachines.length}</span>
          </div>
        </div>
      </Card>

      {oeeRows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground" data-testid="oee-board-empty">
          No run data available for this factory / date. Post job-card entries or
          DWR confirmations to populate <code>computeOEE</code>.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ScorecardTile
              label="Average Plant OEE"
              value={`${avgOEE}%`}
              rag={avgRag}
              hint="prod-line-oee · higher-good"
            />
            <ScorecardTile
              label="World-Class Lines (≥85%)"
              value={oeeRows.filter((r) => r.result.classification === 'world_class').length}
              hint="A×P×Q ≥ 0.85"
            />
            <ScorecardTile
              label="Poor Lines (<40%)"
              value={oeeRows.filter((r) => r.result.classification === 'poor').length}
              hint="needs intervention"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4" data-testid="oee-board-lineoee">
              <div className="text-sm text-muted-foreground mb-2">Line-level OEE %</div>
              <ReportChart
                data={lineOEE}
                config={defaultChartConfig({
                  chartType: 'column',
                  xKey: 'line',
                  series: [{ key: 'oee_pct', label: 'OEE %' }],
                })}
              />
            </Card>
            <Card className="p-4" data-testid="oee-board-apq">
              <div className="text-sm text-muted-foreground mb-2">Availability · Performance · Quality</div>
              <ReportChart
                data={apqBreakdown}
                config={defaultChartConfig({
                  chartType: 'stacked-column',
                  xKey: 'line',
                  series: [
                    { key: 'availability', label: 'Availability %' },
                    { key: 'performance', label: 'Performance %' },
                    { key: 'quality', label: 'Quality %' },
                  ],
                })}
              />
            </Card>
          </div>

          <Card className="p-4" data-testid="oee-board-rag-tiles">
            <div className="text-sm text-muted-foreground mb-3">Per-line RAG (prod-line-oee thresholds)</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {oeeRows.map((r) => (
                <ScorecardTile
                  key={r.machine.id}
                  label={r.machine.name}
                  value={`${Math.round(r.result.oee_pct)}%`}
                  rag={resolveRag(r.result.oee_pct, ragThresholds)}
                  hint={r.result.classification.replace('_', ' ')}
                />
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
