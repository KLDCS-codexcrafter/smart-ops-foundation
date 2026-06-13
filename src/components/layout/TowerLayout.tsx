import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, Users, Shield, Receipt, Lock,
  Bell, Plug, FileText, Settings, HeadphonesIcon, BrainCircuit,
  Palette, ChevronLeft, ChevronRight, Zap, ArrowLeft, Boxes, Network,
} from "lucide-react";
import { UserProfileDropdown } from "@/components/auth/UserProfileDropdown";
import { ThemeToggle } from "@/components/theme";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { title: "Dashboard",        url: "/tower/dashboard",        icon: LayoutDashboard },
  { title: "Customers",        url: "/tower/customers",        icon: Building2 },
  { title: "Product Variants", url: "/tower/variants",         icon: Boxes },
  { title: "Provisioning",     url: "/tower/provisioning",     icon: Network },
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

export function TowerLayout({ children, title, subtitle: _subtitle }: TowerLayoutProps) {
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
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col h-full shrink-0 transition-all duration-300 border-r border-border bg-card",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <p className="text-sm font-semibold text-foreground tracking-tight">
                4DSmartOps
              </p>
              <p className="text-xs text-muted-foreground">Control Tower</p>
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
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
        <div className="p-3 border-t border-border">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
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
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-background">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => navigate("/welcome")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
              Back to App
            </button>
            <span className="text-muted-foreground/50">›</span>
            <span className="text-muted-foreground font-medium">Control Tower</span>
            {pageLabel && (
              <>
                <span className="text-muted-foreground/50">›</span>
                <span className="text-foreground font-medium">{pageLabel}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                3
              </span>
            </button>
            <ThemeToggle />
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                <span className="text-xs text-muted-foreground font-medium">Super Admin</span>
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
