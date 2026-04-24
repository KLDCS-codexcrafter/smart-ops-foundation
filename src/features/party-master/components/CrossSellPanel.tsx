/**
 * @file     CrossSellPanel.tsx
 * @purpose  Surface cross-sell candidates as a scannable list with reason codes.
 * @sprint   T-H1.5-C-S4.5
 */
import { TrendingUp, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CrossSellCandidate } from '../lib/cross-sell-finder';

interface Props {
  candidates: CrossSellCandidate[];
  onCandidateClick: (partyId: string) => void;
  maxShown?: number;
}

const REASON_LABELS: Record<CrossSellCandidate['reason'], string> = {
  low_product_diversity: 'Low product diversity',
  dormant: 'Dormant — worth a call',
  missing_top_category: 'Missing a top-seller',
};

export function CrossSellPanel({ candidates, onCandidateClick, maxShown = 20 }: Props) {
  if (candidates.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Cross-Sell Candidates</p>
        </div>
        <p className="text-xs text-muted-foreground">No candidates at this time. Check back after more transactions.</p>
      </div>
    );
  }

  const shown = candidates.slice(0, maxShown);
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-emerald-500" />
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Cross-Sell Candidates</p>
        <Badge variant="outline" className="text-[10px]">{candidates.length}</Badge>
      </div>
      <ul className="space-y-2">
        {shown.map((c, i) => (
          <li key={`${c.partyId}-${c.reason}-${i}`} className="flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0 flex-1">
              <p className="text-foreground font-medium truncate">{c.partyName}</p>
              <p className="text-[10px] text-muted-foreground">
                <span className="font-semibold">{REASON_LABELS[c.reason]}</span> — {c.detail}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onCandidateClick(c.partyId)}
              className="text-primary hover:underline flex items-center gap-1 shrink-0"
            >
              Open <ArrowRight className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
      {candidates.length > maxShown && (
        <p className="text-[10px] text-muted-foreground mt-2">Showing {maxShown} of {candidates.length}</p>
      )}
    </div>
  );
}
