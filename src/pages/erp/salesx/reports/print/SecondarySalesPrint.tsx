/**
 * SecondarySalesPrint.tsx — Secondary Sales report print (Q3-a UTS dim #6)
 * Sprint T-Phase-1.2.6c
 */

import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { END_CUSTOMER_LABELS, type SecondarySales } from '@/types/secondary-sales';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

interface Props { sec: SecondarySales; onClose?: () => void }

export function SecondarySalesPrint({ sec, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Secondary Sales Report"
      docNo={sec.secondary_code}
      voucherDate={sec.sale_date}
      effectiveDate={sec.effective_date}
      onClose={onClose}
      signatories={['Reported By', 'Verified By']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Distributor:</span> {sec.distributor_name}</div>
          <div><span className="font-semibold">End Customer:</span> {END_CUSTOMER_LABELS[sec.end_customer_type]}</div>
          <div><span className="font-semibold">End Customer Name:</span> {sec.end_customer_name ?? '—'}</div>
          <div><span className="font-semibold">Capture Mode:</span> {sec.capture_mode}</div>
        </div>
      }
      termsAndConditions="Secondary sales data captures distributor sell-through. No accounting impact — used for forecasting and scheme payouts."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Item Code</TableHead>
            <TableHead>Item Name</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Rate ₹</TableHead>
            <TableHead className="text-right">Amount ₹</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sec.lines.map((l, i) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{i + 1}</TableCell>
              <TableCell className="text-xs font-mono">{l.item_code}</TableCell>
              <TableCell className="text-xs">{l.item_name}</TableCell>
              <TableCell className="text-xs">{l.uom}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.rate)}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.amount)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={6} className="text-right font-semibold">Total</TableCell>
            <TableCell className="text-right font-mono font-semibold">{fmtINR(sec.total_amount)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {sec.notes && (
        <div className="mt-4 text-sm"><span className="font-semibold">Notes:</span> {sec.notes}</div>
      )}
    </UniversalPrintFrame>
  );
}
