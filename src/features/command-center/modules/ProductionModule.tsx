/**
 * @file        src/features/command-center/modules/ProductionModule.tsx
 * @sprint      T-Phase-3.PROD-1 · ST6 · Q-LOCK-8 + Q-LOCK-9
 * @purpose     Production Lane landing page · 5 KPI grid + drill-downs to /erp/production/*.
 *              Pattern matches FoundationModule.
 */
import { useNavigate } from 'react-router-dom';
import {
  Factory, Activity, Truck, AlertTriangle, Wallet, ArrowRight,
  CheckCircle, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useProductionLaneKPIs } from '@/hooks/useProductionLaneKPIs';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: React.ReactNode;
  status: 'ok' | 'warn' | 'empty';
  href: string;
  description: string;
}

function StatCard({ icon, title, value, status, href, description }: StatCardProps) {
  const nav = useNavigate();
  return (
    <button
      onClick={() => nav(href)}
      className={cn(
        'group relative w-full text-left rounded-xl border p-5 transition-all',
        'hover:shadow-md hover:-translate-y-0.5',
        status === 'warn'
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-border bg-card hover:border-primary/30',
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg',
          status === 'warn' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary',
        )}>{icon}</div>
        <div className="flex items-center gap-1">
          {status === 'ok' && <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />}
          {status === 'warn' && <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />}
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <p className="text-sm font-semibold text-foreground mb-0.5">{title}</p>
      <div className="text-xl font-bold text-foreground mb-1 font-mono">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

function formatINR(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export function ProductionModule() {
  const { entityCode } = useEntityCode();
  const kpis = useProductionLaneKPIs(entityCode);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Production Lane — Plant Pulse</h2>
        <p className="text-sm text-muted-foreground">
          Cross-card production health: active orders, plant OEE, on-time delivery,
          variance alerts, and Work-in-Progress value.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={<Factory className="h-5 w-5" />}
          title="Active POs"
          value={kpis.activePOs}
          status={kpis.activePOs > 0 ? 'ok' : 'empty'}
          href="/erp/production"
          description="Released and in-progress production orders."
        />
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          title="Plant-wide OEE"
          value={`${kpis.plantOEE}%`}
          status={kpis.plantOEE >= 70 ? 'ok' : kpis.plantOEE > 0 ? 'warn' : 'empty'}
          href="/erp/production"
          description="Weighted output efficiency across machines (simplified proxy)."
        />
        <StatCard
          icon={<Truck className="h-5 w-5" />}
          title="On-time Delivery"
          value={`${kpis.onTimeDeliveryPct}%`}
          status={kpis.onTimeDeliveryPct >= 85 ? 'ok' : kpis.onTimeDeliveryPct > 0 ? 'warn' : 'empty'}
          href="/erp/production"
          description="Last 30 days · completed by target_end_date."
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Variance Alerts Open"
          value={kpis.variancAlertsOpen}
          status={kpis.variancAlertsOpen === 0 ? 'ok' : 'warn'}
          href="/erp/production"
          description="Unacknowledged material/labour/overhead/scrap breaches."
        />
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          title="WIP Value"
          value={formatINR(kpis.wipValue)}
          status={kpis.wipValue > 0 ? 'ok' : 'empty'}
          href="/erp/production"
          description="In-progress PO budget totals · matches WIP cascade source."
        />
      </div>
    </div>
  );
}
