/**
 * TransporterInvoicePrint.tsx — UPRA-3 Phase A Step 2 · Tier-1 NEW Register #2 · A4
 */
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { TransporterInvoice } from '@/types/transporter-invoice';
// Sprint B2 · DocSendBar wave-1 mount
import { DocSendBar } from '@/components/shared/DocSendBar';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

interface Props { invoice: TransporterInvoice; onClose?: () => void }

export function TransporterInvoicePrint({ invoice, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <>
      <div className="no-print px-4 py-2 border-b border-border bg-muted/20">
        <DocSendBar objectType="transporter-invoice" sourceCard="dispatch" sourceRecord={(invoice as unknown) as Record<string, unknown>} />
      </div>
      <UniversalPrintFrame
      company={company}
      title="Transporter Invoice"
      docNo={invoice.invoice_no}
      voucherDate={invoice.invoice_date}
      onClose={onClose}
      signatories={['Logistics', 'Accounts', 'Authorised']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Transporter:</span> {invoice.logistic_name}</div>
          <div><span className="font-semibold">Status:</span> {invoice.status}</div>
          <div><span className="font-semibold">Period:</span> {invoice.period_from} → {invoice.period_to}</div>
          <div><span className="font-semibold">FY:</span> {invoice.fiscal_year_id ?? '—'}</div>
          <div><span className="font-semibold">Workflow:</span> {invoice.workflow_mode}</div>
          <div><span className="font-semibold">Source:</span> {invoice.upload_source}</div>
        </div>
      }
      termsAndConditions="Subject to LR reconciliation against DLN · variances outside tolerance flagged for dispute review."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>LR No</TableHead>
            <TableHead className="text-right">Weight (kg)</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">GST</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoice.lines.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-xs">No lines</TableCell></TableRow>
          )}
          {invoice.lines.map(l => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{l.line_no}</TableCell>
              <TableCell className="text-xs font-mono">{l.lr_no}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.transporter_declared_weight_kg}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmt(l.transporter_declared_amount)}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmt(l.gst_amount)}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmt(l.total)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={3} className="text-right text-xs font-semibold">Totals</TableCell>
            <TableCell className="text-right text-xs font-mono">{fmt(invoice.total_declared)}</TableCell>
            <TableCell className="text-right text-xs font-mono">{fmt(invoice.total_gst)}</TableCell>
            <TableCell className="text-right text-xs font-mono">{fmt(invoice.grand_total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </UniversalPrintFrame>
    </>
);
}
