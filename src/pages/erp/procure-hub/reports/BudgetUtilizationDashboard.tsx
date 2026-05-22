/**
 * @file        BudgetUtilizationDashboard.tsx
 * @sprint      T-Phase-2.HK-5 · Block B · D-NEW-GL
 * @purpose     Read-only dashboard summarising budget utilization across active allocations
 * @reuses      budget-allocation-engine PUBLIC API · po-management-engine (via reconcile)
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listBudgets,
  computeUtilizationPct,
  computeHeadroom,
  reconcileCommittedFromPos,
  summarizeUtilization,
} from '@/lib/budget-allocation-engine';
import type { BudgetAllocation } from '@/types/budget-allocation';

const inr = (n: number): string => '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);

export function BudgetUtilizationDashboard(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [rows, setRows] = useState<BudgetAllocation[]>([]);

  useEffect(() => { setRows(listBudgets(entityCode).filter((b) => b.is_active)); }, [entityCode]);

  const summary = useMemo(() => summarizeUtilization(entityCode), [entityCode, rows]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Budget Utilization Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          C2 · Live committed + consumed against active allocations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Allocated" value={inr(summary.total_allocated)} />
        <KpiCard label="Committed" value={inr(summary.total_committed)} />
        <KpiCard label="Consumed" value={inr(summary.total_consumed)} />
        <KpiCard label="Overall Utilization" value={`${summary.overall_utilization_pct}%`} />
      </div>

      <div className="flex gap-3">
        <Badge variant={summary.breach_count > 0 ? 'destructive' : 'outline'}>
          <AlertCircle className="h-3 w-3 mr-1" />
          {summary.breach_count} breach
        </Badge>
        <Badge variant={summary.warning_count > 0 ? 'secondary' : 'outline'}>
          {summary.warning_count} warning
        </Badge>
        <Badge variant="outline">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {summary.budget_count} active
        </Badge>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Per-Budget Breakdown</CardTitle></CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No active budget allocations.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>FY</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Allocated</TableHead>
                  <TableHead className="text-right">Headroom</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead className="text-right">PO-Reconciled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b) => {
                  const util = computeUtilizationPct(b);
                  const reconciled = reconcileCommittedFromPos(entityCode, b);
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">{b.fiscal_year}</TableCell>
                      <TableCell className="text-xs uppercase">{b.scope}</TableCell>
                      <TableCell>{b.scope_ref_label}</TableCell>
                      <TableCell className="text-right font-mono">{inr(b.allocated_amount)}</TableCell>
                      <TableCell className="text-right font-mono">{inr(computeHeadroom(b))}</TableCell>
                      <TableCell className="w-40">
                        <div className="flex items-center gap-2">
                          <Progress value={Math.min(util, 100)} className="h-2" />
                          <span className="text-xs font-mono w-12 text-right">{util}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {inr(reconciled)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <Card className="glass-card">
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold font-mono mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
