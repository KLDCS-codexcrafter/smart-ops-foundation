/**
 * @file        src/features/fpa-planning/AOPStrategicPlanPage.tsx
 * @page        First-Class Standalone Page #43 · Pillar D.0 · AOP / 3-yr Strategic Plan
 * @sprint      T-Phase-7.D.0.1 · Sprint 116 · 🎬 PHASE 7 OPENER
 * @card        Renders under the NEW 'fpa-planning' card (requiredCards on the sidebar item).
 * @reads-from  org-planning-engine (buildAOP / upsertStrategicTarget / cascadeTargets ·
 *              readEntityNodes / readDivisions / readDepartments — all READ-ONLY) ·
 *              FR-44: indirectly reads org-structure + group-structure via the engine, not directly.
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
  Target, RefreshCw, CheckCircle2, AlertTriangle, Layers, Building2, Save, Info,
} from 'lucide-react';
import {
  buildAOP,
  upsertStrategicTarget,
  readDivisions,
  readDepartments,
  readEntityNodes,
  CORPORATE_SCOPE_ID,
  CASCADE_LEVELS,
  PLAN_HORIZONS,
  netTarget,
  type AOPlan,
  type PlanHorizon,
  type CascadeLevel,
  type StrategicTarget,
} from '@/lib/org-planning-engine';

interface ScopeOption { id: string; label: string; }

function levelLabel(l: CascadeLevel): string {
  if (l === 'corporate') return 'Corporate';
  if (l === 'entity') return 'Entity';
  if (l === 'division') return 'Division';
  return 'Department';
}

export default function AOPStrategicPlanPage() {
  const [fy, setFy] = useState('FY26-27');
  const [horizon, setHorizon] = useState<PlanHorizon>('annual');
  const [plan, setPlan] = useState<AOPlan | null>(null);

  // Editor state
  const [level, setLevel] = useState<CascadeLevel>('corporate');
  const [scopeId, setScopeId] = useState<string>(CORPORATE_SCOPE_ID);
  const [revenue, setRevenue] = useState<string>('0');
  const [cost, setCost] = useState<string>('0');
  const [parentTargetId, setParentTargetId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scopeOptions: ScopeOption[] = useMemo(() => {
    if (level === 'corporate') return [{ id: CORPORATE_SCOPE_ID, label: 'GROUP (Corporate)' }];
    if (level === 'entity') {
      return readEntityNodes().map((n) => ({
        id: n.entity_id,
        label: `${n.entity_id} · ${n.relationship} · ${n.ownership_pct}%`,
      }));
    }
    if (level === 'division') {
      return readDivisions().map((d) => ({ id: d.id, label: `${d.code} · ${d.name}` }));
    }
    return readDepartments().map((d) => ({ id: d.id, label: `${d.code} · ${d.name}` }));
  }, [level]);

  useEffect(() => {
    setScopeId(scopeOptions[0]?.id ?? '');
  }, [level, scopeOptions]);

  useEffect(() => {
    setPlan(buildAOP({ fy, horizon }));
  }, [fy, horizon]);

  const refresh = () => setPlan(buildAOP({ fy, horizon }));

  const parentOptions = useMemo(() => {
    if (!plan) return [];
    const parentLevelIdx = CASCADE_LEVELS.indexOf(level) - 1;
    if (parentLevelIdx < 0) return [];
    const parentLevel = CASCADE_LEVELS[parentLevelIdx];
    return plan.targets.filter((t) => t.level === parentLevel);
  }, [plan, level]);

  const onSave = () => {
    setErrorMsg(null);
    try {
      upsertStrategicTarget({
        fy,
        horizon,
        level,
        scope_id: scopeId,
        revenue_target: Number(revenue) || 0,
        cost_target: Number(cost) || 0,
        parent_target_id: parentTargetId || null,
      });
      refresh();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const rows = plan?.targets ?? [];
  const breaks = plan?.cascade_breaks ?? [];
  const balanced = plan?.cascade_balanced ?? true;
  const scopeCounts = plan?.scope_counts ?? { entities: 0, divisions: 0, departments: 0 };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          AOP &amp; Strategic Plan
        </h1>
        <p className="text-sm text-muted-foreground">
          Pillar D.0 · Annual Operating Plan + 3-year strategic plan · revenue / cost target cascade
          corporate → entity → division → department. Targets only — actuals &amp; variance live in
          the D.1 budget/forecast module.
        </p>
      </header>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>FR-44 — REUSES the real org tree</AlertTitle>
        <AlertDescription className="text-xs">
          Scopes are validated against org-structure (Division / Department) and
          intercompany-group-structure (entities). Tree counts read at build time:
          <span className="font-mono ml-1">{scopeCounts.entities}</span> entities ·
          <span className="font-mono ml-1">{scopeCounts.divisions}</span> divisions ·
          <span className="font-mono ml-1">{scopeCounts.departments}</span> departments.
        </AlertDescription>
      </Alert>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Plan Controls
          </CardTitle>
          <CardDescription>Pick FY + horizon · the cascade rebuilds on every change.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="aop-fy" className="text-xs">Financial Year</Label>
            <Input
              id="aop-fy"
              value={fy}
              onChange={(e) => setFy(e.target.value)}
              className="w-40 font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Horizon</Label>
            <Select value={horizon} onValueChange={(v) => setHorizon(v as PlanHorizon)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLAN_HORIZONS.map((h) => (
                  <SelectItem key={h} value={h}>{h === 'annual' ? 'Annual (AOP)' : '3-Year Strategic'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={refresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Rebuild Cascade
          </Button>
          <div className="ml-auto flex gap-2">
            <Badge variant={balanced ? 'default' : 'destructive'} className="gap-1">
              {balanced
                ? <CheckCircle2 className="h-3 w-3" />
                : <AlertTriangle className="h-3 w-3" />}
              {balanced ? 'Cascade balanced' : `${breaks.length} mismatch(es)`}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Building2 className="h-3 w-3" />
              Targets: <span className="font-mono ml-1">{rows.length}</span>
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Upsert Target</CardTitle>
          <CardDescription>
            Targets are stored only — actuals &amp; variance are out-of-scope (D.1).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Level</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as CascadeLevel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CASCADE_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>{levelLabel(l)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Scope (validated against the real tree)</Label>
              <Select value={scopeId} onValueChange={setScopeId}>
                <SelectTrigger><SelectValue placeholder="Select scope" /></SelectTrigger>
                <SelectContent>
                  {scopeOptions.length === 0 ? (
                    <SelectItem value="__none__" disabled>No scope available</SelectItem>
                  ) : scopeOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Revenue ₹</Label>
              <Input value={revenue} onChange={(e) => setRevenue(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cost ₹</Label>
              <Input value={cost} onChange={(e) => setCost(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Parent target (optional)</Label>
              <Select value={parentTargetId || '__none__'} onValueChange={(v) => setParentTargetId(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {parentOptions.map((p) => (
                    <SelectItem key={p.target_id} value={p.target_id}>
                      {p.level} · {p.scope_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {errorMsg && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs font-mono">{errorMsg}</AlertDescription>
            </Alert>
          )}
          <div>
            <Button onClick={onSave} className="gap-2">
              <Save className="h-4 w-4" />
              Save Target
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Cascade ({fy} · {horizon})</CardTitle>
          <CardDescription>Corporate → Entity → Division → Department (mirrors the org tree).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Level</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead className="text-right">Revenue ₹</TableHead>
                <TableHead className="text-right">Cost ₹</TableHead>
                <TableHead className="text-right">Net ₹</TableHead>
                <TableHead>Parent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    No targets set yet — upsert one above.
                  </TableCell>
                </TableRow>
              ) : rows.map((r: StrategicTarget) => (
                <TableRow key={r.target_id}>
                  <TableCell><Badge variant="outline">{levelLabel(r.level)}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{r.scope_id}</TableCell>
                  <TableCell className="text-right font-mono">{r.revenue_target.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{r.cost_target.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{netTarget(r).toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {r.parent_target_id ?? '—'}
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
            Cascade Breaks
          </CardTitle>
          <CardDescription>Children that do not roll up to the parent (decimal-safe tolerance).</CardDescription>
        </CardHeader>
        <CardContent>
          {breaks.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              No cascade breaks — every parent matches the sum of its children.
            </div>
          ) : (
            <ul className="space-y-2 text-xs">
              {breaks.map((b, i) => (
                <li key={`${b.parent_target_id}-${i}`} className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                  <div>
                    <div className="font-mono">{b.parent_target_id}</div>
                    <div className="text-muted-foreground">
                      {b.reason === 'revenue_mismatch'
                        ? `Revenue parent=${b.parent_revenue} vs Σ children=${b.children_revenue_sum}`
                        : `Cost parent=${b.parent_cost} vs Σ children=${b.children_cost_sum}`}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
