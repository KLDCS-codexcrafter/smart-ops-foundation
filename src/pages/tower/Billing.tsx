import { useState } from "react";
import { toast } from "sonner";
import {
  IndianRupee, CheckCircle2, Clock, AlertCircle,
  Search, Download, RefreshCw, Eye, SearchX,
} from "lucide-react";
import { TowerLayout } from "@/components/layout/TowerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────
type PlanType = "Starter" | "Growth" | "Enterprise";
type BillingStatus = "paid" | "pending" | "overdue" | "failed";
type PaymentMethod = "NEFT" | "IMPS" | "Razorpay" | "UPI" | "Cheque";

interface BillingRecord {
  id: string;
  tenantId: string;
  tenant: string;
  plan: PlanType;
  mrr: number;
  dueDate: string;
  paidDate?: string;
  status: BillingStatus;
  invoiceNo: string;
  paymentMethod?: PaymentMethod;
  period: string;
}

interface RevenueMonth {
  month: string;
  revenue: number;
  tenants: number;
}

// ── Data ───────────────────────────────────────────────
const BILLING: BillingRecord[] = [
  { id: "BIL-001", tenantId: "TNT-001", tenant: "Reliance Digital Solutions", plan: "Enterprise", mrr: 8500000, dueDate: "01 Jul 2026", paidDate: "29 Jun 2026", status: "paid", invoiceNo: "INV-2026-0061", paymentMethod: "NEFT", period: "Jul 2026" },
  { id: "BIL-002", tenantId: "TNT-002", tenant: "Tata Motors Finance", plan: "Enterprise", mrr: 6200000, dueDate: "01 Jul 2026", paidDate: "01 Jul 2026", status: "paid", invoiceNo: "INV-2026-0062", paymentMethod: "IMPS", period: "Jul 2026" },
  { id: "BIL-003", tenantId: "TNT-003", tenant: "Infosys BPM Limited", plan: "Growth", mrr: 3800000, dueDate: "01 Jul 2026", status: "pending", invoiceNo: "INV-2026-0063", period: "Jul 2026" },
  { id: "BIL-004", tenantId: "TNT-004", tenant: "Wipro Enterprises", plan: "Growth", mrr: 3200000, dueDate: "01 Jul 2026", paidDate: "02 Jul 2026", status: "paid", invoiceNo: "INV-2026-0064", paymentMethod: "Razorpay", period: "Jul 2026" },
  { id: "BIL-005", tenantId: "TNT-005", tenant: "Mahindra Logistics", plan: "Growth", mrr: 2800000, dueDate: "28 Jun 2026", status: "overdue", invoiceNo: "INV-2026-0055", period: "Jun 2026" },
  { id: "BIL-006", tenantId: "TNT-009", tenant: "Larsen & Toubro Infotech", plan: "Growth", mrr: 2400000, dueDate: "01 Jul 2026", status: "pending", invoiceNo: "INV-2026-0066", period: "Jul 2026" },
  { id: "BIL-007", tenantId: "TNT-011", tenant: "Havells India", plan: "Growth", mrr: 2100000, dueDate: "01 Jul 2026", paidDate: "30 Jun 2026", status: "paid", invoiceNo: "INV-2026-0067", paymentMethod: "UPI", period: "Jul 2026" },
  { id: "BIL-008", tenantId: "TNT-012", tenant: "Muthoot Finance", plan: "Starter", mrr: 950000, dueDate: "25 Jun 2026", status: "overdue", invoiceNo: "INV-2026-0048", period: "Jun 2026" },
  { id: "BIL-009", tenantId: "TNT-003", tenant: "Infosys BPM Limited", plan: "Growth", mrr: 3800000, dueDate: "01 Jun 2026", paidDate: "31 May 2026", status: "paid", invoiceNo: "INV-2026-0053", paymentMethod: "NEFT", period: "Jun 2026" },
  { id: "BIL-010", tenantId: "TNT-001", tenant: "Reliance Digital Solutions", plan: "Enterprise", mrr: 8500000, dueDate: "01 Jun 2026", paidDate: "29 May 2026", status: "paid", invoiceNo: "INV-2026-0051", paymentMethod: "NEFT", period: "Jun 2026" },
  { id: "BIL-011", tenantId: "TNT-004", tenant: "Wipro Enterprises", plan: "Growth", mrr: 3200000, dueDate: "01 Jun 2026", status: "failed", invoiceNo: "INV-2026-0054", period: "Jun 2026" },
  { id: "BIL-012", tenantId: "TNT-002", tenant: "Tata Motors Finance", plan: "Enterprise", mrr: 6200000, dueDate: "01 Jun 2026", paidDate: "02 Jun 2026", status: "paid", invoiceNo: "INV-2026-0052", paymentMethod: "IMPS", period: "Jun 2026" },
];

const REVENUE_TREND: RevenueMonth[] = [
  { month: "Feb", revenue: 22500000, tenants: 6 },
  { month: "Mar", revenue: 25800000, tenants: 7 },
  { month: "Apr", revenue: 27200000, tenants: 8 },
  { month: "May", revenue: 29500000, tenants: 9 },
  { month: "Jun", revenue: 31400000, tenants: 10 },
  { month: "Jul", revenue: 28950000, tenants: 10 },
];

// ── Helpers ────────────────────────────────────────────
function formatINR(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(2)} Cr`;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(2)} L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)} K`;
  return `₹${rupees.toLocaleString("en-IN")}`;
}

const STATUS_CONFIG: Record<BillingStatus, { label: string; color: string }> = {
  paid: { label: "Paid", color: "bg-success/10 text-success border-success/20" },
  pending: { label: "Pending", color: "bg-warning/10 text-warning border-warning/20" },
  overdue: { label: "Overdue", color: "bg-destructive/10 text-destructive border-destructive/20" },
  failed: { label: "Failed", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const PLAN_COLORS: Record<PlanType, string> = {
  Starter: "bg-secondary text-muted-foreground",
  Growth: "bg-primary/10 text-primary",
  Enterprise: "bg-accent/10 text-accent",
};

const CURRENT_PERIOD = "Jul 2026";

// ── Component ──────────────────────────────────────────
const Billing = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<BillingRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const filtered = BILLING.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch =
      b.tenant.toLowerCase().includes(q) ||
      b.invoiceNo.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    const matchPeriod = periodFilter === "all" || b.period === periodFilter;
    return matchSearch && matchStatus && matchPeriod;
  });

  const currentMonth = BILLING.filter((b) => b.period === CURRENT_PERIOD);
  const paidMRR = currentMonth.filter((b) => b.status === "paid").reduce((s, b) => s + b.mrr, 0);
  const paidCount = currentMonth.filter((b) => b.status === "paid").length;
  const pendingMRR = currentMonth.filter((b) => b.status === "pending").reduce((s, b) => s + b.mrr, 0);
  const atRisk = BILLING.filter((b) => b.status === "overdue" || b.status === "failed");
  const atRiskMRR = atRisk.reduce((s, b) => s + b.mrr, 0);

  const openDetail = (record: BillingRecord) => {
    setSelectedRecord(record);
    setShowDetail(true);
  };

  return (
    <TowerLayout title="Billing" subtitle="Revenue, subscriptions and payment management">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={IndianRupee} label="MRR (Current Month)" value={formatINR(paidMRR)} color="text-success" sub="+12% vs last month" />
        <StatCard icon={CheckCircle2} label="Collected" value={String(paidCount)} color="text-success" sub={`${paidCount}/${currentMonth.length} invoices`} />
        <StatCard icon={Clock} label="Pending" value={formatINR(pendingMRR)} color="text-warning" />
        <StatCard icon={AlertCircle} label="Overdue + Failed" value={formatINR(atRiskMRR)} color="text-destructive" sub={`${atRisk.length} invoices at risk`} />
      </div>

      {/* Revenue Trend */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Revenue Trend</h3>
          <p className="text-xs text-muted-foreground">Last 6 months</p>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={REVENUE_TREND}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [formatINR(value), "Revenue"]}
            />
            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenant or invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Periods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Periods</SelectItem>
            <SelectItem value="Jul 2026">Jul 2026</SelectItem>
            <SelectItem value="Jun 2026">Jun 2026</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="ml-auto" onClick={() => toast("Report download coming soon")}>
          <Download className="h-4 w-4 mr-2" />
          Download Report
        </Button>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground mb-3">
        Showing {filtered.length} of {BILLING.length} records
      </p>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Invoice</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <SearchX className="h-8 w-8" />
                    <span className="text-sm">No billing records found</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((b) => (
                <TableRow
                  key={b.id}
                  className="hover:bg-muted/30 cursor-pointer transition-colors border-border"
                  onClick={() => openDetail(b)}
                >
                  <TableCell>
                    <div className="text-sm font-mono text-foreground">{b.invoiceNo}</div>
                    <div className="text-xs font-mono text-muted-foreground/60">{b.id}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-foreground">{b.tenant}</div>
                    <div className="text-xs font-mono text-muted-foreground">{b.tenantId}</div>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", PLAN_COLORS[b.plan])}>
                      {b.plan}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-mono text-muted-foreground">{b.period}</span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-sm font-mono font-semibold", b.status === "paid" ? "text-success" : "text-foreground")}>
                      {formatINR(b.mrr)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-xs px-2 py-1 rounded-lg border", STATUS_CONFIG[b.status].color)}>
                      {STATUS_CONFIG[b.status].label}
                    </span>
                  </TableCell>
                  <TableCell>
                    {b.status === "paid" && b.paymentMethod ? (
                      <span className="text-xs font-mono text-muted-foreground">{b.paymentMethod}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetail(b)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast(`Downloading ${b.invoiceNo}...`)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      {(b.status === "overdue" || b.status === "failed") && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-warning" onClick={() => toast(`Retry payment for ${b.invoiceNo}...`)}>
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Sheet */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent side="right" className="w-[460px]">
          {selectedRecord && <InvoiceDetail record={selectedRecord} />}
        </SheetContent>
      </Sheet>
    </TowerLayout>
  );
};

// ── StatCard ───────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
          <Icon className={cn("h-5 w-5", color)} />
        </div>
      </div>
      <div className="font-mono text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Invoice Detail ─────────────────────────────────────
function InvoiceDetail({ record }: { record: BillingRecord }) {
  const status = STATUS_CONFIG[record.status];

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Billing ID", value: <span className="font-mono text-xs">{record.id}</span> },
    { label: "Tenant", value: record.tenant },
    { label: "Tenant ID", value: <span className="font-mono">{record.tenantId}</span> },
    {
      label: "Plan",
      value: (
        <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", PLAN_COLORS[record.plan])}>
          {record.plan}
        </span>
      ),
    },
    { label: "Period", value: record.period },
    { label: "Due Date", value: record.dueDate },
    { label: "Paid Date", value: record.paidDate || "—" },
    {
      label: "Payment Method",
      value: record.paymentMethod ? <span className="font-mono">{record.paymentMethod}</span> : "—",
    },
  ];

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-3">
          <span className="text-lg font-semibold font-mono">{record.invoiceNo}</span>
          <span className={cn("text-xs px-2 py-1 rounded-lg border", status.color)}>{status.label}</span>
        </SheetTitle>
      </SheetHeader>

      <div className="mt-4 space-y-5">
        {/* Invoice Details */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Invoice Details</h4>
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/20">
                <span className="text-xs text-muted-foreground">{r.label}</span>
                <span className="text-sm text-foreground">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Amount */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">Amount</h4>
          <div
            className={cn(
              "text-3xl font-bold font-mono",
              record.status === "paid" ? "text-success" :
              record.status === "pending" ? "text-warning" : "text-destructive"
            )}
          >
            {formatINR(record.mrr)}
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Actions */}
        <div className="space-y-2">
          <Button variant="outline" className="w-full" onClick={() => toast("Downloading invoice...")}>
            <Download className="h-4 w-4 mr-2" />
            Download Invoice PDF
          </Button>
          {record.status === "pending" && (
            <Button variant="outline" className="w-full" onClick={() => toast("Reminder sent...")}>
              Send Payment Reminder
            </Button>
          )}
          {(record.status === "overdue" || record.status === "failed") && (
            <Button variant="outline" className="w-full" onClick={() => toast("Retrying...")}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Payment
            </Button>
          )}
          {record.status === "paid" && (
            <Button variant="outline" className="w-full" onClick={() => toast("Downloading receipt...")}>
              <Download className="h-4 w-4 mr-2" />
              Download Receipt
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          For billing queries contact support@4dsmartops.in
        </p>
      </div>
    </>
  );
}

export default Billing;
