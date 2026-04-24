/**
 * @file     CreditScoreBadge.tsx
 * @purpose  Visual badge for credit score + band (A/B/C/D/NEW).
 * @sprint   T-H1.5-C-S4
 */
import { Badge } from '@/components/ui/badge';
import type { CreditBand } from '../hooks/useCreditScoring';

interface CreditScoreBadgeProps {
  score: number;
  band: CreditBand;
  compact?: boolean;
}

const BAND_STYLES: Record<CreditBand, string> = {
  A:   'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  B:   'bg-blue-500/10 text-blue-700 border-blue-500/30',
  C:   'bg-amber-500/10 text-amber-700 border-amber-500/30',
  D:   'bg-red-500/10 text-red-700 border-red-500/30',
  NEW: 'bg-muted/40 text-muted-foreground border-border',
};

export function CreditScoreBadge({ score, band, compact = false }: CreditScoreBadgeProps) {
  return (
    <Badge variant="outline" className={`text-[10px] ${BAND_STYLES[band]}`}>
      {compact ? band : `Band ${band} · ${score}`}
    </Badge>
  );
}
