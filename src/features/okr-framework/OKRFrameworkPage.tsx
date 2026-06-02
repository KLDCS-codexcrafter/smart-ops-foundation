/**
 * @file        src/features/okr-framework/OKRFrameworkPage.tsx
 * @page        First-Class Standalone Page #45 · Pillar D.0 · OKR/KPI Framework + Org-Cost
 * @sprint      T-Phase-7.D.0.3 · Sprint 118 · Arc D.0
 * @card        Renders under the existing 'fpa-planning' card (requiredCards on the sidebar item).
 * @reads-from  okr-kpi-engine (upsertObjective · listObjectives · upsertKeyResult ·
 *              listKeyResults · allocateOrgCost · listOrgCostAllocations · isValidScope ·
 *              defaultSharesFromOwnership). FR-44: org-structure / org-planning / group-structure
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
  Target, Save, AlertTriangle, Info, TrendingUp, Layers, PieChart,
} from 'lucide-react';
import {
  upsertObjective,
  listObjectives,
  upsertKeyResult,
  listKeyResults,
  allocateOrgCost,
  listOrgCostAllocations,
  defaultSharesFromOwnership,
  OKR_LEVELS,
  OKR_CORPORATE_SCOPE_ID,
  type OKRLevel,
  type Objective,
  type KeyResult,
  type OrgCostAllocation,
  type OrgCostShare,
} from '@/lib/okr-kpi-engine';

function levelLabel(l: OKRLevel): string {
  if (l === 'corporate') return 'Corporate';
  if (l === 'division') return 'Division';
  return 'Department';
}

export default function OKRFrameworkPage() {
  const [fy, setFy] = useState('FY26-27');
  // Objective form
  const [level, setLevel] = useState<OKRLevel>('division');
  const [scopeId, setScopeId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [linkedTargetId, setLinkedTargetId] = useState<string>('');
  // KR form
  const [krObjId, setKrObjId] = useState<string>('');
  const [krTitle, setKrTitle] = useState<string>('');
  const [krProgress, setKrProgress] = useState<string>('0');
  // Allocation form
  const [pool, setPool] = useState<string>('Corporate Overhead');
  const [total, setTotal] = useState<string>('1000000');
  const [overhead, setOverhead] = useState<string>('0');
  const [sharesText, setSharesText] = useState<string>('');

  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);
  const [allocations, setAllocations] = useState<OrgCostAllocation[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const refresh = () => {
    setObjectives(listObjectives({ fy }));
    setKeyResults(listKeyResults());
    setAllocations(listOrgCostAllocations({ fy }));
  };

  useEffect(() => {
    refresh();
    // Pre-fill org-cost shares from listGroupStructure ownership (FR-44 reuse)
    const defaults = defaultSharesFromOwnership();
    if (defaults.length > 0 && !sharesText) {
      setSharesText(defaults.map((s) => `${s.entity_id}:${s.share_pct}`).join(', '));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fy]);

  const saveObjective = () => {
    setErrorMsg(null);
    try {
      const effectiveScope = level === 'corporate' ? OKR_CORPORATE_SCOPE_ID : scopeId;
      upsertObjective({
        fy, level, scope_id: effectiveScope, title,
        linked_target_id: linkedTargetId || null,
      });
      setTitle('');
      refresh();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const saveKR = () => {
    setErrorMsg(null);
    try {
      upsertKeyResult({
        objective_id: krObjId,
        title: krTitle,
        progress_pct: Number(krProgress) || 0,
      });
      setKrTitle('');
      refresh();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const parseShares = (text: string): OrgCostShare[] => {
    return text.split(',').map((s) => s.trim()).filter(Boolean).map((token) => {
      const [entity_id, pct] = token.split(':').map((x) => x.trim());
      return { entity_id, share_pct: Number(pct) || 0 };
    });
  };

  const saveAllocation = () => {
    setErrorMsg(null);
    try {
      const shares = parseShares(sharesText);
      allocateOrgCost({
        fy,
        cost_pool: pool,
        total_amount: Number(total) || 0,
        overhead_allocation_pct: Number(overhead) || 0,
        shares,
      });
      refresh();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const krByObjective = useMemo(() => {
    const map = new Map<string, KeyResult[]>();
    for (const k of keyResults) {
      const arr = map.get(k.objective_id) ?? [];
      arr.push(k);
      map.set(k.objective_id, arr);
    }
    return map;
  }, [keyResults]);

  const objectiveOptions = useMemo(() => objectives, [objectives]);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          OKR / KPI Framework &amp; Org-Cost Allocation
        </h1>
        <p className="text-sm text-muted-foreground">
          Pillar D.0 · Objectives cascade corporate → division → department · key-result
          progress clamped 0–100 · objectives can link to a S116 Strategic Target · org-cost
          shares must sum to exactly 100% (decimal-helpers · dEq).
        </p>
      </header>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>FR-44 — reuses the real tree, the AOP, and ownership</AlertTitle>
        <AlertDescription className="text-xs">
          Scopes are validated against org-structure. Strategic-target links are validated
          against the S116 AOP via <span className="font-mono">listStrategicTargets</span>.
          Org-cost share entities are validated against
          <span className="font-mono"> listGroupStructure</span> ownership_pct — none of those
          engines are touched.
        </AlertDescription>
      </Alert>

      {errorMsg && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs font-mono">{errorMsg}</AlertDescription>
        </Alert>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Objective Workbench
          </CardTitle>
          <CardDescription>Create / update an objective at the chosen level.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label htmlFor="okr-fy" className="text-xs">Financial Year</Label>
              <Input id="okr-fy" value={fy} onChange={(e) => setFy(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Level</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as OKRLevel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OKR_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>{levelLabel(l)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="okr-scope" className="text-xs">Scope ID (validated vs org tree)</Label>
              <Input
                id="okr-scope"
                value={level === 'corporate' ? OKR_CORPORATE_SCOPE_ID : scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                disabled={level === 'corporate'}
                className="font-mono"
                placeholder="DIV-0001 / DEPT-0001"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="okr-target" className="text-xs">Linked Strategic Target ID (optional)</Label>
              <Input
                id="okr-target"
                value={linkedTargetId}
                onChange={(e) => setLinkedTargetId(e.target.value)}
                className="font-mono"
                placeholder="FY26-27::annual::..."
              />
            </div>
            <div className="space-y-1 md:col-span-6">
              <Label htmlFor="okr-title" className="text-xs">Objective Title</Label>
              <Input id="okr-title" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Grow ARR 20% YoY" />
            </div>
          </div>
          <Button onClick={saveObjective} className="gap-2">
            <Save className="h-4 w-4" />
            Save Objective
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Key-Result Workbench
          </CardTitle>
          <CardDescription>Add a key-result · progress clamped 0–100%.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="space-y-1 md:col-span-3">
              <Label className="text-xs">Objective</Label>
              <Select value={krObjId} onValueChange={setKrObjId}>
                <SelectTrigger><SelectValue placeholder="Choose objective" /></SelectTrigger>
                <SelectContent>
                  {objectiveOptions.map((o) => (
                    <SelectItem key={o.objective_id} value={o.objective_id}>
                      {o.title} · {o.level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="kr-title" className="text-xs">KR Title</Label>
              <Input id="kr-title" value={krTitle} onChange={(e) => setKrTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="kr-pct" className="text-xs">Progress %</Label>
              <Input id="kr-pct" value={krProgress} onChange={(e) => setKrProgress(e.target.value)}
                className="font-mono" />
            </div>
          </div>
          <Button onClick={saveKR} variant="secondary" className="gap-2" disabled={!krObjId}>
            <Save className="h-4 w-4" />
            Save Key-Result
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Objectives · {fy}</CardTitle>
          <CardDescription>
            <span className="font-mono">{objectives.length}</span> objective(s) ·
            <span className="font-mono ml-1">{keyResults.length}</span> KR(s) across all FYs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Level</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Linked Target</TableHead>
                <TableHead className="text-right">KRs</TableHead>
                <TableHead className="text-right">Avg %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {objectives.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    No objectives yet — create one above.
                  </TableCell>
                </TableRow>
              ) : objectives.map((o) => {
                const krs = krByObjective.get(o.objective_id) ?? [];
                const avg = krs.length > 0
                  ? Math.round(krs.reduce((acc, k) => acc + k.progress_pct, 0) / krs.length)
                  : 0;
                return (
                  <TableRow key={o.objective_id}>
                    <TableCell><Badge variant="outline">{levelLabel(o.level)}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{o.scope_id}</TableCell>
                    <TableCell>{o.title}</TableCell>
                    <TableCell className="font-mono text-xs">{o.linked_target_id ?? '—'}</TableCell>
                    <TableCell className="text-right font-mono">{krs.length}</TableCell>
                    <TableCell className="text-right font-mono">{avg}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Org-Cost Allocation Workbench
          </CardTitle>
          <CardDescription>
            Shares must sum to exactly 100% (decimal-helpers · dEq) · entities validated
            against listGroupStructure · overhead_allocation_pct mirrors the
            internal-pricing pattern.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="oc-pool" className="text-xs">Cost Pool</Label>
              <Input id="oc-pool" value={pool} onChange={(e) => setPool(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="oc-total" className="text-xs">Total ₹</Label>
              <Input id="oc-total" value={total} onChange={(e) => setTotal(e.target.value)}
                className="font-mono" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="oc-oh" className="text-xs">Overhead %</Label>
              <Input id="oc-oh" value={overhead} onChange={(e) => setOverhead(e.target.value)}
                className="font-mono" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="oc-shares" className="text-xs">Shares (entity_id:pct, ...)</Label>
              <Input id="oc-shares" value={sharesText} onChange={(e) => setSharesText(e.target.value)}
                className="font-mono" placeholder="ENT-1:60, ENT-2:40" />
            </div>
          </div>
          <Button onClick={saveAllocation} className="gap-2">
            <Save className="h-4 w-4" />
            Save Allocation
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Allocations · {fy}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cost Pool</TableHead>
                <TableHead className="text-right">Total ₹</TableHead>
                <TableHead className="text-right">Overhead %</TableHead>
                <TableHead>Entity Splits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    No allocations saved yet.
                  </TableCell>
                </TableRow>
              ) : allocations.map((a) => (
                <TableRow key={a.allocation_id}>
                  <TableCell>{a.cost_pool}</TableCell>
                  <TableCell className="text-right font-mono">{a.total_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{a.overhead_allocation_pct}%</TableCell>
                  <TableCell className="font-mono text-xs">
                    {a.allocations.map((al) => `${al.entity_id}:₹${al.amount.toFixed(2)}`).join(' · ')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
