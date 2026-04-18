import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { onEnterNext } from '@/lib/keyboard';
import type { Voucher } from '@/types/voucher';

function formatINR(r: number) {
  if (r === 0) return "—";
  if (r >= 100000) return `₹${(r / 100000).toFixed(2)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;
  return `₹${r.toLocaleString("en-IN")}`;
}

function formatINRAlways(r: number) {
  if (r >= 100000) return `₹${(r / 100000).toFixed(2)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;
  return `₹${r.toLocaleString("en-IN")}`;
}

export default function Statement() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const customerId = 'demo-customer-1'; // [JWT] derived from customer auth context
  const entityCode = 'SMRT';             // [JWT] derived from customer's entity assignment

  const statementRows = useMemo(() => {
    let vouchers: Voucher[] = [];
    try {
      // [JWT] GET /api/accounting/vouchers?party_id={customerId}
      vouchers = JSON.parse(localStorage.getItem(`erp_group_vouchers_${entityCode}`) || '[]');
    } catch { /* noop */ }

    const relevant = vouchers.filter(v =>
      v.party_id === customerId && !v.is_cancelled && v.status === 'posted' &&
      ['Sales', 'Receipt', 'Credit Note', 'Debit Note'].includes(v.base_voucher_type),
    );

    const sorted = [...relevant].sort((a, b) => a.date.localeCompare(b.date));
    let bal = 0;
    return sorted.map(v => {
      const isDr = v.base_voucher_type === 'Sales' || v.base_voucher_type === 'Debit Note';
      const amt = v.net_amount;
      if (isDr) bal += amt; else bal -= amt;
      return {
        id: v.id,
        date: v.date,
        type: isDr ? 'invoice' : 'payment',
        ref: v.voucher_no,
        debit: isDr ? amt : 0,
        credit: isDr ? 0 : amt,
        balance: bal,
        description: v.narration || `${v.base_voucher_type} ${v.voucher_no}`,
      };
    });
  }, [customerId, entityCode]);

  const totalDebits = statementRows.reduce((s, r) => s + r.debit, 0);
  const totalCredits = statementRows.reduce((s, r) => s + r.credit, 0);
  const closingBalance = statementRows[statementRows.length - 1]?.balance ?? 0;

  return (
    <CustomerLayout title="Account Statement" subtitle="Ledger statement with all transactions"><div data-keyboard-form>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Input type="date" className="w-40" value={fromDate} onChange={(e) => setFromDate(e.target.value)} onKeyDown={onEnterNext} />
          <Input type="date" className="w-40" value={toDate} onChange={(e) => setToDate(e.target.value)} onKeyDown={onEnterNext} />
        </div>
        <Button variant="outline" onClick={() => toast("Downloading statement as PDF...")}>
          <Download className="h-4 w-4 mr-1.5" />
          Download Statement
        </Button>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-8 bg-card border border-border rounded-xl p-4 mb-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Debits</p>
          <p className="font-mono text-lg font-bold text-destructive">{formatINRAlways(totalDebits)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Credits</p>
          <p className="font-mono text-lg font-bold text-success">{formatINRAlways(totalCredits)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Closing Balance</p>
          <p className="font-mono text-lg font-bold text-warning">{formatINRAlways(closingBalance)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Description</TableHead>
              <TableHead className="text-xs">Reference</TableHead>
              <TableHead className="text-xs text-right">Debit</TableHead>
              <TableHead className="text-xs text-right">Credit</TableHead>
              <TableHead className="text-xs text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statementRows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">No transactions yet.</TableCell></TableRow>
            ) : statementRows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(
                  row.type === "invoice" && "bg-destructive/[0.03]",
                  row.type === "payment" && "bg-success/[0.03]"
                )}
              >
                <TableCell className="text-xs text-muted-foreground">{row.date}</TableCell>
                <TableCell className="text-sm text-foreground">{row.description}</TableCell>
                <TableCell className="font-mono text-xs text-primary">{row.ref}</TableCell>
                <TableCell className="font-mono text-sm text-destructive text-right">{formatINR(row.debit)}</TableCell>
                <TableCell className="font-mono text-sm text-success text-right">{formatINR(row.credit)}</TableCell>
                <TableCell className="font-mono text-sm font-semibold text-foreground text-right">{formatINRAlways(row.balance)}</TableCell>
              </TableRow>
            ))}
            {/* Closing balance footer */}
            <TableRow className="bg-muted/20 font-bold">
              <TableCell colSpan={5} className="text-sm font-bold">Closing Balance</TableCell>
              <TableCell className="font-mono text-lg font-bold text-warning text-right">{formatINRAlways(closingBalance)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div></CustomerLayout>
  );
}
