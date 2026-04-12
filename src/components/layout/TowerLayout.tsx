import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, Users, Shield, Receipt, Lock,
  Bell, Plug, FileText, Settings, HeadphonesIcon, BrainCircuit,
  Palette, ChevronLeft, ChevronRight, Zap, ArrowLeft,
} from "lucide-react";
import { UserProfileDropdown } from "@/components/auth/UserProfileDropdown";
import { ThemeToggle } from "@/components/theme";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { title: "Dashboard",        url: "/tower/dashboard",        icon: LayoutDashboard },
  { title: "Customers",        url: "/tower/customers",        icon: Building2 },
  { title: "Users",            url: "/tower/users",            icon: Users },
  { title: "Permissions",      url: "/tower/permissions",      icon: Shield },
  { title: "Proforma Invoice", url: "/tower/proforma-invoice", icon: Receipt },
  { title: "Security",         url: "/tower/security",         icon: Lock },
  { title: "Notifications",    url: "/tower/notifications",    icon: Bell },
  { title: "Integrations",     url: "/tower/integrations",     icon: Plug,         v2: true },
  { title: "Audit Logs",       url: "/tower/audit-logs",       icon: FileText },
  { title: "Settings",         url: "/tower/settings",         icon: Settings },
  { title: "Support",          url: "/tower/support",          icon: HeadphonesIcon },
  { title: "AI Insights",      url: "/tower/ai-insights",      icon: BrainCircuit, v2: true },
  { title: "Themes",           url: "/tower/themes",           icon: Palette,      v2: true },
];

interface TowerLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function TowerLayout({ children, title, subtitle }: TowerLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const activeNav = navItems.find(
    (item) =>
      location.pathname === item.url ||
      (item.url === "/tower/dashboard" &&
        (location.pathname === "/tower" || location.pathname === "/tower/"))
  );
  const pageLabel = title ?? activeNav?.title ?? "";

  return (
    <div className="dark flex h-screen overflow-hidden" style={{ background: "#0D1B2A" }}>
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col h-full shrink-0 transition-all duration-300 border-r border-white/[0.08]",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
        style={{ background: "#0D1B2A" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10">
            <Zap className="h-5 w-5 text-cyan-500" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <p className="text-sm font-semibold text-white tracking-tight">
                4DSmartOps
              </p>
              <p className="text-xs text-white/50">Control Tower</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {navItems.map((item) => {
            const active =
              location.pathname === item.url ||
              (item.url === "/tower/dashboard" &&
                (location.pathname === "/tower" || location.pathname === "/tower/"));

            const btn = (
              <button
                key={item.title}
                onClick={() => navigate(item.url)}
                className={cn(
                  "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-white/10 text-white font-medium"
                    : "text-white/55 hover:bg-white/[0.06] hover:text-white/90"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.title}</span>
                    {item.v2 && (
                      <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px] px-1.5 py-0 hover:bg-warning/20">
                        v2
                      </Badge>
                    )}
                  </>
                )}
              </button>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.title} delayDuration={0}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-2">
                    {item.title}
                    {item.v2 && (
                      <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px] px-1.5 py-0">
                        v2
                      </Badge>
                    )}
                  </TooltipContent>
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
            className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm text-white/40 hover:bg-white/[0.06] hover:text-white/70 transition-colors"
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
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0D1B2A]">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] shrink-0 bg-[#0D1B2A]">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => navigate("/welcome")}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 transition-colors group"
            >
              <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
              Back to App
            </button>
            <span className="text-white/30">›</span>
            <span className="text-white/60 font-medium">Control Tower</span>
            {pageLabel && (
              <>
                <span className="text-white/30">›</span>
                <span className="text-white font-medium">{pageLabel}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
                3
              </span>
            </button>
            <div className="[&_button]:text-white/50 [&_button]:hover:text-white/80 [&_button]:hover:bg-white/[0.06]">
              <ThemeToggle />
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-white/[0.08]">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.05]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-white/70 font-medium">Super Admin</span>
              </div>
              <UserProfileDropdown variant="app" />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
