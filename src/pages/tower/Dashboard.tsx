import { AppLayout } from "@/components/layout/AppLayout";
import { TrendingUp, TrendingDown, IndianRupee, Package, Truck, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/auth";

const stats = [
  {
    label: "Today's Revenue",
    value: formatCurrency(4_85_230_00),
    change: "+12.4%",
    trend: "up" as const,
    icon: IndianRupee,
  },
  {
    label: "Active Orders",
    value: "1,284",
    change: "+8.2%",
    trend: "up" as const,
    icon: Package,
  },
  {
    label: "Shipments In Transit",
    value: "342",
    change: "-3.1%",
    trend: "down" as const,
    icon: Truck,
  },
  {
    label: "Critical Alerts",
    value: "7",
    change: "+2",
    trend: "down" as const,
    icon: AlertTriangle,
  },
];

export default function TowerDashboard() {
  return (
    <AppLayout
      title="Control Tower"
      breadcrumbs={[{ label: "Control Tower" }]}
    >
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="glass-card p-5 animate-slide-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{stat.value}</p>
            <div className="flex items-center gap-1 mt-1">
              {stat.trend === "up" ? (
                <TrendingUp className="h-3.5 w-3.5 text-success" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              )}
              <span className={`text-xs font-mono font-medium ${stat.trend === "up" ? "text-success" : "text-destructive"}`}>
                {stat.change}
              </span>
              <span className="text-xs text-muted-foreground ml-1">vs yesterday</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {[
            { text: "Order #ORD-4521 dispatched from Mumbai warehouse", time: "2 min ago", type: "info" },
            { text: "GST filing reminder for Q4 FY2025-26", time: "15 min ago", type: "warning" },
            { text: "Payment of ₹3,42,000 received from Tata Steel", time: "1 hr ago", type: "success" },
            { text: "Stock alert: Widget A below reorder level at Pune", time: "2 hr ago", type: "destructive" },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg p-3 bg-muted/30 border border-border/30 transition-colors hover:bg-muted/50"
            >
              <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full bg-${item.type}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{item.text}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
