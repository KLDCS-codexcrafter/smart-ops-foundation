import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  CreditCard,
  Lock,
  Bell,
  Plug,
  FileText,
  Settings,
  HeadphonesIcon,
  BrainCircuit,
  Palette,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import { UserProfileDropdown } from "@/components/auth/UserProfileDropdown";
import { ThemeToggle } from "@/components/theme";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { title: "Dashboard", url: "/tower/dashboard", icon: LayoutDashboard },
  { title: "Tenants", url: "/tower/tenants", icon: Building2 },
  { title: "Users", url: "/tower/users", icon: Users },
  { title: "Permissions", url: "/tower/permissions", icon: Shield },
  { title: "Billing", url: "/tower/billing", icon: CreditCard },
  { title: "Security", url: "/tower/security", icon: Lock },
  { title: "Notifications", url: "/tower/notifications", icon: Bell },
  { title: "Integrations", url: "/tower/integrations", icon: Plug, v2: true },
  { title: "Audit Logs", url: "/tower/audit-logs", icon: FileText },
  { title: "Settings", url: "/tower/settings", icon: Settings },
  { title: "Support", url: "/tower/support", icon: HeadphonesIcon },
  { title: "AI Insights", url: "/tower/ai-insights", icon: BrainCircuit, v2: true },
  
  { title: "Themes", url: "/tower/themes", icon: Palette, v2: true },
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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col h-full shrink-0 border-r transition-all duration-300",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
        style={{ background: "hsl(222 47% 11%)", borderColor: "rgba(255,255,255,0.06)" }}
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
                (location.pathname === "/tower" ||
                  location.pathname === "/tower/"));

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
