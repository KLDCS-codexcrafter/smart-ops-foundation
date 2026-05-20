/**
 * @file        src/pages/erp/eximx/import/LandedCostReplayView.tsx
 * @purpose     Cross-MLGIT replay timeline · as-of-timestamp picker · Moat #1 FULL CONSUMER
 * @sprint      T-Phase-1.EX-5-CommercialInvoice-6PartAllocation-CIFWaterfall
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, AlertCircle } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { replayAllLandedCosts } from '@/lib/landed-cost-replay-engine';

export function LandedCostReplayView(): JSX.Element {
  const { entityCode } = useEntityCode();
  const nowIso = new Date().toISOString().slice(0, 16);
  const [asOf, setAsOf] = useState<string>(nowIso);

  const snapshots = useMemo(() => {
    if (!entityCode) return [];
    try {
      return replayAllLandedCosts(entityCode, new Date(asOf).toISOString());
    } catch {
      return [];
    }
  }, [entityCode, asOf]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6" /> Replayable Landed Cost
        </h1>
        <p className="text-sm text-muted-foreground">
          Moat #1 FULL CONSUMER · point-in-time snapshot across all MLGITs · consumes MLGIT events + CI allocations
        </p>
      </div>

      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-3 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-primary mt-0.5" />
          <span>
            <strong>How replay works:</strong> Pick any timestamp · the engine reads only ReconciliationEvents at or before that time,
            joins linked CI allocations, and respects <code>inventory-item.default_costing_method</code> (Q15 READ-ONLY).
            Tamper-evident audit baseline for PCA + Customs Officer queries.
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
            <span>Replay Timeline · {snapshots.length} MLGITs</span>
            <div className="flex items-center gap-2">
              <label htmlFor="asof" className="text-xs text-muted-foreground">As of:</label>
              <Input id="asof" type="datetime-local" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-56 font-mono text-xs" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MLGIT</TableHead>
                <TableHead>Linked CI</TableHead>
                <TableHead className="text-right">Booked (₹)</TableHead>
                <TableHead className="text-right">Custom Revalued (₹)</TableHead>
                <TableHead className="text-right">Actual Landed (₹)</TableHead>
                <TableHead className="text-center">Events</TableHead>
                <TableHead className="text-center">CI Lines</TableHead>
                <TableHead>Costing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((s) => (
                <TableRow key={s.mlgit_id}>
                  <TableCell className="font-mono text-xs">{s.mlgit_no}</TableCell>
                  <TableCell className="font-mono text-xs">{s.ci_no ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs text-right">₹{s.booked_total_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                  <TableCell className="font-mono text-xs text-right">{s.custom_revalued_total_inr > 0 ? `₹${s.custom_revalued_total_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}</TableCell>
                  <TableCell className="font-mono text-xs text-right">{s.actual_landed_total_inr > 0 ? `₹${s.actual_landed_total_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}</TableCell>
                  <TableCell className="text-center"><Badge variant="outline">{s.events_replayed}</Badge></TableCell>
                  <TableCell className="text-center"><Badge variant="outline">{s.ci_allocations_replayed}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{s.applicable_costing_method_summary}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
