/**
 * StockIssuePrint.tsx — UPRA-3 Phase B · A4 portrait stock-issue document.
 */
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import type { StockIssue } from '@/types/stock-issue';

export interface StockIssuePrintProps {
  issue: StockIssue;
  onClose?: () => void;
}

export function StockIssuePrint({ issue, onClose }: StockIssuePrintProps): JSX.Element {
  const { entityCode } = useEntityCode();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Stock Issue"
      docNo={issue.issue_no}
      voucherDate={issue.issue_date}
      onClose={onClose}
      signatories={['Storekeeper', 'Recipient', 'Department Head']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><span className="font-semibold">Department:</span> {issue.department_name}</div>
          <div><span className="font-semibold">Recipient:</span> {issue.recipient_name}</div>
          <div><span className="font-semibold">Purpose:</span> {issue.purpose || '—'}</div>
          <div><span className="font-semibold">Voucher No:</span> {issue.voucher_no ?? '—'}</div>
          <div><span className="font-semibold">Posted At:</span> {issue.posted_at ?? '—'}</div>
          <div><span className="font-semibold">FY:</span> {issue.fiscal_year_id ?? '—'}</div>
          <div className="col-span-2"><span className="font-semibold">Narration:</span> {issue.narration || '—'}</div>
        </div>
      }
      termsAndConditions="Stock Issue · departmental consumption document · posts Stock Journal voucher to recipient cost-centre."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>UoM</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead>Godown</TableHead>
            <TableHead>Batch</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issue.lines.map(line => (
            <TableRow key={line.id}>
              <TableCell>{line.item_code} · {line.item_name}</TableCell>
              <TableCell>{line.uom}</TableCell>
              <TableCell className="text-right font-mono">{line.qty}</TableCell>
              <TableCell className="text-right font-mono">₹{line.rate.toLocaleString('en-IN')}</TableCell>
              <TableCell className="text-right font-mono">₹{line.value.toLocaleString('en-IN')}</TableCell>
              <TableCell className="text-xs">{line.source_godown_name}</TableCell>
              <TableCell className="font-mono text-xs">{line.batch_no ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-3 flex justify-end border-t pt-3">
        <div className="text-sm font-semibold">
          Total Value: <span className="font-mono">₹{issue.total_value.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </UniversalPrintFrame>
  );
}

export default StockIssuePrint;
