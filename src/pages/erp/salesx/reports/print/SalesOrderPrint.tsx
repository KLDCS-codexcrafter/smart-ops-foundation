/**
 * SalesOrderPrint.tsx — UPRA-4 Phase B · A4 portrait Sales Order document.
 */
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import type { Order } from '@/types/order';

const inr = (n: number): string =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface SalesOrderPrintProps {
  order: Order;
  onClose?: () => void;
}

export function SalesOrderPrint({ order, onClose }: SalesOrderPrintProps): JSX.Element {
  const { entityCode } = useEntityCode();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Sales Order"
      docNo={order.order_no}
      voucherDate={order.date}
      onClose={onClose}
      signatories={['Sales Officer', 'Sales Manager', 'Authorised Signatory']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><span className="font-semibold">Customer:</span> {order.party_name}</div>
          <div><span className="font-semibold">GSTIN:</span> {order.party_gstin ?? 'Unregistered'}</div>
          <div><span className="font-semibold">Customer PO:</span> {order.ref_no ?? '—'} {order.ref_date && `(${order.ref_date})`}</div>
          <div><span className="font-semibold">Valid Till:</span> {order.valid_till ?? '—'}</div>
          {order.quotation_no && <div><span className="font-semibold">Quotation Ref:</span> {order.quotation_no}</div>}
          {order.project_no && <div><span className="font-semibold">Project:</span> {order.project_no}</div>}
          <div><span className="font-semibold">Place of Supply:</span> {order.place_of_supply ?? '—'}</div>
          <div><span className="font-semibold">FY:</span> {order.fiscal_year_id ?? '—'}</div>
          {order.narration && <div className="col-span-2"><span className="font-semibold">Narration:</span> {order.narration}</div>}
        </div>
      }
      termsAndConditions={order.terms_conditions || 'Sales Order · commitment document only · zero GL/stock/GST impact at this stage (downstream Delivery Note/Tax Invoice will create the postings).'}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sl</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>HSN/SAC</TableHead>
            <TableHead>UoM</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead className="text-right">Disc%</TableHead>
            <TableHead className="text-right">Taxable</TableHead>
            <TableHead className="text-right">GST%</TableHead>
            <TableHead className="text-right">Pending</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.lines.map((line, idx) => (
            <TableRow key={line.id}>
              <TableCell className="font-mono">{idx + 1}</TableCell>
              <TableCell>{line.item_code} · {line.item_name}</TableCell>
              <TableCell className="font-mono text-xs">{line.hsn_sac_code}</TableCell>
              <TableCell>{line.uom}</TableCell>
              <TableCell className="text-right font-mono">{line.qty}</TableCell>
              <TableCell className="text-right font-mono">{inr(line.rate)}</TableCell>
              <TableCell className="text-right font-mono">{line.discount_percent}%</TableCell>
              <TableCell className="text-right font-mono">{inr(line.taxable_value)}</TableCell>
              <TableCell className="text-right font-mono">{line.gst_rate}%</TableCell>
              <TableCell className="text-right font-mono">{line.pending_qty}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-3 flex justify-end gap-6 border-t pt-3 text-sm font-semibold">
        <div>Gross: <span className="font-mono">{inr(order.gross_amount)}</span></div>
        <div>Tax: <span className="font-mono">{inr(order.total_tax)}</span></div>
        <div>Net Amount: <span className="font-mono text-base">{inr(order.net_amount)}</span></div>
      </div>
    </UniversalPrintFrame>
  );
}
