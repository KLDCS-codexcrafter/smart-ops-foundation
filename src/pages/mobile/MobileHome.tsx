/**
 * MobileHome.tsx — Role-aware home dashboard for OperixGo.
 * Distributor and Customer get different tile sets, both gated by plan tier.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ShoppingBag, ShoppingCart, FileText, IndianRupee, CreditCard,
  Network, Gift, Mic, Package, Sparkles, LogOut, Download,
  Navigation, MapPin, Target, Users, PhoneIncoming, Briefcase, ClipboardList,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FeatureGate } from '@/components/layout/FeatureGate';
import type { FeatureId } from '@/types/plan-features';
import type { PlanTier } from '@/types/card-entitlement';
import { PLAN_PRICING_INR_PER_MONTH } from '@/types/plan-features';
import { logMobileTileClick } from '@/lib/mobile-audit';
import type { MobileSession } from './MobileRouter';

function readSession(): MobileSession | null {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch {
    return null;
  }
}

interface Tile {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  feature?: FeatureId;
  showLocked?: boolean;
}

function tilesForRole(role: MobileSession['role']): Tile[] {
  if (role === 'distributor') {
    return [
      { label: 'Catalog',         icon: ShoppingBag, to: '/erp/distributor/catalog',         feature: 'catalog_browse' },
      { label: 'Cart',            icon: ShoppingCart, to: '/erp/distributor/cart',           feature: 'place_orders' },
      { label: 'Invoices',        icon: FileText,    to: '/erp/distributor/invoices',        feature: 'payment_tracking' },
      { label: 'Payments',        icon: IndianRupee, to: '/erp/distributor/payments',        feature: 'payment_tracking' },
      { label: 'Credit Request',  icon: CreditCard,  to: '/erp/distributor/credit-request',  feature: 'credit_request', showLocked: true },
      { label: 'Downstream View', icon: Network,     to: '/erp/distributor/downstream',      feature: 'distributor_hierarchy', showLocked: true },
    ];
  }
  if (role === 'customer') {
    return [
      { label: 'Browse Catalog',  icon: ShoppingBag, to: '/erp/customer-hub#ch-t-catalog',         feature: 'catalog_browse' },
      { label: 'My Cart',         icon: ShoppingCart, to: '/erp/customer-hub#ch-t-cart',            feature: 'place_orders' },
      { label: 'My Orders',       icon: FileText,    to: '/erp/customer-hub#ch-t-orders',           feature: 'payment_tracking' },
      { label: 'Rewards',         icon: Gift,        to: '/erp/customer-hub#ch-t-rewards',          feature: 'loyalty_visibility', showLocked: true },
      { label: 'Voice Complaint', icon: Mic,         to: '/erp/customer-hub#ch-t-voice-complaint',  feature: 'voice_order',        showLocked: true },
      { label: 'Sample Kits',     icon: Package,     to: '/erp/customer-hub#ch-t-sample-kits',      feature: 'catalog_browse' },
    ];
  }
  return [];
}

function planBadgeTone(plan: PlanTier): string {
  if (plan === 'enterprise') return 'bg-amber-500/15 text-amber-700 border-amber-500/40';
  if (plan === 'growth') return 'bg-teal-500/15 text-teal-700 border-teal-500/40';
  return 'bg-slate-500/15 text-slate-700 border-slate-500/40';
}

export default function MobileHome() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  if (!session || session.role === 'unknown') {
    return (
      <div className="p-6 max-w-sm mx-auto space-y-3">
        <Card className="p-4 text-center space-y-3">
          <Sparkles className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm font-semibold">Session error</p>
          <p className="text-xs text-muted-foreground">
            Please sign in again to continue.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              try {
                sessionStorage.removeItem('opx_mobile_session');
              } catch {
                /* ignore */
              }
              navigate('/mobile/login', { replace: true });
            }}
          >
            <LogOut className="h-4 w-4 mr-1" /> Logout
          </Button>
        </Card>
      </div>
    );
  }

  const tiles = tilesForRole(session.role);
  const greeting = session.role === 'distributor' ? 'Welcome back' : 'Hello';
  const planPriceInr = PLAN_PRICING_INR_PER_MONTH[session.plan_tier];

  const onLogout = () => {
    try {
      sessionStorage.removeItem('opx_mobile_session');
    } catch {
      /* ignore */
    }
    toast.success('Signed out');
    navigate('/mobile/login', { replace: true });
  };

  const handleTileClick = (tile: Tile) => {
    logMobileTileClick(
      session.entity_code,
      session.user_id ?? 'unknown',
      session.role,
      tile.label,
      tile.to,
    );
    navigate(tile.to);
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">{greeting},</p>
        <h1 className="text-xl font-bold tracking-tight">{session.display_name}</h1>
        <Badge variant="outline" className={`mt-1 ${planBadgeTone(session.plan_tier)}`}>
          {session.plan_tier.toUpperCase()} · ₹{planPriceInr.toLocaleString('en-IN')}/mo
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => {
          const TileBody = (
            <Card
              className="p-4 flex flex-col items-start gap-2 cursor-pointer hover:bg-teal-500/10 transition-colors"
              onClick={() => handleTileClick(t)}
            >
              <t.icon className="h-5 w-5 text-slate-700" />
              <p className="text-sm font-semibold">{t.label}</p>
            </Card>
          );
          if (t.feature) {
            return (
              <FeatureGate
                key={t.label}
                feature={t.feature}
                plan={session.plan_tier}
                showLocked={t.showLocked}
              >
                {TileBody}
              </FeatureGate>
            );
          }
          return <div key={t.label}>{TileBody}</div>;
        })}
      </div>

      <Card className="p-3 flex items-center justify-between">
        <div className="text-xs">
          <p className="text-muted-foreground">Current plan</p>
          <p className="font-semibold uppercase">{session.plan_tier}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toast.info('Contact sales to upgrade your plan')}
        >
          Upgrade plan
        </Button>
      </Card>

      <Card className="p-3 flex items-center gap-2 text-xs">
        <Download className="h-4 w-4 text-slate-700" />
        <div className="flex-1">
          <p className="font-semibold">Install OperixGo</p>
          <p className="text-muted-foreground">Add to home screen for faster access</p>
        </div>
      </Card>

      <Button variant="outline" className="w-full" onClick={onLogout}>
        <LogOut className="h-4 w-4 mr-1" /> Logout
      </Button>
    </div>
  );
}
