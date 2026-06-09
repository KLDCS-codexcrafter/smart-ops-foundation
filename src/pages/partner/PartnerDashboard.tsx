/**
 * PartnerDashboard.tsx — KLDCS channel-partner home (NOT tenant distributor).
 * Audience: Implementation partners, resellers, integrators who SELL Operix.
 * Orange-500 accent (KLDCS partner channel identity).
 *
 * Sprint PARTNER-1: tile counts COMPUTED from getPartnerDashboardCounts (zero
 * hardcoded literals) · 6 tile routes now real (no dead links) · honest banner
 * about Wave-2 partner login / live MRR feeds lives on PartnerLayout.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Handshake, Users, TrendingUp, FileText,
  Wallet, Target, ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getPartnerDashboardCounts } from '@/lib/partner-portal-engine';

function fmtINR(paise: number): string {
  if (paise >= 10000000) {
    return `₹${(paise / 10000000).toFixed(1)} Cr`;
  }
  if (paise >= 100000) {
    return `₹${(paise / 100000).toFixed(1)} L`;
  }
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function PartnerDashboardPanel() {
  const navigate = useNavigate();
  const counts = useMemo(() => getPartnerDashboardCounts(), []);

  const tiles = [
    {
      title: 'My Customers',
      icon: Users,
      badge: String(counts.customers),
      description: 'Tenants you have onboarded — active plans and renewal health',
      route: '/partner/customers',
    },
    {
      title: 'Deal Registration',
      icon: FileText,
      badge: String(counts.deals),
      description: 'Open prospects — protected from channel conflict',
      route: '/partner/deals',
    },
    {
      title: 'Commission',
      icon: Wallet,
      badge: fmtINR(counts.commission_period_paise),
      description: 'Recurring (MRR × tier %) + one-time on new licenses',
      route: '/partner/commission',
    },
    {
      title: 'Targets',
      icon: Target,
      badge: `${counts.targets_actual}/${counts.targets_total}`,
      description: 'Quarterly new-customer target — mirrors salesman targets',
      route: '/partner/targets',
    },
    {
      title: 'Renewals',
      icon: TrendingUp,
      badge: String(counts.upcoming_renewals_30d),
      description: 'Upcoming subscription renewals in next 30 days',
      route: '/partner/renewals',
    },
    {
      title: 'Marketing Kit',
      icon: Handshake,
      badge: '',
      description: 'Brochures, demo decks, price lists, pitch tools',
      route: '/partner/kit',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
          <Handshake className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Partner Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            KLDCS channel-partner dashboard — your customers, deals, commission, renewals.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((tile) => (
          <Card
            key={tile.title}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate(tile.route)}
          >
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <tile.icon className="h-5 w-5 text-orange-600" />
                {tile.badge && (
                  <span className="text-2xl font-bold font-mono">{tile.badge}</span>
                )}
              </div>
              <div>
                <p className="font-semibold">{tile.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{tile.description}</p>
              </div>
              <div className="flex items-center text-xs text-orange-600">
                Open <ArrowRight className="h-3 w-3 ml-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function PartnerDashboard() { return <PartnerDashboardPanel />; }
