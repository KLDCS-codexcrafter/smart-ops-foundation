/**
 * MaterialIssueNotePrint.tsx — UPRA-4 Phase A · A4 portrait Material Issue Note document.
 * Production-floor material issuance record · against released Production Order.
 */
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import type { MaterialIssueNote } from '@/types/material-issue-note';

const inr = (n: number): string =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface MaterialIssueNotePrintProps {
  issue: MaterialIssueNote;
  onClose?: () => void;
}

export function MaterialIssueNotePrint({ issue, onClose }: MaterialIssueNotePrintProps): JSX.Element {
  const { entityCode } = useEntityCode();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Material Issue Note"
      docNo={issue.doc_no}
      voucherDate={issue.issue_date}
      onClose={onClose}
      signatories={['Storekeeper', 'Shop Floor Supervisor', 'Production Manager']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><span className="font-semibold">Production Order:</span> {issue.production_order_no}</div>
          <div><span className="font-semibold">Department:</span> {issue.department_name}</div>
          <div><span className="font-semibold">Issued By:</span> {issue.issued_by_name}</div>
          <div><span className="font-semibold">FY:</span> {issue.fiscal_year_id ?? '—'}</div>
          <div><span className="font-semibold">QC Required:</span> {issue.qc_required ? 'Yes' : 'No'}</div>
          <div><span className="font-semibold">QC Scenario:</span> {issue.qc_scenario ?? '—'}</div>
          {issue.notes && <div className="col-span-2"><span className="font-semibold">Notes:</span> {issue.notes}</div>}
        </div>
      }
      termsAndConditions="Material Issue Note · production-floor material movement document · issues RM/components from source godown to WIP godown against released Production Order · D-128 zero-touch (no GL · no voucher posting)."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sl</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>UoM</TableHead>
            <TableHead className="text-right">Required</TableHead>
            <TableHead className="text-right">Issued</TableHead>
            <TableHead>Source Godown</TableHead>
            <TableHead>Destination (WIP)</TableHead>
            <TableHead>Batch</TableHead>
            <TableHead>Heat</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead className="text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issue.lines.map(line => (
            <TableRow key={line.id}>
              <TableCell className="font-mono">{line.line_no}</TableCell>
              <TableCell>{line.item_code} · {line.item_name}</TableCell>
              <TableCell>{line.uom}</TableCell>
              <TableCell className="text-right font-mono">{line.required_qty}</TableCell>
              <TableCell className="text-right font-mono">{line.issued_qty}</TableCell>
              <TableCell className="text-xs">{line.source_godown_name}</TableCell>
              <TableCell className="text-xs">{line.destination_godown_name}</TableCell>
              <TableCell className="font-mono text-xs">{line.batch_no ?? '—'}</TableCell>
              <TableCell className="font-mono text-xs">{line.heat_no ?? '—'}</TableCell>
              <TableCell className="text-right font-mono">{inr(line.unit_rate)}</TableCell>
              <TableCell className="text-right font-mono">{inr(line.line_value)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-3 flex justify-end border-t pt-3">
        <div className="text-sm font-semibold">
          Total Qty: <span className="font-mono">{issue.total_qty}</span>
          <span className="mx-3">·</span>
          Total Value: <span className="font-mono">{inr(issue.total_value)}</span>
        </div>
      </div>
    </UniversalPrintFrame>
  );
}
