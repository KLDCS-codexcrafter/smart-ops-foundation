/**
 * CommissionDetailPanel.tsx — UPRA-1 Phase C · display-only DetailPanel
 * extracted from CommissionRegister.tsx (897 LOC) row + CN-expand display.
 *
 * Pure display — no workflow logic.
 */

import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { CommissionEntry } from '@/types/commission-register';

interface Props { entry: CommissionEntry }

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const formatINR = (n: number) => `₹${inrFmt.format(n)}`;

const STATUS_COLOR: Record<CommissionEntry['status'], string> = {
  pending: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  partial: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  paid: 'bg-green-500/15 text-green-700 border-green-500/30',
  reversed: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

export function CommissionDetailPanel({ entry }: Props) {
  const hasCN = (entry.credit_note_refs?.length ?? 0) > 0;
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono font-semibold">{entry.voucher_no}</p>
          <p className="text-xs text-muted-foreground">
            {entry.voucher_date} · {entry.customer_name}
          </p>
        </div>
        <Badge variant="outline" className={cn('text-[10px] capitalize', STATUS_COLOR[entry.status])}>
          {entry.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-muted-foreground">SAM Person</p>
          <p className="font-medium">{entry.person_name}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{entry.person_type}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Invoice Amount</p>
          <p className="font-mono">{formatINR(entry.invoice_amount)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Net Invoice (after CN)</p>
          <p className="font-mono">{formatINR(entry.net_invoice_amount)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Total Commission</p>
          <p className="font-mono">{formatINR(entry.net_total_commission)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Received to date</p>
          <p className="font-mono">{formatINR(entry.amount_received_to_date)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Net Paid to date</p>
          <p className="font-mono">{formatINR(entry.net_paid_to_date)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">TDS Deducted</p>
          <p className="font-mono">{formatINR(entry.tds_deducted_to_date)}</p>
          {entry.tds_applicable && entry.tds_section && (
            <p className="text-[10px] text-muted-foreground">
              {entry.tds_section} @ {entry.tds_rate}%
            </p>
          )}
        </div>
        <div>
          <p className="text-muted-foreground">Collection Bonus</p>
          <p className="font-mono text-amber-700">{formatINR(entry.collection_bonus_amount ?? 0)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">GL Voucher</p>
          <p className="font-mono">{entry.commission_expense_voucher_no ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Bank Payout</p>
          <p className="font-mono">{entry.bank_payment_voucher_no ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Agent Invoice</p>
          <p className="font-mono">
            {entry.agent_invoice_no
              ? `${entry.agent_invoice_no} · ${entry.agent_invoice_status ?? ''}`
              : '—'}
          </p>
        </div>
      </div>

      {entry.payments.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold mb-1">Payment History</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Date</TableHead>
                <TableHead className="text-[10px]">Receipt</TableHead>
                <TableHead className="text-[10px] text-right">Received</TableHead>
                <TableHead className="text-[10px] text-right">Commission</TableHead>
                <TableHead className="text-[10px] text-right">TDS</TableHead>
                <TableHead className="text-[10px] text-right">Net Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entry.payments.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="text-[10px]">{p.payment_date}</TableCell>
                  <TableCell className="text-[10px] font-mono">{p.receipt_voucher_no ?? '—'}</TableCell>
                  <TableCell className="text-[10px] text-right font-mono">{inrFmt.format(p.amount_received)}</TableCell>
                  <TableCell className="text-[10px] text-right font-mono">{inrFmt.format(p.commission_on_receipt)}</TableCell>
                  <TableCell className="text-[10px] text-right font-mono">{inrFmt.format(p.tds_amount)}</TableCell>
                  <TableCell className="text-[10px] text-right font-mono">{inrFmt.format(p.net_commission_paid)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {hasCN && (
        <div>
          <p className="text-[11px] font-semibold mb-1">Credit Note Reversals</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">CN No</TableHead>
                <TableHead className="text-[10px]">Date</TableHead>
                <TableHead className="text-[10px] text-right">CN Amount</TableHead>
                <TableHead className="text-[10px] text-right">Commission Reversed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entry.credit_note_refs.map(r => (
                <TableRow key={r.credit_note_id}>
                  <TableCell className="text-[10px] font-mono">{r.credit_note_no}</TableCell>
                  <TableCell className="text-[10px]">{r.credit_note_date}</TableCell>
                  <TableCell className="text-[10px] text-right font-mono">{inrFmt.format(r.credit_note_amount)}</TableCell>
                  <TableCell className="text-[10px] text-right font-mono">{inrFmt.format(r.commission_reversed)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default CommissionDetailPanel;
