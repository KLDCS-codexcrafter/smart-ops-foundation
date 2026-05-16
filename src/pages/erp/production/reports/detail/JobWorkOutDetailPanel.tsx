/**
 * JobWorkOutDetailPanel.tsx — UPRA-2 Phase A · T2-3
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { JobWorkOutOrder } from '@/types/job-work-out-order';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

interface Props { jwo: JobWorkOutOrder; onPrint: () => void }

export function JobWorkOutDetailPanel({ jwo, onPrint }: Props) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{jwo.doc_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {jwo.vendor_name} · {jwo.jwo_date} → expected {jwo.expected_return_date}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] capitalize">{jwo.status.replace('_', ' ')}</Badge>
            <Button size="sm" variant="outline" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Vendor</div><div>{jwo.vendor_name}</div></div>
          <div><div className="text-xs text-muted-foreground">GSTIN</div><div className="font-mono">{jwo.vendor_gstin ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Department</div><div>{jwo.department_name}</div></div>
          <div><div className="text-xs text-muted-foreground">Raised By</div><div>{jwo.raised_by_name}</div></div>
          <div><div className="text-xs text-muted-foreground">Process</div><div>{jwo.nature_of_processing ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Duration (days)</div><div className="font-mono">{jwo.duration_of_process_days ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">FY</div><div className="font-mono">{jwo.fiscal_year_id ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">JW Value</div><div className="font-mono font-semibold">{fmtINR(jwo.total_jw_value)}</div></div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Line Items</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Output</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Rate ₹</TableHead>
                <TableHead className="text-right">Value ₹</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jwo.lines.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.line_no}</TableCell>
                  <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
                  <TableCell className="text-xs">{l.expected_output_item_code} · {l.expected_output_item_name}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.sent_qty} {l.uom}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.received_qty} {l.uom}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmtINR(l.job_work_rate)}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmtINR(l.job_work_value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {(jwo.dispatched_through || jwo.carrier_name || jwo.motor_vehicle_no) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm border-t pt-3">
            <div><div className="text-xs text-muted-foreground">Dispatched Through</div><div>{jwo.dispatched_through ?? '—'}</div></div>
            <div><div className="text-xs text-muted-foreground">Carrier</div><div>{jwo.carrier_name ?? '—'}</div></div>
            <div><div className="text-xs text-muted-foreground">Vehicle</div><div className="font-mono">{jwo.motor_vehicle_no ?? '—'}</div></div>
            <div><div className="text-xs text-muted-foreground">BoL</div><div className="font-mono">{jwo.bill_of_lading_no ?? '—'}</div></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
