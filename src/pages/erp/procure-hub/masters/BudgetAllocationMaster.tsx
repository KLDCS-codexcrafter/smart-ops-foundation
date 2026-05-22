/**
 * @file        BudgetAllocationMaster.tsx
 * @sprint      T-Phase-2.HK-5 · Block B · D-NEW-GL
 * @purpose     CRUD master for procurement budget allocations
 * @reuses      budget-allocation-engine PUBLIC API · shadcn/ui
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listBudgets, createBudget, deleteBudget, fiscalYearOf, computeUtilizationPct,
} from '@/lib/budget-allocation-engine';
import type { BudgetAllocation, BudgetScope } from '@/types/budget-allocation';

const inr = (n: number): string => '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);

const SCOPE_OPTS: { value: BudgetScope; label: string }[] = [
  { value: 'entity', label: 'Entity (umbrella)' },
  { value: 'department', label: 'Department' },
  { value: 'cost_center', label: 'Cost Center' },
  { value: 'category', label: 'Category' },
];

export function BudgetAllocationMaster(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [rows, setRows] = useState<BudgetAllocation[]>([]);
  const [tick, setTick] = useState(0);

  const [scope, setScope] = useState<BudgetScope>('entity');
  const [scopeRefId, setScopeRefId] = useState('');
  const [scopeRefLabel, setScopeRefLabel] = useState('Entity');
  const [fy, setFy] = useState(fiscalYearOf());
  const [allocated, setAllocated] = useState<number>(0);
  const [threshold, setThreshold] = useState<number>(80);
  const [notes, setNotes] = useState('');

  useEffect(() => { setRows(listBudgets(entityCode)); }, [entityCode, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const handleCreate = (): void => {
    if (allocated <= 0) {
      toast.error('Allocated amount must be positive');
      return;
    }
    createBudget(entityCode, {
      entity_id: entityId,
      fiscal_year: fy,
      scope,
      scope_ref_id: scope === 'entity' ? null : (scopeRefId.trim() || null),
      scope_ref_label: scope === 'entity' ? 'Entity' : (scopeRefLabel.trim() || scope),
      allocated_amount: allocated,
      warning_threshold_pct: threshold,
      is_active: true,
      notes,
    });
    toast.success('Budget allocation created');
    setAllocated(0); setNotes(''); setScopeRefId(''); setScopeRefLabel('Entity');
    refresh();
  };

  const handleDelete = (id: string): void => {
    deleteBudget(entityCode, id);
    toast.success('Budget deleted');
    refresh();
  };

  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [rows],
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          Budget Allocation Master
        </h1>
        <p className="text-sm text-muted-foreground">
          C2 · Procurement budgets · entity / department / cost-center / category scoped
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">New Allocation</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Scope</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as BudgetScope)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCOPE_OPTS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Scope Ref ID</Label>
            <Input
              value={scopeRefId}
              disabled={scope === 'entity'}
              onChange={(e) => setScopeRefId(e.target.value)}
              placeholder={scope === 'entity' ? 'n/a' : 'dept/cc/category id'}
              className="font-mono"
            />
          </div>
          <div>
            <Label>Scope Label</Label>
            <Input
              value={scopeRefLabel}
              disabled={scope === 'entity'}
              onChange={(e) => setScopeRefLabel(e.target.value)}
              placeholder="Human label"
            />
          </div>
          <div>
            <Label>Fiscal Year</Label>
            <Input value={fy} onChange={(e) => setFy(e.target.value)} className="font-mono" />
          </div>
          <div>
            <Label>Allocated (₹)</Label>
            <Input
              type="number"
              value={allocated || ''}
              onChange={(e) => setAllocated(Number(e.target.value) || 0)}
              className="font-mono"
            />
          </div>
          <div>
            <Label>Warning Threshold %</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(Math.max(1, Math.min(100, Number(e.target.value) || 80)))}
              className="font-mono"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" /> Create Allocation
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Existing Allocations</CardTitle></CardHeader>
        <CardContent className="p-0">
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No budget allocations yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>FY</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Allocated</TableHead>
                  <TableHead className="text-right">Committed</TableHead>
                  <TableHead className="text-right">Consumed</TableHead>
                  <TableHead className="text-right">Utilization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((b) => {
                  const util = computeUtilizationPct(b);
                  const variant: 'default' | 'destructive' | 'secondary' | 'outline' =
                    util > 100 ? 'destructive'
                    : util >= b.warning_threshold_pct ? 'secondary'
                    : 'default';
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">{b.fiscal_year}</TableCell>
                      <TableCell className="text-xs uppercase">{b.scope}</TableCell>
                      <TableCell>{b.scope_ref_label}</TableCell>
                      <TableCell className="text-right font-mono">{inr(b.allocated_amount)}</TableCell>
                      <TableCell className="text-right font-mono">{inr(b.committed_amount)}</TableCell>
                      <TableCell className="text-right font-mono">{inr(b.consumed_amount)}</TableCell>
                      <TableCell className="text-right font-mono">{util}%</TableCell>
                      <TableCell>
                        <Badge variant={variant}>
                          {util > 100 ? 'Breach' : util >= b.warning_threshold_pct ? 'Warning' : 'Within'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(b.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
