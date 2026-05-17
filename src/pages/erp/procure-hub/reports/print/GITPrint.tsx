/**
 * GITPrint.tsx — UPRA-3 Phase A Step 2 · Tier-1 NEW Register #4 · A4
 */
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { GitStage1Record } from '@/types/git';

interface Props { git: GitStage1Record; onClose?: () => void }

export function GITPrint({ git, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Goods in Transit"
      docNo={git.git_no}
      voucherDate={git.receipt_date.slice(0, 10)}
      onClose={onClose}
      signatories={['Gate Officer', 'Security', 'Stores']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">PO No:</span> {git.po_no}</div>
          <div><span className="font-semibold">Status:</span> {git.status}</div>
          <div><span className="font-semibold">Vendor:</span> {git.vendor_name}</div>
          <div><span className="font-semibold">Vehicle:</span> {git.vehicle_no ?? '—'}</div>
          <div><span className="font-semibold">Driver:</span> {git.driver_name ?? '—'}</div>
          <div><span className="font-semibold">Invoice:</span> {git.invoice_no ?? '—'}</div>
          <div><span className="font-semibold">FY:</span> {git.fiscal_year_id ?? '—'}</div>
          <div><span className="font-semibold">QC Pass:</span> {git.quality_check_passed ? 'Yes' : 'No'}</div>
        </div>
      }
      termsAndConditions="Stage 1 gate-receipt · Stage 2 final inventory acceptance via FinCore Receipt Note (separate document)."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Ordered</TableHead>
            <TableHead className="text-right">Received</TableHead>
            <TableHead className="text-right">Accepted</TableHead>
            <TableHead className="text-right">Rejected</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {git.lines.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-xs">No lines</TableCell></TableRow>
          )}
          {git.lines.map(l => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{l.item_name}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty_ordered} {l.uom}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty_received}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty_accepted}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty_rejected}</TableCell>
              <TableCell className="text-xs">{l.rejection_reason ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </UniversalPrintFrame>
  );
}
