import {
  Users, Activity, Clock, Shield, Building2, Terminal,
  ArrowRight, FileText, Database,
} from "lucide-react";
import type { CommandCenterModule } from "../pages/CommandCenterPage";

interface OverviewModuleProps {
  onNavigate: (module: CommandCenterModule) => void;
}

const KPI_CARDS = [
  { label: "Active Users", value: "—", sub: "placeholder", icon: Users, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
  { label: "Audit Events Today", value: "0", sub: "placeholder", icon: Shield, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  { label: "Foundation Setup", value: "0%", sub: "configured", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  { label: "Security Score", value: "87", sub: "out of 100", icon: Shield, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
];

const MOCK_ACTIVITY = [
  { action: "Platform initialized", time: "Today 09:00", type: "info" },
  { action: "Security policies loaded", time: "Today 09:02", type: "success" },
  { action: "Module registry synced", time: "Today 09:05", type: "info" },
  { action: "Bridge Agent connected", time: "Today 09:10", type: "success" },
  { action: "System health check passed", time: "Today 09:15", type: "success" },
];

const QUICK_ACTIONS = [
  { label: "Add User", icon: Users, module: "console" as CommandCenterModule },
  { label: "Run Audit", icon: Activity, module: "console" as CommandCenterModule },
  { label: "Export Data", icon: Database, module: "console" as CommandCenterModule },
  { label: "View Logs", icon: FileText, module: "console" as CommandCenterModule },
  { label: "Foundation", icon: Building2, module: "core" as CommandCenterModule },
  { label: "Console", icon: Terminal, module: "console" as CommandCenterModule },
];

export function OverviewModule({ onNavigate }: OverviewModuleProps) {
  return (
    <div className="space-y-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`glass-card rounded-2xl border p-5 ${card.bg}`}>
              <Icon className={`w-5 h-5 ${card.color} mb-3`} />
              <div className="text-2xl font-bold text-foreground font-mono">{card.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
              <div className="text-[10px] text-muted-foreground/60">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Runway Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            module: "core" as CommandCenterModule,
            icon: Building2,
            title: "Foundation & Core",
            description: "Configure organizational structure, master data, geography, and system settings.",
            progress: 0,
            color: "group-hover:text-cyan-400",
          },
          {
            module: "console" as CommandCenterModule,
            icon: Terminal,
            title: "Security Console",
            description: "Manage roles, audit logs, security policies, system monitoring and user access.",
            progress: 45,
            color: "group-hover:text-violet-400",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.module}
              onClick={() => onNavigate(card.module)}
              className="group glass-card rounded-2xl p-5 border border-border hover:border-primary/30 text-left transition-all duration-300 hover:scale-[1.01]"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <Icon className={`h-5 w-5 text-muted-foreground ${card.color} transition-colors`} />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">{card.title}</h3>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{card.description}</p>
              <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/60 rounded-full transition-all duration-700"
                  style={{ width: `${card.progress}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{card.progress}% configured</p>
            </button>
          );
        })}
      </div>

      {/* Action Dock */}
      <div className="glass-card rounded-2xl border border-border p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => onNavigate(action.module)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/50 hover:border-primary/30 transition-all text-sm text-foreground"
              >
                <Icon className="w-3.5 h-3.5 text-primary" />
                {action.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="glass-card rounded-2xl border border-border p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Recent Activity</p>
        <div className="flex flex-col gap-0">
          {MOCK_ACTIVITY.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
              <div className="flex items-center gap-3">
                <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${item.type === "success" ? "bg-emerald-400" : "bg-cyan-400"}`} />
                <span className="text-sm text-foreground">{item.action}</span>
              </div>
              <span className="text-xs text-muted-foreground">{item.time}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
