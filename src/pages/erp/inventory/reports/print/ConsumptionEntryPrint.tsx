/**
 * ConsumptionEntryPrint.tsx — Tally-Prime style Consumption Entry print
 * Sprint T-Phase-1.2.6b · D-226 UTS dim #8
 */

import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { CONSUMPTION_MODE_LABELS, type ConsumptionEntry } from '@/types/consumption';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

interface Props { ce: ConsumptionEntry; onClose?: () => void; }

export function ConsumptionEntryPrint({ ce, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Consumption Entry"
      docNo={ce.ce_no}
      voucherDate={ce.consumption_date}
      effectiveDate={ce.effective_date}
      onClose={onClose}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Mode:</span> {CONSUMPTION_MODE_LABELS[ce.mode]}</div>
          <div><span className="font-semibold">Godown:</span> {ce.godown_name}</div>
          <div><span className="font-semibold">Department:</span> {ce.department_code ?? '—'}</div>
          <div><span className="font-semibold">Consumed By:</span> {ce.consumed_by_name}</div>
          {ce.mode === 'overhead' && (
            <div><span className="font-semibold">Overhead Ledger:</span> {ce.overhead_ledger_name ?? '—'}</div>
          )}
          {ce.mode === 'site' && (
            <div><span className="font-semibold">Site Reference:</span> {ce.site_reference ?? '—'}</div>
          )}
          {ce.mode === 'job' && (
            <div><span className="font-semibold">Output Qty:</span> {ce.output_qty} {ce.output_uom ?? ''}</div>
          )}
        </div>
      }
      termsAndConditions="Consumption entry recorded against authorized job/overhead/site. Variance to be reviewed by cost accountant."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Standard</TableHead>
            <TableHead className="text-right">Actual</TableHead>
            <TableHead className="text-right">Variance</TableHead>
            <TableHead className="text-right">Rate ₹</TableHead>
            <TableHead className="text-right">Value ₹</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ce.lines.map((l, i) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{i + 1}</TableCell>
              <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
              <TableCell className="text-xs">{l.uom}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.standard_qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.actual_qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.variance_qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.rate}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.value)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={7} className="text-right font-semibold">Total</TableCell>
            <TableCell className="text-right font-mono font-semibold">{fmtINR(ce.total_value)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={7} className="text-right font-semibold">Variance ₹</TableCell>
            <TableCell className="text-right font-mono font-semibold">{fmtINR(ce.total_variance_value)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {ce.narration && (
        <div className="mt-4 text-sm"><span className="font-semibold">Narration:</span> {ce.narration}</div>
      )}
    </UniversalPrintFrame>
  );
}
