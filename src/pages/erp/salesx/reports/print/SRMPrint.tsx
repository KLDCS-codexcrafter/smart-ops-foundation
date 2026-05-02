/**
 * SRMPrint.tsx — Supply Request Memo print
 * Sprint T-Phase-1.2.6c · D-226 UTS dim #8
 */

import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { SupplyRequestMemo } from '@/types/supply-request-memo';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

interface Props { srm: SupplyRequestMemo; onClose?: () => void }

export function SRMPrint({ srm, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Supply Request Memo"
      docNo={srm.memo_no}
      voucherDate={srm.memo_date}
      effectiveDate={srm.effective_date}
      onClose={onClose}
      signatories={['Requested By', 'Approved By', 'Dispatched By']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Customer:</span> {srm.customer_name ?? '—'}</div>
          <div><span className="font-semibold">SO No:</span> {srm.sales_order_no ?? '—'}</div>
          <div><span className="font-semibold">Raised By:</span> {srm.raised_by_person_name ?? '—'}</div>
          <div><span className="font-semibold">Expected Dispatch:</span> {srm.expected_dispatch_date ?? '—'}</div>
          <div className="col-span-2"><span className="font-semibold">Delivery Address:</span> {srm.delivery_address ?? '—'}</div>
        </div>
      }
      termsAndConditions={srm.special_instructions ?? 'Goods to be dispatched against this authorisation. Verify quantity at point of pick.'}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Rate ₹</TableHead>
            <TableHead className="text-right">Amount ₹</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {srm.items.map((l, i) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{i + 1}</TableCell>
              <TableCell className="text-xs">{l.item_name}{l.description ? ` · ${l.description}` : ''}</TableCell>
              <TableCell className="text-xs">{l.uom ?? '—'}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.rate)}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.amount)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={5} className="text-right font-semibold">Total</TableCell>
            <TableCell className="text-right font-mono font-semibold">{fmtINR(srm.total_amount)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </UniversalPrintFrame>
  );
}
