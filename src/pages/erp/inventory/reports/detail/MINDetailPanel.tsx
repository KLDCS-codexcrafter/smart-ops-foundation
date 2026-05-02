/**
 * MINDetailPanel.tsx — Drill detail for a Material Issue Note
 * Sprint T-Phase-1.2.6b · D-226 UTS
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MIN_STATUS_LABELS, MIN_STATUS_COLORS, type MaterialIssueNote } from '@/types/consumption';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface Props { min: MaterialIssueNote; onPrint: () => void; }

export function MINDetailPanel({ min, onPrint }: Props) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{min.min_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {min.from_godown_name} → {min.to_godown_name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={MIN_STATUS_COLORS[min.status]}>{MIN_STATUS_LABELS[min.status]}</Badge>
            <Button size="sm" variant="outline" onClick={onPrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Issue Date</div><div className="font-mono">{min.issue_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Effective Date</div><div className="font-mono">{min.effective_date ?? min.issue_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Requested By</div><div>{min.requested_by_name}</div></div>
          <div><div className="text-xs text-muted-foreground">Issued By</div><div>{min.issued_by_name}</div></div>
          <div><div className="text-xs text-muted-foreground">Department</div><div>{min.to_department_code ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Total Qty</div><div className="font-mono">{min.total_qty}</div></div>
          <div><div className="text-xs text-muted-foreground">Total Value</div><div className="font-mono">{fmtINR(min.total_value)}</div></div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Line Items</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead><TableHead>UOM</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate ₹</TableHead>
                <TableHead className="text-right">Value ₹</TableHead>
                <TableHead>Batch</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {min.lines.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
                  <TableCell className="text-xs">{l.uom}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.rate}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmtINR(l.value)}</TableCell>
                  <TableCell className="text-xs">{l.batch_no ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {min.narration && (
          <div>
            <div className="text-xs text-muted-foreground">Narration</div>
            <div className="text-sm">{min.narration}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
