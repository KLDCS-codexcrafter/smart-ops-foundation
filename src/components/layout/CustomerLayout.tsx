import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, IndianRupee, ScrollText,
  ShoppingCart, FolderOpen, HeadphonesIcon, User,
  ChevronLeft, ChevronRight, Building2, Bell, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { title: "Dashboard",  url: "/customer/dashboard", icon: LayoutDashboard },
  { title: "Invoices",   url: "/customer/invoices",  icon: FileText },
  { title: "Payments",   url: "/customer/payments",  icon: IndianRupee },
  { title: "Statement",  url: "/customer/statement",  icon: ScrollText },
  { title: "Orders",     url: "/customer/orders",     icon: ShoppingCart },
  { title: "Documents",  url: "/customer/documents",  icon: FolderOpen },
  { title: "Support",    url: "/customer/support",    icon: HeadphonesIcon },
  { title: "Profile",    url: "/customer/profile",    icon: User },
];

// [JWT] replace with real useCustomerProfile hook
const CUSTOMER = {
  name:       "Rajesh Procurement",
  company:    "Sharma Traders Pvt Ltd",
  tenantName: "Reliance Digital Solutions",
  email:      "rajesh@sharmatraders.in",
  initials:   "RP",
};

interface CustomerLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function CustomerLayout({ children, title, subtitle }: CustomerLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar — lighter card-style design */}
      <aside
        className={cn(
          "h-screen sticky top-0 flex flex-col border-r border-border bg-card transition-all duration-300",
          collapsed ? "w-[60px]" : "w-[220px]"
        )}
      >
        {/* Tenant branding */}
        <div className={cn(
          "flex items-center gap-2.5 border-b border-border/50 px-3 py-4",
          collapsed && "justify-center px-2"
        )}>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {CUSTOMER.tenantName}
              </p>
              <p className="text-[10px] text-muted-foreground">Customer Portal</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const active =
              location.pathname === item.url ||
              location.pathname.startsWith(item.url + "/");

            const btn = (
              <button
                key={item.url}
                onClick={() => navigate(item.url)}
                className={cn(
                  "flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </button>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.url}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right">{item.title}</TooltipContent>
                </Tooltip>
              );
            }
            return btn;
          })}
        </nav>

        {/* Customer profile footer */}
        <div className="border-t border-border/50 p-2">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-semibold text-accent shrink-0">
                {CUSTOMER.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">
                  {CUSTOMER.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {CUSTOMER.company}
                </p>
              </div>
              <ChevronLeft
                className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground shrink-0"
                onClick={() => setCollapsed(true)}
              />
            </div>
          ) : (
            <button
              onClick={() => setCollapsed(false)}
              className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h1 className="text-lg font-bold text-foreground">{title}</h1>
              )}
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <Bell className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-semibold text-accent">
                {CUSTOMER.initials}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
