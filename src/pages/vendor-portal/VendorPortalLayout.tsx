/**
 * @file        src/pages/vendor-portal/VendorPortalLayout.tsx
 * @purpose     Modern wrapper for /vendor-portal/* · replaces VendorPortalShell wholesale (A-c-Q2=D) ·
 *              richer nav (Dashboard + Enquiries + POs + Invoices + KYC + Performance + Messages) ·
 *              notifications dropdown · mobile-responsive · D-272 self-contained
 * @who         External vendor users · token-or-credentials authenticated
 * @when        2026-05-18 (Sprint A-c.1)
 * @sprint      T-Phase-1.A-c.1-VendorPortal-Layout-Dashboard-Login
 * @iso         ISO 25010 Usability · Accessibility
 * @whom        Audit Owner
 * @decisions   D-272 · A-c-Q2=D wholesale replacement · A-c-Q3=B pragmatic shared primitives ·
 *              A-c-Q9=C English-only (i18n A-d) · D-NEW-DY
 * @disciplines FR-30 · FR-50 · FR-58
 * @reuses      vendor-portal-auth-engine (consume only) · shadcn/ui
 * @[JWT]       N/A (layout is pure UI · auth handled by engine)
 */
import { type ReactNode, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Building2, LayoutDashboard, FileText, Send, ShoppingCart, FileUp, Shield,
  BarChart, MessageSquare, Menu, X, Bell, User, LogOut,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  getVendorSession, clearVendorSession, recordVendorActivity,
} from '@/lib/vendor-portal-auth-engine';

interface NavEntry {
  to: string;
  label: string;
  icon: typeof Building2;
  comingSoon?: 'A-c.2' | 'A-c.3';
}

const NAV: NavEntry[] = [
  { to: '/vendor-portal',                  label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/vendor-portal/enquiries',        label: 'Enquiries',       icon: FileText },
  { to: '/vendor-portal/inbox',            label: 'Inbox (legacy)',  icon: FileText },
  { to: '/vendor-portal/bids',             label: 'Submit Bids',     icon: Send },
  { to: '/vendor-portal/purchase-orders',  label: 'Purchase Orders', icon: ShoppingCart },
  { to: '/vendor-portal/invoices',         label: 'Upload Invoices', icon: FileUp,        comingSoon: 'A-c.3' },
  { to: '/vendor-portal/kyc',              label: 'KYC Management',  icon: Shield,        comingSoon: 'A-c.3' },
  { to: '/vendor-portal/performance',      label: 'Performance',     icon: BarChart,      comingSoon: 'A-c.3' },
  { to: '/vendor-portal/messages',         label: 'Messages',        icon: MessageSquare, comingSoon: 'A-c.3' },
  { to: '/vendor-portal/commlog',          label: 'Legacy CommLog',  icon: MessageSquare },
  { to: '/vendor-portal/profile',          label: 'Profile',         icon: User },
];

export default function VendorPortalLayout({ children }: { children: ReactNode }): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getVendorSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = (): void => {
    if (session) {
      recordVendorActivity(session.vendor_id, session.entity_code, 'logout');
    }
    clearVendorSession();
    navigate('/vendor-portal/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-14 border-b bg-card/50 backdrop-blur-xl flex items-center px-4 gap-3 sticky top-0 z-30">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <Building2 className="h-5 w-5 text-primary" />
          <span>Operix · Vendor Portal</span>
        </div>

        <div className="flex-1" />

        {session && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                  Live notifications in Sprint A-c.3
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 hidden md:inline-flex">
                  <User className="h-4 w-4" />
                  <span className="font-mono text-xs">{session.party_code}</span>
                  <Badge variant="outline" className="font-mono text-[10px]">{session.entity_code}</Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{session.party_name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/vendor-portal/profile')}>
                  <User className="h-4 w-4 mr-2" /> Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="sm" onClick={handleLogout} className="md:hidden">
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        )}
      </header>

      <div className="flex flex-1 min-h-0">
        <aside
          className={`w-60 border-r bg-card/30 flex-col ${
            mobileMenuOpen ? 'flex absolute inset-y-0 left-0 top-14 z-20 bg-background' : 'hidden md:flex'
          }`}
        >
          <nav className="p-3 space-y-1">
            {NAV.map((n) => {
              const Icon = n.icon;
              const isActive =
                n.to === '/vendor-portal'
                  ? location.pathname === '/vendor-portal'
                  : location.pathname.startsWith(n.to);
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted/60 text-muted-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{n.label}</span>
                  </span>
                  {n.comingSoon && (
                    <Badge variant="outline" className="text-[9px] flex-shrink-0">{n.comingSoon}</Badge>
                  )}
                </NavLink>
              );
            })}
          </nav>
          <div className="mt-auto p-3 text-xs text-muted-foreground border-t">
            Operix Procure360 · Phase 1
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <ScrollArea className="h-[calc(100vh-3.5rem)]">
            <div className="p-4 md:p-6">{children}</div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
