import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Activity, CheckCircle2, AlertTriangle,
  GitCompare, Radio, Building2, Settings2, GitBranch,
  Upload, Download, ScrollText, Settings,
  ChevronLeft, ChevronRight, Zap, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserProfileDropdown } from "@/components/auth/UserProfileDropdown";
import { ThemeToggle } from "@/components/theme";

const navItems = [
  { title: "Dashboard",        url: "/bridge/dashboard",      icon: LayoutDashboard },
  { title: "Sync Monitor",     url: "/bridge/sync-monitor",   icon: Activity },
  { title: "Approval Inbox",   url: "/bridge/approvals",      icon: CheckCircle2 },
  { title: "Exceptions",       url: "/bridge/exceptions",     icon: AlertTriangle },
  { title: "Reconciliation",   url: "/bridge/reconciliation", icon: GitCompare },
  { title: "Agent Fleet",      url: "/bridge/agents",         icon: Radio },
  { title: "Company Registry", url: "/bridge/companies",      icon: Building2 },
  { title: "Sync Profiles",    url: "/bridge/sync-profiles",  icon: Settings2 },
  { title: "Field Mapper",     url: "/bridge/field-mapper",   icon: GitBranch },
  { title: "Import Hub",       url: "/bridge/import",         icon: Upload },
  { title: "Export Hub",       url: "/bridge/export",         icon: Download },
  { title: "Audit Explorer",   url: "/bridge/audit",          icon: ScrollText },
  { title: "Settings",         url: "/bridge/settings",       icon: Settings },
];

interface BridgeLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function BridgeLayout({ children, title, subtitle }: BridgeLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col h-full shrink-0 border-r border-white/[0.06] transition-all duration-300",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
        style={{ background: "hsl(var(--sidebar-background))" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <p className="text-sm font-semibold text-white tracking-tight">
                4DSmartOps
              </p>
              <p className="text-xs text-white/50">Bridge Console</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {navItems.map((item) => {
            const active =
              location.pathname === item.url ||
              (item.url === "/bridge/dashboard" &&
                (location.pathname === "/bridge" ||
                  location.pathname === "/bridge/"));

            const btn = (
              <button
                key={item.title}
                onClick={() => navigate(item.url)}
                className={cn(
                  "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-white/10 text-white font-medium"
                    : "text-white/60 hover:bg-white/[0.06] hover:text-white/90"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <span className="flex-1 text-left">{item.title}</span>
                )}
              </button>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.title} delayDuration={0}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right">{item.title}</TooltipContent>
                </Tooltip>
              );
            }
            return btn;
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="p-3 border-t border-white/[0.06]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            {title && (
              <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
            <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
            </button>
            <ThemeToggle />
            <UserProfileDropdown variant="app" />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
