/**
 * CycleCountDetailPanel.tsx — Drill detail for a Cycle Count
 * Sprint T-Phase-1.2.6b · D-226 UTS · variance summary
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { AuditHistoryButton } from '@/components/uth/AuditHistoryButton';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  COUNT_STATUS_COLORS, COUNT_KIND_LABELS, VARIANCE_REASON_LABELS,
  type CycleCount,
} from '@/types/cycle-count';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface Props { count: CycleCount; onPrint: () => void; }

export function CycleCountDetailPanel({ count, onPrint }: Props) {
  const { entityCode } = useCardEntitlement();
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{count.count_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {COUNT_KIND_LABELS[count.count_kind]} · {count.godown_name ?? 'All Godowns'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={COUNT_STATUS_COLORS[count.status]}>{count.status}</Badge>
            <Button size="sm" variant="outline" onClick={onPrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <AuditHistoryButton
              recordId={count.id}
              entityType="cycle_count"
              entityCode={entityCode || ''}
              currentRecord={count as unknown as Record<string, unknown>}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Count Date</div><div className="font-mono">{count.count_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Effective Date</div><div className="font-mono">{count.effective_date ?? count.count_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Counter</div><div>{count.counter_name ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Approver</div><div>{count.approver_name ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Total Lines</div><div className="font-mono">{count.total_lines}</div></div>
          <div><div className="text-xs text-muted-foreground">Variance Lines</div><div className="font-mono">{count.variance_lines}</div></div>
          <div><div className="text-xs text-muted-foreground">|Variance Qty|</div><div className="font-mono">{count.total_variance_qty_abs}</div></div>
          <div><div className="text-xs text-muted-foreground">Net Shrink %</div><div className="font-mono">{count.net_shrinkage_pct.toFixed(2)}%</div></div>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <span className="font-semibold">Variance Summary:</span> {count.variance_lines} of {count.total_lines} lines · Net ₹{fmtINR(count.total_variance_value)} · Shrinkage {count.net_shrinkage_pct.toFixed(2)}%
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Line Items</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead><TableHead>Bin</TableHead>
                <TableHead className="text-right">System</TableHead>
                <TableHead className="text-right">Physical</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">Variance ₹</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {count.lines.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
                  <TableCell className="text-xs">{l.bin_code ?? '—'}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.system_qty}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.physical_qty}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.variance_qty}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmtINR(l.variance_value)}</TableCell>
                  <TableCell className="text-xs">{l.variance_reason ? VARIANCE_REASON_LABELS[l.variance_reason] : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
