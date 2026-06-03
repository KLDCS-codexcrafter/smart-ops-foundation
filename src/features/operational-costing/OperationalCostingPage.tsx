/**
 * @file        src/features/operational-costing/OperationalCostingPage.tsx
 * @page        Standalone Page #50 · Operational Costing (under FP&A self-owned shell)
 * @sprint      Sprint 124 · T-Phase-7.D.1.5 · Block 5
 * @reads-from  operational-costing-engine (only)
 * @scope       BOM cost roll-up tree · standard cost editor · standard-vs-actual variance
 */
import { useState, useMemo } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Calculator, TreePine, Activity } from 'lucide-react';
import {
  rollUpBOMCost,
  upsertStandardCost,
  getStandardCost,
  listStandardCosts,
  recordActualCost,
  computeCostVariance,
  upsertBOMInput,
  type BOMCostNode,
  type CostVariance,
} from '@/lib/operational-costing-engine';

function INR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}

function BOMTreeNode({ node, depth = 0 }: { node: BOMCostNode; depth?: number }) {
  return (
    <div className="font-mono text-sm">
      <div
        className="flex items-center justify-between py-1 border-b border-border/50"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        <span>
          {depth > 0 && '└─ '}
          <span className="font-semibold">{node.item_key}</span>
          <span className="text-muted-foreground ml-2">qty={node.qty} · unit={INR(node.unit_cost)}</span>
        </span>
        <span className="text-primary">{INR(node.rolled_cost)}</span>
      </div>
      {node.children.map((c, i) => (
        <BOMTreeNode key={`${c.item_key}-${i}`} node={c} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function OperationalCostingPage() {
  const [itemKey, setItemKey] = useState('FINISHED-A');
  const [fy, setFy] = useState('2026-27');
  const [tree, setTree] = useState<BOMCostNode | null>(null);
  const [variance, setVariance] = useState<CostVariance | null>(null);

  const existing = useMemo(() => getStandardCost(itemKey), [itemKey, variance]);
  const [material, setMaterial] = useState(existing?.standard_material ?? 0);
  const [labour, setLabour] = useState(existing?.standard_labour ?? 0);
  const [overhead, setOverhead] = useState(existing?.standard_overhead ?? 0);
  const [actual, setActual] = useState(0);

  const [allStandards, setAllStandards] = useState(listStandardCosts());

  const seedDemoBOM = () => {
    upsertBOMInput({
      item_key: 'RAW-X',
      qty: 1,
      unit_cost: 50,
      children: [],
    });
    upsertBOMInput({
      item_key: 'RAW-Y',
      qty: 1,
      unit_cost: 30,
      children: [],
    });
    upsertBOMInput({
      item_key: 'FINISHED-A',
      qty: 1,
      unit_cost: 20, // assembly cost
      children: [
        { item_key: 'RAW-X', qty: 2 },
        { item_key: 'RAW-Y', qty: 3 },
      ],
    });
  };

  const handleRollUp = () => {
    setTree(rollUpBOMCost(itemKey));
  };

  const handleSaveStandard = () => {
    upsertStandardCost({
      item_key: itemKey,
      standard_material: Number(material),
      standard_labour: Number(labour),
      standard_overhead: Number(overhead),
      standard_total: 0, // recomputed in engine
    });
    setAllStandards(listStandardCosts());
  };

  const handleComputeVariance = () => {
    if (actual > 0) recordActualCost(itemKey, fy, Number(actual));
    setVariance(computeCostVariance({ item_key: itemKey, fy }));
  };

  return (
    <div className="min-h-full bg-background p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <Calculator className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-semibold">Operational Costing</h1>
            <Badge variant="outline" className="ml-2">S124 · Pt 1</Badge>
            <Badge variant="secondary">Page #50</Badge>
          </div>
          <p className="text-muted-foreground max-w-3xl">
            BOM cost roll-up · standard costing (material / labour / overhead) ·
            standard-vs-actual variance. Distinct from statutory cost-audit (§148) —
            this is INTERNAL product costing (FR-44 wall).
          </p>
        </header>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Item selector
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="item-key">Item Key</Label>
              <Input id="item-key" value={itemKey} onChange={(e) => setItemKey(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="fy">FY</Label>
              <Input id="fy" value={fy} onChange={(e) => setFy(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={seedDemoBOM} variant="outline" size="sm">Seed demo BOM</Button>
              <Button onClick={handleRollUp}>Roll up BOM</Button>
            </div>
          </CardContent>
        </Card>

        {tree && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TreePine className="h-5 w-5 text-primary" /> BOM Cost Roll-up · {tree.item_key}
              </CardTitle>
              <CardDescription>Total rolled cost: <span className="font-mono text-primary">{INR(tree.rolled_cost)}</span></CardDescription>
            </CardHeader>
            <CardContent>
              <BOMTreeNode node={tree} />
            </CardContent>
          </Card>
        )}

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Standard Cost</CardTitle>
            <CardDescription>Material + Labour + Overhead per unit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="material">Material</Label>
                <Input id="material" type="number" value={material} onChange={(e) => setMaterial(Number(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="labour">Labour</Label>
                <Input id="labour" type="number" value={labour} onChange={(e) => setLabour(Number(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="overhead">Overhead</Label>
                <Input id="overhead" type="number" value={overhead} onChange={(e) => setOverhead(Number(e.target.value))} />
              </div>
            </div>
            <Button onClick={handleSaveStandard}>Save Standard</Button>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Standard vs Actual Variance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div>
                <Label htmlFor="actual">Actual Total</Label>
                <Input id="actual" type="number" value={actual} onChange={(e) => setActual(Number(e.target.value))} />
              </div>
              <Button onClick={handleComputeVariance}>Compute Variance</Button>
            </div>
            {variance && (
              <div className="font-mono text-sm border border-border rounded-lg p-4 space-y-1">
                <div>Standard: <span className="text-primary">{INR(variance.standard_total)}</span></div>
                <div>Actual: <span className="text-primary">{INR(variance.actual_total)}</span></div>
                <div>Variance: <span className={variance.direction === 'unfavorable' ? 'text-destructive' : variance.direction === 'favorable' ? 'text-success' : 'text-muted-foreground'}>{INR(variance.variance)} ({variance.variance_pct}% · {variance.direction})</span></div>
              </div>
            )}
          </CardContent>
        </Card>

        {allStandards.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">All Standard Costs</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Material</TableHead>
                    <TableHead className="text-right">Labour</TableHead>
                    <TableHead className="text-right">Overhead</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allStandards.map((s) => (
                    <TableRow key={s.item_key}>
                      <TableCell className="font-mono">{s.item_key}</TableCell>
                      <TableCell className="text-right font-mono">{INR(s.standard_material)}</TableCell>
                      <TableCell className="text-right font-mono">{INR(s.standard_labour)}</TableCell>
                      <TableCell className="text-right font-mono">{INR(s.standard_overhead)}</TableCell>
                      <TableCell className="text-right font-mono text-primary">{INR(s.standard_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
