/**
 * QuotationPrint.tsx — Quotation print using UniversalPrintFrame
 * Sprint T-Phase-1.2.6c · D-226 UTS dim #8 · NEW (parallel to ProformaInvoicePrint)
 */

import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { Quotation } from '@/types/quotation';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

interface Props { quotation: Quotation; onClose?: () => void }

export function QuotationPrint({ quotation: q, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Quotation"
      docNo={q.quotation_no}
      voucherDate={q.quotation_date}
      effectiveDate={q.effective_date}
      onClose={onClose}
      signatories={['Prepared By', 'Approved By', 'Customer Acceptance']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Customer:</span> {q.customer_name ?? '—'}</div>
          <div><span className="font-semibold">Stage:</span> {q.quotation_stage}</div>
          <div><span className="font-semibold">Enquiry:</span> {q.enquiry_no ?? '—'}</div>
          <div><span className="font-semibold">Valid Until:</span> {q.valid_until_date ?? '—'}</div>
          {q.revision_number > 0 && (
            <div><span className="font-semibold">Revision:</span> {q.revision_number}</div>
          )}
        </div>
      }
      termsAndConditions={q.terms_conditions ?? 'Quotation valid until the date specified above. Prices include applicable taxes.'}
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
          {q.items.map((l, i) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{i + 1}</TableCell>
              <TableCell className="text-xs">{l.item_name}{l.description ? ` · ${l.description}` : ''}</TableCell>
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
            <TableCell className="text-right font-mono">{fmtINR(q.sub_total)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={7} className="text-right font-semibold">Tax</TableCell>
            <TableCell className="text-right font-mono">{fmtINR(q.tax_amount)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={7} className="text-right font-semibold">Grand Total</TableCell>
            <TableCell className="text-right font-mono font-semibold">{fmtINR(q.total_amount)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {q.notes && (
        <div className="mt-4 text-sm"><span className="font-semibold">Notes:</span> {q.notes}</div>
      )}
    </UniversalPrintFrame>
  );
}
