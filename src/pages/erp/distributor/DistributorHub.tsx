/**
 * DistributorHub.tsx — Tenant-internal hub for managing the distributor programme.
 * Sprint 10. Indigo-600 accent. Peer of SalesX/ReceivX/FineCore hubs.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users2, FileCheck, Megaphone, Layers, BarChart3, UserPlus,
  ArrowRight, IndianRupee, ShoppingBag,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { formatINR } from '@/lib/india-validations';
import { distributorsKey, type Distributor } from '@/types/distributor';
import {
  distributorOrdersKey, distributorIntimationsKey,
  type DistributorOrder, type DistributorPaymentIntimation,
} from '@/types/distributor-order';

const INDIGO = 'hsl(231 48% 58%)';
const INDIGO_BG = 'hsl(231 48% 48% / 0.12)';

function ls<T>(k: string): T[] {
  try {
    // [JWT] GET /api/{key}
    const r = localStorage.getItem(k);
    return r ? (JSON.parse(r) as T[]) : [];
  } catch { return []; }
}

export function DistributorHubPanel() { return <DistributorHub />; }

export default function DistributorHub() {
  const navigate = useNavigate();

  const entityCode = useMemo(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('erp_distributors_'));
    return keys[0]?.replace('erp_distributors_', '') ?? 'SMRT';
  }, []);

  const distributors = useMemo(() => ls<Distributor>(distributorsKey(entityCode)), [entityCode]);
  const orders = useMemo(() => ls<DistributorOrder>(distributorOrdersKey(entityCode)), [entityCode]);
  const intimations = useMemo(() => ls<DistributorPaymentIntimation>(distributorIntimationsKey(entityCode)), [entityCode]);

  const activeCount = distributors.filter(d => d.status === 'active').length;
  const monthOrders = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return orders.filter(o => new Date(o.created_at).getTime() >= cutoff).length;
  }, [orders]);
  const outstandingAR = distributors.reduce((s, d) => s + d.outstanding_paise, 0);
  const pendingIntimations = intimations.filter(i => i.status === 'submitted' || i.status === 'verifying').length;

  const kpis = [
    { label: 'Active Distributors', value: String(activeCount), icon: Users2 },
    { label: 'Orders (30d)', value: String(monthOrders), icon: ShoppingBag },
    { label: 'Outstanding AR', value: formatINR(outstandingAR), icon: IndianRupee },
    { label: 'Pending Intimations', value: String(pendingIntimations), icon: FileCheck },
  ];

  const tiles = [
    { title: 'Enrolled Distributors', icon: Users2,
      description: 'View, edit, suspend distributor accounts',
      route: '/erp/masters/customer?filter=portal_enabled' },
    { title: 'Invitations Queue', icon: UserPlus,
      description: 'Send portal invitations to new distributors',
      route: '/erp/distributor-hub/invitations',
      badge: 'Soon' },
    { title: 'Intimation Queue', icon: FileCheck,
      description: 'Verify payment intimations and convert to receipts',
      route: '/erp/finecore/distributor-intimations' },
    { title: 'Broadcast Console', icon: Megaphone,
      description: 'Fire WhatsApp / Email / In-portal messages by tier',
      route: '/erp/salesx/distributor-broadcast' },
    { title: 'Catalog Layers', icon: Layers,
      description: 'Manage tier-priced item lists for distributors',
      route: '/erp/inventory-hub/price-lists' },
    { title: 'Analytics', icon: BarChart3,
      description: 'Distributor engagement, sentiment, mood-of-month — Sprint 11',
      route: '#',
      badge: 'Planned' },
  ];

  return (
    <AppLayout
      title="Distributor Hub"
      breadcrumbs={[{ label: 'ERP', href: '/erp/dashboard' }, { label: 'Distributor Hub' }]}
    >
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map(k => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{k.label}</p>
                  <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: INDIGO_BG }}>
                    <k.icon className="h-3.5 w-3.5" style={{ color: INDIGO }} />
                  </div>
                </div>
                <p className="text-lg font-bold font-mono text-foreground">{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiles.map(tile => {
            const disabled = tile.route === '#';
            return (
              <Card
                key={tile.title}
                className={disabled ? 'opacity-60' : 'hover:shadow-md transition-shadow cursor-pointer'}
                onClick={() => { if (!disabled) navigate(tile.route); }}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: INDIGO_BG }}>
                      <tile.icon className="h-4 w-4" style={{ color: INDIGO }} />
                    </div>
                    {tile.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {tile.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{tile.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{tile.description}</p>
                  </div>
                  {!disabled && (
                    <div className="flex items-center text-xs" style={{ color: INDIGO }}>
                      Open <ArrowRight className="h-3 w-3 ml-1" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
