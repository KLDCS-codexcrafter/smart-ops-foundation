import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  LayoutDashboard, Shield, Settings, Server,
  Database, Users, ArrowRight, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const quickLinks = [
  { icon: Settings, label: "Foundation & Core", desc: "Org structure, branches, fiscal years", route: "/erp/command-center/hub" },
  { icon: Shield, label: "Security Console", desc: "Roles, MFA, IP whitelisting", route: "/erp/command-center/hub" },
  { icon: Users, label: "User Management", desc: "Users, invites and access control", route: "/erp/command-center/hub" },
  { icon: Database, label: "Master Data", desc: "Currencies, UoM, numbering series", route: "/erp/command-center/hub" },
];

const platformStats = [
  { label: "Active Users", value: "187", icon: Users, color: "text-primary" },
  { label: "Security Score", value: "91%", icon: Shield, color: "text-emerald-500" },
  { label: "System Uptime", value: "99.8%", icon: Server, color: "text-cyan-500" },
  { label: "Health Check", value: "OK", icon: Activity, color: "text-amber-500" },
];

export default function CommandCenterWelcome() {
  const navigate = useNavigate();

  return (
    <AppLayout
      title="Command Center"
      breadcrumbs={[
        { label: "ERP", href: "/erp" },
        { label: "Command Center" },
      ]}
    >
      <div className="flex flex-col gap-6">
        {/* Hero */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <LayoutDashboard className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Command Center</h2>
                <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-500">
                  Work in Progress
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground max-w-lg">
                Platform administration, foundation setup and security console.
                Configure your organisation structure, manage users, and monitor system health.
              </p>
            </div>
            <button
              onClick={() => navigate("/erp/command-center/hub")}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Open Hub <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {platformStats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <s.icon className={cn("h-5 w-5", s.color)} />
              </div>
              <div>
                <span className="text-lg font-bold text-foreground font-mono">{s.value}</span>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Quick Access</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => navigate(link.route)}
                className="rounded-xl border border-border bg-card hover:border-primary/40 p-4 text-left transition-all group"
              >
                <link.icon className="h-5 w-5 text-primary mb-2 transition-transform group-hover:scale-110" />
                <span className="text-sm font-semibold text-foreground block">{link.label}</span>
                <span className="text-xs text-muted-foreground">{link.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
