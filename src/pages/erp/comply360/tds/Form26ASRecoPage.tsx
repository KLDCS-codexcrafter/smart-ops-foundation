/**
 * @file        src/pages/erp/comply360/tds/Form26ASRecoPage.tsx
 * @purpose     NATIVE Comply360 Form 26AS (TRACES) reconciliation surface · claimed vs reflected TDS
 * @sprint      Sprint 72 · T-Phase-5.A.1.4 · Block 7 · DP-S72-5
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCcw, GitCompareArrows, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { aggregateTDSDeductions } from '@/lib/comply360-tds-aggregator-engine';
import {
  loadForm26AS,
  reconcile26AS,
  type Form26ASMismatch,
} from '@/lib/comply360-form26as-reco-engine';
import { useEntityCode } from '@/hooks/useEntityCode';

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function mismatchBadge(m: Form26ASMismatch): JSX.Element {
  if (m.side === 'claimed-only') return <Badge variant="destructive">Claimed only</Badge>;
  if (m.side === 'reflected-only') return <Badge variant="secondary">Reflected only</Badge>;
  return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Amount mismatch</Badge>;
}

export default function Form26ASRecoPage(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [refreshTick, setRefreshTick] = useState(0);

  const reco = useMemo(() => {
    if (!entityCode) return null;
    const claimed = aggregateTDSDeductions({ entity_code: entityCode, fy: 'FY25-26' });
    const reflected = loadForm26AS(entityCode, 'FY25-26');
    return reconcile26AS(claimed, reflected, { entityCode, fy: 'FY25-26' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, refreshTick]);

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <GitCompareArrows className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity to reconcile TDS against Form 26AS.</p>
        </Card>
      </div>
    );
  }

  const t = reco?.totals;
  const balanced = (t?.net_variance ?? 0) === 0;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Form 26AS Reconciliation</h1>
          <p className="text-muted-foreground text-sm">Claimed (books) vs Reflected (TRACES) · FY25-26</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setRefreshTick((x) => x + 1)}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Claimed (books)</div>
          <div className="text-xl font-mono font-semibold mt-1">{inr(t?.claimed_total ?? 0)}</div>
          <div className="text-xs text-muted-foreground mt-1">{t?.claimed_count ?? 0} entries</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Reflected (26AS)</div>
          <div className="text-xl font-mono font-semibold mt-1">{inr(t?.reflected_total ?? 0)}</div>
          <div className="text-xs text-muted-foreground mt-1">{t?.reflected_count ?? 0} entries</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Net Variance</div>
          <div className={`text-xl font-mono font-semibold mt-1 ${balanced ? 'text-emerald-500' : 'text-amber-500'}`}>{inr(t?.net_variance ?? 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Status</div>
          <div className="mt-2">
            {balanced
              ? <Badge className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />Reconciled</Badge>
              : <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{t?.mismatched_count ?? 0} mismatches</Badge>}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Mismatches</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Side</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Party / Deductor</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(reco?.mismatched ?? []).length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No mismatches — claimed and reflected agree (or no data yet).</TableCell></TableRow>
            )}
            {(reco?.mismatched ?? []).map((m, i) => (
              <TableRow key={`mismatch-${i}-${m.side}`}>
                <TableCell>{mismatchBadge(m)}</TableCell>
                <TableCell className="font-mono">{m.claimed?.section ?? m.reflected?.section ?? '—'}</TableCell>
                <TableCell>{m.claimed?.party_name ?? m.reflected?.deductor_name ?? '—'}</TableCell>
                <TableCell className="text-right font-mono text-amber-500">{inr(m.variance)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{m.reason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
