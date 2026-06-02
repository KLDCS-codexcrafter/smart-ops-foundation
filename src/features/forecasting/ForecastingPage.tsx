/**
 * @file        src/features/forecasting/ForecastingPage.tsx
 * @page        First-Class Standalone Page #48 · Pillar D.1 · FP&A Forecasting
 * @sprint      T-Phase-7.D.1.2 · Sprint 121 · Arc D.1
 * @card        Renders under the existing 'fpa-planning' card (requiredCards on the sidebar item).
 * @reads-from  fpa-forecasting-engine (generateFPAForecast · getForecastVsBudget ·
 *              listFPAForecasts · FORECAST_TARGETS · FORECAST_METHODS).
 *              FR-44 source engines (demand-forecast · fpa-budgeting · group-consolidation)
 *              are accessed INDIRECTLY through the engine, not by this page.
 * @no-ml       This page surfaces explainable heuristics + the ML-SEAM disclosure.
 * @discipline  Dark mode · semantic tokens · shadcn · lucide · font-mono on numbers · NOT a SIBLID.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  LineChart, AlertTriangle, Info, TrendingUp, Sparkles, Scale,
} from 'lucide-react';
import {
  generateFPAForecast,
  getForecastVsBudget,
  listFPAForecasts,
  FORECAST_TARGETS,
  FORECAST_METHODS,
  type ForecastTarget,
  type ForecastMethod,
  type FPAForecast,
  type ForecastVsBudgetResult,
} from '@/lib/fpa-forecasting-engine';

function targetLabel(t: ForecastTarget): string {
  if (t === 'revenue') return 'Revenue';
  if (t === 'cash') return 'Cash';
  return 'Demand';
}

function methodLabel(m: ForecastMethod): string {
  if (m === 'moving_average') return 'Moving Average';
  if (m === 'linear_trend') return 'Linear Trend';
  return 'Seasonal';
}

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

export default function ForecastingPage() {
  const [fy, setFy] = useState('FY26-27');
  const [target, setTarget] = useState<ForecastTarget>('revenue');
  const [method, setMethod] = useState<ForecastMethod>('moving_average');
  const [scopeId, setScopeId] = useState<string>('GROUP');
  const [horizon, setHorizon] = useState<number>(4);

  const [forecasts, setForecasts] = useState<FPAForecast[]>([]);
  const [vsBudget, setVsBudget] = useState<ForecastVsBudgetResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const refresh = () => {
    setForecasts(listFPAForecasts({ fy }));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fy]);

  const handleGenerate = () => {
    setErrorMsg(null);
    try {
      generateFPAForecast({
        fy, target, method, scope_id: scopeId, horizon,
      });
      refresh();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleVsBudget = () => {
    setErrorMsg(null);
    try {
      const r = getForecastVsBudget({ fy, scope_id: scopeId, target });
      setVsBudget(r);
      refresh();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const latestForTarget = useMemo(() => {
    const matches = forecasts
      .filter((f) => f.target === target && f.scope_id === scopeId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return matches[0] ?? null;
  }, [forecasts, target, scopeId]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <LineChart className="h-8 w-8 text-primary" />
              FP&amp;A Forecasting
            </h1>
            <p className="text-muted-foreground mt-1">
              Revenue · Cash · Demand forecasts via explainable heuristics
              (moving-average · linear-trend · seasonal). ML-interface seam declared;
              predictive ML on the roadmap.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">Pillar D.1</Badge>
            <Badge variant="outline" className="font-mono">Sprint 121</Badge>
            <Badge variant="outline" className="font-mono">DP-D1-5 honest AI</Badge>
          </div>
        </div>

        {errorMsg && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Validation</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {/* Honesty banner */}
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Explainable, not machine-proven</AlertTitle>
          <AlertDescription>
            Forecasts are heuristic. The engine declares a ForecastModelHook seam so a
            predictive ML model can plug in later without engine surgery. No ML library
            is imported and no live training happens here (DP-D1-5 / DP-P7-6).
          </AlertDescription>
        </Alert>

        {/* Generate form */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Generate Forecast
            </CardTitle>
            <CardDescription>
              History is read from consolidated P&amp;L (revenue/cash) or demand-forecast
              (demand) — engine reuse only (FR-44).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Fiscal Year</Label>
              <Input value={fy} onChange={(e) => setFy(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Target</Label>
              <Select value={target} onValueChange={(v) => setTarget(v as ForecastTarget)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORECAST_TARGETS.map((t) => (
                    <SelectItem key={t} value={t}>{targetLabel(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as ForecastMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORECAST_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{methodLabel(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scope ID</Label>
              <Input
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                placeholder="GROUP / entity_id / item entity code"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Horizon</Label>
              <Input
                type="number"
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value) || 0)}
                className="font-mono"
                min={1}
                max={24}
              />
            </div>
            <div className="md:col-span-5 flex flex-wrap gap-2">
              <Button onClick={handleGenerate}>
                <TrendingUp className="h-4 w-4 mr-1" /> Generate
              </Button>
              <Button variant="outline" onClick={handleVsBudget}>
                <Scale className="h-4 w-4 mr-1" /> Compare vs Budget
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Latest projection readout */}
        {latestForTarget && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                History vs Projection — {targetLabel(latestForTarget.target)} · {latestForTarget.scope_id}
              </CardTitle>
              <CardDescription className="flex items-start gap-2">
                <Info className="h-3 w-3 mt-1 shrink-0" />
                <span>{latestForTarget.confidence_note}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-2">History (actuals)</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latestForTarget.history.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          No history available.
                        </TableCell>
                      </TableRow>
                    ) : (
                      latestForTarget.history.map((p) => (
                        <TableRow key={`h-${p.period}`}>
                          <TableCell className="font-mono text-xs">{p.period}</TableCell>
                          <TableCell className="text-right font-mono">{formatINR(p.value)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Projection</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latestForTarget.projection.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          No projection yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      latestForTarget.projection.map((p) => (
                        <TableRow key={`p-${p.period}`}>
                          <TableCell className="font-mono text-xs">{p.period}</TableCell>
                          <TableCell className="text-right font-mono">{formatINR(p.value)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Forecast vs Budget */}
        {vsBudget && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" /> Forecast vs Budget — {targetLabel(target)} · {scopeId}
              </CardTitle>
              <CardDescription>
                Budget baseline from S120 fpa-budgeting-engine.listBudgets ({fy}).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Forecast Total</p>
                <p className="text-2xl font-mono">{formatINR(vsBudget.forecast_total)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Budget Total</p>
                <p className="text-2xl font-mono">{formatINR(vsBudget.budget_total)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Variance</p>
                <p
                  className={`text-2xl font-mono ${vsBudget.variance >= 0 ? 'text-success' : 'text-destructive'}`}
                >
                  {formatINR(vsBudget.variance)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Forecasts table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Forecasts — {fy}
            </CardTitle>
            <CardDescription>
              {forecasts.length} forecast record(s).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {forecasts.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <LineChart className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No forecasts for {fy} yet. Use the form above to generate one.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Target</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead className="text-right">History pts</TableHead>
                    <TableHead className="text-right">Horizon</TableHead>
                    <TableHead className="text-right">vs Budget</TableHead>
                    <TableHead>Method note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecasts.map((f) => (
                    <TableRow key={f.forecast_id}>
                      <TableCell><Badge variant="outline">{targetLabel(f.target)}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{methodLabel(f.method)}</TableCell>
                      <TableCell className="font-mono text-xs">{f.scope_id}</TableCell>
                      <TableCell className="text-right font-mono">{f.history.length}</TableCell>
                      <TableCell className="text-right font-mono">{f.projection.length}</TableCell>
                      <TableCell
                        className={`text-right font-mono ${
                          (f.vs_budget_variance ?? 0) >= 0 ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {f.vs_budget_variance === undefined ? '—' : formatINR(f.vs_budget_variance)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-md truncate">
                        {f.confidence_note}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
