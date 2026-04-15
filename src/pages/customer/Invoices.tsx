import { useState } from "react";
import { toast } from "sonner";
import { Download, Search } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { onEnterNext } from '@/lib/keyboard';

// [JWT] Replace with real invoice data from API
const INVOICES = [
  { id: "INV-2026-0412", date: "01 Apr 2026", dueDate: "15 Apr 2026", amount: 84000,  gst: 12960, status: "unpaid",  items: 4, poRef: "PO-0881" },
  { id: "INV-2026-0389", date: "22 Mar 2026", dueDate: "05 Apr 2026", amount: 54500,  gst: 8424,  status: "overdue", items: 2, poRef: "PO-0854" },
  { id: "INV-2026-0361", date: "15 Mar 2026", dueDate: "29 Mar 2026", amount: 45000,  gst: 6750,  status: "paid",    items: 3, poRef: "PO-0821" },
  { id: "INV-2026-0334", date: "05 Mar 2026", dueDate: "19 Mar 2026", amount: 120000, gst: 18000, status: "paid",    items: 6, poRef: "PO-0798" },
  { id: "INV-2026-0298", date: "18 Feb 2026", dueDate: "04 Mar 2026", amount: 67800,  gst: 10170, status: "paid",    items: 5, poRef: "PO-0765" },
  { id: "INV-2026-0271", date: "02 Feb 2026", dueDate: "16 Feb 2026", amount: 38500,  gst: 5775,  status: "paid",    items: 2, poRef: "PO-0741" },
];

function formatINR(paise: number) {
  const r = paise / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(2)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;
  return `₹${r.toLocaleString("en-IN")}`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  paid:    { label: "Paid",    color: "bg-success/10 text-success border-success/20" },
  unpaid:  { label: "Unpaid",  color: "bg-warning/10 text-warning border-warning/20" },
  overdue: { label: "Overdue", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function Invoices() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = INVOICES.filter((inv) => {
    const q = search.toLowerCase();
    const matchSearch = inv.id.toLowerCase().includes(q) || inv.poRef.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paidCount = INVOICES.filter((i) => i.status === "paid").length;
  const unpaidCount = INVOICES.filter((i) => i.status === "unpaid").length;
  const overdueCount = INVOICES.filter((i) => i.status === "overdue").length;
  const totalOutstanding = INVOICES
    .filter((i) => i.status === "unpaid" || i.status === "overdue")
    .reduce((sum, i) => sum + i.amount + i.gst, 0);

  return (
    <CustomerLayout title="My Invoices" subtitle="All invoices from Reliance Digital Solutions">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Invoices", value: INVOICES.length, color: "text-primary" },
          { label: "Paid", value: paidCount, color: "text-success" },
          { label: "Unpaid", value: unpaidCount, color: "text-warning" },
          { label: "Overdue", value: overdueCount, color: "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className={cn("font-mono text-xl font-bold mt-1", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoice or PO ref..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" className="w-40" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <Input type="date" className="w-40" value={toDate} onChange={(e) => setToDate(e.target.value)} />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Invoice No</TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">PO Ref</TableHead>
              <TableHead className="text-xs">Items</TableHead>
              <TableHead className="text-xs">GST</TableHead>
              <TableHead className="text-xs">Total</TableHead>
              <TableHead className="text-xs">Due Date</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Download</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                  No invoices match filters
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((inv) => (
                <TableRow key={inv.id} className={cn(inv.status === "overdue" && "bg-destructive/5")}>
                  <TableCell className="font-mono text-xs text-primary">{inv.id}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{inv.date}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{inv.poRef}</TableCell>
                  <TableCell className="text-xs">{inv.items}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{formatINR(inv.gst)}</TableCell>
                  <TableCell className={cn(
                    "font-mono text-sm font-semibold",
                    inv.status === "paid" ? "text-success" : inv.status === "overdue" ? "text-destructive" : "text-foreground"
                  )}>
                    {formatINR(inv.amount + inv.gst)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{inv.dueDate}</TableCell>
                  <TableCell>
                    <span className={cn("text-xs border rounded-lg px-2 py-0.5", STATUS_CONFIG[inv.status].color)}>
                      {STATUS_CONFIG[inv.status].label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => toast(`Downloading ${inv.id} as PDF...`)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
            {/* Total footer */}
            <TableRow className="bg-muted/20 font-bold">
              <TableCell colSpan={5} className="text-sm">Total Outstanding:</TableCell>
              <TableCell className="font-mono text-primary font-bold text-sm">{formatINR(totalOutstanding)}</TableCell>
              <TableCell colSpan={3} />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </CustomerLayout>
  );
}
