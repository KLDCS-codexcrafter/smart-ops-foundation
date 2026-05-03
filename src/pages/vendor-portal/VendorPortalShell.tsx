/**
 * @file        VendorPortalShell.tsx
 * @sprint      T-Phase-1.2.6f-b-1 · Block B.1
 * @purpose     NEW shell for /vendor-portal/* (per D-272 · NOT internal Shell).
 *              Top bar + left sidebar (Inbox · Profile · CommLog · Logout). Public surface · token replaces auth.
 */
import { type ReactNode } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { Inbox, User, MessageSquare, LogOut } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getVendorSession,
  clearVendorSession,
  recordVendorActivity,
} from '@/lib/vendor-portal-auth-engine';

interface NavEntry { to: string; label: string; icon: typeof Inbox }
const NAV: NavEntry[] = [
  { to: '/vendor-portal/inbox', label: 'Inbox', icon: Inbox },
  { to: '/vendor-portal/profile', label: 'Profile', icon: User },
  { to: '/vendor-portal/commlog', label: 'CommLog', icon: MessageSquare },
];

export default function VendorPortalShell({ children }: { children: ReactNode }): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getVendorSession();

  const handleLogout = (): void => {
    if (session) {
      recordVendorActivity(session.vendor_id, session.entity_code, 'logout');
    }
    clearVendorSession();
    navigate('/vendor-portal/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="h-14 border-b bg-card/50 backdrop-blur-xl flex items-center px-4 gap-4 sticky top-0 z-30">
        <div className="font-semibold tracking-tight">Operix · Vendor Portal</div>
        <div className="flex-1" />
        {session && (
          <>
            <div className="text-sm text-muted-foreground hidden md:block">
              <span className="font-mono">{session.party_code}</span> · {session.party_name}
            </div>
            <Badge variant="outline" className="font-mono text-xs">{session.entity_code}</Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </>
        )}
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-56 border-r bg-card/30 hidden md:flex flex-col">
          <nav className="p-3 space-y-1">
            {NAV.map((n) => {
              const active = location.pathname.startsWith(n.to);
              const Icon = n.icon;
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60 text-muted-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {n.label}
                </NavLink>
              );
            })}
          </nav>
          <div className="mt-auto p-3 text-xs text-muted-foreground border-t">
            Operix Procure360 · Phase 1
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          <ScrollArea className="h-[calc(100vh-3.5rem)]">
            <div className="p-6">{children}</div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
