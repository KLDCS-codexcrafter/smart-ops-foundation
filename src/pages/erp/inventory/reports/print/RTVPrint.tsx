/**
 * RTVPrint.tsx — Tally-Prime style Return-to-Vendor print
 * Sprint T-Phase-1.2.6b · D-226 UTS dim #8
 */

import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { RTV } from '@/types/rtv';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

interface Props { rtv: RTV; onClose?: () => void; }

export function RTVPrint({ rtv, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Return to Vendor"
      docNo={rtv.rtv_no}
      voucherDate={rtv.rtv_date}
      effectiveDate={rtv.effective_date}
      onClose={onClose}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Vendor:</span> {rtv.vendor_name}</div>
          <div><span className="font-semibold">GSTIN:</span> {rtv.vendor_gst ?? '—'}</div>
          <div><span className="font-semibold">Vehicle:</span> {rtv.vehicle_no ?? '—'}</div>
          <div><span className="font-semibold">LR No:</span> {rtv.lr_no ?? '—'}</div>
          <div><span className="font-semibold">Transport:</span> {rtv.transport_mode ?? '—'}</div>
          <div><span className="font-semibold">Expected CN:</span> {rtv.expected_credit_note_no ?? '—'}</div>
        </div>
      }
      termsAndConditions="Goods returned against QC failure. Credit note expected within 30 days from receipt."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Item · Heat / Batch</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Rate ₹</TableHead>
            <TableHead className="text-right">Amount ₹</TableHead>
            <TableHead>Source GRN</TableHead>
            <TableHead>QC Failure</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rtv.lines.map((l, i) => (
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
              <TableCell className="text-right text-xs font-mono">{l.rejected_qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.unit_rate}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.line_total)}</TableCell>
              <TableCell className="text-xs">{l.source_grn_no ?? '—'}</TableCell>
              <TableCell className="text-xs">{l.qc_failure_reason}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={5} className="text-right font-semibold">Total</TableCell>
            <TableCell className="text-right font-mono font-semibold">{fmtINR(rtv.total_value)}</TableCell>
            <TableCell colSpan={2} />
          </TableRow>
        </TableBody>
      </Table>
      {rtv.narration && (
        <div className="mt-4 text-sm"><span className="font-semibold">Narration:</span> {rtv.narration}</div>
      )}
    </UniversalPrintFrame>
  );
}
