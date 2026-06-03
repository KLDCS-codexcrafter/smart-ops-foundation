/**
 * @file        src/features/scenario-modeling/ScenarioModelingPage.tsx
 * @page        First-Class Standalone Page #49 · ⭐ Pillar D.1 · Scenario Modeling (THE MOAT · Pt 1)
 * @sprint      T-Phase-7.D.1.3 · Sprint 122 · Arc D.1
 * @card        Renders under the existing 'fpa-planning' card (requiredCards on the sidebar item).
 * @reads-from  scenario-modeling-engine (runScenario · listScenarios · compareScenarios ·
 *              listScenarioEntities · SCENARIO_CASES). NOT a SIBLID.
 * @discipline  Dark mode · semantic tokens · shadcn · lucide · font-mono on numbers.
 */
import { useMemo, useState } from 'react';
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
import { Sparkles, Layers, Globe2, TrendingUp, TrendingDown, AlertTriangle, Grid3x3, Activity, Wallet, GitCompareArrows } from 'lucide-react';
import {
  recordScenarioDecision,
  evaluateOutcome,
  type ScenarioOutcome,
} from '@/lib/scenario-outcome-tracker-engine';
import {
  runScenario,
  listScenarios,
  compareScenarios,
  listScenarioEntities,
  runScenarioMatrix,
  runDemandScenario,
  runCapexScenario,
  FX_SHOCKS,
  type ScenarioScope,
  type ScenarioResult,
  type ScenarioDriver,
  type ScenarioMatrix,
  type DemandScenario,
  type CapexScenario,
  type CapexAction,
} from '@/lib/scenario-modeling-engine';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

const DEFAULT_DRIVERS: ScenarioDriver[] = [
  { driver: 'revenue_pct', best: 10, base: 0, worst: -10 },
  { driver: 'cost_pct', best: -5, base: 0, worst: 8 },
  { driver: 'volume_pct', best: 5, base: 0, worst: -5 },
];

export default function ScenarioModelingPage() {
  const [fy, setFy] = useState('FY26-27');
  const [scope, setScope] = useState<ScenarioScope>('consolidated');
  const groupEntities = useMemo(() => listScenarioEntities(), []);
  const [entityScope, setEntityScope] = useState<string[]>(
    () => (groupEntities.length > 0 ? groupEntities : ['sinha-trading']),
  );
  const [drivers, setDrivers] = useState<ScenarioDriver[]>(DEFAULT_DRIVERS);
  const [baselineRevenue, setBaselineRevenue] = useState<number>(0);
  const [baselineCost, setBaselineCost] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [runs, setRuns] = useState<ScenarioResult[]>(() => listScenarios({ fy: 'FY26-27' }));
  const [activeId, setActiveId] = useState<string | null>(null);

  // ── S123 · Matrix / Demand / Capex state ────────────────────────────────
  const [matrix, setMatrix] = useState<ScenarioMatrix | null>(null);
  const [matrixForeignCcy, setMatrixForeignCcy] = useState<string>('USD');
  const [matrixBaselineRev, setMatrixBaselineRev] = useState<number>(10_000_000);
  const [matrixBaselineCost, setMatrixBaselineCost] = useState<number>(7_000_000);
  const [demand, setDemand] = useState<DemandScenario | null>(null);
  const [demandChangePct, setDemandChangePct] = useState<number>(15);
  const [demandBaseRev, setDemandBaseRev] = useState<number>(10_000_000);
  const [demandBaseCost, setDemandBaseCost] = useState<number>(7_000_000);
  const [capex, setCapex] = useState<CapexScenario | null>(null);
  const [capexAction, setCapexAction] = useState<CapexAction>('defer');
  const [capexAmount, setCapexAmount] = useState<number>(5_000_000);

  const refresh = () => setRuns(listScenarios({ fy }));

  const updateDriver = (idx: number, key: 'best' | 'base' | 'worst', val: number): void => {
    setDrivers((ds) => ds.map((d, i) => (i === idx ? { ...d, [key]: val } : d)));
  };

  const toggleEntity = (e: string): void => {
    setEntityScope((es) => (es.includes(e) ? es.filter((x) => x !== e) : [...es, e]));
  };

  const handleRun = (): void => {
    setErrorMsg(null);
    try {
      const res = runScenario({
        fy, scope, entity_scope: entityScope, drivers,
        baseline_override:
          baselineRevenue > 0 || baselineCost > 0
            ? { revenue: baselineRevenue, cost: baselineCost }
            : undefined,
      });
      setActiveId(res.scenario_id);
      refresh();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const active = runs.find((r) => r.scenario_id === activeId) ?? null;
  const compare = active ? compareScenarios(active.scenario_id) : [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              Scenario Modeling
              <Badge variant="outline" className="ml-2">⭐ The Moat · Pt 2 (Capstone)</Badge>
            </h1>
            <p className="text-muted-foreground mt-1">
              Best / base / worst at single-entity AND multi-entity CONSOLIDATED
              scope — orchestrates the Phase-6 consolidation + FX-translation +
              eliminations stack across {groupEntities.length || 0} group entities.
            </p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Layers className="h-4 w-4" />
            FR-44 orchestration
          </Badge>
        </div>

        {errorMsg && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Scenario run failed</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="best-base-worst" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="best-base-worst" className="gap-2">
              <Sparkles className="h-4 w-4" /> Best / Base / Worst
            </TabsTrigger>
            <TabsTrigger value="matrix" className="gap-2">
              <Grid3x3 className="h-4 w-4" /> FX × Rev × Cost Matrix
            </TabsTrigger>
            <TabsTrigger value="demand" className="gap-2">
              <Activity className="h-4 w-4" /> Demand Surge / Drop
            </TabsTrigger>
            <TabsTrigger value="capex" className="gap-2">
              <Wallet className="h-4 w-4" /> Capex Defer / Accelerate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="best-base-worst" className="space-y-6 mt-4">
        {/* Controls */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Scenario inputs</CardTitle>
            <CardDescription>
              Choose scope and driver perturbations. Consolidated scope walks the
              entire Phase-6 stack (consolidate · fx-translate · eliminate · build P&L).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Financial year</Label>
              <Input value={fy} onChange={(e) => setFy(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Scope</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as ScenarioScope)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_entity">Single entity</SelectItem>
                  <SelectItem value="consolidated">Consolidated (multi-entity · the moat)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Baseline override (optional)</Label>
              <div className="flex gap-2">
                <Input
                  type="number" placeholder="Revenue"
                  value={baselineRevenue || ''}
                  onChange={(e) => setBaselineRevenue(Number(e.target.value) || 0)}
                  className="font-mono"
                />
                <Input
                  type="number" placeholder="Cost"
                  value={baselineCost || ''}
                  onChange={(e) => setBaselineCost(Number(e.target.value) || 0)}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="md:col-span-3 space-y-2">
              <Label className="flex items-center gap-2">
                <Globe2 className="h-4 w-4" /> Entity scope
              </Label>
              <div className="flex flex-wrap gap-2">
                {(groupEntities.length > 0 ? groupEntities : ['sinha-trading']).map((e) => (
                  <Button
                    key={e}
                    size="sm"
                    variant={entityScope.includes(e) ? 'default' : 'outline'}
                    onClick={() => toggleEntity(e)}
                  >
                    {e}
                  </Button>
                ))}
              </div>
            </div>

            {/* Driver matrix */}
            <div className="md:col-span-3 space-y-2">
              <Label>Driver perturbations (%)</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-right">Best</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Worst</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((d, i) => (
                    <TableRow key={d.driver}>
                      <TableCell className="font-medium">{d.driver}</TableCell>
                      {(['best', 'base', 'worst'] as const).map((k) => (
                        <TableCell key={k} className="text-right">
                          <Input
                            type="number"
                            value={d[k]}
                            onChange={(e) => updateDriver(i, k, Number(e.target.value))}
                            className="font-mono w-24 inline-block text-right"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:col-span-3">
              <Button onClick={handleRun} className="gap-2">
                <Sparkles className="h-4 w-4" /> Run scenario
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {active && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Scenario result
                {active.consolidated && (
                  <Badge className="gap-1">
                    <Layers className="h-3 w-3" /> Consolidated · {active.entity_scope.length} entities
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                {active.scenario_id}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">PBT</TableHead>
                    <TableHead className="text-right">Δ vs base</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.cases.map((c) => {
                    const row = compare.find((x) => x.case === c.case);
                    const delta = row ? row.delta_vs_base : 0;
                    return (
                      <TableRow key={c.case}>
                        <TableCell className="font-medium capitalize">{c.case}</TableCell>
                        <TableCell className="text-right font-mono">₹{formatINR(c.consolidated_revenue)}</TableCell>
                        <TableCell className="text-right font-mono">₹{formatINR(c.consolidated_cost)}</TableCell>
                        <TableCell className="text-right font-mono">₹{formatINR(c.consolidated_pbt)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {delta > 0 ? (
                            <span className="text-success inline-flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" /> +₹{formatINR(delta)}
                            </span>
                          ) : delta < 0 ? (
                            <span className="text-destructive inline-flex items-center gap-1">
                              <TrendingDown className="h-3 w-3" /> ₹{formatINR(delta)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* History */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Recent scenarios</CardTitle>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scenarios yet. Run one above.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scenario</TableHead>
                    <TableHead>FY</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Entities</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.slice().reverse().map((r) => (
                    <TableRow
                      key={r.scenario_id}
                      className="cursor-pointer"
                      onClick={() => setActiveId(r.scenario_id)}
                    >
                      <TableCell className="font-mono text-xs">{r.scenario_id}</TableCell>
                      <TableCell>{r.fy}</TableCell>
                      <TableCell>
                        {r.consolidated ? <Badge>consolidated</Badge> : <Badge variant="outline">single</Badge>}
                      </TableCell>
                      <TableCell className="font-mono">{r.entity_scope.length}</TableCell>
                      <TableCell className="font-mono text-xs">{r.created_at}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* ─── S123 · FX × Revenue × Cost Sensitivity Matrix ─── */}
          <TabsContent value="matrix" className="space-y-4 mt-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Grid3x3 className="h-4 w-4" /> FX × Revenue × Cost Sensitivity Matrix
                </CardTitle>
                <CardDescription>
                  Orchestrates the same Phase-6 consolidation stack + fx-translation rate
                  perturbation across every (FX shock, revenue step, cost step) cell. FR-44
                  reuse — does not duplicate fx-what-if.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Foreign currency</Label>
                    <Input
                      value={matrixForeignCcy}
                      onChange={(e) => setMatrixForeignCcy(e.target.value.toUpperCase())}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Baseline revenue</Label>
                    <Input
                      type="number" value={matrixBaselineRev}
                      onChange={(e) => setMatrixBaselineRev(Number(e.target.value) || 0)}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Baseline cost</Label>
                    <Input
                      type="number" value={matrixBaselineCost}
                      onChange={(e) => setMatrixBaselineCost(Number(e.target.value) || 0)}
                      className="font-mono"
                    />
                  </div>
                </div>
                <Button
                  className="gap-2"
                  onClick={() => {
                    setErrorMsg(null);
                    try {
                      const m = runScenarioMatrix({
                        fy,
                        entity_scope: entityScope.length > 0 ? entityScope : ['sinha-trading'],
                        fx_shocks: [...FX_SHOCKS],
                        revenue_steps: [-10, 0, 10],
                        cost_steps: [-5, 0, 5],
                        foreign_currency: matrixForeignCcy,
                        baseline_override: {
                          revenue: matrixBaselineRev,
                          cost: matrixBaselineCost,
                        },
                      });
                      setMatrix(m);
                    } catch (e) {
                      setErrorMsg(e instanceof Error ? e.message : 'Unknown matrix error');
                    }
                  }}
                >
                  <Sparkles className="h-4 w-4" /> Run matrix
                </Button>

                {matrix && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      <Badge variant="outline" className="font-mono">{matrix.matrix_id}</Badge>
                      <span className="text-muted-foreground">
                        cells: <span className="font-mono">{matrix.cells.length}</span>
                      </span>
                      <span className="text-muted-foreground">
                        base PBT: <span className="font-mono">₹{formatINR(matrix.base_pbt)}</span>
                      </span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>FX shock</TableHead>
                          <TableHead className="text-right">Factor</TableHead>
                          <TableHead className="text-right">Rev %</TableHead>
                          <TableHead className="text-right">Cost %</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead className="text-right">PBT</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {matrix.cells.map((c, i) => (
                          <TableRow key={`${c.fx_shock}-${c.revenue_pct}-${c.cost_pct}-${i}`}>
                            <TableCell className="font-mono text-xs">{c.fx_shock}</TableCell>
                            <TableCell className="text-right font-mono">{c.fx_factor.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono">{c.revenue_pct}</TableCell>
                            <TableCell className="text-right font-mono">{c.cost_pct}</TableCell>
                            <TableCell className="text-right font-mono">₹{formatINR(c.consolidated_revenue)}</TableCell>
                            <TableCell className="text-right font-mono">₹{formatINR(c.consolidated_cost)}</TableCell>
                            <TableCell className={`text-right font-mono ${c.consolidated_pbt >= matrix.base_pbt ? 'text-success' : 'text-destructive'}`}>
                              ₹{formatINR(c.consolidated_pbt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── S123 · Demand surge / drop ─── */}
          <TabsContent value="demand" className="space-y-4 mt-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Demand Surge / Drop
                </CardTitle>
                <CardDescription>
                  Calls demand-forecast-engine for the forward sample then flows
                  Δdemand% through to consolidated PBT.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Demand change %</Label>
                    <Input
                      type="number" value={demandChangePct}
                      onChange={(e) => setDemandChangePct(Number(e.target.value) || 0)}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Baseline revenue</Label>
                    <Input
                      type="number" value={demandBaseRev}
                      onChange={(e) => setDemandBaseRev(Number(e.target.value) || 0)}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Baseline cost</Label>
                    <Input
                      type="number" value={demandBaseCost}
                      onChange={(e) => setDemandBaseCost(Number(e.target.value) || 0)}
                      className="font-mono"
                    />
                  </div>
                </div>
                <Button
                  className="gap-2"
                  onClick={() => {
                    setErrorMsg(null);
                    try {
                      const d = runDemandScenario({
                        fy,
                        entity_scope: entityScope.length > 0 ? entityScope : ['sinha-trading'],
                        demand_change_pct: demandChangePct,
                        baseline_override: { revenue: demandBaseRev, cost: demandBaseCost },
                      });
                      setDemand(d);
                    } catch (e) {
                      setErrorMsg(e instanceof Error ? e.message : 'Unknown demand error');
                    }
                  }}
                >
                  <Sparkles className="h-4 w-4" /> Run demand scenario
                </Button>

                {demand && (
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>Δ demand</TableCell>
                        <TableCell className="text-right font-mono">{demand.demand_change_pct}%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Forecast sample qty</TableCell>
                        <TableCell className="text-right font-mono">{formatINR(demand.forecast_sample_qty)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Resulting revenue</TableCell>
                        <TableCell className="text-right font-mono">₹{formatINR(demand.resulting_revenue)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Resulting cost</TableCell>
                        <TableCell className="text-right font-mono">₹{formatINR(demand.resulting_cost)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Resulting PBT</TableCell>
                        <TableCell className={`text-right font-mono ${demand.resulting_pbt >= 0 ? 'text-success' : 'text-destructive'}`}>
                          ₹{formatINR(demand.resulting_pbt)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── S123 · Capex defer / accelerate ─── */}
          <TabsContent value="capex" className="space-y-4 mt-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4" /> Capex Defer / Accelerate
                </CardTitle>
                <CardDescription>
                  Reads S120 fpa-budgeting capital budget; computes cash + PBT impact
                  for defer vs accelerate of the supplied capex amount.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Action</Label>
                    <Select value={capexAction} onValueChange={(v) => setCapexAction(v as CapexAction)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="defer">Defer</SelectItem>
                        <SelectItem value="accelerate">Accelerate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Capex amount (₹)</Label>
                    <Input
                      type="number" value={capexAmount}
                      onChange={(e) => setCapexAmount(Number(e.target.value) || 0)}
                      className="font-mono"
                    />
                  </div>
                </div>
                <Button
                  className="gap-2"
                  onClick={() => {
                    setErrorMsg(null);
                    try {
                      const c = runCapexScenario({
                        fy,
                        entity_scope: entityScope.length > 0 ? entityScope : ['sinha-trading'],
                        capex_action: capexAction,
                        capex_amount: capexAmount,
                      });
                      setCapex(c);
                    } catch (e) {
                      setErrorMsg(e instanceof Error ? e.message : 'Unknown capex error');
                    }
                  }}
                >
                  <Sparkles className="h-4 w-4" /> Run capex scenario
                </Button>

                {capex && (
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>Action</TableCell>
                        <TableCell className="text-right font-mono capitalize">{capex.capex_action}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Capital budget total (S120)</TableCell>
                        <TableCell className="text-right font-mono">₹{formatINR(capex.capital_budget_total)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Capex amount</TableCell>
                        <TableCell className="text-right font-mono">₹{formatINR(capex.capex_amount)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Cash impact</TableCell>
                        <TableCell className={`text-right font-mono ${capex.cash_impact >= 0 ? 'text-success' : 'text-destructive'}`}>
                          ₹{formatINR(capex.cash_impact)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>PBT impact</TableCell>
                        <TableCell className={`text-right font-mono ${capex.pbt_impact >= 0 ? 'text-success' : 'text-destructive'}`}>
                          ₹{formatINR(capex.pbt_impact)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
