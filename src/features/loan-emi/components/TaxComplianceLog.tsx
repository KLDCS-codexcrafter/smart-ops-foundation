/**
 * @file     TaxComplianceLog.tsx
 * @purpose  Filtered view of a Borrowing's accrualLog showing ONLY tax-
 *           compliance entries: 'tds_deduction', 'gst_on_charge', and
 *           'processing_fee'. Useful for quarterly TDS returns + GST ITC
 *           claims. Reverse chronological. Read-only.
 *
 *           NOTE — Mounting in BorrowingLedgerPanel is OUT OF SCOPE for D4
 *           (would break panel 0-line-diff invariant). Component is created
 *           and exported for future polish sprint to mount.
 * @sprint   T-H1.5-D-D4
 * @finding  CC-065
 */

import { useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { AccrualLogEntry, AccrualAction } from '../lib/accrual-log';

const STORAGE_KEY = 'erp_group_ledger_definitions';

interface BorrowingRow {
  id: string;
  ledgerType?: string;
  name?: string;
  accrualLog?: AccrualLogEntry[];
}

interface Props {
  ledgerId: string;
}

const TAX_ACTIONS: ReadonlySet<AccrualAction> = new Set([
  'tds_deduction', 'gst_on_charge', 'processing_fee',
]);

const ACTION_LABEL: Record<'tds_deduction' | 'gst_on_charge' | 'processing_fee', string> = {
  tds_deduction: 'TDS Deducted',
  gst_on_charge: 'GST on Charge',
  processing_fee: 'Processing Fee',
};

const ACTION_TONE: Record<'tds_deduction' | 'gst_on_charge' | 'processing_fee', string> = {
  tds_deduction: 'bg-violet-500/10 text-violet-700 border-violet-500/30',
  gst_on_charge: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  processing_fee: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/30',
};

const fmt = (n: number): string =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtTs = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};

function loadLog(ledgerId: string): AccrualLogEntry[] {
  try {
    // [JWT] GET /api/accounting/ledger-definitions/:id
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as BorrowingRow[];
    const ledger = all.find(l => l.id === ledgerId);
    return ledger?.accrualLog ?? [];
  } catch {
    return [];
  }
}

export function TaxComplianceLog({ ledgerId }: Props) {
  const entries = useMemo(() => {
    const log = loadLog(ledgerId);
    return log
      .filter(e => TAX_ACTIONS.has(e.action))
      .slice()
      .sort((a, b) => b.postedAt.localeCompare(a.postedAt));
  }, [ledgerId]);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" />
          Tax Compliance Log
          <Badge variant="outline" className="ml-2 font-mono">{entries.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            No tax-compliance entries yet. TDS / GST will appear here when the relevant
            accruals or charges are posted.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Posted</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">EMI #</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Voucher</TableHead>
                  <TableHead>Narration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(e => {
                  const tag = e.action as 'tds_deduction' | 'gst_on_charge' | 'processing_fee';
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{fmtTs(e.postedAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={ACTION_TONE[tag]}>
                          {ACTION_LABEL[tag]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {e.emiNumber ?? '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">{fmt(e.amount)}</TableCell>
                      <TableCell className="font-mono text-xs">{e.voucherNo}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {e.narration}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
