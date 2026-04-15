import { useState } from "react";
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

// [JWT] Replace with real statement data
const STATEMENT = [
  { id: "ST-001", date: "01 Apr 2026", type: "invoice", ref: "INV-2026-0412", debit: 84000,  credit: 0,      balance: 183500, description: "Sales Invoice — 4 items" },
  { id: "ST-002", date: "28 Mar 2026", type: "payment", ref: "PAY-0412",      debit: 0,      credit: 120000, balance: 99500,  description: "Payment received — NEFT" },
  { id: "ST-003", date: "22 Mar 2026", type: "invoice", ref: "INV-2026-0389", debit: 54500,  credit: 0,      balance: 219500, description: "Sales Invoice — 2 items" },
  { id: "ST-004", date: "15 Mar 2026", type: "invoice", ref: "INV-2026-0361", debit: 45000,  credit: 0,      balance: 165000, description: "Sales Invoice — 3 items" },
  { id: "ST-005", date: "10 Mar 2026", type: "payment", ref: "PAY-0389",      debit: 0,      credit: 45000,  balance: 120000, description: "Payment received — UPI" },
  { id: "ST-006", date: "05 Mar 2026", type: "invoice", ref: "INV-2026-0334", debit: 120000, credit: 0,      balance: 165000, description: "Sales Invoice — 6 items" },
  { id: "ST-007", date: "18 Feb 2026", type: "payment", ref: "PAY-0361",      debit: 0,      credit: 67800,  balance: 45000,  description: "Payment received — IMPS" },
];

function formatINR(paise: number) {
  if (paise === 0) return "—";
  const r = paise / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(2)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;
  return `₹${r.toLocaleString("en-IN")}`;
}

function formatINRAlways(paise: number) {
  const r = paise / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(2)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;
  return `₹${r.toLocaleString("en-IN")}`;
}

export default function Statement() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const totalDebits = STATEMENT.reduce((s, r) => s + r.debit, 0);
  const totalCredits = STATEMENT.reduce((s, r) => s + r.credit, 0);
  const closingBalance = STATEMENT[0]?.balance ?? 0;

  return (
    <CustomerLayout title="Account Statement" subtitle="Ledger statement with all transactions"><div data-keyboard-form>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Input type="date" className="w-40" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input type="date" className="w-40" value={toDate} onChange={(e) => setToDate(e.target.value)} />
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
            {STATEMENT.map((row) => (
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
