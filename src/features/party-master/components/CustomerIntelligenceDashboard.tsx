/**
 * @file     CustomerIntelligenceDashboard.tsx
 * @purpose  Top-of-page dashboard showing aggregate customer KPIs +
 *           cross-sell candidates. Plugged into CustomerMasterPanel.
 * @sprint   T-H1.5-C-S4.5
 */
import { useMemo } from 'react';
import { Users, IndianRupee, Clock, TrendingUp } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCustomerKPIs } from '../hooks/useCustomerKPIs';
import { rollupFromLeaves } from '../lib/customer-kpi-engine';
import { findCrossSellCandidates } from '../lib/cross-sell-finder';
import { CrossSellPanel } from './CrossSellPanel';

interface CustomerRow {
  id: string;
  partyName: string;
  natureOfBusiness: string;
  businessActivity: string;
}

interface Props {
  customers: CustomerRow[];
  onCandidateClick: (partyId: string) => void;
}

const fmt = (n: number): string => {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
};

export function CustomerIntelligenceDashboard({ customers, onCandidateClick }: Props) {
  const { entityCode } = useEntityCode();
  const kpis = useCustomerKPIs(customers);

  const rollup = useMemo(() => {
    const leaves = Array.from(kpis.values());
    return rollupFromLeaves(leaves);
  }, [kpis]);

  const candidates = useMemo(() => {
    return findCrossSellCandidates({ customers, kpis });
  }, [customers, kpis]);

  if (!entityCode) {
    return <div className="glass-card rounded-2xl p-4 text-xs text-muted-foreground">Select a company to view intelligence.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          label="Total Customers"
          value={String(rollup.count)}
          sub={`${rollup.greenCount} healthy · ${rollup.amberCount + rollup.redCount} at risk`}
          color="text-primary"
        />
        <MetricCard
          icon={<IndianRupee className="h-4 w-4" />}
          label="Revenue YTD"
          value={fmt(rollup.revenueYTD)}
          sub={`MTD ${fmt(rollup.revenueMTD)}`}
          color="text-emerald-500"
        />
        <MetricCard
          icon={<Clock className="h-4 w-4" />}
          label="Outstanding"
          value={fmt(rollup.totalOutstanding)}
          sub={`Avg DSO ${rollup.avgDSO}d`}
          color="text-amber-500"
        />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Cross-Sell Candidates"
          value={String(candidates.length)}
          sub={candidates.length > 0 ? 'Review below' : 'None identified'}
          color="text-violet-500"
        />
      </div>

      <CrossSellPanel candidates={candidates} onCandidateClick={onCandidateClick} maxShown={20} />
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}
function MetricCard({ icon, label, value, sub, color }: MetricCardProps) {
  return (
    <div className="rounded-xl bg-card/60 backdrop-blur-xl border border-border p-4">
      <div className={`flex items-center gap-2 mb-1 ${color}`}>
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground font-mono">{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}
