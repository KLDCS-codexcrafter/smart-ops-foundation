/**
 * MaterialIssueNoteDetailPanel.tsx — UPRA-4 Phase A · read-only display detail panel.
 * Mirrors UPRA-3 Phase B/C DetailPanel patterns · STATUS labels inlined · `inr` inlined.
 * Conditional cards: QC Hookpoints (qc_required) · Approval History · Status History.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { MaterialIssueNote, MaterialIssueStatus } from '@/types/material-issue-note';

const STATUS_LABELS: Record<MaterialIssueStatus, string> = {
  draft: 'Draft',
  issued: 'Issued',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<MaterialIssueStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  issued: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
};

const inr = (n: number): string =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

export interface MaterialIssueNoteDetailPanelProps {
  issue: MaterialIssueNote;
  onPrint: () => void;
}

export function MaterialIssueNoteDetailPanel({ issue, onPrint }: MaterialIssueNoteDetailPanelProps): JSX.Element {
  const totalIssuedQty = issue.lines.reduce((a, l) => a + l.issued_qty, 0);
  const totalLineValue = issue.lines.reduce((a, l) => a + l.line_value, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-mono">{issue.doc_no}</CardTitle>
              <div className="text-sm mt-1">{issue.production_order_no}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {issue.department_name} → {issue.issued_by_name}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={STATUS_COLORS[issue.status]}>{STATUS_LABELS[issue.status]}</Badge>
              <Button variant="outline" size="sm" onClick={onPrint}>
                <Printer className="h-3 w-3 mr-1" /> Print
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Basic</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Issue Date" value={dash(issue.issue_date)} />
          <Field label="Production Order Id" value={dash(issue.production_order_id)} />
          <Field label="Fiscal Year" value={dash(issue.fiscal_year_id)} />
          <Field label="Department Id" value={dash(issue.department_id)} />
          <Field label="Issued By User Id" value={dash(issue.issued_by_user_id)} />
          <div className="col-span-2 md:col-span-3 text-xs">
            <div className="text-muted-foreground">Notes</div>
            <div className="mt-0.5 whitespace-pre-wrap">{dash(issue.notes)}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Totals</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Total Qty" value={issue.total_qty} />
          <Field label="Total Value" value={inr(issue.total_value)} />
          <Field label="Lines" value={issue.lines.length} />
        </CardContent>
      </Card>

      {issue.qc_required && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">QC Hookpoints</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="QC Scenario" value={dash(issue.qc_scenario)} />
            <Field label="Linked Test Reports" value={issue.linked_test_report_ids.length} />
            <Field label="Routed to Quarantine" value={issue.routed_to_quarantine ? 'Yes' : 'No'} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Lines</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sl</TableHead>
                <TableHead>Item Code</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>UoM</TableHead>
                <TableHead className="text-right">Required</TableHead>
                <TableHead className="text-right">Issued</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Heat</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issue.lines.map(line => (
                <TableRow key={line.id}>
                  <TableCell className="font-mono text-xs">{line.line_no}</TableCell>
                  <TableCell className="font-mono text-xs">{line.item_code}</TableCell>
                  <TableCell className="text-xs">{line.item_name}</TableCell>
                  <TableCell className="text-xs">{line.uom}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{line.required_qty}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{line.issued_qty}</TableCell>
                  <TableCell className="text-xs">{line.source_godown_name}</TableCell>
                  <TableCell className="text-xs">{line.destination_godown_name}</TableCell>
                  <TableCell className="font-mono text-xs">{dash(line.batch_no)}</TableCell>
                  <TableCell className="font-mono text-xs">{dash(line.heat_no)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{inr(line.unit_rate)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{inr(line.line_value)}</TableCell>
                  <TableCell className="text-xs">{line.remarks || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-3 flex justify-end border-t pt-3 gap-6">
            <div className="text-sm font-semibold">
              Total Issued Qty: <span className="font-mono">{totalIssuedQty}</span>
            </div>
            <div className="text-sm font-semibold">
              Total Line Value: <span className="font-mono">{inr(totalLineValue)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {issue.approval_history.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Approval History</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {issue.approval_history.map(ev => (
              <div key={ev.id} className="text-xs border-l-2 border-muted pl-3 py-1">
                <div className="font-mono">
                  {ev.action.toUpperCase()} · {ev.approver_role}
                </div>
                <div className="text-muted-foreground mt-0.5">
                  by {ev.approver_user_id} at {ev.acted_at}
                </div>
                {ev.remarks && <div className="mt-0.5 whitespace-pre-wrap">{ev.remarks}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {issue.status_history.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Status History</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {issue.status_history.map(ev => (
              <div key={ev.id} className="text-xs border-l-2 border-muted pl-3 py-1">
                <div className="font-mono">
                  {ev.from_status ? STATUS_LABELS[ev.from_status] : '—'} → {STATUS_LABELS[ev.to_status]}
                </div>
                <div className="text-muted-foreground mt-0.5">
                  by {ev.changed_by_name} at {ev.changed_at}
                </div>
                {ev.note && <div className="mt-0.5 whitespace-pre-wrap">{ev.note}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
