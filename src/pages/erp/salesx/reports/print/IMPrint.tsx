/**
 * IMPrint.tsx — Invoice Memo print
 * Sprint T-Phase-1.2.6c · D-226 UTS dim #8
 */

import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { InvoiceMemo } from '@/types/invoice-memo';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

interface Props { im: InvoiceMemo; onClose?: () => void }

export function IMPrint({ im, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: im.gstin ?? '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Invoice Memo"
      docNo={im.memo_no}
      voucherDate={im.memo_date}
      effectiveDate={im.effective_date}
      onClose={onClose}
      signatories={['Prepared By', 'Approved By', 'Authorised Signatory']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Customer:</span> {im.customer_name ?? '—'}</div>
          <div><span className="font-semibold">SO No:</span> {im.sales_order_no ?? '—'}</div>
          <div><span className="font-semibold">DM No:</span> {im.delivery_memo_no ?? '—'}</div>
          <div><span className="font-semibold">SRM No:</span> {im.supply_request_memo_no ?? '—'}</div>
          <div><span className="font-semibold">Place of Supply:</span> {im.place_of_supply ?? '—'}</div>
          <div><span className="font-semibold">Invoice Date:</span> {im.invoice_date ?? '—'}</div>
          <div className="col-span-2"><span className="font-semibold">Billing Address:</span> {im.billing_address ?? '—'}</div>
        </div>
      }
      termsAndConditions="This memo authorises Accounts to post the corresponding Sales Invoice. Subject to reconciliation against dispatch records."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Rate ₹</TableHead>
            <TableHead className="text-right">Disc %</TableHead>
            <TableHead className="text-right">Tax %</TableHead>
            <TableHead className="text-right">Amount ₹</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {im.items.map((l, i) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{i + 1}</TableCell>
              <TableCell className="text-xs">{l.item_name}</TableCell>
              <TableCell className="text-xs">{l.uom ?? '—'}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.rate)}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.discount_pct}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.tax_pct}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.amount)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={7} className="text-right font-semibold">Sub-total</TableCell>
            <TableCell className="text-right font-mono">{fmtINR(im.sub_total)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={7} className="text-right font-semibold">Tax</TableCell>
            <TableCell className="text-right font-mono">{fmtINR(im.tax_amount)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={7} className="text-right font-semibold">Grand Total</TableCell>
            <TableCell className="text-right font-mono font-semibold">{fmtINR(im.total_amount)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {im.narration && (
        <div className="mt-4 text-sm"><span className="font-semibold">Narration:</span> {im.narration}</div>
      )}
    </UniversalPrintFrame>
  );
}
