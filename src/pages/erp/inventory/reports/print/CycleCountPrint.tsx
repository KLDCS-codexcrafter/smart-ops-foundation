/**
 * CycleCountPrint.tsx — Tally-Prime style Cycle Count print
 * Sprint T-Phase-1.2.6b · D-226 UTS dim #8 · variance summary line at bottom
 */

import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { COUNT_KIND_LABELS, VARIANCE_REASON_LABELS, type CycleCount } from '@/types/cycle-count';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

interface Props { count: CycleCount; onClose?: () => void; }

export function CycleCountPrint({ count, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Physical Stock Voucher"
      docNo={count.count_no}
      voucherDate={count.count_date}
      effectiveDate={count.effective_date}
      onClose={onClose}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Kind:</span> {COUNT_KIND_LABELS[count.count_kind]}</div>
          <div><span className="font-semibold">Godown:</span> {count.godown_name ?? 'All'}</div>
          <div><span className="font-semibold">Counter:</span> {count.counter_name ?? '—'}</div>
          <div><span className="font-semibold">Reviewer:</span> {count.reviewer_name ?? '—'}</div>
          <div><span className="font-semibold">Approver:</span> {count.approver_name ?? '—'}</div>
          <div><span className="font-semibold">Status:</span> {count.status}</div>
        </div>
      }
      termsAndConditions="Variances must be investigated and reasoned. Recount required if shrinkage exceeds 1%."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Bin</TableHead>
            <TableHead className="text-right">System</TableHead>
            <TableHead className="text-right">Physical</TableHead>
            <TableHead className="text-right">Variance Qty</TableHead>
            <TableHead className="text-right">Variance ₹</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {count.lines.map((l, i) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{i + 1}</TableCell>
              <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
              <TableCell className="text-xs">{l.bin_code ?? '—'}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.system_qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.physical_qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.variance_qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.variance_value)}</TableCell>
              <TableCell className="text-xs">{l.variance_reason ? VARIANCE_REASON_LABELS[l.variance_reason] : '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-4 rounded-lg border bg-muted/20 p-3 text-sm">
        <span className="font-semibold">Variance Summary:</span> {count.variance_lines} of {count.total_lines} lines varied · |Qty| {count.total_variance_qty_abs} · Net ₹{fmtINR(count.total_variance_value)} · Net Shrinkage {count.net_shrinkage_pct.toFixed(2)}%
      </div>
      {count.notes && (
        <div className="mt-3 text-sm"><span className="font-semibold">Notes:</span> {count.notes}</div>
      )}
    </UniversalPrintFrame>
  );
}
