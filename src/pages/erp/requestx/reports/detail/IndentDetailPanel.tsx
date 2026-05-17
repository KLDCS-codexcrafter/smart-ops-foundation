/**
 * IndentDetailPanel.tsx — UPRA-4 Phase C · NEW union DetailPanel
 * Renders full indent record · 3-kind discriminated union · kind-specific sections.
 * PF-Q4=(A) single union DetailPanel · matches PD-Q2=(A) consolidation.
 * Self-contained STATUS maps adapter · type files 0-diff.
 */
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer, AlertTriangle, History, Building2 } from 'lucide-react';
import { STATUS_LABEL, STATUS_COLOR } from '@/types/requisition-common';
import type { IndentStatus } from '@/types/material-indent';
import { inrFmt } from '@/lib/requestx-report-engine';
import type { IndentUnionRow } from '../IndentRegister';

const statusBadgeClass = (status: IndentStatus): string => {
  const tone = STATUS_COLOR[status];
  if (tone === 'muted') return 'bg-muted text-muted-foreground';
  if (tone === 'primary') return 'bg-primary/10 text-primary';
  if (tone === 'warning') return 'bg-warning/10 text-warning';
  if (tone === 'success') return 'bg-success/10 text-success';
  if (tone === 'destructive') return 'bg-destructive/10 text-destructive';
  return 'bg-muted text-muted-foreground';
};

const dash = (v: string | number | null | undefined): string =>
  v === null || v === undefined || v === '' ? '—' : String(v);

function Field({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

export interface IndentDetailPanelProps {
  row: IndentUnionRow;
  onPrint: () => void;
}

export function IndentDetailPanel({ row, onPrint }: IndentDetailPanelProps): JSX.Element {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg font-mono">{row.voucher_no}</CardTitle>
              <div className="text-xs text-muted-foreground">
                {row.originating_department_name} · {row.requested_by_name}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">{row.kind}</Badge>
              <Badge variant="outline" className={statusBadgeClass(row.status)}>
                {STATUS_LABEL[row.status]}
              </Badge>
              <Button size="sm" variant="outline" onClick={onPrint}>
                <Printer className="h-3.5 w-3.5 mr-1" /> Print
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Basic Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Date" value={row.date} />
          <Field label="Priority" value={row.priority} />
          <Field label="Approval Tier" value={String(row.approval_tier)} />
          <Field label="Pending Approver" value={dash(row.pending_approver_user_id)} mono />
          <Field label="Cost Center" value={row.cost_center_id} mono />
          <Field label="Branch" value={row.branch_id} mono />
          <Field label="Division" value={row.division_id} mono />
          <Field label="HOD" value={row.hod_user_id} mono />
          <Field label="FY" value={dash(row.fiscal_year_id)} />
        </CardContent>
      </Card>

      {row.kind === 'material' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Material Lines · {row.category} · {row.sub_type}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>UoM</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">In Stock</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Target Godown</TableHead>
                  <TableHead>Stock Check</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {row.lines.map(line => (
                  <TableRow key={line.id}>
                    <TableCell>{line.item_name}</TableCell>
                    <TableCell>{line.uom}</TableCell>
                    <TableCell className="text-right font-mono">{line.qty}</TableCell>
                    <TableCell className="text-right font-mono">{line.current_stock_qty}</TableCell>
                    <TableCell className="text-right font-mono">{inrFmt(line.estimated_rate)}</TableCell>
                    <TableCell className="text-right font-mono">{inrFmt(line.estimated_value)}</TableCell>
                    <TableCell className="text-xs">{line.target_godown_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{line.stock_check_status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {row.kind === 'service' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Service Details · {row.category} · {row.sub_type}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <Field label="Service Track" value={row.service_track} />
              <Field label="Vendor" value={dash(row.vendor_id)} mono />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>UoM</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">SLA (days)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {row.lines.map(line => (
                  <TableRow key={line.id}>
                    <TableCell>{line.service_name}</TableCell>
                    <TableCell className="text-xs">{line.description}</TableCell>
                    <TableCell className="text-right font-mono">{line.qty}</TableCell>
                    <TableCell>{line.uom}</TableCell>
                    <TableCell className="text-right font-mono">{inrFmt(line.estimated_rate)}</TableCell>
                    <TableCell className="text-right font-mono">{inrFmt(line.estimated_value)}</TableCell>
                    <TableCell className="text-right font-mono">{line.sla_days}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {row.kind === 'capital' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Capital Details · {row.capital_sub_type}
              {row.finance_gate_required && (
                <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning ml-2">Finance Gate</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>UoM</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>CWIP Account</TableHead>
                  <TableHead className="text-right">Useful Life (yr)</TableHead>
                  <TableHead>Depreciation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {row.lines.map(line => (
                  <TableRow key={line.id}>
                    <TableCell>{line.item_name}</TableCell>
                    <TableCell>{line.uom}</TableCell>
                    <TableCell className="text-right font-mono">{line.qty}</TableCell>
                    <TableCell className="text-right font-mono">{inrFmt(line.estimated_rate)}</TableCell>
                    <TableCell className="text-right font-mono">{inrFmt(line.estimated_value)}</TableCell>
                    <TableCell className="text-xs">{line.cwip_account_id}</TableCell>
                    <TableCell className="text-right font-mono">{line.expected_useful_life_years}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{dash(line.depreciation_method)}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Totals</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Total Estimated Value" value={inrFmt(row.total_estimated_value)} mono />
          <Field label="Lines" value={String(row.lines.length)} mono />
        </CardContent>
      </Card>

      {row.approval_history.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-primary" /> Approval History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {row.approval_history.map(ev => (
              <div key={ev.id} className="border-l-2 border-primary pl-3 text-xs">
                <div className="font-semibold">{ev.action} · {ev.approver_role}</div>
                {ev.remarks && <div className="text-muted-foreground">{ev.remarks}</div>}
                <div className="text-muted-foreground font-mono">{ev.acted_at}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {row.status === 'cancelled' && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Cancelled
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            This indent was cancelled. See Approval History for cancellation event details.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
