/**
 * JobCardPrint.tsx — UPRA-2 Phase A · T1-1 · A4 print
 */
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { JobCard } from '@/types/job-card';

interface Props { card: JobCard; onClose?: () => void }

export function JobCardPrint({ card, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Job Card"
      docNo={card.doc_no}
      voucherDate={card.scheduled_start.slice(0, 10)}
      onClose={onClose}
      signatories={['Operator', 'Supervisor', 'QC']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Prod Order:</span> {card.production_order_no}</div>
          <div><span className="font-semibold">Status:</span> {card.status}</div>
          <div><span className="font-semibold">Operator:</span> {card.employee_name} ({card.employee_code})</div>
          <div><span className="font-semibold">Machine:</span> {card.machine_id}</div>
          <div><span className="font-semibold">Shift:</span> {card.shift_name}</div>
          <div><span className="font-semibold">FY:</span> {card.fiscal_year_id ?? '—'}</div>
        </div>
      }
      termsAndConditions="Shop floor document · all wastage must be logged with reason · QC sign-off required for completed status."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            <TableHead className="text-right">Qty ({card.uom})</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow><TableCell>Planned</TableCell><TableCell className="text-right font-mono">{card.planned_qty}</TableCell><TableCell>—</TableCell></TableRow>
          <TableRow><TableCell>Produced</TableCell><TableCell className="text-right font-mono">{card.produced_qty}</TableCell><TableCell>—</TableCell></TableRow>
          <TableRow><TableCell>Rejected</TableCell><TableCell className="text-right font-mono">{card.rejected_qty}</TableCell><TableCell>—</TableCell></TableRow>
          <TableRow><TableCell>Rework</TableCell><TableCell className="text-right font-mono">{card.rework_qty}</TableCell><TableCell>—</TableCell></TableRow>
          <TableRow><TableCell>Wastage</TableCell><TableCell className="text-right font-mono">{card.wastage_qty}</TableCell><TableCell className="text-xs">{card.wastage_reason ?? '—'} · {card.wastage_notes}</TableCell></TableRow>
        </TableBody>
      </Table>
    </UniversalPrintFrame>
  );
}
