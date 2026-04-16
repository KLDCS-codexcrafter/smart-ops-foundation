import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// [JWT] Replace with real order data
const ORDERS = [
  {
    id: "ORD-0881", date: "02 Apr 2026", items: [
      { name: "Widget A — Premium",  qty: 50,  rate: 120, amount: 6000 },
      { name: "Widget B — Standard", qty: 100, rate: 80,  amount: 8000 },
      { name: "Bracket Set — M6",    qty: 200, rate: 15,  amount: 3000 },
      { name: "Fastener Kit",        qty: 10,  rate: 800, amount: 8000 },
    ], total: 84000, status: "confirmed", delivery: "10 Apr 2026", invoiceId: "INV-2026-0412",
  },
  {
    id: "ORD-0854", date: "22 Mar 2026", items: [
      { name: "Motor Assembly — 3kW",  qty: 2, rate: 18500, amount: 37000 },
      { name: "Control Panel — Basic", qty: 1, rate: 17500, amount: 17500 },
    ], total: 54500, status: "delivered", delivery: "28 Mar 2026", invoiceId: "INV-2026-0389",
  },
  {
    id: "ORD-0821", date: "10 Mar 2026", items: [
      { name: "Pipe Fitting — 2 inch", qty: 100, rate: 450, amount: 45000 },
      { name: "Valve — Ball 25mm",     qty: 50,  rate: 220, amount: 11000 },
      { name: "Gasket Set",            qty: 200, rate: 45,  amount: 9000 },
      { name: "Threaded Rod — M12",    qty: 500, rate: 18,  amount: 9000 },
      { name: "Coupling — 2 inch",     qty: 100, rate: 185, amount: 18500 },
      { name: "Elbow — 90°",           qty: 150, rate: 120, amount: 18000 },
    ], total: 165000, status: "delivered", delivery: "16 Mar 2026", invoiceId: "INV-2026-0361",
  },
];

function formatINR(paise: number) {
  const r = paise / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(2)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;
  return `₹${r.toLocaleString("en-IN")}`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Confirmed", color: "bg-primary/10 text-primary border-primary/20" },
  delivered: { label: "Delivered", color: "bg-success/10 text-success border-success/20" },
};

export function OrdersPanel() {
  return <Orders />;
}

export default function Orders() {
  const confirmedCount = ORDERS.filter((o) => o.status === "confirmed").length;
  const deliveredCount = ORDERS.filter((o) => o.status === "delivered").length;

  return (
    <CustomerLayout title="My Orders" subtitle="Order history with Reliance Digital Solutions">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Orders", value: ORDERS.length, color: "text-primary" },
          { label: "Confirmed", value: confirmedCount, color: "text-primary" },
          { label: "Delivered", value: deliveredCount, color: "text-success" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className={cn("font-mono text-xl font-bold mt-1", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Order cards */}
      <div className="space-y-4">
        {ORDERS.map((order) => (
          <div
            key={order.id}
            className={cn(
              "bg-card border rounded-xl overflow-hidden",
              order.status === "confirmed" ? "border-primary/30" : "border-success/30"
            )}
          >
            {/* Card header */}
            <div className="flex flex-wrap items-center justify-between p-4 border-b border-border bg-muted/20">
              <div>
                <p className="font-mono text-sm font-bold text-primary">{order.id}</p>
                <p className="text-xs text-muted-foreground">
                  {order.date} • Delivery: {order.delivery}
                </p>
                <p className="font-mono text-xs text-primary mt-0.5">→ {order.invoiceId}</p>
              </div>
              <div className="text-right">
                <span className={cn("text-xs border rounded-lg px-2 py-0.5 inline-block mb-1", STATUS_CONFIG[order.status].color)}>
                  {STATUS_CONFIG[order.status].label}
                </span>
                <p className="font-mono text-lg font-bold text-foreground">{formatINR(order.total)}</p>
              </div>
            </div>

            {/* Items table */}
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
                {order.items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-sm text-foreground">{item.name}</TableCell>
                    <TableCell className="font-mono text-sm text-right">{item.qty}</TableCell>
                    <TableCell className="font-mono text-sm text-right">₹{item.rate.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="font-mono text-sm font-semibold text-right">{formatINR(item.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Card footer */}
            <div className="flex justify-end gap-2 p-3 border-t border-border/50">
              <Button variant="outline" size="sm" onClick={() => toast(`Downloading ${order.invoiceId}...`)}>
                <Download className="h-3.5 w-3.5 mr-1" />
                Download Invoice
              </Button>
              {order.status === "confirmed" && (
                <Button variant="outline" size="sm" onClick={() => toast("Tracking coming soon")}>
                  Track Order
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </CustomerLayout>
  );
}
