import { useNavigate } from "react-router-dom";
import { TowerLayout } from "@/components/layout/TowerLayout";
import {
  Server, Database, Cable, Globe, Layers,
  UserPlus, Shield, Building2, ScrollText, CreditCard, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// [JWT] Replace with real auth context
const ADMIN_NAME = "Admin";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const bannerStats = [
  { value: "30", label: "Screens Delivered", color: "text-cyan-400" },
  { value: "3", label: "Panels Live", color: "text-cyan-400" },
  { value: "99.8%", label: "Platform Uptime", color: "text-emerald-400" },
  { value: "27", label: "Security Panels", color: "text-cyan-400" },
];

const services = [
  { name: "API Server", icon: Server, status: "LIVE" as const, latency: "12ms" },
  { name: "Database", icon: Database, status: "LIVE" as const, latency: "4ms" },
  { name: "Bridge Agent", icon: Cable, status: "LIVE" as const, latency: "28ms" },
  { name: "CDN", icon: Globe, status: "LIVE" as const, latency: "8ms" },
  { name: "Queue Worker", icon: Layers, status: "DEGRADED" as const, latency: "340ms" },
];

const gauges = [
  { label: "Total Tenants", value: 24, display: "24", max: 100, pct: 24, color: "#0EA5E9", subtitle: "+3 this month" },
  { label: "Active Users", value: 187, display: "187", max: 500, pct: 37, color: "#8B5CF6", subtitle: "Across all tenants" },
  { label: "Security Score", value: 91, display: "91", max: 100, pct: 91, color: "#10B981", subtitle: "CERT-In compliant" },
  { label: "Audit Events", value: 2847, display: "2.8K", max: 100, pct: 57, color: "#F59E0B", subtitle: "Last 30 days" },
];

const actions = [
  { icon: UserPlus, label: "Invite User", to: "/tower/users" },
  { icon: Shield, label: "Security Console", to: "/tower/security" },
  { icon: Building2, label: "Manage Tenants", to: "/tower/tenants" },
  { icon: ScrollText, label: "Audit Log", to: "/tower/audit-logs" },
  { icon: CreditCard, label: "Billing", to: "/tower/billing" },
  { icon: Activity, label: "System Health", to: null },
];

const activityTypeColors: Record<string, string> = {
  Security: "text-red-400 bg-red-400",
  Tenant: "text-cyan-400 bg-cyan-400",
  User: "text-purple-400 bg-purple-400",
  Billing: "text-amber-400 bg-amber-400",
  System: "text-emerald-400 bg-emerald-400",
  Audit: "text-slate-400 bg-slate-400",
};

// [JWT] Replace with real activity feed from API
const recentActivity = [
  { type: "Security", desc: "MFA enabled for user admin@acmeindia.in", time: "2 min ago" },
  { type: "Tenant", desc: "New tenant provisioned: Bharat Traders Pvt Ltd", time: "14 min ago" },
  { type: "User", desc: "User invited: priya.sharma@acmeindia.in", time: "31 min ago" },
  { type: "Security", desc: "IP Whitelist updated: 3 IPs added", time: "1 hr ago" },
  { type: "Billing", desc: "Invoice #INV-2026-047 generated — ₹18,500", time: "2 hr ago" },
  { type: "Security", desc: "Failed login attempt: unknown@hacker.xyz (blocked)", time: "3 hr ago" },
  { type: "Tenant", desc: "Tenant storage upgraded: Globe Exports (50GB → 100GB)", time: "4 hr ago" },
  { type: "System", desc: "Bridge Agent v2.4.1 deployed to all agents", time: "6 hr ago" },
  { type: "Audit", desc: "Audit log exported by superadmin — 2,847 events", time: "8 hr ago" },
  { type: "Security", desc: "Geo-fencing rule updated: Blocked 4 countries", time: "12 hr ago" },
];

function RadialGauge({ pct, color, display, label, subtitle }: {
  pct: number; color: string; display: string; label: string; subtitle: string;
}) {
  const r = 40, stroke = 8, size = (r + stroke) * 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="bg-[#1E3A5F] rounded-xl border border-slate-700 p-6 flex flex-col items-center">
      <svg width={size} height={size} className="mb-2">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#334155" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-700"
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
          fill={color} fontSize="20" fontWeight="bold" fontFamily="JetBrains Mono, monospace">
          {display}
        </text>
      </svg>
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <span className="text-[10px] text-slate-500 mt-0.5">{subtitle}</span>
    </div>
  );
}

export default function TowerDashboard() {
  const navigate = useNavigate();

  return (
    <TowerLayout title="Dashboard" subtitle="Platform overview — Super Admin">
      <div className="flex flex-col gap-6">

        {/* SECTION 1 — Greeting Banner */}
        <div className="bg-[#1E3A5F] rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{getGreeting()}, {ADMIN_NAME} 👋</h2>
            <p className="text-sm text-slate-400 mt-1">Platform is healthy · Last checked just now</p>
            <span className="inline-block mt-2 text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-medium">
              4DSmartOps Tower · Confidential
            </span>
          </div>
          <div className="flex flex-wrap gap-6">
            {bannerStats.map((s) => (
              <div key={s.label} className="flex flex-col items-center">
                <span className={cn("text-3xl font-bold font-mono", s.color)}>{s.value}</span>
                <span className="text-xs text-slate-400">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2 — PulseRing */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-slate-300">Platform Health</span>
            <span className="text-[10px] bg-emerald-900/60 text-emerald-400 px-2 py-0.5 rounded-full font-bold">All Systems</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {services.map((svc) => {
              const live = svc.status === "LIVE";
              return (
                <div key={svc.name} className="bg-[#1E3A5F] rounded-xl border border-slate-700 p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <svc.icon className="h-4 w-4 text-slate-300" />
                    <span className="text-sm text-white font-semibold">{svc.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full animate-pulse", live ? "bg-emerald-400" : "bg-amber-400")} />
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full",
                      live ? "bg-emerald-900/60 text-emerald-400" : "bg-amber-900/60 text-amber-400"
                    )}>{svc.status}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{svc.latency}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3 — Radial Gauges */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {gauges.map((g) => (
            <RadialGauge key={g.label} {...g} />
          ))}
        </div>

        {/* SECTION 4 — Action Dock */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={() => a.to ? navigate(a.to) : toast("System Health: All nominal")}
              className="bg-[#1E3A5F] rounded-xl border border-slate-700 hover:border-cyan-500 p-4 flex flex-col items-center gap-2 cursor-pointer transition-all hover:bg-[#24466d] group"
            >
              <a.icon className="h-5 w-5 text-cyan-400 transition-transform group-hover:scale-105" />
              <span className="text-xs text-slate-300">{a.label}</span>
            </button>
          ))}
        </div>

        {/* SECTION 5 — Activity + Security */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Activity Feed */}
          <div className="lg:col-span-3 bg-[#1E3A5F] rounded-xl border border-slate-700 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivity.map((item, i) => {
                const colors = activityTypeColors[item.type] || "text-slate-400 bg-slate-400";
                const [textColor, dotColor] = colors.split(" ");
                return (
                  <div key={i} className="flex items-start gap-3">
                    <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", dotColor)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn("text-[10px] font-bold uppercase", textColor)}>{item.type}</span>
                      </div>
                      <p className="text-sm text-white truncate">{item.desc}</p>
                      <span className="text-xs text-slate-400">{item.time}</span>
                    </div>
                    <button className="text-xs text-cyan-400 shrink-0 hover:underline">View</button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Security Health */}
          <div className="lg:col-span-2 bg-[#1E3A5F] rounded-xl border border-slate-700 p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="h-4 w-4 text-white" />
              <span className="text-sm font-semibold text-white">Security Health</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <span className="text-6xl font-black text-emerald-400 font-mono">91</span>
              <span className="text-xs text-slate-400 mt-1">Platform Security Score</span>
              <div className="w-full h-2 rounded-full bg-slate-700 mt-4 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: "91%" }} />
              </div>
            </div>
            <div className="space-y-2 mt-6">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span className="text-xs text-amber-400">Queue Worker degraded — monitor closely</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                <span className="text-xs text-red-400">3 failed login attempts in last hour</span>
              </div>
            </div>
            <button
              onClick={() => navigate("/tower/security")}
              className="mt-4 w-full text-sm text-cyan-400 border border-cyan-500/40 rounded-lg py-2 hover:bg-cyan-500/10 transition-colors"
            >
              View Security Console →
            </button>
          </div>
        </div>
      </div>
    </TowerLayout>
  );
}