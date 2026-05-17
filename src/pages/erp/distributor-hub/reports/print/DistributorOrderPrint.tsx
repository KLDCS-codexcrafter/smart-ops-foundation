/**
 * DistributorOrderPrint.tsx — UPRA-3 Phase A Step 2 · Tier-1 NEW Register #1 · A4
 */
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { DistributorOrder } from '@/types/distributor-order';
import { formatINR } from '@/lib/india-validations';

interface Props { order: DistributorOrder; onClose?: () => void }

export function DistributorOrderPrint({ order, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Distributor Order"
      docNo={order.order_no}
      voucherDate={order.submitted_at.slice(0, 10)}
      onClose={onClose}
      signatories={['Sales', 'Accounts', 'Authorised']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Partner:</span> {order.partner_code} · {order.partner_name}</div>
          <div><span className="font-semibold">Status:</span> {order.status}</div>
          <div><span className="font-semibold">Expected:</span> {order.expected_delivery_date ?? '—'}</div>
          <div><span className="font-semibold">FY:</span> {order.fiscal_year_id ?? '—'}</div>
          <div className="col-span-2"><span className="font-semibold">Deliver to:</span> {order.delivery_address}</div>
        </div>
      }
      termsAndConditions="Subject to credit limit & inventory availability · prices locked at order submission · all amounts in INR."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead className="text-right">Taxable</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.lines.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-xs">No lines</TableCell></TableRow>
          )}
          {order.lines.map(l => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty} {l.uom}</TableCell>
              <TableCell className="text-right text-xs font-mono">{formatINR(l.rate_paise)}</TableCell>
              <TableCell className="text-right text-xs font-mono">{formatINR(l.taxable_paise)}</TableCell>
              <TableCell className="text-right text-xs font-mono">{formatINR(l.total_paise)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={3} className="text-right text-xs font-semibold">Totals</TableCell>
            <TableCell className="text-right text-xs font-mono">{formatINR(order.total_taxable_paise)}</TableCell>
            <TableCell className="text-right text-xs font-mono">{formatINR(order.grand_total_paise)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </UniversalPrintFrame>
  );
}
