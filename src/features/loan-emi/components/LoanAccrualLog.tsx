/**
 * @file     LoanAccrualLog.tsx
 * @purpose  Per-loan chronological audit log of every D2 engine action.
 *           Read-only view of `ledger.accrualLog` ordered reverse-chrono.
 *           Triggered from BorrowingLedgerPanel Step 4.
 * @sprint   T-H1.5-D-D2
 */
import { useMemo } from 'react';
import { useLedgerStore } from '@/features/ledger-master/hooks/useLedgerStore';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { AccrualLogEntry, AccrualAction } from '../lib/accrual-log';

interface BorrowingLike {
  id: string;
  ledgerType: 'borrowing';
  accrualLog?: AccrualLogEntry[];
}

interface Props {
  ledgerId: string;
}

const ACTION_LABEL: Record<AccrualAction, string> = {
  monthly_interest: 'Monthly Interest',
  penal_daily: 'Penal Daily',
  bounce_charge: 'Bounce Charge',
  tds_deduction: 'TDS Deducted',
  gst_on_charge: 'GST on Charge',
  processing_fee: 'Processing Fee',
};

const ACTION_TONE: Record<AccrualAction, string> = {
  monthly_interest: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  penal_daily: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  bounce_charge: 'bg-red-500/10 text-red-700 border-red-500/30',
  tds_deduction: 'bg-violet-500/10 text-violet-700 border-violet-500/30',
  gst_on_charge: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  processing_fee: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/30',
};

const fmt = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const fmtTs = (iso: string) => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch {
    return iso;
  }
};

export function LoanAccrualLog({ ledgerId }: Props) {
  const { ledgers } = useLedgerStore<BorrowingLike>('borrowing');
  const ledger = ledgers.find(l => l.id === ledgerId);

  const entries = useMemo(() => {
    const log = ledger?.accrualLog ?? [];
    return [...log].sort((a, b) => (b.postedAt || '').localeCompare(a.postedAt || ''));
  }, [ledger]);

  if (!ledger) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        Loan record not found.
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        No D2 postings yet for this loan.
        <br />
        <span className="text-[10px]">Run accrual or trigger a bounce to populate this log.</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden max-h-[420px] overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Date</TableHead>
            <TableHead className="text-xs">Action</TableHead>
            <TableHead className="text-xs">EMI #</TableHead>
            <TableHead className="text-xs text-right">Amount</TableHead>
            <TableHead className="text-xs">Voucher</TableHead>
            <TableHead className="text-xs">Posted By</TableHead>
            <TableHead className="text-xs">Reversed?</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(e => (
            <TableRow key={e.id}>
              <TableCell className="text-xs font-mono">{fmtTs(e.postedAt)}</TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-[10px] ${ACTION_TONE[e.action]}`}>
                  {ACTION_LABEL[e.action]}
                </Badge>
              </TableCell>
              <TableCell className="text-xs font-mono">{e.emiNumber ?? '—'}</TableCell>
              <TableCell className="text-xs font-mono text-right">{fmt(e.amount)}</TableCell>
              <TableCell className="text-xs font-mono">{e.voucherNo}</TableCell>
              <TableCell className="text-xs">{e.postedBy}</TableCell>
              <TableCell className="text-xs">
                {e.reversedByVoucherId
                  ? <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">Reversed</Badge>
                  : <span className="text-muted-foreground">—</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
