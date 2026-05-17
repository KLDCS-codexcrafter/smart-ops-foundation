/**
 * StockIssueDetailPanel.tsx — UPRA-3 Phase B · display-only read-only detail panel.
 * Conditional Posting Linkage (status='issued') / Cancellation (status='cancelled') cards.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  STOCK_ISSUE_STATUS_LABELS, STOCK_ISSUE_STATUS_COLORS,
  type StockIssue,
} from '@/types/stock-issue';

export interface StockIssueDetailPanelProps {
  issue: StockIssue;
  onPrint: () => void;
}

const dash = (v: string | number | null | undefined): string =>
  v === null || v === undefined || v === '' ? '—' : String(v);

function Field({ label, value }: { label: string; value: React.ReactNode }): JSX.Element {
  return (
    <div className="text-xs">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-mono mt-0.5">{value}</div>
    </div>
  );
}

export function StockIssueDetailPanel({ issue, onPrint }: StockIssueDetailPanelProps): JSX.Element {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-mono">{issue.issue_no}</CardTitle>
              <div className="text-sm mt-1">{issue.department_name} → {issue.recipient_name}</div>
              <div className="text-xs text-muted-foreground mt-0.5 font-mono">{issue.issue_date}</div>
            </div>
            <Badge className={STOCK_ISSUE_STATUS_COLORS[issue.status]}>
              {STOCK_ISSUE_STATUS_LABELS[issue.status]}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Basic</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Issue Date" value={dash(issue.issue_date)} />
          <Field label="Purpose" value={dash(issue.purpose)} />
          <Field label="Fiscal Year" value={dash(issue.fiscal_year_id)} />
          <Field label="Effective Date" value={dash(issue.effective_date)} />
          <div className="col-span-2 md:col-span-3 text-xs">
            <div className="text-muted-foreground">Narration</div>
            <div className="mt-0.5 whitespace-pre-wrap">{dash(issue.narration)}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Lines</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>UoM</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Godown</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issue.lines.map(line => (
                <TableRow key={line.id}>
                  <TableCell className="font-mono text-xs">{line.item_code}</TableCell>
                  <TableCell className="text-xs">{line.item_name}</TableCell>
                  <TableCell className="text-xs">{line.uom}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{line.qty}</TableCell>
                  <TableCell className="text-right font-mono text-xs">₹{line.rate.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right font-mono text-xs">₹{line.value.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-xs">{line.source_godown_name}</TableCell>
                  <TableCell className="font-mono text-xs">{dash(line.batch_no)}</TableCell>
                  <TableCell className="text-xs">{line.remarks || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-3 flex justify-end border-t pt-3">
            <div className="text-sm font-semibold">
              Total Value: <span className="font-mono">₹{issue.total_value.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {issue.status === 'issued' && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Posting Linkage</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Voucher Id" value={dash(issue.voucher_id)} />
            <Field label="Voucher No" value={dash(issue.voucher_no)} />
            <Field label="Posted At" value={dash(issue.posted_at)} />
          </CardContent>
        </Card>
      )}

      {issue.status === 'cancelled' && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Cancellation</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Cancelled At" value={dash(issue.cancelled_at)} />
            <div className="col-span-2 md:col-span-3 text-xs">
              <div className="text-muted-foreground">Cancel Reason</div>
              <div className="mt-0.5 whitespace-pre-wrap">{dash(issue.cancel_reason)}</div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onPrint}>
          <Printer className="h-3 w-3 mr-1" /> Print
        </Button>
      </div>
    </div>
  );
}

export default StockIssueDetailPanel;
