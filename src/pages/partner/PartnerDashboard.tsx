/**
 * PartnerDashboard.tsx — KLDCS channel-partner home (NOT tenant distributor).
 * Audience: Implementation partners, resellers, integrators who SELL Operix.
 * Orange-500 accent (KLDCS partner channel identity).
 */
import { useNavigate } from 'react-router-dom';
import {
  Handshake, Users, TrendingUp, FileText,
  Wallet, Target, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const TILES = [
  { title: 'My Customers', icon: Users, count: 12,
    description: 'Tenants I have onboarded — active plans and health',
    route: '/partner/customers' },
  { title: 'Deal Registration', icon: FileText, count: 5,
    description: 'Prospects I have registered — protected from channel conflict',
    route: '/partner/deals' },
  { title: 'Commission', icon: Wallet, count: null,
    description: 'Recurring and one-time commission earned — this month ₹2.4L',
    route: '/partner/commission' },
  { title: 'Targets', icon: Target, count: null,
    description: 'Quarterly target: 10 new tenants — currently 6/10 (60%)',
    route: '/partner/targets' },
  { title: 'Renewals', icon: TrendingUp, count: 3,
    description: 'Upcoming subscription renewals in next 30 days',
    route: '/partner/renewals' },
  { title: 'Marketing Kit', icon: Handshake, count: null,
    description: 'Brochures, demo decks, price lists, pitch tools',
    route: '/partner/kit' },
] as const;

export function PartnerDashboardPanel() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/welcome')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Workspace
        </Button>

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
          {TILES.map(tile => (
            <Card key={tile.title} className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(tile.route)}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <tile.icon className="h-5 w-5 text-orange-600" />
                  {tile.count !== null && (
                    <span className="text-2xl font-bold font-mono">{tile.count}</span>
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
    </div>
  );
}

export default function PartnerDashboard() { return <PartnerDashboardPanel />; }
