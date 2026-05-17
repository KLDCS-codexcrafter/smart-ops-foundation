/**
 * BillPassingDetailPanel.tsx — UPRA-3 Phase C · display-only read-only detail panel.
 * GST / TDS / RCM cards conditional render when respective field is present (D-NEW-AI cached).
 * FCPI Linkage card conditional when fcpi_voucher_id present.
 * Rejection Reason card conditional when status === 'rejected'.
 * Helpers (inr/dash/Field) inlined per PC-Q5=(A) corrected · BillPassing fields are rupees.
 */
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BillPassingRecord, BillPassingStatus } from '@/types/bill-passing';

const STATUS_LABELS: Record<BillPassingStatus, string> = {
  pending_match: 'Pending Match',
  matched_clean: 'Matched (Clean)',
  matched_with_variance: 'Matched (Variance)',
  awaiting_qa: 'Awaiting QA',
  qa_failed: 'QA Failed',
  approved_for_fcpi: 'Approved for FCPI',
  fcpi_drafted: 'FCPI Drafted',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<BillPassingStatus, string> = {
  pending_match: 'bg-muted text-muted-foreground',
  matched_clean: 'bg-success/10 text-success',
  matched_with_variance: 'bg-warning/10 text-warning',
  awaiting_qa: 'bg-primary/10 text-primary',
  qa_failed: 'bg-destructive/10 text-destructive',
  approved_for_fcpi: 'bg-emerald-100 text-emerald-700',
  fcpi_drafted: 'bg-blue-100 text-blue-700',
  rejected: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
};

const inr = (n: number): string =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const dash = (v: string | number | null | undefined): string =>
  v === null || v === undefined || v === '' ? '—' : String(v);

function Field({ label, value }: { label: string; value: ReactNode }): JSX.Element {
  return (
    <div className="text-xs">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-mono mt-0.5">{value}</div>
    </div>
  );
}

export interface BillPassingDetailPanelProps {
  bill: BillPassingRecord;
  onPrint: () => void;
}

export function BillPassingDetailPanel({ bill, onPrint }: BillPassingDetailPanelProps): JSX.Element {
  const linesTotal = bill.lines.reduce(
    (acc, l) => ({
      po_value: acc.po_value + l.po_value,
      grn_qty: acc.grn_qty + l.grn_qty,
      invoice_value: acc.invoice_value + l.invoice_value,
      invoice_total: acc.invoice_total + l.invoice_total,
      total_variance: acc.total_variance + l.total_variance,
    }),
    { po_value: 0, grn_qty: 0, invoice_value: 0, invoice_total: 0, total_variance: 0 },
  );

  const yesNo = (v: boolean | null): string => v === null ? '—' : v ? 'Yes' : 'No';

  return (
    <div className="space-y-4">
      {/* 1. Header */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div>
            <div className="text-lg font-mono font-bold">{bill.bill_no}</div>
            <div className="text-sm text-muted-foreground mt-0.5">
              {bill.vendor_name} · Inv {dash(bill.vendor_invoice_no)}
            </div>
            <Badge variant="outline" className={`mt-2 ${STATUS_COLORS[bill.status]}`}>
              {STATUS_LABELS[bill.status]}
            </Badge>
          </div>
          <Button size="sm" variant="outline" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </CardHeader>
      </Card>

      {/* 2. Basic */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Basic</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Bill Date" value={fmtDate(bill.bill_date)} />
          <Field label="PO No" value={dash(bill.po_no)} />
          <Field label="GIT ID" value={dash(bill.git_id)} />
          <Field label="Vendor Invoice Date" value={fmtDate(bill.vendor_invoice_date)} />
          <Field label="Entity ID" value={dash(bill.entity_id)} />
          <Field label="Branch ID" value={dash(bill.branch_id)} />
          <Field label="Fiscal Year" value={dash(bill.fiscal_year_id)} />
          <Field
            label="Match Type"
            value={<Badge variant="outline" className="text-[10px]">{bill.match_type}</Badge>}
          />
          <Field label="Approver" value={dash(bill.approver_user_id)} />
          <Field label="Approved At" value={fmtDate(bill.approved_at)} />
          <div className="col-span-2 md:col-span-3">
            <Field label="Narration" value={dash(bill.narration)} />
          </div>
        </CardContent>
      </Card>

      {/* 3. Match Summary */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Match Summary</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="PO Value" value={inr(bill.total_po_value)} />
          <Field label="GRN Value" value={inr(bill.total_grn_value)} />
          <Field label="Invoice Value" value={inr(bill.total_invoice_value)} />
          <Field
            label="Variance"
            value={
              <span className={bill.total_variance > 0 ? 'text-warning' : bill.total_variance < 0 ? 'text-destructive' : ''}>
                {inr(bill.total_variance)}
              </span>
            }
          />
          <Field label="Variance %" value={`${bill.variance_pct.toFixed(2)}%`} />
          <Field label="Tolerance %" value={`${bill.tolerance_pct.toFixed(2)}%`} />
          <Field label="Tolerance Amount" value={inr(bill.tolerance_amount)} />
        </CardContent>
      </Card>

      {/* 4. GST Snapshot — conditional */}
      {bill.gst_breakdown && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">GST Snapshot</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Basic" value={inr(bill.gst_breakdown.basic)} />
            <Field label="CGST" value={inr(bill.gst_breakdown.cgst)} />
            <Field label="SGST" value={inr(bill.gst_breakdown.sgst)} />
            <Field label="IGST" value={inr(bill.gst_breakdown.igst)} />
            <Field label="Total Tax" value={inr(bill.gst_breakdown.tax)} />
            <Field label="Gross" value={inr(bill.gst_breakdown.gross)} />
            <Field label="Inter-state" value={bill.gst_breakdown.is_inter_state ? 'Yes' : 'No'} />
            <Field label="Place of Supply" value={dash(bill.gst_breakdown.place_of_supply)} />
            <Field label="Vendor GSTIN" value={dash(bill.vendor_gstin)} />
            <Field label="Entity GSTIN" value={dash(bill.entity_gstin)} />
          </CardContent>
        </Card>
      )}

      {/* 5. TDS Snapshot — conditional */}
      {bill.tds_breakdown && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">TDS Snapshot</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Applicable" value={bill.tds_breakdown.applicable ? 'Yes' : 'No'} />
            <Field label="Section" value={dash(bill.tds_breakdown.section)} />
            <Field label="Rate" value={`${bill.tds_breakdown.rate.toFixed(2)}%`} />
            <Field label="Threshold" value={inr(bill.tds_breakdown.threshold)} />
            <Field label="Amount" value={inr(bill.tds_breakdown.amount)} />
          </CardContent>
        </Card>
      )}

      {/* 6. RCM Snapshot — conditional */}
      {bill.rcm_breakdown && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">RCM Snapshot</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="RCM Applicable" value={bill.rcm_breakdown.is_rcm_applicable ? 'Yes' : 'No'} />
            <Field label="RCM Amount" value={inr(bill.rcm_breakdown.rcm_amount)} />
          </CardContent>
        </Card>
      )}

      {/* 7. Lines */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Lines</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sl</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Match</TableHead>
                <TableHead className="text-right">PO Qty</TableHead>
                <TableHead className="text-right">PO Rate</TableHead>
                <TableHead className="text-right">PO Value</TableHead>
                <TableHead className="text-right">GRN Qty</TableHead>
                <TableHead className="text-right">Inv Qty</TableHead>
                <TableHead className="text-right">Inv Rate</TableHead>
                <TableHead className="text-right">Inv Value</TableHead>
                <TableHead className="text-right">Inv Total</TableHead>
                <TableHead className="text-right">Qty Var</TableHead>
                <TableHead className="text-right">Rate Var</TableHead>
                <TableHead className="text-right">Total Var</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Insp?</TableHead>
                <TableHead>QA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bill.lines.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">{l.line_no}</TableCell>
                  <TableCell className="text-xs">{l.item_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {l.match_status.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{l.po_qty}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{inr(l.po_rate)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{inr(l.po_value)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{l.grn_qty}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{l.invoice_qty}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{inr(l.invoice_rate)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{inr(l.invoice_value)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{inr(l.invoice_total)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{l.qty_variance}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{inr(l.rate_variance)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{inr(l.total_variance)}</TableCell>
                  <TableCell className="text-xs">{l.variance_reason || '—'}</TableCell>
                  <TableCell className="text-xs">{l.requires_inspection ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-xs">{yesNo(l.qa_passed)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={5} className="text-xs">Totals</TableCell>
                <TableCell className="text-right font-mono text-xs">{inr(linesTotal.po_value)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{linesTotal.grn_qty}</TableCell>
                <TableCell colSpan={2}></TableCell>
                <TableCell className="text-right font-mono text-xs">{inr(linesTotal.invoice_value)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{inr(linesTotal.invoice_total)}</TableCell>
                <TableCell colSpan={2}></TableCell>
                <TableCell className="text-right font-mono text-xs">{inr(linesTotal.total_variance)}</TableCell>
                <TableCell colSpan={3}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 8. FCPI Linkage — conditional */}
      {bill.fcpi_voucher_id && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">FCPI Linkage</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="FCPI Voucher ID" value={bill.fcpi_voucher_id} />
            <Field label="FCPI Drafted At" value={fmtDate(bill.fcpi_drafted_at)} />
            <Field label="Authorised Signatory" value="Approver / CFO" />
          </CardContent>
        </Card>
      )}

      {/* 9. Rejection Reason — conditional */}
      {bill.status === 'rejected' && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Rejection Reason</CardTitle></CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {bill.approval_notes || '—'}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
