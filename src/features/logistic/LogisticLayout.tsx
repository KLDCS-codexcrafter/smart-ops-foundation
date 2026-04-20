/**
 * LogisticLayout.tsx — Transporter portal shell.
 * Sprint 15c-2. Gold (yellow-500) accent. Wraps all /erp/logistic/* pages.
 * Separate auth boundary: redirects to /erp/logistic/login when no session.
 */
import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Truck, IndianRupee, AlertCircle,
  Building2, ChevronLeft, ChevronRight, LogOut, Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  getLogisticSession, clearLogisticSession, recordLogisticActivity,
} from '@/lib/logistic-auth-engine';
import { lrAcceptancesKey, type LRAcceptance } from '@/types/logistic-portal';
import { disputesKey, type Dispute } from '@/types/freight-reconciliation';
import { toast } from 'sonner';

interface LogisticLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function LogisticLayout({ children, title, subtitle }: LogisticLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const session = getLogisticSession();

  // Must-change-password guard — runs before render returns
  useEffect(() => {
    if (!session) return;
    if (session.must_change_password && !location.pathname.includes('/erp/logistic/profile')) {
      toast.warning('Please change your temporary password');
      navigate('/erp/logistic/profile?tab=security', { replace: true });
    }
  }, [session, location.pathname, navigate]);

  if (!session) return <Navigate to="/erp/logistic/login" replace />;

  // Badge counts
  let awaitingCount = 0;
  let openDisputeCount = 0;
  try {
    const lrs: LRAcceptance[] = JSON.parse(localStorage.getItem(lrAcceptancesKey(session.entity_code)) ?? '[]');
    awaitingCount = lrs.filter(l => l.logistic_id === session.logistic_id && l.status === 'awaiting').length;
    const disputes: Dispute[] = JSON.parse(localStorage.getItem(disputesKey(session.entity_code)) ?? '[]');
    openDisputeCount = disputes.filter(d =>
      d.logistic_id === session.logistic_id &&
      !['resolved_in_favor_of_us', 'resolved_in_favor_of_transporter', 'resolved_split', 'withdrawn'].includes(d.status),
    ).length;
  } catch { /* ignore */ }

  const navItems = [
    { title: 'Dashboard',      url: '/erp/logistic/dashboard',     icon: LayoutDashboard, badge: 0 },
    { title: 'Submit Invoice', url: '/erp/logistic/invoices/new',  icon: FileText,        badge: 0 },
    { title: 'LR Queue',       url: '/erp/logistic/lr-queue',      icon: Truck,           badge: awaitingCount },
    { title: 'Payments',       url: '/erp/logistic/payments',      icon: IndianRupee,     badge: 0 },
    { title: 'Disputes',       url: '/erp/logistic/disputes',      icon: AlertCircle,     badge: openDisputeCount },
    { title: 'Profile',        url: '/erp/logistic/profile',       icon: Building2,       badge: 0 },
  ];

  const initials = session.party_name
    .split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || 'TR';

  const handleLogout = () => {
    recordLogisticActivity(session.logistic_id, session.entity_code, 'logout');
    clearLogisticSession();
    toast.success('Signed out');
    navigate('/erp/logistic/login');
  };

  return (
    <div className="min-h-screen flex bg-background">
      <aside
        className={cn(
          'h-screen sticky top-0 flex flex-col border-r transition-all duration-300',
          collapsed ? 'w-[60px]' : 'w-[220px]',
        )}
        style={{ background: 'hsl(222 47% 11%)', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className={cn(
          'flex items-center gap-2.5 border-b border-border/50 px-3 py-4',
          collapsed && 'justify-center px-2',
        )}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'hsl(48 96% 53% / 0.18)' }}
          >
            <Truck className="h-4 w-4" style={{ color: 'hsl(48 96% 63%)' }} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{session.party_name}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{session.party_code}</p>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="px-3 py-2">
            <span
              className="inline-block text-[9px] font-bold tracking-wider px-2 py-0.5 rounded"
              style={{ background: 'hsl(48 96% 53% / 0.18)', color: 'hsl(48 96% 53%)' }}
            >
              {session.logistic_type.toUpperCase()}
            </span>
          </div>
        )}

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
                  active ? 'font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  collapsed && 'justify-center px-2',
                )}
                style={active ? { background: 'hsl(48 96% 53% / 0.18)', color: 'hsl(48 96% 63%)' } : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.title}</span>
                    {item.badge > 0 && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'hsl(48 96% 53%)', color: 'hsl(222 47% 11%)' }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
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

        <div className="border-t border-border/50 p-2">
          {!collapsed ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 px-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                  style={{ background: 'hsl(48 96% 53% / 0.18)', color: 'hsl(48 96% 63%)' }}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{session.party_name}</p>
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
                style={{ background: 'hsl(48 96% 53% / 0.18)', color: 'hsl(48 96% 63%)' }}
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
