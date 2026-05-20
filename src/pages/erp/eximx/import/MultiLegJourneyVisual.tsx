/**
 * @file        src/pages/erp/eximx/import/MultiLegJourneyVisual.tsx
 * @purpose     Compact 5-leg journey badge component
 * @sprint      T-Phase-1.EX-4-MultiLeg-GIT-3Bucket-4Method
 */
import { Anchor, Ship, Building2, Warehouse } from 'lucide-react';
import type { MultiLegGoodsInTransit } from '@/types/multi-leg-git';
import { getAllLegs } from '@/types/multi-leg-git';

const STATE_DOT: Record<string, string> = {
  pending: 'bg-muted',
  in_transit: 'bg-primary animate-pulse',
  arrived: 'bg-warning',
  handed_over: 'bg-success',
};

export function MultiLegJourneyVisual({ mlgit }: { mlgit: MultiLegGoodsInTransit }): JSX.Element {
  const legs = getAllLegs(mlgit);
  const Icons = [Anchor, Ship, Anchor, Building2, Warehouse];
  return (
    <div className="flex items-center gap-1">
      {legs.map((leg, i) => {
        const Icon = Icons[i];
        if (leg.skip_flag) {
          return <div key={i} className="w-2 h-2 rounded-full bg-muted opacity-30" title={`Leg ${i + 1} skipped`} />;
        }
        return (
          <div key={i} className="flex items-center gap-1" title={`Leg ${i + 1}: ${leg.state}`}>
            <Icon className="w-3 h-3 text-muted-foreground" />
            <div className={`w-2 h-2 rounded-full ${STATE_DOT[leg.state] ?? 'bg-muted'}`} />
          </div>
        );
      })}
    </div>
  );
}
