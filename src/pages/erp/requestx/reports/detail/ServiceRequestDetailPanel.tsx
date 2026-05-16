/**
 * ServiceRequestDetailPanel.tsx — UPRA-2 Phase A · T1-2
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ServiceRequest } from '@/types/service-request';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

interface Props { request: ServiceRequest; onPrint: () => void }

export function ServiceRequestDetailPanel({ request, onPrint }: Props) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{request.voucher_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {request.requested_by_name} · {request.originating_department_name} · {request.date}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{request.service_track}</Badge>
            <Button size="sm" variant="outline" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Category</div><div>{request.category}</div></div>
          <div><div className="text-xs text-muted-foreground">Sub-Type</div><div>{request.sub_type}</div></div>
          <div><div className="text-xs text-muted-foreground">Priority</div><div>{request.priority}</div></div>
          <div><div className="text-xs text-muted-foreground">Status</div><div>{request.status}</div></div>
          <div><div className="text-xs text-muted-foreground">Approval Tier</div><div className="font-mono">T{request.approval_tier}</div></div>
          <div><div className="text-xs text-muted-foreground">FY</div><div className="font-mono">{request.fiscal_year_id ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Vendor</div><div className="font-mono">{request.vendor_id ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Total Estimated</div><div className="font-mono font-semibold">{fmtINR(request.total_estimated_value)}</div></div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Line Items</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Required</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {request.lines.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.line_no}</TableCell>
                  <TableCell className="text-xs">{l.service_name}</TableCell>
                  <TableCell className="text-xs">{l.description}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.qty} {l.uom}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmtINR(l.estimated_rate)}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmtINR(l.estimated_value)}</TableCell>
                  <TableCell className="text-xs font-mono">{l.required_date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
