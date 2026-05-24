/**
 * @file        src/features/command-center/modules/ProductionModule.tsx
 * @sprint      T-Phase-3.PROD-1 · ST6 · Q-LOCK-8 + Q-LOCK-9
 * @purpose     Production Lane landing page · 5 KPI grid + drill-downs to /erp/production/*.
 *              Pattern matches FoundationModule.
 */
import { useNavigate } from 'react-router-dom';
import {
  Factory, Activity, Truck, AlertTriangle, Wallet, ArrowRight,
  CheckCircle, AlertCircle, ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useProductionLaneKPIs } from '@/hooks/useProductionLaneKPIs';
// T-Phase-3.PROD-2.5 · ST9 · Q-LOCK-9 · mode-aware KPI descriptions
import { useEntityManufacturingMode } from '@/hooks/useEntityManufacturingMode';
import type { ManufacturingMode } from '@/types/manufacturing-mode';

const KPI_DESCRIPTIONS_BY_MODE: Record<ManufacturingMode, {
  activePOs: string;
  plantOEE: string;
  onTimeDelivery: string;
  varianceAlerts: string;
  wipValue: string;
  openLeaks: string;
}> = {
  discrete: {
    activePOs: 'Production Orders in released/in_progress state',
    plantOEE: 'Plant-wide Overall Equipment Effectiveness (last 30 days)',
    onTimeDelivery: 'On-time PO completion · last 30 days · actual_end ≤ target_end',
    varianceAlerts: 'Critical material/labour/overhead variance alerts · unacknowledged',
    wipValue: 'Work-in-Progress inventory value · in_progress POs',
    openLeaks: "Unack'd PROD-2 leak alerts · JW shortage, BOM drift, MSME-JW, licence, hazmat, wastage drift, tooling.",
  },
  process: {
    activePOs: 'Active Batches in released/in_progress state',
    plantOEE: 'Plant-wide OEE · weighted across reactor capacity',
    onTimeDelivery: 'On-time batch completion · last 30 days · actual_end ≤ target_end',
    varianceAlerts: 'Yield variance + batch material variance alerts · unacknowledged',
    wipValue: 'WIP value including intermediates + by-products',
    openLeaks: 'Process leak alerts · effluent · licence · hazmat caps · catalyst burn · yield drift.',
  },
  repetitive: {
    activePOs: 'Active Production Lots in released/in_progress state',
    plantOEE: 'Line-wide OEE · weighted across packaging line capacity',
    onTimeDelivery: 'On-time lot completion · last 30 days',
    varianceAlerts: 'Line efficiency + material variance alerts · unacknowledged',
    wipValue: 'WIP value across active lots',
    openLeaks: 'Repetitive line leak alerts · BOM drift, line efficiency, wastage, tooling.',
  },
  mixed_mode: {
    activePOs: 'Active BU-Production Orders across discrete + process + repetitive BUs',
    plantOEE: 'Plant-wide OEE · BU-weighted aggregate',
    onTimeDelivery: 'On-time completion across all BUs',
    varianceAlerts: 'Cross-BU variance alerts · unacknowledged',
    wipValue: 'Total WIP value · all BUs',
    openLeaks: 'All leak alerts across BUs · cross-mode coverage.',
  },
  na: {
    activePOs: 'N/A · entity is trading/services',
    plantOEE: 'N/A',
    onTimeDelivery: 'N/A',
    varianceAlerts: 'N/A',
    wipValue: 'N/A',
    openLeaks: 'N/A',
  },
};

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
  const mfgPreset = useEntityManufacturingMode(entityCode);
  const descriptions = KPI_DESCRIPTIONS_BY_MODE[mfgPreset.mode];

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
          description={descriptions.activePOs}
        />
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          title="Plant-wide OEE"
          value={`${kpis.plantOEE}%`}
          status={kpis.plantOEE >= 70 ? 'ok' : kpis.plantOEE > 0 ? 'warn' : 'empty'}
          href="/erp/production"
          description={descriptions.plantOEE}
        />
        <StatCard
          icon={<Truck className="h-5 w-5" />}
          title="On-time Delivery"
          value={`${kpis.onTimeDeliveryPct}%`}
          status={kpis.onTimeDeliveryPct >= 85 ? 'ok' : kpis.onTimeDeliveryPct > 0 ? 'warn' : 'empty'}
          href="/erp/production"
          description={descriptions.onTimeDelivery}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Variance Alerts Open"
          value={kpis.variancAlertsOpen}
          status={kpis.variancAlertsOpen === 0 ? 'ok' : 'warn'}
          href="/erp/production"
          description={descriptions.varianceAlerts}
        />
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          title="WIP Value"
          value={formatINR(kpis.wipValue)}
          status={kpis.wipValue > 0 ? 'ok' : 'empty'}
          href="/erp/production"
          description={descriptions.wipValue}
        />
        <StatCard
          icon={<ShieldAlert className="h-5 w-5" />}
          title="Open Leaks Count"
          value={kpis.openLeaksCount}
          status={kpis.openLeaksCount === 0 ? 'ok' : 'warn'}
          href="/erp/production"
          description={descriptions.openLeaks}
        />
      </div>
    </div>
  );
}
