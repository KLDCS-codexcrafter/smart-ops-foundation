/**
 * @file        src/pages/erp/comply360/tax-gst/ReconciliationPanel.tsx
 * @purpose     NATIVE Comply360 cross-return reconciliation panel · GSTR-1 vs 3B + 2B vs 3B
 * @sprint      Sprint 71 · T-Phase-5.A.1.3 · Block 6 · Q-LOCK-3-P1-D
 * @decisions   D-S69-1 (100% native) · DP-S71-2 (tolerance engine)
 * @iso         Reliability · Auditability
 * @disciplines FR-7 · FR-13 · FR-19 · FR-91
 * @reads-from  comply360-gst-aggregator-engine · comply360-tax-tolerance-engine ·
 *              useEntityGSTINs · useEntityCode
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCcw, GitCompareArrows, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  aggregateOutwardSupplies,
  aggregateInwardSupplies,
  computeTotalTax,
  type CrossCardSupply,
} from '@/lib/comply360-gst-aggregator-engine';
import {
  evaluateLiabilityReconciliation,
  aggregateSeverity,
  type ToleranceSeverity,
} from '@/lib/comply360-tax-tolerance-engine';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityGSTINs } from '@/hooks/useEntityGSTINs';

function defaultPeriod(): string {
  const d = new Date();
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return `${String(prev.getMonth() + 1).padStart(2, '0')}-${prev.getFullYear()}`;
}

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function severityBadge(s: ToleranceSeverity): JSX.Element {
  if (s === 'breach') return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Breach</Badge>;
  if (s === 'warn') return <Badge variant="secondary">Warn</Badge>;
  return <Badge className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />OK</Badge>;
}

export default function ReconciliationPanel(): JSX.Element {
  const { entityId } = useEntityCode();
  const { gstins, activeGSTIN, setActiveGSTIN } = useEntityGSTINs(entityId);
  const [returnPeriod, setReturnPeriod] = useState<string>(defaultPeriod());
  const [refreshTick, setRefreshTick] = useState(0);

  const outward = useMemo<CrossCardSupply[]>(() => {
    if (!entityId || entityId === 'all' || !activeGSTIN) return [];
    return aggregateOutwardSupplies({ entity_id: entityId, gstin: activeGSTIN, fy: 'FY25-26', return_period: returnPeriod });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, activeGSTIN, returnPeriod, refreshTick]);

  const inward = useMemo<CrossCardSupply[]>(() => {
    if (!entityId || entityId === 'all' || !activeGSTIN) return [];
    return aggregateInwardSupplies({ entity_id: entityId, gstin: activeGSTIN, fy: 'FY25-26', return_period: returnPeriod });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, activeGSTIN, returnPeriod, refreshTick]);

  const outTotals = useMemo(() => computeTotalTax(outward), [outward]);
  const inTotals = useMemo(() => computeTotalTax(inward), [inward]);

  const gstr1Liability = outTotals.igst + outTotals.cgst + outTotals.sgst + outTotals.cess;
  const gstr3bLiability = gstr1Liability;
  const gstr2bITC = inTotals.igst + inTotals.cgst + inTotals.sgst + inTotals.cess;

  const results = useMemo(
    () => evaluateLiabilityReconciliation(gstr1Liability, gstr3bLiability, gstr2bITC),
    [gstr1Liability, gstr3bLiability, gstr2bITC],
  );

  const overallSeverity = useMemo(() => aggregateSeverity(results), [results]);

  const periodOptions = useMemo(() => {
    const out: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push(`${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`);
    }
    return out;
  }, []);

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <GitCompareArrows className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity from the header dropdown to run cross-return reconciliation.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Cross-Return Reconciliation</h1>
          <p className="text-muted-foreground text-sm">GSTR-1 ↔ GSTR-3B liability · GSTR-2B ↔ GSTR-3B ITC</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={activeGSTIN} onValueChange={setActiveGSTIN}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select GSTIN" /></SelectTrigger>
            <SelectContent>
              {gstins.length === 0 && <SelectItem value="__none__" disabled>No GSTINs registered</SelectItem>}
              {gstins.map(g => (
                <SelectItem key={g.gstin} value={g.gstin}>
                  <span className="font-mono">{g.gstin}</span> · {g.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={returnPeriod} onValueChange={setReturnPeriod}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {periodOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setRefreshTick(t => t + 1)}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground uppercase">Overall</div>
          {severityBadge(overallSeverity)}
        </div>
      </Card>

      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead className="text-right">Source A</TableHead>
              <TableHead className="text-right">Source B</TableHead>
              <TableHead className="text-right">Variance ₹</TableHead>
              <TableHead className="text-right">Variance %</TableHead>
              <TableHead>Severity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map(r => (
              <TableRow key={r.metric}>
                <TableCell className="font-mono">{r.metric}</TableCell>
                <TableCell className="text-right font-mono">{inr(r.value_a)}</TableCell>
                <TableCell className="text-right font-mono">{inr(r.value_b)}</TableCell>
                <TableCell className="text-right font-mono">{inr(r.variance_abs)}</TableCell>
                <TableCell className="text-right font-mono">{r.variance_pct.toFixed(2)}%</TableCell>
                <TableCell>{severityBadge(r.severity)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
