/**
 * GRNPrint.tsx — Tally-Prime style GRN print using UniversalPrintFrame
 * Sprint T-Phase-1.2.6b · D-226 UTS dim #8 · prints batch_no + heat_number in line block
 */

import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { GRN } from '@/types/grn';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

interface Props { grn: GRN; onClose?: () => void; }

export function GRNPrint({ grn, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = {
    name: entityCode || 'Operix',
    address: 'Registered Office',
    gstin: '—',
    pan: '—',
  };

  return (
    <UniversalPrintFrame
      company={company}
      title="Goods Receipt Note"
      docNo={grn.grn_no}
      voucherDate={grn.receipt_date}
      effectiveDate={grn.effective_date}
      onClose={onClose}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Vendor:</span> {grn.vendor_name}</div>
          <div><span className="font-semibold">Godown:</span> {grn.godown_name}</div>
          <div><span className="font-semibold">PO Ref:</span> {grn.po_no ?? '—'}</div>
          <div><span className="font-semibold">Vendor Invoice:</span> {grn.vendor_invoice_no ?? '—'}</div>
          <div><span className="font-semibold">Vehicle:</span> {grn.vehicle_no ?? '—'}</div>
          <div><span className="font-semibold">LR No:</span> {grn.lr_no ?? '—'}</div>
        </div>
      }
      termsAndConditions="Goods received subject to QC. Discrepancies must be reported within 48 hours."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Item · Batch · Heat</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Received</TableHead>
            <TableHead className="text-right">Accepted</TableHead>
            <TableHead className="text-right">Rate ₹</TableHead>
            <TableHead className="text-right">Amount ₹</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grn.lines.map((l, i) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{i + 1}</TableCell>
              <TableCell className="text-xs">
                <div>{l.item_code} · {l.item_name}</div>
                <div className="text-muted-foreground">
                  {l.batch_no ? `Batch: ${l.batch_no}` : ''}
                  {l.batch_no && l.heat_no ? ' · ' : ''}
                  {l.heat_no ? `Heat: ${l.heat_no}` : ''}
                </div>
              </TableCell>
              <TableCell className="text-xs">{l.uom}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.received_qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.accepted_qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.unit_rate}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.line_total)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={6} className="text-right font-semibold">Total</TableCell>
            <TableCell className="text-right font-mono font-semibold">{fmtINR(grn.total_value)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {grn.narration && (
        <div className="mt-4 text-sm">
          <span className="font-semibold">Narration:</span> {grn.narration}
        </div>
      )}
    </UniversalPrintFrame>
  );
}
