/**
 * ProductionConfirmationPrint.tsx — UPRA-2 Phase A · T1-3 · A4 print
 */
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { ProductionConfirmation } from '@/types/production-confirmation';

interface Props { confirmation: ProductionConfirmation; onClose?: () => void }

export function ProductionConfirmationPrint({ confirmation, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Production Confirmation"
      docNo={confirmation.doc_no}
      voucherDate={confirmation.confirmation_date}
      onClose={onClose}
      signatories={['Confirmed by', 'Supervisor', 'Production Manager']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Prod Order:</span> {confirmation.production_order_no}</div>
          <div><span className="font-semibold">Department:</span> {confirmation.department_name}</div>
          <div><span className="font-semibold">Confirmed By:</span> {confirmation.confirmed_by_name}</div>
          <div><span className="font-semibold">Status:</span> {confirmation.status}</div>
          <div><span className="font-semibold">PO Complete:</span> {confirmation.marks_po_complete ? 'Yes' : 'No'}</div>
          <div><span className="font-semibold">FY:</span> {confirmation.fiscal_year_id ?? '—'}</div>
        </div>
      }
      termsAndConditions="Production confirmation closes the production order line. Batch / serial numbers carry to stock ledger."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Output Item</TableHead>
            <TableHead>Godown</TableHead>
            <TableHead>Batch</TableHead>
            <TableHead className="text-right">Planned</TableHead>
            <TableHead className="text-right">Actual</TableHead>
            <TableHead className="text-right">Yield %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {confirmation.lines.map(l => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{l.line_no}</TableCell>
              <TableCell className="text-xs">{l.output_item_code} · {l.output_item_name}</TableCell>
              <TableCell className="text-xs">{l.destination_godown_name}</TableCell>
              <TableCell className="text-xs font-mono">{l.batch_no ?? '—'}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.planned_qty} {l.uom}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.actual_qty} {l.uom}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.yield_pct.toFixed(1)}%</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={4} className="text-right font-semibold">Totals</TableCell>
            <TableCell className="text-right font-mono font-semibold">{confirmation.total_planned_qty}</TableCell>
            <TableCell className="text-right font-mono font-semibold">{confirmation.total_actual_qty}</TableCell>
            <TableCell className="text-right font-mono font-semibold">{confirmation.overall_yield_pct.toFixed(1)}%</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </UniversalPrintFrame>
  );
}
