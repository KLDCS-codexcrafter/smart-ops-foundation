/**
 * @file     ProcessBatchRegister.tsx
 * @sprint   T-Phase-3.PROD-3.5.PASS3 · ST11b
 * @purpose  Register report for all process batches · variance display.
 *           Consumes process-batch-engine + production-variance-engine (process variance ext).
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listProcessBatches } from '@/lib/process-batch-engine';
import { listRecipes } from '@/lib/recipe-formula-engine';
import {
  computeProcessVariance,
  persistProcessVariance,
} from '@/lib/production-variance-engine';
import type { ProcessBatch } from '@/types/process-batch';

// RPT-6a chart-enable additions
import { ShieldCheck } from 'lucide-react';
import { ReportChart } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';
import { useMemo } from 'react';

export function ProcessBatchRegisterPanel(): JSX.Element {
  const navigate = useNavigate();
  const { entityCode } = useEntityCode();
  const [batches, setBatches] = useState<ProcessBatch[]>([]);
  const [showCompleted, setShowCompleted] = useState(true);
  const [showInFlight, setShowInFlight] = useState(true);

  useEffect(() => {
    if (!entityCode) return;
    setBatches(listProcessBatches(entityCode));
  }, [entityCode]);

  function handleComputeVariance(batch: ProcessBatch): void {
    const recipes = listRecipes(entityCode);
    const recipe = recipes.find(r => r.id === batch.recipe_id);
    if (!recipe) {
      toast.error('Recipe not found for this batch');
      return;
    }
    try {
      const variance = computeProcessVariance({ batch, recipe });
      persistProcessVariance(entityCode, variance);
      toast.success(`Variance computed · yield Δ ${batch.yield_variance.toFixed(2)}%`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const filtered = batches.filter(b => {
    const isCompleted = b.status === 'completed' || b.status === 'rejected' || b.status === 'cancelled';
    if (isCompleted && !showCompleted) return false;
    if (!isCompleted && !showInFlight) return false;
    return true;
  });

  const completedCount = batches.filter(b => b.status === 'completed').length;
  const rejectedCount = batches.filter(b => b.status === 'rejected').length;
  const inFlightCount = batches.filter(b =>
    b.status === 'draft' || b.status === 'running' || b.status === 'paused' || b.status === 'sampling',
  ).length;

  // RPT-6a · dashboard recipe (additive)
  const chartRows = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of batches) m.set(b.status ?? 'unknown', (m.get(b.status ?? 'unknown') ?? 0) + 1);
    return Array.from(m.entries()).map(([process, batch_count]) => ({ process, batch_count }));
  }, [batches]);
  const chartConfig = getKpi('prod-batch')?.defaultChart ?? defaultChartConfig({ chartType: 'column', xKey: 'process', series: [{ key: 'batch_count', label: 'Batches' }], title: 'Process batches by status' });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">Process Batch Register</h1>
        <Badge variant="outline">Process Mfg</Badge>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">In-Flight</p>
            <p className="text-3xl font-bold font-mono">{inFlightCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-3xl font-bold font-mono text-success">{completedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Rejected</p>
            <p className="text-3xl font-bold font-mono text-destructive">{rejectedCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button variant={showInFlight ? 'default' : 'outline'} size="sm" onClick={() => setShowInFlight(!showInFlight)}>
          In-Flight
        </Button>
        <Button variant={showCompleted ? 'default' : 'outline'} size="sm" onClick={() => setShowCompleted(!showCompleted)}>
          Completed/Rejected
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Batches ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground">No batches match the filter.</p>
            )}
            {filtered.map(b => (
              <div key={b.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge>{b.status}</Badge>
                    <div>
                      <p className="font-semibold font-mono">{b.batch_no}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.recipe_name} · v{b.recipe_version} · planned {b.planned_yield}{b.yield_uom}
                        {b.actual_yield !== null && ` · actual ${b.actual_yield}${b.yield_uom}`}
                      </p>
                    </div>
                  </div>
                  {b.status === 'completed' && (
                    <Button size="sm" variant="outline" onClick={() => handleComputeVariance(b)} className="gap-1">
                      <TrendingUp className="h-3 w-3" /> Variance
                    </Button>
                  )}
                </div>
                {b.status === 'completed' && b.yield_variance !== 0 && (
                  <p className="text-xs mt-2 text-muted-foreground">
                    Yield variance: {b.yield_variance.toFixed(2)}%
                    {b.yield_variance < 0 ? ' (unfavourable)' : ' (favourable)'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>

      <Card className="p-3 space-y-2" data-testid="prod-batch-dashboard-host">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] font-mono" data-testid="prod-batch-integrity-badge" title={integrityHash}>
            <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
          </Badge>
        </div>
        {chartRows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No batches yet</div>
        ) : (
          <div className="w-full h-72" data-testid="prod-batch-chart-host">
            <ReportChart data={chartRows} config={chartConfig} />
          </div>
        )}
      </Card>
    </div>
  );
}
