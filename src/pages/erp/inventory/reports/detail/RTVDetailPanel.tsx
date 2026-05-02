/**
 * RTVDetailPanel.tsx — Drill detail for a Return-to-Vendor record
 * Sprint T-Phase-1.2.6b · D-226 UTS
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RTV_STATUS_COLORS, type RTV } from '@/types/rtv';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface Props { rtv: RTV; onPrint: () => void; }

export function RTVDetailPanel({ rtv, onPrint }: Props) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{rtv.rtv_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{rtv.vendor_name} {rtv.vendor_gst ? `· ${rtv.vendor_gst}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={RTV_STATUS_COLORS[rtv.status]}>{rtv.status}</Badge>
            <Button size="sm" variant="outline" onClick={onPrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">RTV Date</div><div className="font-mono">{rtv.rtv_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Effective Date</div><div className="font-mono">{rtv.effective_date ?? rtv.rtv_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Transport Mode</div><div>{rtv.transport_mode ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Vehicle</div><div className="font-mono">{rtv.vehicle_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">LR No</div><div className="font-mono">{rtv.lr_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Expected CN</div><div className="font-mono">{rtv.expected_credit_note_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Total Qty</div><div className="font-mono">{rtv.total_qty}</div></div>
          <div><div className="text-xs text-muted-foreground">Total Value</div><div className="font-mono">{fmtINR(rtv.total_value)}</div></div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Line Items</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead><TableHead>UOM</TableHead><TableHead>Godown</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate ₹</TableHead>
                <TableHead className="text-right">Total ₹</TableHead>
                <TableHead>Source GRN</TableHead>
                <TableHead>QC Failure</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rtv.lines.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
                  <TableCell className="text-xs">{l.uom}</TableCell>
                  <TableCell className="text-xs">{l.godown_name}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.rejected_qty}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.unit_rate}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmtINR(l.line_total)}</TableCell>
                  <TableCell className="text-xs">{l.source_grn_no ?? '—'}</TableCell>
                  <TableCell className="text-xs">{l.qc_failure_reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {rtv.narration && (
          <div>
            <div className="text-xs text-muted-foreground">Narration</div>
            <div className="text-sm">{rtv.narration}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
