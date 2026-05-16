/**
 * ProductionConfirmationDetailPanel.tsx — UPRA-2 Phase A · T1-3
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ProductionConfirmation } from '@/types/production-confirmation';

interface Props { confirmation: ProductionConfirmation; onPrint: () => void }

export function ProductionConfirmationDetailPanel({ confirmation, onPrint }: Props) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{confirmation.doc_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {confirmation.production_order_no} · {confirmation.department_name} · {confirmation.confirmation_date}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] capitalize">{confirmation.status}</Badge>
            <Button size="sm" variant="outline" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Confirmed By</div><div>{confirmation.confirmed_by_name}</div></div>
          <div><div className="text-xs text-muted-foreground">Department</div><div>{confirmation.department_name}</div></div>
          <div><div className="text-xs text-muted-foreground">FY</div><div className="font-mono">{confirmation.fiscal_year_id ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Marks PO Complete</div><div>{confirmation.marks_po_complete ? 'Yes' : 'No'}</div></div>
          <div><div className="text-xs text-muted-foreground">Total Planned</div><div className="font-mono">{confirmation.total_planned_qty}</div></div>
          <div><div className="text-xs text-muted-foreground">Total Actual</div><div className="font-mono">{confirmation.total_actual_qty}</div></div>
          <div><div className="text-xs text-muted-foreground">Yield %</div><div className="font-mono">{confirmation.overall_yield_pct.toFixed(2)}%</div></div>
          <div><div className="text-xs text-muted-foreground">Lines</div><div className="font-mono">{confirmation.lines.length}</div></div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Confirmation Lines</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Output Item</TableHead>
                <TableHead>Godown</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead className="text-right">Planned</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Yield %</TableHead>
                <TableHead className="text-right">Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {confirmation.lines.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.line_no}</TableCell>
                  <TableCell className="text-xs">{l.output_item_code} · {l.output_item_name}</TableCell>
                  <TableCell className="text-xs">{l.destination_godown_name}</TableCell>
                  <TableCell className="text-xs font-mono">{l.batch_no ?? '—'}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.planned_qty} {l.uom}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.actual_qty} {l.uom}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.yield_pct.toFixed(1)}%</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.qty_variance}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {confirmation.notes && (
          <div className="border-t pt-3">
            <div className="text-xs text-muted-foreground">Notes</div>
            <div className="text-sm">{confirmation.notes}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
