import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Shield, ShieldCheck, ShieldAlert, Lock, Users, Activity,
  Key, Fingerprint, Monitor, Smartphone, Globe, AlertTriangle,
  CheckCircle, XCircle, Search, Download, RefreshCw, Plus,
  TrendingUp, TrendingDown, Eye, Settings, Gauge, Cpu,
  HardDrive, Wifi, Database, Server, Mail, FileText,
  Clock, BarChart3,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

// ── Mock Data ────────────────────────────────────────────────

const LOGIN_TREND = [
  { day: "Mon", successful: 342, failed: 18, blocked: 7 },
  { day: "Tue", successful: 398, failed: 22, blocked: 4 },
  { day: "Wed", successful: 315, failed: 15, blocked: 9 },
  { day: "Thu", successful: 421, failed: 31, blocked: 12 },
  { day: "Fri", successful: 389, failed: 19, blocked: 6 },
  { day: "Sat", successful: 187, failed: 8, blocked: 2 },
  { day: "Sun", successful: 143, failed: 5, blocked: 1 },
];

const DEVICE_DATA = [
  { name: "Desktop", value: 58, color: "hsl(185 80% 50%)" },
  { name: "Mobile", value: 28, color: "hsl(142 70% 45%)" },
  { name: "Tablet", value: 10, color: "hsl(38 92% 50%)" },
  { name: "Unknown", value: 4, color: "hsl(215 20% 65%)" },
];

const RADAR_DATA = [
  { metric: "Authentication", score: 92 },
  { metric: "Access Control", score: 85 },
  { metric: "Device Security", score: 78 },
  { metric: "Geo Compliance", score: 90 },
  { metric: "Session Security", score: 88 },
  { metric: "IP Reputation", score: 82 },
];

const API_VOLUME = [
  { day: "Mon", calls: 12400 },
  { day: "Tue", calls: 14800 },
  { day: "Wed", calls: 11200 },
  { day: "Thu", calls: 16300 },
  { day: "Fri", calls: 15100 },
  { day: "Sat", calls: 7800 },
  { day: "Sun", calls: 5400 },
];

const ERROR_RATE = [
  { day: "Mon", rate: 0.8 },
  { day: "Tue", rate: 1.2 },
  { day: "Wed", rate: 0.6 },
  { day: "Thu", rate: 1.8 },
  { day: "Fri", rate: 0.9 },
  { day: "Sat", rate: 0.4 },
  { day: "Sun", rate: 0.3 },
];

const MOCK_USERS = [
  { name: "Rajesh Kumar", email: "rajesh@company.in", role: "Admin", status: "Active", lastLogin: "Today 09:14 IST" },
  { name: "Priya Sharma", email: "priya@company.in", role: "Manager", status: "Active", lastLogin: "Today 08:52 IST" },
  { name: "Ankit Verma", email: "ankit@company.in", role: "User", status: "Active", lastLogin: "Yesterday 17:30 IST" },
  { name: "Sunita Patel", email: "sunita@company.in", role: "Manager", status: "Active", lastLogin: "Today 10:05 IST" },
  { name: "Vikram Singh", email: "vikram@company.in", role: "User", status: "Suspended", lastLogin: "3 days ago" },
  { name: "Meena Iyer", email: "meena@company.in", role: "Admin", status: "Active", lastLogin: "Today 07:48 IST" },
  { name: "Arjun Mehta", email: "arjun@company.in", role: "Viewer", status: "Active", lastLogin: "Yesterday 14:20 IST" },
  { name: "Kavita Nair", email: "kavita@company.in", role: "User", status: "Active", lastLogin: "Today 11:33 IST" },
  { name: "Deepak Joshi", email: "deepak@company.in", role: "Manager", status: "Active", lastLogin: "Yesterday 09:15 IST" },
  { name: "Lakshmi Rao", email: "lakshmi@company.in", role: "User", status: "Active", lastLogin: "Today 08:00 IST" },
];

const AUDIT_ENTRIES = [
  { action: "User login successful", user: "rajesh@company.in", time: "09:14:23", type: "success", source: "User" },
  { action: "Role assigned: Manager", user: "admin@company.in", time: "09:10:15", type: "info", source: "Admin" },
  { action: "Failed login attempt", user: "unknown", time: "09:08:44", type: "warning", source: "System" },
  { action: "Data export: Audit logs", user: "meena@company.in", time: "09:05:31", type: "info", source: "User" },
  { action: "Security policy updated", user: "admin@company.in", time: "08:58:12", type: "info", source: "Admin" },
  { action: "IP blocked: 192.168.1.45", user: "System", time: "08:55:07", type: "warning", source: "System" },
  { action: "Module config changed", user: "rajesh@company.in", time: "08:50:33", type: "info", source: "User" },
  { action: "Bridge Agent connected", user: "System", time: "08:45:00", type: "success", source: "System" },
  { action: "Backup completed", user: "System", time: "08:30:00", type: "success", source: "System" },
  { action: "Password reset request", user: "ankit@company.in", time: "08:22:18", type: "info", source: "User" },
  { action: "New user invited", user: "admin@company.in", time: "08:15:44", type: "info", source: "Admin" },
  { action: "Session expired", user: "vikram@company.in", time: "08:10:02", type: "info", source: "System" },
  { action: "High-risk login flagged", user: "unknown", time: "07:58:31", type: "error", source: "System" },
  { action: "User suspended", user: "admin@company.in", time: "07:45:19", type: "warning", source: "Admin" },
  { action: "API rate limit hit", user: "api-service", time: "07:30:05", type: "warning", source: "API" },
  { action: "Database health check passed", user: "System", time: "07:00:00", type: "success", source: "System" },
  { action: "MFA enabled for user", user: "priya@company.in", time: "06:55:41", type: "success", source: "User" },
  { action: "Config export completed", user: "admin@company.in", time: "06:40:18", type: "info", source: "Admin" },
  { action: "Geo-fence violation detected", user: "unknown", time: "06:22:09", type: "error", source: "System" },
  { action: "Platform startup complete", user: "System", time: "06:00:00", type: "success", source: "System" },
];

const PERMISSIONS = [
  { permission: "View Dashboard", superAdmin: true, admin: true, manager: true, user: true, viewer: true },
  { permission: "Export Data", superAdmin: true, admin: true, manager: true, user: false, viewer: false },
  { permission: "Manage Users", superAdmin: true, admin: true, manager: false, user: false, viewer: false },
  { permission: "Assign Roles", superAdmin: true, admin: true, manager: false, user: false, viewer: false },
  { permission: "View Policies", superAdmin: true, admin: true, manager: true, user: false, viewer: false },
  { permission: "Edit Settings", superAdmin: true, admin: true, manager: true, user: false, viewer: false },
  { permission: "System Console", superAdmin: true, admin: true, manager: false, user: false, viewer: false },
  { permission: "Run Audit", superAdmin: true, admin: true, manager: true, user: false, viewer: false },
  { permission: "Impersonate User", superAdmin: true, admin: false, manager: false, user: false, viewer: false },
  { permission: "Manage Modules", superAdmin: true, admin: true, manager: false, user: false, viewer: false },
];

const SERVICES = [
  { name: "Database", status: "healthy" as const, icon: Database },
  { name: "Authentication", status: "healthy" as const, icon: Key },
  { name: "Storage", status: "healthy" as const, icon: HardDrive },
  { name: "Notifications", status: "healthy" as const, icon: Mail },
  { name: "Bridge Agent", status: "healthy" as const, icon: Wifi },
  { name: "Email Service", status: "healthy" as const, icon: Mail },
];

// ── Sub-components ────────────────────────────────────────────

function PolicyHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <Badge variant="outline" className="text-xs">Global</Badge>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
        <Users className="w-3 h-3" /> Affected Users: 54,960
      </p>
    </div>
  );
}

function PolicyScope() {
  const [scope, setScope] = useState("global");
  return (
    <Card className="bg-card/60 border-border mt-4">
      <CardHeader className="pb-2"><CardTitle className="text-sm">Policy Scope</CardTitle></CardHeader>
      <CardContent>
        <div className="flex gap-2 flex-wrap">
          {["global", "entity", "users"].map(s => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                scope === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
              )}
            >
              {s === "global" ? "Global" : s === "entity" ? "Entity" : "Users / Groups"}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Tab 1: Dashboard ─────────────────────────────────────────

function DashboardTab() {
  return (
    <div className="space-y-5">
      {/* Security Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-card/60 border-border lg:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke="hsl(var(--primary))" strokeWidth="8"
                  strokeDasharray={`${(87 / 100) * 251.2} 251.2`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <div className="text-3xl font-bold text-foreground">87</div>
                <div className="text-xs text-muted-foreground">/ 100</div>
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground mt-3">Security Score</p>
            <div className="w-full mt-4 space-y-2">
              {[
                { label: "Authentication", value: 92, color: "bg-emerald-500" },
                { label: "Access Control", value: 85, color: "bg-primary" },
                { label: "Device Security", value: 78, color: "bg-amber-500" },
              ].map(m => (
                <div key={m.label}>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{m.label}</span><span>{m.value}%</span>
                  </div>
                  <Progress value={m.value} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          {[
            { label: "Active MFA Users", value: "1,247", trend: "up", icon: Fingerprint, color: "text-cyan-400" },
            { label: "Blocked Sign-Ins", value: "41", trend: "down", sub: "last 7 days", icon: ShieldAlert, color: "text-red-400" },
            { label: "Active Sessions", value: "389", trend: "up", sub: "last hour", icon: Activity, color: "text-emerald-400" },
            { label: "High Risk Alerts", value: "3", trend: "up", sub: "flagged", icon: AlertTriangle, color: "text-amber-400" },
          ].map(kpi => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.label} className="bg-card/60 border-border">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <Icon className={`w-4 h-4 ${kpi.color}`} />
                    {kpi.trend === "up"
                      ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      : <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                    }
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-2 font-mono">{kpi.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{kpi.label}</div>
                  {kpi.sub && <div className="text-[10px] text-muted-foreground/60">{kpi.sub}</div>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Login Trend */}
        <Card className="bg-card/60 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Login Trends (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={LOGIN_TREND}>
                <defs>
                  <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(185 80% 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(185 80% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="successful" stroke="hsl(185 80% 50%)" fill="url(#successGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="failed" stroke="hsl(38 92% 50%)" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
                <Area type="monotone" dataKey="blocked" stroke="hsl(0 62% 40%)" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Device + Radar */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card/60 border-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Device Types</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={DEVICE_DATA} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                    {DEVICE_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="bg-card/60 border-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Security Radar</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={170}>
                <RadarChart data={RADAR_DATA}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} />
                  <Radar name="Score" dataKey="score" stroke="hsl(185 80% 50%)" fill="hsl(185 80% 50%)" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: Roles & Permissions ───────────────────────────────

function RolesTab() {
  const ROLE_COUNTS = [
    { role: "Super Admin", count: 1, color: "text-red-400 bg-red-500/10 border-red-500/20" },
    { role: "Admin", count: 3, color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
    { role: "Manager", count: 12, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    { role: "User", count: 48, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
    { role: "Viewer", count: 15, color: "text-muted-foreground bg-muted border-border" },
  ];

  return (
    <div className="space-y-5">
      {/* Role summary */}
      <div className="flex flex-wrap gap-3">
        {ROLE_COUNTS.map(r => (
          <div key={r.role} className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border", r.color)}>
            <span className="text-sm font-bold">{r.count}</span>
            <span className="text-xs">{r.role}</span>
          </div>
        ))}
        <Button size="sm" variant="outline" className="gap-1.5 ml-auto">
          <Plus className="w-3.5 h-3.5" /> Add Custom Role
        </Button>
      </div>

      {/* Permission matrix */}
      <Card className="bg-card/60 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Permission Matrix</CardTitle>
          <CardDescription className="text-xs">Toggle switches are visual — backend wires enforcement</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-xs">Permission</TableHead>
                <TableHead className="text-xs text-center">Super Admin</TableHead>
                <TableHead className="text-xs text-center">Admin</TableHead>
                <TableHead className="text-xs text-center">Manager</TableHead>
                <TableHead className="text-xs text-center">User</TableHead>
                <TableHead className="text-xs text-center">Viewer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSIONS.map(row => (
                <TableRow key={row.permission} className="border-border">
                  <TableCell className="text-xs font-medium">{row.permission}</TableCell>
                  {["superAdmin", "admin", "manager", "user", "viewer"].map(role => (
                    <TableCell key={role} className="text-center">
                      <div className="flex justify-center">
                        {row[role as keyof typeof row]
                          ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                          : <XCircle className="w-4 h-4 text-muted-foreground/40" />
                        }
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab 3: Audit Explorer ────────────────────────────────────

function AuditTab() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = AUDIT_ENTRIES.filter(e => {
    const matchesSearch = !search || e.action.toLowerCase().includes(search.toLowerCase()) || e.user.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || e.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const typeColors: Record<string, string> = {
    success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    info: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    warning: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    error: "bg-red-500/15 text-red-400 border-red-500/20",
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search actions or users..."
            className="pl-9 h-8 text-xs"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => toast.info("Export to Excel — backend pending")}>
          <Download className="w-3.5 h-3.5" /> Export
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-card/60 border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-xs">Action</TableHead>
                <TableHead className="text-xs">User</TableHead>
                <TableHead className="text-xs">Time</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry, i) => (
                <TableRow key={i} className="border-border">
                  <TableCell className="text-xs font-medium">{entry.action}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{entry.user}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{entry.time}</TableCell>
                  <TableCell>
                    <Badge className={cn("text-[10px] border", typeColors[entry.type])}>
                      {entry.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{entry.source}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab 4: System Monitoring ─────────────────────────────────

function MonitoringTab() {
  const infraCards = [
    { label: "CPU Usage", value: 34, unit: "%", trend: "down", icon: Cpu, color: "text-cyan-400" },
    { label: "Memory Usage", value: 61, unit: "%", trend: "up", icon: Server, color: "text-violet-400" },
    { label: "Storage Used", value: 45, unit: "%", trend: "up", icon: HardDrive, color: "text-amber-400" },
    { label: "API Latency", value: 142, unit: "ms", trend: "down", icon: Gauge, color: "text-emerald-400" },
  ];

  return (
    <div className="space-y-5">
      {/* Infra cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {infraCards.map(card => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="bg-card/60 border-border">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`w-4 h-4 ${card.color}`} />
                  {card.trend === "down"
                    ? <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                    : <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  }
                </div>
                <div className="text-2xl font-bold text-foreground font-mono">
                  {card.value}<span className="text-sm text-muted-foreground">{card.unit}</span>
                </div>
                <Progress value={card.unit === "ms" ? (card.value / 5) : card.value} className="h-1.5 mt-2" />
                <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Service status */}
      <Card className="bg-card/60 border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Service Status</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SERVICES.map(svc => {
              const Icon = svc.icon;
              return (
                <div key={svc.name} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/40">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground flex-1">{svc.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-emerald-400">Healthy</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card/60 border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">API Call Volume (7 days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={API_VOLUME}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="calls" fill="hsl(185 80% 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Error Rate % (7 days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={ERROR_RATE}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="rate" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={{ fill: "hsl(38 92% 50%)", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Tab 5: Security Policies ─────────────────────────────────

function PoliciesTab() {
  const [policyTab, setPolicyTab] = useState("password");
  const [minLength, setMinLength] = useState([12]);
  const [expiryDays, setExpiryDays] = useState([90]);
  const [sessionTimeout, setSessionTimeout] = useState([60]);
  const [maxDevices, setMaxDevices] = useState([3]);
  const [requireUpper, setRequireUpper] = useState(true);
  const [requireNumbers, setRequireNumbers] = useState(true);
  const [requireSpecial, setRequireSpecial] = useState(true);
  const [expiryEnabled, setExpiryEnabled] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [trustedDevices, setTrustedDevices] = useState(true);
  const [ipEnabled, setIpEnabled] = useState(false);
  const [geoEnabled, setGeoEnabled] = useState(true);

  const POLICY_TABS = [
    { id: "password", label: "Password" },
    { id: "mfa", label: "MFA" },
    { id: "ip", label: "IP Whitelist" },
    { id: "geo", label: "Geo Fencing" },
    { id: "device", label: "Device" },
    { id: "session", label: "Session" },
  ];

  function handleSave() {
    toast.success("Policy settings saved — will take effect after backend is wired");
  }

  return (
    <div className="space-y-4">
      {/* Policy sub-tabs */}
      <div className="flex gap-1 flex-wrap border-b border-border pb-3">
        {POLICY_TABS.map(pt => (
          <button
            key={pt.id}
            onClick={() => setPolicyTab(pt.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              policyTab === pt.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {pt.label}
          </button>
        ))}
      </div>

      {/* Password Policy */}
      {policyTab === "password" && (
        <Card className="bg-card/60 border-border">
          <CardContent className="pt-5 space-y-5">
            <PolicyHeader title="Password Policy" description="Define password strength requirements and expiry rules for all users." />
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-foreground">Minimum Password Length</span>
                  <span className="font-mono text-primary">{minLength[0]} characters</span>
                </div>
                <Slider value={minLength} onValueChange={setMinLength} min={8} max={32} step={1} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Require Uppercase", value: requireUpper, set: setRequireUpper },
                  { label: "Require Numbers", value: requireNumbers, set: setRequireNumbers },
                  { label: "Require Special Chars", value: requireSpecial, set: setRequireSpecial },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
                    <span className="text-xs text-foreground">{item.label}</span>
                    <Switch checked={item.value} onCheckedChange={item.set} />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
                <span className="text-xs text-foreground">Password Expiry</span>
                <Switch checked={expiryEnabled} onCheckedChange={setExpiryEnabled} />
              </div>
              {expiryEnabled && (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-foreground">Expiry Period</span>
                    <span className="font-mono text-primary">{expiryDays[0]} days</span>
                  </div>
                  <Slider value={expiryDays} onValueChange={setExpiryDays} min={30} max={365} step={30} />
                </div>
              )}
            </div>
            <PolicyScope />
            <Button size="sm" onClick={handleSave} className="mt-4">Save Password Policy</Button>
          </CardContent>
        </Card>
      )}

      {/* MFA Policy */}
      {policyTab === "mfa" && (
        <Card className="bg-card/60 border-border">
          <CardContent className="pt-5 space-y-5">
            <PolicyHeader title="MFA Policy" description="Configure multi-factor authentication requirements and allowed methods." />
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
                <div>
                  <p className="text-sm font-medium text-foreground">Enforce MFA for all users</p>
                  <p className="text-xs text-muted-foreground">Users must complete MFA on every login</p>
                </div>
                <Switch checked={mfaEnabled} onCheckedChange={setMfaEnabled} />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Allowed Methods</p>
                <div className="grid grid-cols-3 gap-2">
                  {["Authenticator App", "SMS OTP", "Email OTP"].map(m => (
                    <div key={m} className="flex items-center gap-2 p-3 rounded-xl bg-muted/20 border border-border/40">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="text-xs text-foreground">{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <PolicyScope />
            <Button size="sm" onClick={handleSave}>Save MFA Policy</Button>
          </CardContent>
        </Card>
      )}

      {/* IP Whitelist */}
      {policyTab === "ip" && (
        <Card className="bg-card/60 border-border">
          <CardContent className="pt-5 space-y-5">
            <PolicyHeader title="IP Whitelist" description="Restrict platform access to specific IP addresses or CIDR ranges." />
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
              <span className="text-sm text-foreground">Enable IP Whitelist</span>
              <Switch checked={ipEnabled} onCheckedChange={setIpEnabled} />
            </div>
            <div className="flex gap-2">
              <Input placeholder="e.g. 192.168.1.0/24" className="text-xs h-8" />
              <Button size="sm" variant="outline" className="gap-1.5 h-8">
                <Plus className="w-3.5 h-3.5" /> Add Range
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">No IP ranges configured — all IPs allowed.</div>
            <PolicyScope />
            <Button size="sm" onClick={handleSave}>Save IP Policy</Button>
          </CardContent>
        </Card>
      )}

      {/* Geo Fencing */}
      {policyTab === "geo" && (
        <Card className="bg-card/60 border-border">
          <CardContent className="pt-5 space-y-5">
            <PolicyHeader title="Geo Fencing" description="Restrict access based on geographic location." />
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
              <span className="text-sm text-foreground">Enable Geo Fencing</span>
              <Switch checked={geoEnabled} onCheckedChange={setGeoEnabled} />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Allowed Countries</p>
              <div className="flex flex-wrap gap-2">
                {["India ✅", "United Arab Emirates", "Singapore", "United Kingdom", "United States"].map(c => (
                  <div key={c} className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs",
                    c.includes("✅")
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-muted text-muted-foreground border-border"
                  )}>
                    <Globe className="w-3 h-3" />
                    {c.replace(" ✅", "")}
                  </div>
                ))}
              </div>
            </div>
            <PolicyScope />
            <Button size="sm" onClick={handleSave}>Save Geo Policy</Button>
          </CardContent>
        </Card>
      )}

      {/* Device Sign-In */}
      {policyTab === "device" && (
        <Card className="bg-card/60 border-border">
          <CardContent className="pt-5 space-y-5">
            <PolicyHeader title="Device Sign-In" description="Control trusted devices and sign-in from new devices." />
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
              <div>
                <p className="text-sm font-medium text-foreground">Trusted Device Registration</p>
                <p className="text-xs text-muted-foreground">Allow users to mark devices as trusted</p>
              </div>
              <Switch checked={trustedDevices} onCheckedChange={setTrustedDevices} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-foreground">Maximum Devices per User</span>
                <span className="font-mono text-primary">{maxDevices[0]}</span>
              </div>
              <Slider value={maxDevices} onValueChange={setMaxDevices} min={1} max={10} step={1} />
            </div>
            <PolicyScope />
            <Button size="sm" onClick={handleSave}>Save Device Policy</Button>
          </CardContent>
        </Card>
      )}

      {/* Session Management */}
      {policyTab === "session" && (
        <Card className="bg-card/60 border-border">
          <CardContent className="pt-5 space-y-5">
            <PolicyHeader title="Session Management" description="Configure session duration and concurrent session limits." />
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-foreground">Session Timeout</span>
                <span className="font-mono text-primary">{sessionTimeout[0]} minutes</span>
              </div>
              <Slider value={sessionTimeout} onValueChange={setSessionTimeout} min={15} max={480} step={15} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
              <div>
                <p className="text-sm font-medium text-foreground">Force re-login on IP change</p>
                <p className="text-xs text-muted-foreground">Session invalidates if user's IP changes</p>
              </div>
              <Switch defaultChecked />
            </div>
            <PolicyScope />
            <Button size="sm" onClick={handleSave}>Save Session Policy</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Tab 6: User Management ───────────────────────────────────

function UsersTab() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const filtered = MOCK_USERS.filter(u => {
    const matchesSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleColors: Record<string, string> = {
    "Admin": "bg-violet-500/15 text-violet-400 border-violet-500/20",
    "Manager": "bg-amber-500/15 text-amber-400 border-amber-500/20",
    "User": "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    "Viewer": "bg-muted text-muted-foreground border-border",
    "Super Admin": "bg-red-500/15 text-red-400 border-red-500/20",
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-9 h-8 text-xs"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Manager">Manager</SelectItem>
            <SelectItem value="User">User</SelectItem>
            <SelectItem value="Viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs ml-auto" onClick={() => toast.info("Invite User — backend pending")}>
          <Plus className="w-3.5 h-3.5" /> Invite User
        </Button>
      </div>

      {/* Users table */}
      <Card className="bg-card/60 border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-xs">User</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Last Login</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user, i) => {
                const initials = user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <TableRow key={i} className="border-border">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground">{user.name}</p>
                          <p className="text-[10px] text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-[10px] border", roleColors[user.role] ?? "bg-muted text-muted-foreground border-border")}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full", user.status === "Active" ? "bg-emerald-500" : "bg-muted-foreground")} />
                        <span className="text-xs text-muted-foreground">{user.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell font-mono">
                      {user.lastLogin}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toast.info("Change Role — backend pending")}>
                          <Settings className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toast.info("View Profile — backend pending")}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main SecurityModule Component ───────────────────────────

export function SecurityModule() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Security Console</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Roles, audit logs, security policies, system monitoring and user access for this deployment.
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/30 p-1 w-full">
          <TabsTrigger value="dashboard" className="text-xs">Dashboard</TabsTrigger>
          <TabsTrigger value="roles" className="text-xs">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs">Audit Explorer</TabsTrigger>
          <TabsTrigger value="monitoring" className="text-xs">System Monitoring</TabsTrigger>
          <TabsTrigger value="policies" className="text-xs">Security Policies</TabsTrigger>
          <TabsTrigger value="users" className="text-xs">User Management</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-5"><DashboardTab /></TabsContent>
        <TabsContent value="roles" className="mt-5"><RolesTab /></TabsContent>
        <TabsContent value="audit" className="mt-5"><AuditTab /></TabsContent>
        <TabsContent value="monitoring" className="mt-5"><MonitoringTab /></TabsContent>
        <TabsContent value="policies" className="mt-5"><PoliciesTab /></TabsContent>
        <TabsContent value="users" className="mt-5"><UsersTab /></TabsContent>
      </Tabs>
    </div>
  );
}
