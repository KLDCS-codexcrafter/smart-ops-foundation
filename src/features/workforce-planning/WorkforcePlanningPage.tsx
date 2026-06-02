/**
 * @file        src/features/workforce-planning/WorkforcePlanningPage.tsx
 * @page        First-Class Standalone Page #44 · Pillar D.0 · Workforce Planning
 * @sprint      T-Phase-7.D.0.2 · Sprint 117 · Arc D.0
 * @card        Renders under the existing 'fpa-planning' card (requiredCards on the sidebar item).
 * @reads-from  workforce-planning-engine (projectWorkforce · upsertHeadcountPlan ·
 *              listHeadcountPlans · getWorkforceCostVsAOP · isValidScope · readAopCostTarget ·
 *              getCapacityContextRowCount). FR-44: org-structure / capacity / org-planning
 *              are read INDIRECTLY via the engine, not directly.
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
  Users, RefreshCw, CheckCircle2, AlertTriangle, Save, Info, TrendingUp,
} from 'lucide-react';
import {
  projectWorkforce,
  upsertHeadcountPlan,
  listHeadcountPlans,
  getWorkforceCostVsAOP,
  type WorkforceScopeLevel,
  type ProjectionResult,
  type HeadcountPlan,
  type CostVsAOPRow,
} from '@/lib/workforce-planning-engine';

const LEVELS: WorkforceScopeLevel[] = ['entity', 'division', 'department'];

function levelLabel(l: WorkforceScopeLevel): string {
  if (l === 'entity') return 'Entity';
  if (l === 'division') return 'Division';
  return 'Department';
}

export default function WorkforcePlanningPage() {
  const [fy, setFy] = useState('FY26-27');
  const [scopeLevel, setScopeLevel] = useState<WorkforceScopeLevel>('department');
  const [scopeId, setScopeId] = useState<string>('');
  const [attritionPct, setAttritionPct] = useState<string>('8');
  const [hires, setHires] = useState<string>('');
  const [costPerHead, setCostPerHead] = useState<string>('600000');
  const [projection, setProjection] = useState<ProjectionResult | null>(null);
  const [plans, setPlans] = useState<HeadcountPlan[]>([]);
  const [costRows, setCostRows] = useState<CostVsAOPRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const refresh = () => {
    setPlans(listHeadcountPlans({ fy }));
    setCostRows(getWorkforceCostVsAOP({ fy }));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fy]);

  const project = () => {
    setErrorMsg(null);
    try {
      const result = projectWorkforce({
        fy,
        scope_level: scopeLevel,
        scope_id: scopeId,
        attrition_pct: Number(attritionPct) || 0,
        hires: hires === '' ? undefined : Number(hires),
        cost_per_head: Number(costPerHead) || undefined,
      });
      setProjection(result);
    } catch (e) {
      setProjection(null);
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const save = () => {
    setErrorMsg(null);
    if (!projection) return;
    try {
      upsertHeadcountPlan({
        fy: projection.fy,
        scope_level: projection.scope_level,
        scope_id: projection.scope_id,
        current_headcount: projection.current_headcount,
        planned_headcount: projection.planned_headcount,
        hires: projection.hires,
        attrition: projection.attrition,
        mix: projection.mix,
        projected_cost: projection.projected_cost,
        aop_cost_target: projection.aop_cost_target,
        cost_variance_vs_aop: projection.cost_variance_vs_aop,
      });
      refresh();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const totals = useMemo(() => {
    return plans.reduce(
      (acc, p) => ({
        current: acc.current + p.current_headcount,
        planned: acc.planned + p.planned_headcount,
        permanent: acc.permanent + p.mix.permanent,
        contract: acc.contract + p.mix.contract,
      }),
      { current: 0, planned: 0, permanent: 0, contract: 0 },
    );
  }, [plans]);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Workforce Planning
        </h1>
        <p className="text-sm text-muted-foreground">
          Pillar D.0 · Headcount projection by org node · hiring &amp; attrition modeling ·
          permanent-vs-contract mix · workforce cost flagged against the AOP cost targets
          set in the S116 Strategic Plan (intra-arc linkage).
        </p>
      </header>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>FR-44 — REUSES the real tree + the S116 AOP</AlertTitle>
        <AlertDescription className="text-xs">
          Scopes are validated against org-structure (Division / Department). Current
          headcount is read from the employee + contract-manpower masters. AOP cost targets
          are read live from the org-planning engine — none of those engines are touched.
        </AlertDescription>
      </Alert>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Projection Workbench
          </CardTitle>
          <CardDescription>
            planned = current + hires − attrition · projected cost = headcount × loaded rate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label htmlFor="wf-fy" className="text-xs">Financial Year</Label>
              <Input
                id="wf-fy"
                value={fy}
                onChange={(e) => setFy(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Scope Level</Label>
              <Select value={scopeLevel} onValueChange={(v) => setScopeLevel(v as WorkforceScopeLevel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>{levelLabel(l)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="wf-scope" className="text-xs">Scope ID (validated vs org tree)</Label>
              <Input
                id="wf-scope"
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                className="font-mono"
                placeholder="DEPT-0001 / DIV-0001 / entity-id"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wf-attr" className="text-xs">Attrition %</Label>
              <Input
                id="wf-attr"
                value={attritionPct}
                onChange={(e) => setAttritionPct(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wf-hires" className="text-xs">Hires (override)</Label>
              <Input
                id="wf-hires"
                value={hires}
                onChange={(e) => setHires(e.target.value)}
                className="font-mono"
                placeholder="auto"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wf-cph" className="text-xs">Cost per head (₹)</Label>
              <Input
                id="wf-cph"
                value={costPerHead}
                onChange={(e) => setCostPerHead(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          {errorMsg && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs font-mono">{errorMsg}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={project} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Project
            </Button>
            <Button onClick={save} variant="secondary" className="gap-2" disabled={!projection}>
              <Save className="h-4 w-4" />
              Save Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {projection && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Projection · {projection.scope_id}</CardTitle>
            <CardDescription>
              {levelLabel(projection.scope_level)} · {projection.fy}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Current</div>
                <div className="font-mono text-lg">{projection.current_headcount}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Planned</div>
                <div className="font-mono text-lg">{projection.planned_headcount}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Hires</div>
                <div className="font-mono text-lg text-success">+{projection.hires}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Attrition</div>
                <div className="font-mono text-lg text-destructive">−{projection.attrition}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Permanent</div>
                <div className="font-mono text-lg">{projection.mix.permanent}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Contract</div>
                <div className="font-mono text-lg">{projection.mix.contract}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 items-center">
              <Badge variant="outline" className="font-mono">
                Projected cost ₹{projection.projected_cost.toFixed(2)}
              </Badge>
              {projection.aop_cost_target !== undefined ? (
                <Badge
                  variant={(projection.cost_variance_vs_aop ?? 0) <= 0 ? 'default' : 'destructive'}
                  className="gap-1"
                >
                  {(projection.cost_variance_vs_aop ?? 0) <= 0
                    ? <CheckCircle2 className="h-3 w-3" />
                    : <AlertTriangle className="h-3 w-3" />}
                  AOP variance ₹{(projection.cost_variance_vs_aop ?? 0).toFixed(2)}
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Info className="h-3 w-3" />
                  No AOP cost target set for this scope (S116)
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Headcount Plans · {fy}</CardTitle>
          <CardDescription>
            Σ current <span className="font-mono">{totals.current}</span> ·
            planned <span className="font-mono ml-1">{totals.planned}</span> ·
            permanent <span className="font-mono ml-1">{totals.permanent}</span> ·
            contract <span className="font-mono ml-1">{totals.contract}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Level</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Planned</TableHead>
                <TableHead className="text-right">Hires</TableHead>
                <TableHead className="text-right">Attrition</TableHead>
                <TableHead className="text-right">Perm / Ctr</TableHead>
                <TableHead className="text-right">Projected ₹</TableHead>
                <TableHead className="text-right">AOP ₹</TableHead>
                <TableHead className="text-right">Variance ₹</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                    No saved plans yet — project + save a scope above.
                  </TableCell>
                </TableRow>
              ) : plans.map((p) => (
                <TableRow key={p.plan_id}>
                  <TableCell><Badge variant="outline">{levelLabel(p.scope_level)}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{p.scope_id}</TableCell>
                  <TableCell className="text-right font-mono">{p.current_headcount}</TableCell>
                  <TableCell className="text-right font-mono">{p.planned_headcount}</TableCell>
                  <TableCell className="text-right font-mono text-success">+{p.hires}</TableCell>
                  <TableCell className="text-right font-mono text-destructive">−{p.attrition}</TableCell>
                  <TableCell className="text-right font-mono">
                    {p.mix.permanent} / {p.mix.contract}
                  </TableCell>
                  <TableCell className="text-right font-mono">{p.projected_cost.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {p.aop_cost_target === undefined ? '—' : p.aop_cost_target.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {p.cost_variance_vs_aop === undefined ? '—' : p.cost_variance_vs_aop.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Workforce Cost vs AOP · {fy}
          </CardTitle>
          <CardDescription>
            Live read from the S116 org-planning engine — scopes with no AOP target are
            skipped (honest · no fabrication).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {costRows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No saved plans have a matching AOP cost target yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scope</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Projected ₹</TableHead>
                  <TableHead className="text-right">AOP ₹</TableHead>
                  <TableHead className="text-right">Variance ₹</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costRows.map((r) => (
                  <TableRow key={`${r.scope_level}::${r.scope_id}`}>
                    <TableCell className="font-mono text-xs">{r.scope_id}</TableCell>
                    <TableCell><Badge variant="outline">{levelLabel(r.scope_level)}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{r.projected_cost.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{r.aop_cost_target.toFixed(2)}</TableCell>
                    <TableCell
                      className={`text-right font-mono ${r.variance > 0 ? 'text-destructive' : 'text-success'}`}
                    >
                      {r.variance.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
