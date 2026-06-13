import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { IndianRupee, Inbox } from "lucide-react";
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
import { customerOrdersKey, type CustomerOrder } from "@/types/customer-order";

// [JWT] Replace with real customer account data from API
const ACCOUNT = {
  customerName:    "Sharma Traders Pvt Ltd",
  customerCode:    "CUST-0091",
  gstin:           "27AABCS5678T1ZX",
  creditLimit:     50000000, // paise · 5,00,000
  lastPaymentDate: "—",
};

/** W1C-10 F-2 · seeded entity for the customer portal (mirrors
 *  partner-portal-engine.SEED_ENTITY pattern · single-tenant Tier-L). */
const CUSTOMER_PORTAL_ENTITY = "SMRT";

/** Read real seeded orders for the active customer-portal entity.
 *  Honest empty-state when nothing is seeded — no synthetic rows. */
function readCustomerOrders(entityCode: string): CustomerOrder[] {
  try {
    // [JWT] GET /api/customer/orders?entityCode=:entityCode
    const raw = localStorage.getItem(customerOrdersKey(entityCode));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as CustomerOrder[]) : [];
  } catch {
    return [];
  }
}

function formatINR(paise: number): string {
  const r = paise / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(2)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;
  return `₹${r.toLocaleString("en-IN")}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return "—"; }
}

const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  paid:    { label: "Paid",    color: "bg-success/10 text-success border-success/20" },
  unpaid:  { label: "Unpaid",  color: "bg-warning/10 text-warning border-warning/20" },
  overdue: { label: "Overdue", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  draft:     { label: "Draft",     color: "bg-muted text-muted-foreground" },
  placed:    { label: "Placed",    color: "bg-primary/10 text-primary" },
  confirmed: { label: "Confirmed", color: "bg-primary/10 text-primary" },
  packed:    { label: "Packed",    color: "bg-primary/10 text-primary" },
  shipped:   { label: "Shipped",   color: "bg-primary/10 text-primary" },
  delivered: { label: "Delivered", color: "bg-success/10 text-success" },
  cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive" },
  returned:  { label: "Returned",  color: "bg-warning/10 text-warning" },
};

/** Map a CustomerOrder to an invoice-shaped row (delivered/shipped/packed/confirmed
 *  are treated as billed; placed/draft are not). Honest: derived view, not synthetic. */
function deriveInvoiceStatus(o: CustomerOrder): "paid" | "unpaid" | "overdue" {
  if (o.status === "delivered") return "paid";
  // Overdue if placed > 30d ago and not delivered
  if (o.placed_at) {
    const ageDays = (Date.now() - new Date(o.placed_at).getTime()) / 86400000;
    if (ageDays > 30) return "overdue";
  }
  return "unpaid";
}

export function CustomerDashboardPanel() { return <CustomerDashboard />; }
export default function CustomerDashboard() {
  const navigate = useNavigate();

  // Real reads — single pass, memoized.
  const orders = useMemo(() => readCustomerOrders(CUSTOMER_PORTAL_ENTITY), []);

  const derived = useMemo(() => {
    const outstanding = orders
      .filter(o => o.status !== "delivered" && o.status !== "cancelled" && o.status !== "returned")
      .reduce((s, o) => s + (o.net_payable_paise || 0), 0);

    const overdue = orders
      .filter(o => deriveInvoiceStatus(o) === "overdue")
      .reduce((s, o) => s + (o.net_payable_paise || 0), 0);

    const lastDelivered = orders
      .filter(o => o.status === "delivered" && o.delivered_at)
      .sort((a, b) => (b.delivered_at! > a.delivered_at! ? 1 : -1))[0];

    const lastPayment = lastDelivered?.net_payable_paise ?? 0;
    const lastPaymentDate = lastDelivered ? formatDate(lastDelivered.delivered_at) : "—";

    const creditUsed = ACCOUNT.creditLimit > 0
      ? Math.min(100, Math.round((outstanding / ACCOUNT.creditLimit) * 100))
      : 0;

    // Monthly buckets · last 6 months from now (IST-friendly via toLocaleString)
    const months: { month: string; amount: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: d.toLocaleString("en-IN", { month: "short" }), amount: 0 });
    }
    for (const o of orders) {
      if (!o.placed_at) continue;
      const d = new Date(o.placed_at);
      const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (diffMonths >= 0 && diffMonths < 6) {
        months[5 - diffMonths].amount += o.net_payable_paise || 0;
      }
    }

    const recentOrders = [...orders]
      .sort((a, b) => (b.placed_at || b.created_at).localeCompare(a.placed_at || a.created_at))
      .slice(0, 5);

    const recentInvoices = recentOrders
      .filter(o => o.status !== "draft")
      .map(o => ({
        id: o.order_no || o.id,
        date: formatDate(o.placed_at || o.created_at),
        amount: o.net_payable_paise || 0,
        status: deriveInvoiceStatus(o),
        dueDate: formatDate(o.delivered_at) ?? "—",
      }));

    return { outstanding, overdue, lastPayment, lastPaymentDate, creditUsed, months, recentOrders, recentInvoices };
  }, [orders]);

  const creditColor = derived.creditUsed <= 50
    ? "text-success" : derived.creditUsed <= 80
    ? "text-warning" : "text-destructive";

  const creditBarColor = derived.creditUsed <= 50
    ? "bg-success" : derived.creditUsed <= 80
    ? "bg-warning" : "bg-destructive";

  const hasData = orders.length > 0;

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
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Outstanding</span>
            <IndianRupee className="h-4 w-4 text-warning" />
          </div>
          <p className="font-mono text-xl font-bold text-warning">{formatINR(derived.outstanding)}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Overdue</span>
            <IndianRupee className="h-4 w-4 text-destructive" />
          </div>
          <p className="font-mono text-xl font-bold text-destructive">{formatINR(derived.overdue)}</p>
          {derived.overdue > 0 && <p className="text-[10px] text-destructive mt-1">Action needed</p>}
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Credit Used</span>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className={cn("font-mono text-xl font-bold", creditColor)}>{derived.creditUsed}%</p>
          <div className="w-full h-1.5 mt-2 bg-secondary rounded-full">
            <div
              className={cn("h-full rounded-full transition-all", creditBarColor)}
              style={{ width: `${derived.creditUsed}%` }}
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Last Payment</span>
            <IndianRupee className="h-4 w-4 text-success" />
          </div>
          <p className="font-mono text-xl font-bold text-success">{formatINR(derived.lastPayment)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{derived.lastPaymentDate}</p>
        </div>
      </div>

      {/* Honest empty-state */}
      {!hasData && (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center mb-6">
          <Inbox className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">No transactions yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            This portal shows your real seeded orders + invoices for entity
            <span className="font-mono"> {CUSTOMER_PORTAL_ENTITY}</span>. Seed demo data from
            Dev Tools → Seed Lab, or place an order to populate this dashboard.
          </p>
        </div>
      )}

      {/* Two-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Purchase Trend Chart */}
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm font-semibold text-foreground">Monthly Purchases</p>
            <p className="text-xs text-muted-foreground mb-4">Last 6 months</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={derived.months}>
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

          {/* Recent Invoices (derived from real orders) */}
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
            {derived.recentInvoices.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No invoices yet.</p>
            ) : (
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
                  {derived.recentInvoices.map((inv) => (
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
            )}
          </div>
        </div>

        {/* RIGHT col */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm font-semibold text-foreground mb-4">Account Summary</p>
            <div className="space-y-0">
              {[
                { label: "Customer Code", value: ACCOUNT.customerCode, className: "font-mono text-xs text-primary" },
                { label: "GSTIN", value: ACCOUNT.gstin, className: "font-mono text-xs uppercase" },
                { label: "Credit Limit", value: formatINR(ACCOUNT.creditLimit), className: "font-mono text-xs text-success" },
                { label: "Outstanding", value: formatINR(derived.outstanding), className: "font-mono text-xs text-warning" },
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
            {derived.recentOrders.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No orders yet.</p>
            ) : derived.recentOrders.map((ord) => {
              const statusCfg = ORDER_STATUS[ord.status] ?? ORDER_STATUS.placed;
              return (
                <div key={ord.id} className="p-3 border-b border-border/50 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-primary">{ord.order_no || ord.id}</span>
                    <span className="text-[10px] text-muted-foreground">{formatDate(ord.placed_at || ord.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{ord.lines?.length ?? 0} items</span>
                    <span className="font-mono text-sm font-semibold text-foreground">{formatINR(ord.net_payable_paise || 0)}</span>
                  </div>
                  <span className={cn(
                    "inline-block text-xs px-2 py-0.5 rounded-lg mt-1.5",
                    statusCfg.color
                  )}>
                    {statusCfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
