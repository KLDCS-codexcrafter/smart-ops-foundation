/**
 * @file     KPIBadgeGroup.tsx
 * @purpose  Horizontal row of KPI badges — revenue, DSO, overdue, products.
 * @sprint   T-H1.5-C-S4.5
 */
import { Badge } from '@/components/ui/badge';
import type { CustomerKPI } from '../lib/customer-kpi-engine';

interface Props { kpi: CustomerKPI; compact?: boolean; }

const fmt = (n: number): string => {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
};

export function KPIBadgeGroup({ kpi, compact = false }: Props) {
  const health = kpi.healthStatus;
  const healthColor =
    health === 'green' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' :
    health === 'amber' ? 'bg-amber-500/10 text-amber-700 border-amber-500/30' :
    health === 'red' ? 'bg-red-500/10 text-red-700 border-red-500/30' :
                       'bg-muted/40 text-muted-foreground border-border';

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Badge variant="outline" className={`text-[10px] ${healthColor}`}>{health}</Badge>
        <span className="text-[10px] text-muted-foreground">{fmt(kpi.revenueYTD)}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant="outline" className={`text-[10px] ${healthColor}`}>{health.toUpperCase()}</Badge>
      <Badge variant="outline" className="text-[10px]">YTD {fmt(kpi.revenueYTD)}</Badge>
      <Badge variant="outline" className="text-[10px]">MTD {fmt(kpi.revenueMTD)}</Badge>
      {kpi.outstandingAmount > 0 && (
        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">
          Due {fmt(kpi.outstandingAmount)}
        </Badge>
      )}
      <Badge variant="outline" className="text-[10px]">DSO {kpi.daysSalesOutstanding}d</Badge>
      <Badge variant="outline" className="text-[10px]">{kpi.productsPurchasedCount} products</Badge>
    </div>
  );
}
