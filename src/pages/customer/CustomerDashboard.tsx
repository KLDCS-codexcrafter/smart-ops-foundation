import { useNavigate } from "react-router-dom";
import {
  IndianRupee, FileText, ShoppingCart,
} from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

// [JWT] Replace with real customer account data from API
const ACCOUNT = {
  customerName:    "Sharma Traders Pvt Ltd",
  customerCode:    "CUST-0091",
  gstin:           "27AABCS5678T1ZX",
  creditLimit:     500000,
  outstanding:     183500,
  overdue:         45000,
  lastPayment:     120000,
  lastPaymentDate: "28 Mar 2026",
  creditUsed:      37,
};

const RECENT_INVOICES = [
  { id: "INV-2026-0412", date: "01 Apr 2026", amount: 84000,  status: "unpaid",  dueDate: "15 Apr 2026" },
  { id: "INV-2026-0389", date: "22 Mar 2026", amount: 54500,  status: "unpaid",  dueDate: "05 Apr 2026" },
  { id: "INV-2026-0361", date: "15 Mar 2026", amount: 45000,  status: "paid",    dueDate: "29 Mar 2026" },
  { id: "INV-2026-0334", date: "05 Mar 2026", amount: 120000, status: "paid",    dueDate: "19 Mar 2026" },
  { id: "INV-2026-0298", date: "18 Feb 2026", amount: 67800,  status: "overdue", dueDate: "04 Mar 2026" },
];

const RECENT_ORDERS = [
  { id: "ORD-0881", date: "02 Apr 2026", items: 4, amount: 84000,  status: "confirmed" },
  { id: "ORD-0854", date: "22 Mar 2026", items: 2, amount: 54500,  status: "delivered" },
  { id: "ORD-0821", date: "10 Mar 2026", items: 6, amount: 165000, status: "delivered" },
];

const MONTHLY_PURCHASES = [
  { month: "Oct", amount: 145000 },
  { month: "Nov", amount: 189000 },
  { month: "Dec", amount: 210000 },
  { month: "Jan", amount: 175000 },
  { month: "Feb", amount: 168000 },
  { month: "Mar", amount: 239500 },
];

function formatINR(paise: number): string {
  const r = paise / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(2)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;
  return `₹${r.toLocaleString("en-IN")}`;
}

const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  paid:    { label: "Paid",    color: "bg-success/10 text-success border-success/20" },
  unpaid:  { label: "Unpaid",  color: "bg-warning/10 text-warning border-warning/20" },
  overdue: { label: "Overdue", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Confirmed", color: "bg-primary/10 text-primary" },
  delivered: { label: "Delivered", color: "bg-success/10 text-success" },
};

export default function CustomerDashboard() {
  const navigate = useNavigate();

  const creditColor = ACCOUNT.creditUsed <= 50
    ? "text-success" : ACCOUNT.creditUsed <= 80
    ? "text-warning" : "text-destructive";

  const creditBarColor = ACCOUNT.creditUsed <= 50
    ? "bg-success" : ACCOUNT.creditUsed <= 80
    ? "bg-warning" : "bg-destructive";

  return (
    <CustomerLayout title="My Dashboard" subtitle="Account overview — Sharma Traders Pvt Ltd">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/5 border border-primary/20 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-foreground">Good morning, Sharma Traders</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              Reliance Digital Solutions — Account {ACCOUNT.customerCode}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              GSTIN: {ACCOUNT.gstin}
            </p>
          </div>
          <Button
            className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
            onClick={() => navigate("/customer/payments")}
          >
            <IndianRupee className="h-4 w-4 mr-1.5" />
            Make Payment
          </Button>
        </div>
      </div>

      {/* Account Health Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Outstanding */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Outstanding</span>
            <IndianRupee className="h-4 w-4 text-warning" />
          </div>
          <p className="font-mono text-xl font-bold text-warning">{formatINR(ACCOUNT.outstanding)}</p>
        </div>

        {/* Overdue */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Overdue</span>
            <IndianRupee className="h-4 w-4 text-destructive" />
          </div>
          <p className="font-mono text-xl font-bold text-destructive">{formatINR(ACCOUNT.overdue)}</p>
          <p className="text-[10px] text-destructive mt-1">Action needed</p>
        </div>

        {/* Credit Used */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Credit Used</span>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className={cn("font-mono text-xl font-bold", creditColor)}>{ACCOUNT.creditUsed}%</p>
          <div className="w-full h-1.5 mt-2 bg-secondary rounded-full">
            <div
              className={cn("h-full rounded-full transition-all", creditBarColor)}
              style={{ width: `${ACCOUNT.creditUsed}%` }}
            />
          </div>
        </div>

        {/* Last Payment */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Last Payment</span>
            <IndianRupee className="h-4 w-4 text-success" />
          </div>
          <p className="font-mono text-xl font-bold text-success">{formatINR(ACCOUNT.lastPayment)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{ACCOUNT.lastPaymentDate}</p>
        </div>
      </div>

      {/* Two-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT col-span-2 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Purchase Trend Chart */}
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm font-semibold text-foreground">Monthly Purchases</p>
            <p className="text-xs text-muted-foreground mb-4">Last 6 months</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={MONTHLY_PURCHASES}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(v: number) => [formatINR(v), "Amount"]}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Invoices */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Recent Invoices</p>
              <button
                className="text-xs text-primary hover:underline cursor-pointer"
                onClick={() => navigate("/customer/invoices")}
              >
                View All →
              </button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Invoice No</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">Due Date</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECENT_INVOICES.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs text-primary">{inv.id}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{inv.date}</TableCell>
                    <TableCell className={cn(
                      "font-mono text-sm font-semibold",
                      inv.status === "paid" ? "text-success" : inv.status === "overdue" ? "text-destructive" : "text-foreground"
                    )}>
                      {formatINR(inv.amount)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{inv.dueDate}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-xs border rounded-lg px-2 py-0.5",
                        INVOICE_STATUS[inv.status].color
                      )}>
                        {INVOICE_STATUS[inv.status].label}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* RIGHT col-span-1 */}
        <div className="space-y-4">
          {/* Account Summary */}
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm font-semibold text-foreground mb-4">Account Summary</p>
            <div className="space-y-0">
              {[
                { label: "Customer Code", value: ACCOUNT.customerCode, className: "font-mono text-xs text-primary" },
                { label: "GSTIN", value: ACCOUNT.gstin, className: "font-mono text-xs uppercase" },
                { label: "Credit Limit", value: formatINR(ACCOUNT.creditLimit), className: "font-mono text-xs text-success" },
                { label: "Outstanding", value: formatINR(ACCOUNT.outstanding), className: "font-mono text-xs text-warning" },
                { label: "Account With", value: "Reliance Digital Solutions", className: "text-xs text-foreground" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                  <span className={row.className}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Recent Orders</p>
              <button
                className="text-xs text-primary hover:underline cursor-pointer"
                onClick={() => navigate("/customer/orders")}
              >
                View All →
              </button>
            </div>
            {RECENT_ORDERS.map((ord) => (
              <div key={ord.id} className="p-3 border-b border-border/50 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-primary">{ord.id}</span>
                  <span className="text-[10px] text-muted-foreground">{ord.date}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{ord.items} items</span>
                  <span className="font-mono text-sm font-semibold text-foreground">{formatINR(ord.amount)}</span>
                </div>
                <span className={cn(
                  "inline-block text-xs px-2 py-0.5 rounded-lg mt-1.5",
                  ORDER_STATUS[ord.status].color
                )}>
                  {ORDER_STATUS[ord.status].label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
