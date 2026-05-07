/**
 * @file     QualiCheckDashboard.tsx
 * @sprint   T-Phase-1.3-3b-pre-3 · Block D · D-642
 * @purpose  Q58=c · 2 always-visible sections (Trend + Pareto) · Q60=c polymorphic Pareto grouping.
 */
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useProductionConfig } from '@/hooks/useProductionConfig';
import { listQaInspections } from '@/lib/qa-inspection-engine';
import { computeParetoData, computeQCTrend } from '@/lib/qa-pareto-engine';
import type { QaInspectionRecord } from '@/types/qa-inspection';
import type { ParetoGroupingMode } from '@/types/qc-dashboard-mode';
import { QCTrendChart } from '@/components/qc/QCTrendChart';
import { QCParetoChart } from '@/components/qc/QCParetoChart';

const GROUPING_KEYS: ParetoGroupingMode[] = ['per_parameter', 'per_item', 'per_machine', 'per_inspector'];

export function QualiCheckDashboard(): JSX.Element {
  const { entityCode } = useEntityCode();
  const productionConfig = useProductionConfig();
  const [inspections, setInspections] = useState<QaInspectionRecord[]>([]);
  const [paretoGrouping, setParetoGrouping] = useState<ParetoGroupingMode>(() => {
    try {
      // [JWT] GET /api/user-preferences/qc-pareto-grouping
      const stored = localStorage.getItem('qc_pareto_grouping');
      if (stored && (GROUPING_KEYS as string[]).includes(stored)) return stored as ParetoGroupingMode;
    } catch { /* silent */ }
    return productionConfig.qcParetoDefaultGrouping ?? 'per_parameter';
  });

  useEffect(() => {
    setInspections(listQaInspections(entityCode));
  }, [entityCode]);

  const trendPoints = useMemo(() => computeQCTrend(inspections, 30), [inspections]);
  const paretoData = useMemo(() => computeParetoData(inspections, paretoGrouping), [inspections, paretoGrouping]);

  const totalInspections = inspections.filter(i => i.status === 'passed' || i.status === 'failed' || i.status === 'partial_pass').length;
  const totalFailures = inspections.filter(i => i.status === 'failed').length;
  const overallPassRate = totalInspections > 0
    ? Math.round(((totalInspections - totalFailures) / totalInspections) * 1000) / 10
    : 0;

  const handleGroupingChange = (g: ParetoGroupingMode): void => {
    setParetoGrouping(g);
    try {
      // [JWT] PUT /api/user-preferences/qc-pareto-grouping
      localStorage.setItem('qc_pareto_grouping', g);
    } catch { /* silent */ }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Inspections (finalized)</div>
            <div className="text-2xl font-bold font-mono">{totalInspections}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Pass Rate</div>
            <div className="text-2xl font-bold font-mono text-success">{overallPassRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Failures</div>
            <div className="text-2xl font-bold font-mono text-destructive">{totalFailures}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Pass/Fail Trend (last 30 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendPoints.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No finalized inspections in the last 30 days.
            </div>
          ) : (
            <QCTrendChart data={trendPoints} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-warning" />
            Failure Pareto · {paretoData.total_failures} total failures
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paretoData.bins.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No failure data to chart.
            </div>
          ) : (
            <QCParetoChart
              data={paretoData}
              grouping={paretoGrouping}
              onGroupingChange={handleGroupingChange}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
