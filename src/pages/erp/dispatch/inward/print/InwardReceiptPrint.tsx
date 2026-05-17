/**
 * InwardReceiptPrint.tsx — UPRA-3 Phase B · A4 portrait gate-receipt document.
 */
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { InwardReceipt } from '@/types/inward-receipt';

export interface InwardReceiptPrintProps {
  receipt: InwardReceipt;
  onClose?: () => void;
}

export function InwardReceiptPrint({ receipt, onClose }: InwardReceiptPrintProps): JSX.Element {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Inward Receipt"
      docNo={receipt.receipt_no}
      voucherDate={receipt.arrival_date}
      onClose={onClose}
      signatories={['Gate Officer', 'Stores', 'QC']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><span className="font-semibold">Vendor:</span> {receipt.vendor_name}</div>
          <div><span className="font-semibold">PO No:</span> {receipt.po_no ?? '—'}</div>
          <div><span className="font-semibold">Vehicle:</span> {receipt.vehicle_no ?? '—'}</div>
          <div><span className="font-semibold">LR No:</span> {receipt.lr_no ?? '—'}</div>
          <div><span className="font-semibold">Arrival:</span> {receipt.arrival_date} {receipt.arrival_time}</div>
          <div><span className="font-semibold">Received By:</span> {receipt.received_by_name}</div>
          <div><span className="font-semibold">Godown:</span> {receipt.godown_name}</div>
          <div><span className="font-semibold">FY:</span> {receipt.fiscal_year_id ?? '—'}</div>
        </div>
      }
      termsAndConditions="Inward Receipt · physical arrival document · routing decisions per QC plan · downstream GRN posting follows release."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>UoM</TableHead>
            <TableHead className="text-right">Expected</TableHead>
            <TableHead className="text-right">Received</TableHead>
            <TableHead>Batch</TableHead>
            <TableHead>Heat</TableHead>
            <TableHead>Routing</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {receipt.lines.map(line => (
            <TableRow key={line.id}>
              <TableCell>{line.item_code} · {line.item_name}</TableCell>
              <TableCell>{line.uom}</TableCell>
              <TableCell className="text-right font-mono">{line.expected_qty}</TableCell>
              <TableCell className="text-right font-mono">{line.received_qty}</TableCell>
              <TableCell className="font-mono text-xs">{line.batch_no ?? '—'}</TableCell>
              <TableCell className="font-mono text-xs">{line.heat_no ?? '—'}</TableCell>
              <TableCell className="text-xs capitalize">{line.routing_decision.replace('_', ' ')}</TableCell>
              <TableCell className="text-xs">{line.routing_reason || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-3 grid grid-cols-4 gap-3 text-xs border-t pt-3">
        <div><span className="font-semibold">Total Lines:</span> {receipt.total_lines}</div>
        <div><span className="font-semibold">Quarantine:</span> {receipt.quarantine_lines}</div>
        <div><span className="font-semibold">Released:</span> {receipt.released_lines}</div>
        <div><span className="font-semibold">Rejected:</span> {receipt.rejected_lines}</div>
      </div>
    </UniversalPrintFrame>
  );
}

export default InwardReceiptPrint;
