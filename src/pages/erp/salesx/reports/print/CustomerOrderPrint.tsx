/**
 * CustomerOrderPrint.tsx — UPRA-1 Phase A · T1-1 · A4 print
 */
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { CustomerOrder } from '@/types/customer-order';

const fmtINR = (paise: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(paise / 100)}`;

interface Props { order: CustomerOrder; onClose?: () => void }

export function CustomerOrderPrint({ order, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Customer Order"
      docNo={order.order_no}
      voucherDate={order.placed_at ?? order.created_at.slice(0, 10)}
      onClose={onClose}
      signatories={['Customer', 'Sales', 'Authorised Signatory']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Customer:</span> {order.customer_name}</div>
          <div><span className="font-semibold">Status:</span> {order.status}</div>
          <div><span className="font-semibold">FY:</span> {order.fiscal_year_id ?? '—'}</div>
          <div><span className="font-semibold">Delivered:</span> {order.delivered_at ?? '—'}</div>
        </div>
      }
      termsAndConditions="Goods once sold will not be taken back without prior approval. Subject to local jurisdiction."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit ₹</TableHead>
            <TableHead className="text-right">Amount ₹</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.lines.map((l, i) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{i + 1}</TableCell>
              <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
              <TableCell className="text-xs">{l.uom}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.unit_price_paise)}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.line_total_paise)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={5} className="text-right font-semibold">Net Payable</TableCell>
            <TableCell className="text-right font-mono font-semibold">{fmtINR(order.net_payable_paise)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </UniversalPrintFrame>
  );
}
