/**
 * StockReceiptAckPrint.tsx — UPRA-3 Phase A Step 2 · Tier-1 NEW Register #3 · A4
 */
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { StockReceiptAck } from '@/types/stock-receipt-ack';

interface Props { ack: StockReceiptAck; onClose?: () => void }

export function StockReceiptAckPrint({ ack, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Stock Receipt Acknowledgment"
      docNo={ack.ack_no}
      voucherDate={ack.ack_date.slice(0, 10)}
      onClose={onClose}
      signatories={['Store Keeper', 'Supervisor', 'Department Head']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Inward Receipt:</span> {ack.inward_receipt_no}</div>
          <div><span className="font-semibold">Status:</span> {ack.status}</div>
          <div><span className="font-semibold">Vendor:</span> {ack.vendor_name}</div>
          <div><span className="font-semibold">Acknowledged By:</span> {ack.acknowledged_by_name}</div>
          <div><span className="font-semibold">Voucher:</span> {ack.voucher_no ?? '—'}</div>
          <div><span className="font-semibold">FY:</span> {ack.fiscal_year_id ?? '—'}</div>
        </div>
      }
      termsAndConditions="Stores acknowledgment — physical receipt confirmed into Stores godown · variances logged with remarks · posts a Stock Journal voucher."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Inward</TableHead>
            <TableHead className="text-right">Ack</TableHead>
            <TableHead className="text-right">Variance</TableHead>
            <TableHead>Source → Dest</TableHead>
            <TableHead>Remarks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ack.lines.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-xs">No lines</TableCell></TableRow>
          )}
          {ack.lines.map(l => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty_inward} {l.uom}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty_acknowledged} {l.uom}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.variance}</TableCell>
              <TableCell className="text-xs">{l.source_godown_name} → {l.dest_godown_name}</TableCell>
              <TableCell className="text-xs">{l.remarks}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </UniversalPrintFrame>
  );
}
