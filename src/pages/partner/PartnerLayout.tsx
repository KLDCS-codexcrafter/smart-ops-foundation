/**
 * PartnerLayout.tsx — KLDCS channel-partner shell (orange-500 identity).
 * Honest banner: partner login + live MRR/billing arrive with Wave-2.
 */
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, Handshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPartnerProfile } from '@/lib/partner-portal-engine';
import { PARTNER_TIER_LABEL } from '@/types/partner-portal';

const NAV = [
  { to: '/partner/dashboard',  label: 'Dashboard' },
  { to: '/partner/customers',  label: 'Customers' },
  { to: '/partner/deals',      label: 'Deals' },
  { to: '/partner/commission', label: 'Commission' },
  { to: '/partner/targets',    label: 'Targets' },
  { to: '/partner/renewals',   label: 'Renewals' },
  { to: '/partner/kit',        label: 'Marketing Kit' },
];

export function PartnerLayout() {
  const navigate = useNavigate();
  const profile = getPartnerProfile();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/welcome')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Workspace
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
              <Handshake className="h-4 w-4 text-orange-600" />
            </div>
            <div className="text-sm">
              <div className="font-semibold leading-tight">{profile.name}</div>
              <div className="text-xs text-muted-foreground">{profile.region}</div>
            </div>
          </div>
          <Badge variant="outline" className="ml-2 border-orange-600/40 text-orange-600">
            {PARTNER_TIER_LABEL[profile.tier]}
          </Badge>
          <nav className="ml-auto hidden md:flex gap-1 text-sm">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md hover:bg-muted ${isActive ? 'bg-muted font-medium text-orange-600' : 'text-muted-foreground'}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="bg-orange-500/10 border-t border-orange-500/30 text-xs text-orange-700 dark:text-orange-300 px-6 py-2 text-center">
          Tier-L demo · Partner login &amp; live MRR/billing feeds arrive with Wave-2.
          Counts on this portal are computed from seeded demo data — no faked auth.
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}

export default PartnerLayout;
