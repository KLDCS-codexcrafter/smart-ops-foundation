/**
 * SalesReturnMemoDetailPanel.tsx — UPRA-1 Phase B · display-only DetailPanel
 * extracted from SalesReturnMemoRegister.tsx (399 LOC) view-dialog block.
 *
 * Pure display — no workflow logic. Workflow lives in
 * actions/SalesReturnMemoActionsDialog.tsx.
 */

import { FileMinus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { SalesReturnMemo, SalesReturnMemoStatus } from '@/types/sales-return-memo';

interface Props { memo: SalesReturnMemo }

const STATUS_COLOR: Record<SalesReturnMemoStatus, string> = {
  pending: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  approved: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  credit_note_posted: 'bg-green-500/15 text-green-700 border-green-500/30',
};

const STATUS_LABEL: Record<SalesReturnMemoStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  credit_note_posted: 'CN Posted',
};

export function SalesReturnMemoDetailPanel({ memo }: Props) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2">
        <FileMinus className="h-5 w-5 text-orange-500" />
        <div className="flex-1">
          <p className="font-semibold font-mono">{memo.memo_no}</p>
          <p className="text-xs text-muted-foreground">
            Raised on {memo.memo_date} by {memo.raised_by_person_name}
          </p>
        </div>
        <Badge variant="outline" className={cn('text-[10px]', STATUS_COLOR[memo.status])}>
          {STATUS_LABEL[memo.status]}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div><span className="text-muted-foreground">Customer:</span> {memo.customer_name}</div>
        <div><span className="text-muted-foreground">Invoice:</span> {memo.against_invoice_no}</div>
        <div><span className="text-muted-foreground">Reason:</span> {memo.reason}</div>
        <div><span className="text-muted-foreground">Total:</span> ₹{memo.total_amount.toLocaleString('en-IN')}</div>
      </div>

      {memo.reason_note && (
        <div className="bg-muted/30 rounded p-2 text-xs">
          <p className="font-semibold mb-1">Notes</p>
          {memo.reason_note}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Item</TableHead>
            <TableHead className="text-xs text-right">Qty</TableHead>
            <TableHead className="text-xs text-right">Rate</TableHead>
            <TableHead className="text-xs text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {memo.items.map(it => (
            <TableRow key={it.id}>
              <TableCell className="text-xs">{it.item_name}</TableCell>
              <TableCell className="text-xs text-right font-mono">{it.qty}</TableCell>
              <TableCell className="text-xs text-right font-mono">{it.rate.toLocaleString('en-IN')}</TableCell>
              <TableCell className="text-xs text-right font-mono">{it.amount.toLocaleString('en-IN')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {memo.rejection_reason && (
        <div className="bg-destructive/10 border border-destructive/30 rounded p-2 text-xs">
          <p className="font-semibold mb-1 text-destructive">Rejection reason</p>
          {memo.rejection_reason}
        </div>
      )}
      {memo.approval_notes && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2 text-xs">
          <p className="font-semibold mb-1 text-blue-700">Approval notes</p>
          {memo.approval_notes}
        </div>
      )}
      {memo.credit_note_voucher_no && (
        <div className="bg-green-500/10 border border-green-500/30 rounded p-2 text-xs">
          <p className="font-semibold mb-1 text-green-700">Credit Note posted</p>
          <span className="font-mono">{memo.credit_note_voucher_no}</span>
        </div>
      )}
    </div>
  );
}

export default SalesReturnMemoDetailPanel;
