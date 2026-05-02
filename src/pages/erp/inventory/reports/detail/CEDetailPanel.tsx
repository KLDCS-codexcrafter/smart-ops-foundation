/**
 * CEDetailPanel.tsx — Drill detail for a Consumption Entry
 * Sprint T-Phase-1.2.6b · D-226 UTS
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { AuditHistoryButton } from '@/components/uth/AuditHistoryButton';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CONSUMPTION_STATUS_LABELS, CONSUMPTION_STATUS_COLORS,
  CONSUMPTION_MODE_LABELS, CONSUMPTION_MODE_COLORS,
  type ConsumptionEntry,
} from '@/types/consumption';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface Props { ce: ConsumptionEntry; onPrint: () => void; }

export function CEDetailPanel({ ce, onPrint }: Props) {
  const { entityCode } = useCardEntitlement();
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{ce.ce_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{ce.godown_name} · Consumed by {ce.consumed_by_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={CONSUMPTION_MODE_COLORS[ce.mode]}>{CONSUMPTION_MODE_LABELS[ce.mode]}</Badge>
            <Badge className={CONSUMPTION_STATUS_COLORS[ce.status]}>{CONSUMPTION_STATUS_LABELS[ce.status]}</Badge>
            <Button size="sm" variant="outline" onClick={onPrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <AuditHistoryButton
              recordId={ce.id}
              entityType="consumption_entry"
              entityCode={entityCode || ''}
              currentRecord={ce as unknown as Record<string, unknown>}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Consumption Date</div><div className="font-mono">{ce.consumption_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Effective Date</div><div className="font-mono">{ce.effective_date ?? ce.consumption_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Mode</div><div>{CONSUMPTION_MODE_LABELS[ce.mode]}</div></div>
          <div><div className="text-xs text-muted-foreground">Department</div><div>{ce.department_code ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Total Qty</div><div className="font-mono">{ce.total_qty}</div></div>
          <div><div className="text-xs text-muted-foreground">Total Value</div><div className="font-mono">{fmtINR(ce.total_value)}</div></div>
          <div><div className="text-xs text-muted-foreground">Variance ₹</div><div className="font-mono">{fmtINR(ce.total_variance_value)}</div></div>
          <div><div className="text-xs text-muted-foreground">Output Qty</div><div className="font-mono">{ce.output_qty}</div></div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Line Items</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead><TableHead>UOM</TableHead>
                <TableHead className="text-right">Standard</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">Rate ₹</TableHead>
                <TableHead className="text-right">Value ₹</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ce.lines.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
                  <TableCell className="text-xs">{l.uom}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.standard_qty}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.actual_qty}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.variance_qty}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.rate}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmtINR(l.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {ce.narration && (
          <div>
            <div className="text-xs text-muted-foreground">Narration</div>
            <div className="text-sm">{ce.narration}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
