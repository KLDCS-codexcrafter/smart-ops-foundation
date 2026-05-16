/**
 * DispatchReceiptPrint.tsx — UPRA-1 Phase A · T1-3 · A4 print
 */
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { DispatchReceipt } from '@/types/dispatch-receipt';

interface Props { receipt: DispatchReceipt; onClose?: () => void }

export function DispatchReceiptPrint({ receipt, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Dispatch Receipt"
      docNo={receipt.receipt_no}
      voucherDate={receipt.delivery_date}
      effectiveDate={receipt.effective_date}
      onClose={onClose}
      signatories={['Driver', 'Receiver', 'Authorised Signatory']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Customer:</span> {receipt.customer_name}</div>
          <div><span className="font-semibold">Destination:</span> {receipt.destination}</div>
          <div><span className="font-semibold">DM No:</span> {receipt.dispatch_memo_no ?? '—'}</div>
          <div><span className="font-semibold">Invoice No:</span> {receipt.invoice_no ?? '—'}</div>
          <div><span className="font-semibold">Vehicle:</span> {receipt.vehicle_no ?? '—'}</div>
          <div><span className="font-semibold">LR:</span> {receipt.lr_no ?? '—'}</div>
        </div>
      }
      termsAndConditions="Receiver acknowledges delivery quantities listed below."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Dispatched</TableHead>
            <TableHead className="text-right">Delivered</TableHead>
            <TableHead className="text-right">Damage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {receipt.lines.map((l, i) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{i + 1}</TableCell>
              <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
              <TableCell className="text-xs">{l.uom}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.dispatched_qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.delivered_qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.damage_qty}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {receipt.narration && (
        <div className="mt-4 text-sm"><span className="font-semibold">Narration:</span> {receipt.narration}</div>
      )}
    </UniversalPrintFrame>
  );
}
