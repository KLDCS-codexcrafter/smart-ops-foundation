/**
 * BillPassingPrint.tsx — UPRA-3 Phase C · A4 portrait Bill Passing Match Review document.
 * Hybrid pattern (PC-Q2=(C)): UniversalPrintFrame frame + buildBillPassingPrintPayload body.
 * Signatories ['Accountant', 'Approver', 'CFO'].
 * Local `inr` helper preserved per PC-Q5=(A) corrected · BillPassing fields are rupees.
 */
import { useMemo } from 'react';
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { buildBillPassingPrintPayload, BILL_PASSING_COPY_CONFIG } from '@/lib/bill-passing-print-engine';
import { loadEntityGst } from '@/lib/voucher-print-shared';
import { loadPrintConfig } from '@/lib/print-config-storage';
import type { BillPassingRecord } from '@/types/bill-passing';

const inr = (n: number): string =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface BillPassingPrintProps {
  bill: BillPassingRecord;
  onClose?: () => void;
}

export function BillPassingPrint({ bill, onClose }: BillPassingPrintProps): JSX.Element {
  const { entityCode } = useEntityCode();

  const payload = useMemo(() => buildBillPassingPrintPayload(
    bill,
    loadEntityGst(entityCode),
    BILL_PASSING_COPY_CONFIG.default,
    loadPrintConfig(entityCode),
  ), [bill, entityCode]);

  const company: PrintCompany = {
    name: payload.buyer.legal_name || payload.buyer.trade_name || entityCode || 'Operix',
    gstin: payload.buyer.gstin || '—',
    pan: payload.buyer.pan || '—',
  };

  return (
    <UniversalPrintFrame
      company={company}
      title="Bill Passing — Match Review Copy"
      docNo={payload.bill_no}
      voucherDate={payload.bill_date}
      onClose={onClose}
      signatories={['Accountant', 'Approver', 'CFO']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><span className="font-semibold">Vendor:</span> {payload.vendor_name}</div>
          <div><span className="font-semibold">Vendor Invoice No:</span> {payload.vendor_invoice_no}</div>
          <div><span className="font-semibold">Vendor Invoice Date:</span> {payload.vendor_invoice_date}</div>
          <div><span className="font-semibold">PO No:</span> {payload.po_no}</div>
          <div><span className="font-semibold">Match Type:</span> {payload.match_type}</div>
          <div><span className="font-semibold">Status:</span> {payload.status}</div>
          <div><span className="font-semibold">Copy:</span> {payload.copy_label}</div>
          <div><span className="font-semibold">FY:</span> {bill.fiscal_year_id ?? '—'}</div>
        </div>
      }
      termsAndConditions="Bill Passing Match Review · 3-way / 4-way match document · approval to FCPI per engine workflow · internal review copy."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sl</TableHead>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">PO Qty</TableHead>
            <TableHead className="text-right">PO Rate</TableHead>
            <TableHead className="text-right">PO Value</TableHead>
            <TableHead className="text-right">GRN Qty</TableHead>
            <TableHead className="text-right">Inv Qty</TableHead>
            <TableHead className="text-right">Inv Rate</TableHead>
            <TableHead className="text-right">Inv Value</TableHead>
            <TableHead className="text-right">Total Var</TableHead>
            <TableHead>Match</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payload.lines.map(line => (
            <TableRow key={line.sl_no}>
              <TableCell className="font-mono">{line.sl_no}</TableCell>
              <TableCell>{line.item_name}</TableCell>
              <TableCell className="text-right font-mono">{line.po_qty}</TableCell>
              <TableCell className="text-right font-mono">{inr(line.po_rate)}</TableCell>
              <TableCell className="text-right font-mono">{inr(line.po_value)}</TableCell>
              <TableCell className="text-right font-mono">{line.grn_qty}</TableCell>
              <TableCell className="text-right font-mono">{line.invoice_qty}</TableCell>
              <TableCell className="text-right font-mono">{inr(line.invoice_rate)}</TableCell>
              <TableCell className="text-right font-mono">{inr(line.invoice_value)}</TableCell>
              <TableCell className="text-right font-mono">{inr(line.total_variance)}</TableCell>
              <TableCell className="text-xs capitalize">{line.match_status.replace(/_/g, ' ')}</TableCell>
              <TableCell className="text-xs">{line.variance_reason || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-4 grid grid-cols-4 gap-3 text-xs border-t pt-3">
        <div><span className="font-semibold">PO Total:</span> <span className="font-mono">{inr(payload.total_po_value)}</span></div>
        <div><span className="font-semibold">GRN Total:</span> <span className="font-mono">{inr(payload.total_grn_value)}</span></div>
        <div><span className="font-semibold">Invoice Total:</span> <span className="font-mono">{inr(payload.total_invoice_value)}</span></div>
        <div><span className="font-semibold">Variance:</span> <span className="font-mono">{inr(payload.total_variance)} ({payload.variance_pct.toFixed(2)}%)</span></div>
      </div>

      <div className="mt-3 text-xs">
        <span className="font-semibold">Amount in Words:</span> {payload.amount_in_words}
      </div>

      {payload.approval_notes && (
        <div className="mt-3 text-xs">
          <span className="font-semibold">Approval Notes:</span> {payload.approval_notes}
        </div>
      )}
    </UniversalPrintFrame>
  );
}
