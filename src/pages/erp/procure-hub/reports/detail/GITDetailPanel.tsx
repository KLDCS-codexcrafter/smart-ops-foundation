/**
 * GITDetailPanel.tsx — UPRA-3 Phase A Step 2 · Tier-1 NEW Register #4
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { GitStage1Record } from '@/types/git';

interface Props { git: GitStage1Record; onPrint: () => void }

export function GITDetailPanel({ git, onPrint }: Props) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{git.git_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {git.po_no} · {git.vendor_name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize text-[10px]">{git.status.replace(/_/g, ' ')}</Badge>
            <Button size="sm" variant="outline" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Receipt Date</div><div className="font-mono">{git.receipt_date.slice(0, 10)}</div></div>
          <div><div className="text-xs text-muted-foreground">Vehicle</div><div className="font-mono">{git.vehicle_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Driver</div><div className="font-mono">{git.driver_name ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Invoice</div><div className="font-mono">{git.invoice_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Godown</div><div className="font-mono">{git.godown_id ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">QC Passed</div><div className="font-mono">{git.quality_check_passed ? 'Yes' : 'No'}</div></div>
          <div><div className="text-xs text-muted-foreground">Stage 2 GRN</div><div className="font-mono">{git.stage2_grn_id ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">FY</div><div className="font-mono">{git.fiscal_year_id ?? '—'}</div></div>
        </div>
        {git.lines.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Lines</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Accepted</TableHead>
                  <TableHead className="text-right">Rejected</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {git.lines.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">{l.item_name}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{l.qty_ordered} {l.uom}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{l.qty_received}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{l.qty_accepted}</TableCell>
                    <TableCell className={`text-xs text-right font-mono ${l.qty_rejected > 0 ? 'text-destructive' : ''}`}>{l.qty_rejected}</TableCell>
                    <TableCell className="text-xs">{l.rejection_reason ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {git.quality_notes && (
          <div className="border-t pt-3">
            <div className="text-xs text-muted-foreground">Quality Notes</div>
            <div className="text-sm">{git.quality_notes}</div>
          </div>
        )}
        {git.notes && (
          <div className="border-t pt-3">
            <div className="text-xs text-muted-foreground">Notes</div>
            <div className="text-sm">{git.notes}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
