/**
 * DrillBreadcrumb.tsx — Clickable Tally-Prime style drill trail
 *
 * Sprint T-Phase-1.2.6b · Card #2.6 sub-sprint 2 of 6 · Q-Final lock (a)
 *
 * Renders the current useDrillDown trail as: Root › Crumb 1 › Crumb 2 …
 * Clicking any crumb truncates the trail (drillGoTo). Clicking the root
 * label resets the trail entirely.
 */

import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DrillCrumb } from '@/types/drill';

interface DrillBreadcrumbProps {
  /** Label shown for the root segment (typically the register title). */
  rootLabel: string;
  trail: DrillCrumb[];
  onGoTo: (crumbId: string) => void;
  onReset: () => void;
  className?: string;
}

export function DrillBreadcrumb(props: DrillBreadcrumbProps) {
  const { rootLabel, trail, onGoTo, onReset, className } = props;

  if (trail.length === 0) return null;

  return (
    <nav
      aria-label="Drill-down breadcrumb"
      className={cn(
        'flex items-center gap-1 text-xs text-muted-foreground flex-wrap',
        className,
      )}
    >
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-3 w-3" />
        <span>{rootLabel}</span>
      </button>
      {trail.map((crumb, idx) => {
        const isLast = idx === trail.length - 1;
        return (
          <span key={crumb.id} className="inline-flex items-center gap-1">
            <ChevronRight className="h-3 w-3 opacity-60" />
            {isLast ? (
              <span className="text-foreground font-medium">{crumb.label}</span>
            ) : (
              <button
                type="button"
                onClick={() => onGoTo(crumb.id)}
                className="hover:text-foreground transition-colors"
              >
                {crumb.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
