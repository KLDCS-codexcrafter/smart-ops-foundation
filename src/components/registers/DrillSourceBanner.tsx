/**
 * DrillSourceBanner.tsx — Banner shown on a register when reached via drill-down.
 *
 * Sprint T-Phase-1.2.6b-rpt · Card #2.6 sub-sprint 3 of 6
 *
 * Renders "⤴ Drill-down from: <strong>label</strong> · [Clear filter]" when
 * an `initialFilter.sourceLabel` is set. Calling `onClear` resets the host
 * register's filter state.
 */

import { ArrowUpRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DrillSourceBannerProps {
  sourceLabel?: string | null;
  onClear: () => void;
}

export function DrillSourceBanner({ sourceLabel, onClear }: DrillSourceBannerProps) {
  if (!sourceLabel) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/5 text-xs">
      <ArrowUpRight className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
      <span className="text-muted-foreground">Drill-down from:</span>
      <strong className="text-foreground">{sourceLabel}</strong>
      <span className="flex-1" />
      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1" onClick={onClear}>
        <X className="h-3 w-3" /> Clear filter
      </Button>
    </div>
  );
}
