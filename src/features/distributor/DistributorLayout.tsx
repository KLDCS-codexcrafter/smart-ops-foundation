/**
 * DistributorLayout.tsx — Distributor portal shell.
 * Sprint 10. Indigo-600 accent. Wraps all /partner/* pages.
 * Separate auth boundary: redirects to /partner/login when no session.
 */
import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, FileText, IndianRupee,
  Megaphone, ChevronLeft, ChevronRight, Truck, Bell, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getDistributorSession, clearDistributorSession } from '@/lib/distributor-auth-engine';
import { toast } from 'sonner';

const navItems = [
  { title: 'Dashboard', url: '/partner/dashboard', icon: LayoutDashboard },
  { title: 'Catalog',   url: '/partner/catalog',   icon: Package },
  { title: 'Cart',      url: '/partner/cart',      icon: ShoppingCart },
  { title: 'Invoices',  url: '/partner/invoices',  icon: FileText },
  { title: 'Payments',  url: '/partner/payments',  icon: IndianRupee },
  { title: 'Updates',   url: '/partner/updates',   icon: Megaphone },
];

interface DistributorLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function DistributorLayout({ children, title, subtitle }: DistributorLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const session = getDistributorSession();
  if (!session) return <Navigate to="/partner/login" replace />;

  const initials = session.legal_name
    .split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || 'PR';

  const handleLogout = () => {
    clearDistributorSession();
    toast.success('Signed out');
    navigate('/partner/login');
  };

  const tierBadge = {
    gold:   { bg: 'rgba(234,179,8,0.15)',  fg: 'hsl(38 92% 50%)',  label: 'GOLD' },
    silver: { bg: 'rgba(148,163,184,0.18)', fg: 'hsl(215 16% 47%)', label: 'SILVER' },
    bronze: { bg: 'rgba(180,83,9,0.15)',    fg: 'hsl(25 95% 39%)',  label: 'BRONZE' },
  }[session.tier];

  return (
    <div className="min-h-screen flex bg-background">
      <aside
        className={cn(
          'h-screen sticky top-0 flex flex-col border-r transition-all duration-300',
          collapsed ? 'w-[60px]' : 'w-[220px]',
        )}
        style={{ background: 'hsl(222 47% 11%)', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        {/* Brand */}
        <div className={cn(
          'flex items-center gap-2.5 border-b border-border/50 px-3 py-4',
          collapsed && 'justify-center px-2',
        )}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'hsl(231 48% 48% / 0.18)' }}
          >
            <Truck className="h-4 w-4" style={{ color: 'hsl(231 48% 68%)' }} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {session.legal_name}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {session.partner_code}
              </p>
            </div>
          )}
        </div>

        {/* Tier chip */}
        {!collapsed && (
          <div className="px-3 py-2">
            <span
              className="inline-block text-[9px] font-bold tracking-wider px-2 py-0.5 rounded"
              style={{ background: tierBadge.bg, color: tierBadge.fg }}
            >
              {tierBadge.label} TIER
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map(item => {
            const active =
              location.pathname === item.url ||
              location.pathname.startsWith(item.url + '/');
            const btn = (
              <button
                key={item.url}
                onClick={() => navigate(item.url)}
                className={cn(
                  'flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-sm transition-colors',
                  active
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  collapsed && 'justify-center px-2',
                )}
                style={active ? { background: 'hsl(231 48% 48% / 0.18)', color: 'hsl(231 48% 68%)' } : undefined}
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

        {/* Footer */}
        <div className="border-t border-border/50 p-2">
          {!collapsed ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 px-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                  style={{ background: 'hsl(231 48% 48% / 0.18)', color: 'hsl(231 48% 68%)' }}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">
                    {session.email}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    Entity: <span className="font-mono">{session.entity_code}</span>
                  </p>
                </div>
                <ChevronLeft
                  className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground shrink-0"
                  onClick={() => setCollapsed(true)}
                />
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
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

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              {title && <h1 className="text-lg font-bold text-foreground">{title}</h1>}
              {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <Bell className="h-4 w-4 text-muted-foreground" />
              </button>
              <ThemeToggle />
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ background: 'hsl(231 48% 48% / 0.18)', color: 'hsl(231 48% 68%)' }}
              >
                {initials}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
