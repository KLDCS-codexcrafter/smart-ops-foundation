import { AppLayout } from "@/components/layout/AppLayout";
import {
  Building2,
  CheckCircle2,
  Clock,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  XCircle,
  Timer,
  Server,
  Database,
  Wifi,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

const newTenantsChart = [
  { month: "Sep", count: 3 },
  { month: "Oct", count: 5 },
  { month: "Nov", count: 4 },
  { month: "Dec", count: 7 },
  { month: "Jan", count: 6 },
  { month: "Feb", count: 8 },
];

const recentActivity = [
  { tenant: "Reliance Digital Solutions", action: "User role updated", time: "2 min ago" },
  { tenant: "Tata Motors Finance", action: "New user invited", time: "8 min ago" },
  { tenant: "Infosys BPM Ltd", action: "Billing plan upgraded", time: "22 min ago" },
  { tenant: "Wipro Enterprises", action: "Module activated: GST Filing", time: "45 min ago" },
  { tenant: "Mahindra Logistics", action: "Tenant settings changed", time: "1 hr ago" },
  { tenant: "Bajaj Finserv", action: "Password policy updated", time: "1.5 hr ago" },
  { tenant: "HCL Technologies", action: "New API key generated", time: "2 hr ago" },
  { tenant: "Godrej Industries", action: "Subscription renewed", time: "3 hr ago" },
  { tenant: "Larsen & Toubro Infotech", action: "User deactivated", time: "4 hr ago" },
  { tenant: "Adani Ports Digital", action: "Trial started", time: "5 hr ago" },
];

const alerts = [
  {
    title: "Churn Risk",
    description: "12 tenants haven't logged in for 30+ days",
    icon: AlertTriangle,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20",
  },
  {
    title: "Payment Failures",
    description: "3 recurring payment failures this week",
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/20",
  },
  {
    title: "Trial Expiring",
    description: "8 tenants approaching trial end (< 5 days)",
    icon: Timer,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20",
  },
];

const regions = [
  { name: "India — Mumbai", uptime: 99.9 },
  { name: "India — Chennai", uptime: 99.7 },
  { name: "Singapore", uptime: 99.8 },
];

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {title}
            </p>
            <p className={cn("text-3xl font-bold mt-1 font-mono", color)}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", `${color.replace("text-", "bg-")}/10`)}>
            <Icon className={cn("h-5 w-5", color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TowerDashboard() {
  return (
    <AppLayout
      title="Control Tower"
      breadcrumbs={[{ label: "Control Tower" }]}
    >
      <div className="space-y-6">
        {/* Top Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="Total Tenants" value="142" icon={Building2} color="text-primary" subtitle="+6 this month" />
          <StatCard title="Active Tenants" value="118" icon={CheckCircle2} color="text-success" subtitle="83% of total" />
          <StatCard title="Trial Tenants" value="19" icon={Clock} color="text-warning" subtitle="8 expiring soon" />
          <StatCard title="Monthly Revenue" value="₹18.4L" icon={IndianRupee} color="text-accent" subtitle="+12% MoM" />
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2 p-5">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                New This Month
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <p className="text-3xl font-bold font-mono text-success mb-3">8</p>
              <div className="h-[80px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={newTenantsChart}>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: "hsl(220,9%,60%)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Bar dataKey="count" fill="hsl(152,69%,40%)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2 p-5">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Churned This Month
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <p className="text-3xl font-bold font-mono text-destructive">2</p>
              <p className="text-xs text-muted-foreground mt-1">1.4% churn rate — below target</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2 p-5">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" />
                Avg Health Score
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold font-mono text-accent">87</span>
                <span className="text-lg text-muted-foreground font-mono mb-1">/100</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: "87%",
                    background: "linear-gradient(90deg, hsl(173,80%,40%), hsl(152,69%,40%))",
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Health Strip */}
        <Card className="border-border bg-card">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-medium text-foreground">System Health</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <Server className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">API Status</p>
                  <p className="text-xs text-muted-foreground">All endpoints</p>
                </div>
                <Badge className="bg-success/15 text-success border-success/20 hover:bg-success/15">
                  Operational
                </Badge>
              </div>

              <div className="p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Database Health</span>
                </div>
                <div className="space-y-1.5">
                  {regions.map((r) => (
                    <div key={r.name} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{r.name}</span>
                      <span className="font-mono text-success">{r.uptime}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <Wifi className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Bridge Agents Online</p>
                  <p className="text-xs text-muted-foreground">Across all tenants</p>
                </div>
                <span className="text-2xl font-bold font-mono text-accent">89</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Alerts</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {alerts.map((alert) => (
              <button
                key={alert.title}
                className={cn(
                  "text-left p-4 rounded-lg border transition-colors hover:bg-muted/50",
                  alert.bg,
                  alert.border
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <alert.icon className={cn("h-4 w-4", alert.color)} />
                  <span className={cn("text-sm font-semibold", alert.color)}>{alert.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{alert.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="border-border bg-card">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-medium text-foreground">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground">Tenant</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Action</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((item, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell className="text-sm font-medium text-foreground py-3">{item.tenant}</TableCell>
                    <TableCell className="text-sm text-muted-foreground py-3">{item.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground text-right font-mono py-3">{item.time}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
