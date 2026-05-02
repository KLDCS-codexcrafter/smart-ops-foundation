/**
 * SOMPrint.tsx — Sample Outward Memo print
 * Sprint T-Phase-1.2.6c · D-226 UTS dim #8
 */

import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { SOM_PURPOSE_LABELS, type SampleOutwardMemo } from '@/types/sample-outward-memo';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

interface Props { som: SampleOutwardMemo; onClose?: () => void }

export function SOMPrint({ som, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Sample Outward Memo"
      docNo={som.memo_no}
      voucherDate={som.memo_date}
      effectiveDate={som.effective_date}
      onClose={onClose}
      signatories={['Issued By', 'Received By', 'Approved By']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Recipient:</span> {som.recipient_name}</div>
          <div><span className="font-semibold">Company:</span> {som.recipient_company ?? '—'}</div>
          <div><span className="font-semibold">Purpose:</span> {SOM_PURPOSE_LABELS[som.purpose]}</div>
          <div><span className="font-semibold">Refundable:</span> {som.is_refundable ? 'Yes' : 'No'}</div>
          <div><span className="font-semibold">Salesman:</span> {som.salesman_name ?? '—'}</div>
          <div><span className="font-semibold">Return Due:</span> {som.return_due_date ?? '—'}</div>
          {som.outward_godown_name && (
            <div className="col-span-2"><span className="font-semibold">Outward Godown:</span> {som.outward_godown_name}</div>
          )}
        </div>
      }
      termsAndConditions={
        som.is_refundable
          ? 'Sample dispatched as refundable. Recipient to return on or before the due date specified.'
          : 'Sample dispatched as non-refundable (booked as marketing expense). No return expected.'
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit Value ₹</TableHead>
            <TableHead className="text-right">Amount ₹</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {som.items.map((l, i) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{i + 1}</TableCell>
              <TableCell className="text-xs">{l.item_name}{l.description ? ` · ${l.description}` : ''}</TableCell>
              <TableCell className="text-xs">{l.uom ?? '—'}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.unit_value)}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.amount)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={5} className="text-right font-semibold">Total Value</TableCell>
            <TableCell className="text-right font-mono font-semibold">{fmtINR(som.total_value)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {som.purpose_note && (
        <div className="mt-4 text-sm"><span className="font-semibold">Purpose Note:</span> {som.purpose_note}</div>
      )}
    </UniversalPrintFrame>
  );
}
