/**
 * @file    Welcome.tsx
 * @what    Post-login landing page — hub for all panels + Support Ops + Server Ops
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Cpu, LayoutDashboard, GitMerge, BarChart3, Handshake, LayoutGrid, Puzzle,
  Users, Compass, ArrowRight, ArrowLeft, Home, HelpCircle,
  Settings, HeadphonesIcon, Server, AlertTriangle, CheckCircle,
  Clock, Search, Plus, Wifi, WifiOff, Activity,
  HardDrive, Gauge, XCircle, AlertCircle,
  Grid3X3, Bell, RefreshCw, Sparkles, Circle, Boxes, Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UserProfileDropdown } from "@/components/auth/UserProfileDropdown";
import { ThemeToggle } from "@/components/theme";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 11) return { text: "Good Morning", emoji: "🌅" };
  if (hour >= 12 && hour <= 16) return { text: "Good Afternoon", emoji: "☀️" };
  if (hour >= 17 && hour <= 20) return { text: "Good Evening", emoji: "🌆" };
  return { text: "Working Late", emoji: "🌙" };
}

function getUserName(): string {
  try {
    const raw = localStorage.getItem("4ds_login_credential");
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.value ?? "Welcome";
    }
  } catch { /* ignore */ }
  return "Welcome";
}

// ── Panel & Quick Action data ─────────────────────────────────
const panelCards = [
  {
    title: "Control Tower",
    icon: LayoutDashboard,
    route: "/tower/dashboard",
    description: "Platform management & customer administration — users, plans, billing, security.",
    badge: null,
  },
  {
    title: "Bridge Console",
    icon: GitMerge,
    route: "/bridge/dashboard",
    description: "Tally sync operations & exception management — live bridge agent monitoring.",
    badge: null,
  },
  {
    title: "Operix Udyam Kendra Prism Nexus",
    icon: BarChart3,
    route: "/erp/dashboard",
    description: "Business Operations Hub — Full ERP · Modules · Small Projects",
    badge: "wip",
  },
  {
    title: "Partner Panel",
    icon: Handshake,
    route: "/partner/dashboard",
    description: "Partner dashboard & commission management.",
    badge: "wip",
  },
  {
    title: "Customer Portal",
    icon: Users,
    route: "/customer/dashboard",
    description: "Self-service invoices, payments, orders and support for your B2B clients.",
    badge: "wip",
  },
  {
    title: "Vertical",
    icon: LayoutGrid,
    route: "/verticals",
    description: "Industry-specific ERP systems built for other sectors. Current: Hospital Management, School & Education ERP. Planned: Hotel, Clinic & Pharmacy, Construction, Agriculture.",
    badge: "wip",
  },
  {
    title: "Modules",
    icon: Boxes,
    route: "/modules",
    description: "Standalone modules that work independently or bolt-on to any vertical. Current: GateFlow (gate management). Planned: Document Management, Standalone HR, Service Desk, AMC Management.",
    badge: "wip",
  },
  {
    title: "Add-ons",
    icon: Puzzle,
    route: "/add-ons",
    description: "Optional extensions beyond the core ERP. Current: Barcode (standalone label generation for Tally users). Planned: WhatsApp integration, AI price forecasting, hardware connectors.",
    badge: null,
  },
  {
    title: "Client Customized",
    icon: Wrench,
    route: "/client-customized",
    description: "Products built specifically for individual clients per their unique requirements. These are bespoke builds — not available in the general catalogue. Each entry is a dedicated client project.",
    badge: "wip",
  },
  {
    title: "Prudent 360",
    icon: Compass,
    route: "/prudent360",
    description: "Tools, documentation & intelligence hub.",
    badge: "wip",
  },
];

const quickActions = [
  { icon: BarChart3, label: "Reports", href: "/erp/dashboard" },
  { icon: Users, label: "Team", href: "/tower/dashboard" },
  { icon: GitMerge, label: "Sync Status", href: "/bridge/dashboard" },
  { icon: Handshake, label: "Partners", href: "/partner/dashboard" },
  { icon: HelpCircle, label: "Support", href: "/my/dashboard" },
  { icon: Settings, label: "Settings", href: "/profile" },
];

// ── Support Ops data ──────────────────────────────────────────
type TicketPriority = "Critical" | "High" | "Medium" | "Low";
type TicketStatus = "Open" | "In Progress" | "Escalated" | "Resolved";

interface SupportTicket {
  id: string;
  title: string;
  tenant: string;
  priority: TicketPriority;
  status: TicketStatus;
  sla: "ok" | "warning" | "breach";
  agent: string;
  created: string;
}

const MOCK_TICKETS: SupportTicket[] = [
  { id: "TKT-1041", title: "Bridge Agent disconnected — no sync since 6 hours", tenant: "Sharma Traders Pvt Ltd", priority: "Critical", status: "Escalated", sla: "breach", agent: "Rahul S.", created: "2h ago" },
  { id: "TKT-1040", title: "GST report not generating for October 2025", tenant: "Reliance Digital Solutions", priority: "High", status: "In Progress", sla: "warning", agent: "Priya M.", created: "3h ago" },
  { id: "TKT-1039", title: "Unable to login — password reset not working", tenant: "Mehta Industries", priority: "High", status: "Open", sla: "ok", agent: "Unassigned", created: "4h ago" },
  { id: "TKT-1038", title: "Payroll processing stuck at 78%", tenant: "Gupta & Sons Mfg.", priority: "Critical", status: "In Progress", sla: "breach", agent: "Suresh K.", created: "5h ago" },
  { id: "TKT-1037", title: "Vendor portal — supplier cannot submit invoice", tenant: "Sharma Traders Pvt Ltd", priority: "Medium", status: "Open", sla: "ok", agent: "Anita R.", created: "6h ago" },
  { id: "TKT-1036", title: "Inventory count mismatch in cycle count report", tenant: "Patel Chemicals Ltd", priority: "Medium", status: "In Progress", sla: "ok", agent: "Vikram D.", created: "8h ago" },
  { id: "TKT-1035", title: "Production MRP run taking too long", tenant: "Mehta Industries", priority: "Low", status: "Open", sla: "ok", agent: "Unassigned", created: "10h ago" },
  { id: "TKT-1034", title: "Bank reconciliation entries missing after import", tenant: "Reliance Digital Solutions", priority: "High", status: "Escalated", sla: "warning", agent: "Priya M.", created: "12h ago" },
  { id: "TKT-1033", title: "SalesX geo-tracking not updating on mobile", tenant: "Gupta & Sons Mfg.", priority: "Medium", status: "In Progress", sla: "ok", agent: "Rahul S.", created: "1d ago" },
  { id: "TKT-1032", title: "TDS section 194C not showing in dropdown", tenant: "Patel Chemicals Ltd", priority: "Low", status: "Resolved", sla: "ok", agent: "Suresh K.", created: "1d ago" },
  { id: "TKT-1031", title: "Email notifications not being sent for approvals", tenant: "Sharma Traders Pvt Ltd", priority: "Medium", status: "Resolved", sla: "ok", agent: "Anita R.", created: "2d ago" },
  { id: "TKT-1030", title: "User account locked — too many failed attempts", tenant: "Mehta Industries", priority: "Low", status: "Resolved", sla: "ok", agent: "Vikram D.", created: "2d ago" },
  { id: "TKT-1029", title: "GRN entry crashing on large item count", tenant: "Reliance Digital Solutions", priority: "High", status: "Resolved", sla: "ok", agent: "Rahul S.", created: "3d ago" },
  { id: "TKT-1028", title: "Chart of accounts import failing for more than 500 rows", tenant: "Gupta & Sons Mfg.", priority: "Medium", status: "Resolved", sla: "ok", agent: "Priya M.", created: "3d ago" },
  { id: "TKT-1027", title: "Service desk SLA calendar not syncing correctly", tenant: "Patel Chemicals Ltd", priority: "Low", status: "Resolved", sla: "ok", agent: "Suresh K.", created: "4d ago" },
];

// ── Server Ops data ───────────────────────────────────────────
interface TenantHealth {
  id: string;
  name: string;
  plan: string;
  cpu: number;
  memory: number;
  storage: number;
  latency: number;
  uptime: number;
  bridge: "connected" | "disconnected" | "error";
  lastSync: string;
  status: "healthy" | "degraded" | "critical";
}

const MOCK_TENANTS: TenantHealth[] = [
  { id: "t1", name: "Sharma Traders Pvt Ltd", plan: "ERP Full", cpu: 34, memory: 58, storage: 42, latency: 138, uptime: 99.8, bridge: "error", lastSync: "6h ago", status: "critical" },
  { id: "t2", name: "Reliance Digital Solutions", plan: "ERP Full", cpu: 28, memory: 61, storage: 55, latency: 142, uptime: 99.9, bridge: "connected", lastSync: "2m ago", status: "healthy" },
  { id: "t3", name: "Mehta Industries", plan: "Manufacturing Pack", cpu: 45, memory: 72, storage: 38, latency: 167, uptime: 99.7, bridge: "connected", lastSync: "5m ago", status: "degraded" },
  { id: "t4", name: "Gupta & Sons Mfg.", plan: "ERP Full", cpu: 22, memory: 48, storage: 31, latency: 124, uptime: 100.0, bridge: "connected", lastSync: "1m ago", status: "healthy" },
  { id: "t5", name: "Patel Chemicals Ltd", plan: "ERP Mid", cpu: 19, memory: 44, storage: 67, latency: 151, uptime: 99.9, bridge: "connected", lastSync: "3m ago", status: "healthy" },
  { id: "t6", name: "Iyer Textiles Pvt Ltd", plan: "SME Starter", cpu: 12, memory: 31, storage: 22, latency: 118, uptime: 100.0, bridge: "connected", lastSync: "4m ago", status: "healthy" },
  { id: "t7", name: "Singh Agro Foods", plan: "Manufacturing Pack", cpu: 67, memory: 81, storage: 74, latency: 289, uptime: 98.2, bridge: "disconnected", lastSync: "2h ago", status: "critical" },
  { id: "t8", name: "Nair Pharmaceuticals", plan: "ERP Mid", cpu: 31, memory: 55, storage: 48, latency: 144, uptime: 99.8, bridge: "connected", lastSync: "6m ago", status: "healthy" },
];

const ERROR_RATE_DATA = [
  { tenant: "Sharma", rate: 2.4 },
  { tenant: "Reliance", rate: 0.3 },
  { tenant: "Mehta", rate: 1.1 },
  { tenant: "Gupta", rate: 0.1 },
  { tenant: "Patel", rate: 0.4 },
  { tenant: "Iyer", rate: 0.0 },
  { tenant: "Singh", rate: 4.8 },
  { tenant: "Nair", rate: 0.2 },
];

// ── Tab 1: Workspace ──────────────────────────────────────────
function WorkspaceTab({ navigate }: { navigate: (path: string) => void }) {
  return (
    <>
      <div className="mb-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Your Workspace
        </p>
        <div className="h-px bg-gradient-to-r from-border via-border/50 to-transparent" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {panelCards.map((card, i) => (
          <button
            key={card.title}
            onClick={() => navigate(card.route)}
            className="group relative overflow-hidden rounded-2xl p-6 sm:p-8 text-left w-full transition-all duration-500 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 animate-slide-up"
            style={{ animationDelay: `${0.1 + i * 0.08}s`, animationFillMode: "backwards" }}
          >
            <div className="absolute inset-0 backdrop-blur-xl border rounded-2xl bg-card/60 border-border" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl" />

            {card.badge === "wip" && (
              <span className="absolute top-3 right-3 z-20 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/30">
                Work in Progress
              </span>
            )}

            <div className="relative z-10 flex flex-col min-h-[160px]">
              <div className="w-12 h-12 rounded-xl bg-muted/50 group-hover:bg-muted/70 transition-colors flex items-center justify-center">
                <card.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="mt-auto">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  {card.title}
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground/80 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-8 glass-card rounded-2xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick Actions
        </p>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.href)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/50 hover:bg-background/80 border border-border/50 hover:border-accent/50 transition-all duration-200 hover:scale-105"
            >
              <action.icon className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Tab 2: Support Operations ─────────────────────────────────
function SupportOpsTab() {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = MOCK_TICKETS.filter(t => {
    const matchSearch = !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.tenant.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());
    const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchPriority && matchStatus;
  });

  const stats = {
    open: MOCK_TICKETS.filter(t => t.status !== "Resolved").length,
    critical: MOCK_TICKETS.filter(t => t.priority === "Critical").length,
    breaching: MOCK_TICKETS.filter(t => t.sla === "breach").length,
    resolved: MOCK_TICKETS.filter(t => t.status === "Resolved").length,
  };

  const priorityColors: Record<TicketPriority, string> = {
    Critical: "bg-red-500/15 text-red-400 border-red-500/20",
    High: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    Medium: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    Low: "bg-muted text-muted-foreground border-border",
  };

  const statusColors: Record<TicketStatus, string> = {
    Open: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    "In Progress": "bg-amber-500/15 text-amber-400 border-amber-500/20",
    Escalated: "bg-red-500/15 text-red-400 border-red-500/20",
    Resolved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  };

  const slaConfig = {
    ok: { icon: CheckCircle, color: "text-emerald-400" },
    warning: { icon: AlertCircle, color: "text-amber-400" },
    breach: { icon: XCircle, color: "text-red-400" },
  };

  return (
    <div className="space-y-6">
      {stats.breaching > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">
            {stats.breaching} ticket{stats.breaching > 1 ? "s are" : " is"} breaching SLA — immediate attention required
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Open", value: stats.open, icon: Clock, color: "text-cyan-400" },
          { label: "Critical", value: stats.critical, icon: AlertTriangle, color: "text-red-400" },
          { label: "SLA Breaching", value: stats.breaching, icon: XCircle, color: "text-amber-400" },
          { label: "Resolved Today", value: stats.resolved, icon: CheckCircle, color: "text-emerald-400" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl bg-card/60 backdrop-blur-xl border border-border p-4 text-center">
              <Icon className={cn("h-5 w-5 mx-auto mb-1", s.color)} />
              <p className="text-2xl font-bold text-foreground font-mono">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tickets..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Escalated">Escalated</SelectItem>
            <SelectItem value="Resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => toast.info("Create Ticket — backend pending")}>
          <Plus className="h-4 w-4 mr-1" /> Create Ticket
        </Button>
      </div>

      <div className="rounded-xl bg-card/60 backdrop-blur-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">SLA</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No tickets match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((ticket) => {
                  const SlaIcon = slaConfig[ticket.sla].icon;
                  return (
                    <tr key={ticket.id} className={cn("border-b border-border/50 hover:bg-muted/30 transition-colors", ticket.sla === "breach" && "bg-red-500/5")}>
                      <td className="px-4 py-3">
                        <p className="font-mono font-semibold text-foreground">{ticket.id}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[250px]">{ticket.title}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{ticket.tenant}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={statusColors[ticket.status]}>{ticket.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <SlaIcon className={cn("h-4 w-4", slaConfig[ticket.sla].color)} />
                      </td>
                      <td className={cn("px-4 py-3", ticket.agent === "Unassigned" ? "italic text-destructive" : "text-muted-foreground")}>
                        {ticket.agent}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{ticket.created}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab 3: Server Operations ──────────────────────────────────
function ServerOpsTab() {
  const healthy = MOCK_TENANTS.filter(t => t.status === "healthy").length;
  const degraded = MOCK_TENANTS.filter(t => t.status === "degraded").length;
  const critical = MOCK_TENANTS.filter(t => t.status === "critical").length;
  const criticalTenants = MOCK_TENANTS.filter(t => t.status === "critical");

  const statusDot: Record<string, string> = {
    healthy: "bg-emerald-500",
    degraded: "bg-amber-500",
    critical: "bg-red-500",
  };

  const statusBorder: Record<string, string> = {
    healthy: "border-border",
    degraded: "border-amber-500/30",
    critical: "border-red-500/30 bg-red-500/5",
  };

  function bridgeInfo(b: TenantHealth["bridge"]) {
    if (b === "connected") return { Icon: Wifi, color: "text-emerald-400", label: "Connected" };
    if (b === "error") return { Icon: AlertTriangle, color: "text-red-400", label: "Error" };
    return { Icon: WifiOff, color: "text-amber-400", label: "Disconnected" };
  }

  function barColor(val: number) {
    if (val > 75) return "bg-red-500";
    if (val > 60) return "bg-amber-500";
    return "bg-primary";
  }

  return (
    <div className="space-y-6">
      {criticalTenants.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">
              Critical alerts on {criticalTenants.length} customer{criticalTenants.length > 1 ? "s" : ""}:
            </p>
            <p className="text-xs text-red-400/80">{criticalTenants.map(t => t.name).join(" · ")}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Customers", value: MOCK_TENANTS.length, icon: Server, color: "text-cyan-400" },
          { label: "Healthy", value: healthy, icon: CheckCircle, color: "text-emerald-400" },
          { label: "Degraded", value: degraded, icon: AlertCircle, color: "text-amber-400" },
          { label: "Critical", value: critical, icon: XCircle, color: "text-red-400" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl bg-card/60 backdrop-blur-xl border border-border p-4 text-center">
              <Icon className={cn("h-5 w-5 mx-auto mb-1", s.color)} />
              <p className="text-2xl font-bold text-foreground font-mono">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {MOCK_TENANTS.map(tenant => {
          const bridge = bridgeInfo(tenant.bridge);
          return (
            <div key={tenant.id} className={cn("rounded-xl bg-card/60 backdrop-blur-xl border p-4 space-y-3", statusBorder[tenant.status])}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full animate-pulse", statusDot[tenant.status])} />
                  <h4 className="font-semibold text-sm text-foreground">{tenant.name}</h4>
                </div>
                <Badge variant="outline" className="text-[10px]">{tenant.plan}</Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground mb-1">CPU</p>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", barColor(tenant.cpu))} style={{ width: `${tenant.cpu}%` }} />
                  </div>
                  <p className="text-foreground font-mono mt-0.5">{tenant.cpu}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Memory</p>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", barColor(tenant.memory))} style={{ width: `${tenant.memory}%` }} />
                  </div>
                  <p className="text-foreground font-mono mt-0.5">{tenant.memory}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Storage</p>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", barColor(tenant.storage))} style={{ width: `${tenant.storage}%` }} />
                  </div>
                  <p className="text-foreground font-mono mt-0.5">{tenant.storage}%</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <bridge.Icon className={cn("h-3.5 w-3.5", bridge.color)} />
                  <span className={bridge.color}>{bridge.label}</span>
                </div>
                <span className="text-muted-foreground">Latency: <span className="font-mono text-foreground">{tenant.latency}ms</span></span>
                <span className="text-muted-foreground">Uptime: <span className="font-mono text-foreground">{tenant.uptime}%</span></span>
                <span className="text-muted-foreground">Sync: <span className="font-mono text-foreground">{tenant.lastSync}</span></span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-card/60 backdrop-blur-xl border border-border p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Error Rate by Customer (%)</p>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ERROR_RATE_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="tenant" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
type WelcomeTab = "workspace" | "support" | "server";

export default function Welcome() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<WelcomeTab>("workspace");

  useEffect(() => {
    const token = localStorage.getItem("4ds_token");
    if (!token) {
      navigate("/auth/login", { replace: true });
    } else {
      setAuthenticated(true);
    }
  }, [navigate]);

  if (!authenticated) return null;

  const greeting = getGreeting();
  const userName = getUserName();
  const todayFormatted = format(new Date(), "EEEE, dd MMM yyyy");

  const tabs: { key: WelcomeTab; label: string; icon: typeof LayoutDashboard }[] = [
    { key: "workspace", label: "Workspace", icon: LayoutDashboard },
    { key: "support", label: "Support Ops", icon: HeadphonesIcon },
    { key: "server", label: "Server Ops", icon: Server },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-30 animate-float-1 animate-pulse-glow pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--orb-1) / 0.4), transparent 70%)" }}
        />
        <div
          className="absolute top-1/2 -left-24 w-80 h-80 rounded-full opacity-20 animate-float-2 animate-pulse-glow pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--orb-2) / 0.3), transparent 70%)", animationDelay: "2s" }}
        />
        <div
          className="absolute -bottom-20 right-1/3 w-72 h-72 rounded-full opacity-25 animate-float-3 animate-pulse-glow pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--orb-3) / 0.35), transparent 70%)", animationDelay: "4s" }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border/50 h-14 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Cpu className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm text-foreground hidden sm:inline">4DSmartOps</span>
          <Separator orientation="vertical" className="h-5 bg-border/50 hidden sm:block" />
          {/* Nav pill — Back / Forward / Home */}
          <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-0.5 gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.history.back()}>
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.history.forward()}>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate("/welcome")}>
              <Home className="h-3.5 w-3.5" />
            </Button>
          </div>
          {/* Search */}
          <div className="hidden md:block w-52">
            <Input
              placeholder="Search... (Ctrl+K)"
              className="h-8 text-xs bg-muted/30 border-border/50"
            />
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {/* App launcher */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/erp/dashboard")}>
            <Grid3X3 className="h-4 w-4" />
          </Button>
          {/* Refresh */}
          <Button variant="ghost" size="icon" className="h-8 w-8 hidden md:flex" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {/* Data freshness dot */}
          <Button variant="ghost" size="icon" className="h-8 w-8 hidden md:flex">
            <Circle className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500 animate-pulse" />
          </Button>
          {/* Bell */}
          <Button variant="ghost" size="icon" className="h-8 w-8 relative">
            <Bell className="h-4 w-4" />
          </Button>
          <ThemeToggle />
          <UserProfileDropdown variant="app" />
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-6xl">
        {/* Greeting */}
        <div className="animate-fade-in mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {greeting.emoji} {greeting.text}, {userName}
          </h1>
          <p className="text-muted-foreground mt-1">{todayFormatted}</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 mb-8 overflow-x-auto border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "workspace" && <WorkspaceTab navigate={(p) => navigate(p)} />}
        {activeTab === "support" && <SupportOpsTab />}
        {activeTab === "server" && <ServerOpsTab />}

        {/* Footer */}
        <footer className="mt-12 py-4 border-t border-border/30 text-center text-xs text-muted-foreground">
          © 2026 4DSmartOps · v0.1 · Built for Indian SMEs
        </footer>
      </main>
    </div>
  );
}
