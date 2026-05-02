/**
 * DeliveryMemoPrint.tsx — Customer-copy DM print using UniversalPrintFrame.
 * Sprint T-Phase-1.2.6d · Q2-a sibling discipline (PackingSlipPrint untouched).
 */

import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { type DeliveryMemo } from '@/types/delivery-memo';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

interface Props { dm: DeliveryMemo; onClose?: () => void }

export function DeliveryMemoPrint({ dm, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Delivery Memo (Customer Copy)"
      docNo={dm.memo_no}
      voucherDate={dm.memo_date}
      effectiveDate={dm.effective_date}
      onClose={onClose}
      signatories={['Issued By', 'Driver Signature', 'Customer Acknowledgement']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Customer:</span> {dm.customer_name ?? '—'}</div>
          <div><span className="font-semibold">SRM No:</span> {dm.supply_request_memo_no ?? '—'}</div>
          <div><span className="font-semibold">Transporter:</span> {dm.transporter_name ?? '—'}</div>
          <div><span className="font-semibold">Vehicle No:</span> {dm.vehicle_no ?? '—'}</div>
          <div><span className="font-semibold">LR No:</span> {dm.lr_no ?? '—'}</div>
          <div><span className="font-semibold">LR Date:</span> {dm.lr_date ?? '—'}</div>
          <div><span className="font-semibold">Expected Delivery:</span> {dm.expected_delivery_date ?? '—'}</div>
          <div className="col-span-2"><span className="font-semibold">Delivery Address:</span> {dm.delivery_address ?? '—'}</div>
        </div>
      }
      termsAndConditions="Goods sent in good condition · subject to verification at destination."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Amount ₹</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dm.items.map((l, i) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{i + 1}</TableCell>
              <TableCell className="text-xs">{l.item_name}</TableCell>
              <TableCell className="text-xs">{l.uom ?? '—'}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.amount)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={4} className="text-right font-semibold">Grand Total</TableCell>
            <TableCell className="text-right font-mono font-semibold">{fmtINR(dm.total_amount)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </UniversalPrintFrame>
  );
}
