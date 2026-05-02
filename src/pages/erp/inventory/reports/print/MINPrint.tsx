/**
 * MINPrint.tsx — Tally-Prime style MIN print using UniversalPrintFrame
 * Sprint T-Phase-1.2.6b · D-226 UTS dim #8
 */

import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { MaterialIssueNote } from '@/types/consumption';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

interface Props { min: MaterialIssueNote; onClose?: () => void; }

export function MINPrint({ min, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Material Issue Note"
      docNo={min.min_no}
      voucherDate={min.issue_date}
      effectiveDate={min.effective_date}
      onClose={onClose}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">From:</span> {min.from_godown_name}</div>
          <div><span className="font-semibold">To:</span> {min.to_godown_name}</div>
          <div><span className="font-semibold">Department:</span> {min.to_department_code ?? '—'}</div>
          <div><span className="font-semibold">Requested By:</span> {min.requested_by_name}</div>
          <div><span className="font-semibold">Issued By:</span> {min.issued_by_name}</div>
        </div>
      }
      termsAndConditions="Material issued against approved requisition. Receiver to verify quantity at point of receipt."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Rate ₹</TableHead>
            <TableHead className="text-right">Value ₹</TableHead>
            <TableHead>Batch</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {min.lines.map((l, i) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{i + 1}</TableCell>
              <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
              <TableCell className="text-xs">{l.uom}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.rate}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.value)}</TableCell>
              <TableCell className="text-xs">{l.batch_no ?? '—'}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={5} className="text-right font-semibold">Total</TableCell>
            <TableCell className="text-right font-mono font-semibold">{fmtINR(min.total_value)}</TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
      {min.narration && (
        <div className="mt-4 text-sm"><span className="font-semibold">Narration:</span> {min.narration}</div>
      )}
    </UniversalPrintFrame>
  );
}
