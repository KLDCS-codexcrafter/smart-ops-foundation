/**
 * @file        src/features/budgeting/BudgetingPage.tsx
 * @page        First-Class Standalone Page #47 · Pillar D.1 · FP&A Budgeting
 * @sprint      T-Phase-7.D.1.1 · Sprint 120 · 🎬 Arc D.1 OPENER
 * @card        Renders under the existing 'fpa-planning' card (requiredCards on the sidebar item).
 * @reads-from  fpa-budgeting-engine (upsertBudget · listBudgets · getBudget ·
 *              getBudgetVsActual · getBudgetVsAOP · isValidBudgetScope · BUDGET_TYPES ·
 *              BUDGET_SCOPE_LEVELS). FR-44: org-planning / group-consolidation are read
 *              INDIRECTLY via the engine, not by this page.
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
  Wallet, Save, AlertTriangle, Info, TrendingUp, RefreshCcw, Target,
} from 'lucide-react';
import {
  upsertBudget,
  listBudgets,
  getBudgetVsActual,
  getBudgetVsAOP,
  isValidBudgetScope,
  BUDGET_TYPES,
  BUDGET_SCOPE_LEVELS,
  type BudgetType,
  type BudgetScopeLevel,
  type FPABudget,
  type FPABudgetLine,
  type BudgetVsAOPResult,
} from '@/lib/fpa-budgeting-engine';

function levelLabel(l: BudgetScopeLevel): string {
  if (l === 'entity') return 'Entity';
  if (l === 'division') return 'Division';
  return 'Department';
}

function typeLabel(t: BudgetType): string {
  if (t === 'operating') return 'Operating';
  if (t === 'capital') return 'Capital';
  return 'Cash';
}

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

export default function BudgetingPage() {
  const [fy, setFy] = useState('FY26-27');
  const [budgetType, setBudgetType] = useState<BudgetType>('operating');
  const [scopeLevel, setScopeLevel] = useState<BudgetScopeLevel>('division');
  const [scopeId, setScopeId] = useState<string>('');
  // Line-item entry — one ledger_group_code + budgeted amount per row, comma-separated.
  // Format: "LG-CODE:amount, LG-CODE:amount" (e.g. "I-OR:5000000, E-OE:1200000").
  const [linesText, setLinesText] = useState<string>('');

  const [budgets, setBudgets] = useState<FPABudget[]>([]);
  const [vsAop, setVsAop] = useState<BudgetVsAOPResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const refresh = () => {
    setBudgets(listBudgets({ fy }));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fy]);

  const parseLines = (text: string): FPABudgetLine[] => {
    return text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((token) => {
        const [code, amt] = token.split(':').map((x) => x.trim());
        return {
          ledger_group_code: code,
          budgeted: Number.isFinite(Number(amt)) ? Number(amt) : 0,
        } as FPABudgetLine;
      })
      .filter((l) => !!l.ledger_group_code);
  };

  const handleUpsert = () => {
    setErrorMsg(null);
    try {
      const lines = parseLines(linesText);
      if (lines.length === 0) {
        setErrorMsg('Add at least one ledger line in the form "I-OR:5000000, E-OE:1200000".');
        return;
      }
      upsertBudget({
        fy,
        budget_type: budgetType,
        scope_level: scopeLevel,
        scope_id: scopeId,
        lines,
      });
      refresh();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleVsActual = () => {
    setErrorMsg(null);
    try {
      getBudgetVsActual({
        fy,
        budget_type: budgetType,
        scope_level: scopeLevel,
        scope_id: scopeId,
      });
      refresh();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleVsAOP = () => {
    setErrorMsg(null);
    try {
      const r = getBudgetVsAOP({
        fy,
        scope_level: scopeLevel,
        scope_id: scopeId,
        basis: 'cost',
      });
      setVsAop(r);
      refresh();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const scopeOk = useMemo(
    () => (scopeId ? isValidBudgetScope(scopeLevel, scopeId) : false),
    [scopeLevel, scopeId],
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Wallet className="h-8 w-8 text-primary" />
              FP&amp;A Budgeting
            </h1>
            <p className="text-muted-foreground mt-1">
              Operating · Capital · Cash budgets at the org-node level. Budget-vs-actual via
              consolidated P&amp;L · Budget-vs-AOP via S116 StrategicTarget.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">Pillar D.1</Badge>
            <Badge variant="outline" className="font-mono">Sprint 120</Badge>
          </div>
        </div>

        {errorMsg && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Validation</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {/* Upsert form */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" /> Upsert Budget
            </CardTitle>
            <CardDescription>
              Idempotent by composite key {`{fy, budget_type, scope_level, scope_id}`}. Scope must
              exist in the real org tree (org-structure / group-structure).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Fiscal Year</Label>
              <Input value={fy} onChange={(e) => setFy(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Budget Type</Label>
              <Select value={budgetType} onValueChange={(v) => setBudgetType(v as BudgetType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUDGET_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{typeLabel(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scope Level</Label>
              <Select
                value={scopeLevel}
                onValueChange={(v) => setScopeLevel(v as BudgetScopeLevel)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUDGET_SCOPE_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>{levelLabel(l)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scope ID</Label>
              <Input
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                placeholder="DIV-0001 / DEPT-0001 / entity_id"
                className="font-mono"
              />
              {scopeId && !scopeOk && (
                <p className="text-xs text-destructive">Scope not found in org tree.</p>
              )}
            </div>
            <div className="space-y-2 md:col-span-5">
              <Label>Lines (LG-CODE:amount, comma-separated)</Label>
              <Input
                value={linesText}
                onChange={(e) => setLinesText(e.target.value)}
                placeholder="I-OR:5000000, E-COG:2000000, E-OE:1200000"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Ledger group codes mirror consolidated P&amp;L (I-OR, E-COG, E-OE, E-FC, E-DEP, I-OI).
              </p>
            </div>
            <div className="md:col-span-5 flex flex-wrap gap-2">
              <Button onClick={handleUpsert} disabled={!scopeOk}>
                <Save className="h-4 w-4 mr-1" /> Save Budget
              </Button>
              <Button variant="outline" onClick={handleVsActual} disabled={!scopeOk}>
                <RefreshCcw className="h-4 w-4 mr-1" /> Refresh vs Actual
              </Button>
              <Button variant="outline" onClick={handleVsAOP} disabled={!scopeOk}>
                <Target className="h-4 w-4 mr-1" /> Compare vs AOP
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AOP comparison readout */}
        {vsAop && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" /> Budget vs AOP — {vsAop.scope_level} · {vsAop.scope_id}
              </CardTitle>
              <CardDescription>
                Basis: {vsAop.basis} target from org-planning StrategicTarget (S116).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Budgeted</p>
                <p className="text-2xl font-mono">{formatINR(vsAop.budgeted)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">AOP Target</p>
                <p className="text-2xl font-mono">{formatINR(vsAop.aop_target)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Variance</p>
                <p
                  className={`text-2xl font-mono ${vsAop.variance >= 0 ? 'text-success' : 'text-destructive'}`}
                >
                  {formatINR(vsAop.variance)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">AOP Link</p>
                <Badge variant={vsAop.aop_missing ? 'destructive' : 'outline'}>
                  {vsAop.aop_missing ? 'Missing' : 'Linked'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Budgets table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Budgets — {fy}
            </CardTitle>
            <CardDescription>
              {budgets.length} budget record(s). Actuals are sourced from group-consolidation
              buildConsolidatedPnL.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {budgets.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <Wallet className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No budgets for {fy} yet. Use the form above to add one.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead className="text-right">Budgeted</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">AOP Target</TableHead>
                    <TableHead className="text-right">vs AOP</TableHead>
                    <TableHead>Lines</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgets.map((b) => (
                    <TableRow key={b.budget_id}>
                      <TableCell>
                        <Badge variant="outline">{typeLabel(b.budget_type)}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {levelLabel(b.scope_level)} · {b.scope_id}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatINR(b.total_budgeted)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatINR(b.total_actual)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono ${b.total_variance >= 0 ? 'text-success' : 'text-destructive'}`}
                      >
                        {formatINR(b.total_variance)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {b.aop_target === undefined ? '—' : formatINR(b.aop_target)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono ${
                          (b.vs_aop_variance ?? 0) >= 0 ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {b.vs_aop_variance === undefined ? '—' : formatINR(b.vs_aop_variance)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{b.lines.length}</TableCell>
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
