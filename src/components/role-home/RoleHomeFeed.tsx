/**
 * @file        src/components/role-home/RoleHomeFeed.tsx
 * @sprint      AM.1 · T-AM1-AI-Everywhere · Pass 2 · NEW (allowlisted)
 * @purpose     Shared "What needs you now" feed surface. Used by mobile
 *              persona homes (web widget on /operix-go + /welcome). Pure
 *              presentation — CONSUMES buildRoleHomeFeed only.
 * @canon       Tier-L · NO fetch · honest empty · Wave-2 banner mounted.
 */
import { useMemo } from 'react';
import { Sparkles, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  buildRoleHomeFeed,
  ROLE_HOME_HONESTY,
  type RoleHomeAction,
  type RoleHomeReason,
} from '@/lib/role-home-engine';
import type { UserRole } from '@/types/card-entitlement';

interface RoleHomeFeedProps {
  role: UserRole;
  fy?: string;
  entityCode?: string;
  topN?: number;
  /** When true, render compact (mobile persona home / web widget). */
  compact?: boolean;
  className?: string;
}

const REASON_META: Record<RoleHomeReason, { label: string; tone: string; Icon: typeof Sparkles }> = {
  overdue:           { label: 'Overdue',           tone: 'bg-destructive/15 text-destructive border-destructive/30', Icon: AlertTriangle },
  approval_pending:  { label: 'Approval',          tone: 'bg-warning/15 text-warning border-warning/30',           Icon: Activity },
  risk:              { label: 'Risk',              tone: 'bg-destructive/15 text-destructive border-destructive/30', Icon: AlertTriangle },
  opportunity:       { label: 'Opportunity',       tone: 'bg-success/15 text-success border-success/30',           Icon: TrendingUp },
  anomaly:           { label: 'Anomaly',           tone: 'bg-warning/15 text-warning border-warning/30',           Icon: Sparkles },
};

function currentFy(): string {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 3 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
}

export function RoleHomeFeed({
  role, fy, entityCode, topN = 5, compact = false, className,
}: RoleHomeFeedProps) {
  const effectiveFy = fy ?? currentFy();
  const actions = useMemo<RoleHomeAction[]>(() => {
    try {
      return buildRoleHomeFeed({ role, fy: effectiveFy, entity_code: entityCode, top_n: topN });
    } catch {
      return [];
    }
  }, [role, effectiveFy, entityCode, topN]);

  return (
    <div className={cn('space-y-2', className)} data-testid="role-home-feed">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}>
            What needs you now
          </h3>
        </div>
        <Badge variant="outline" className="text-[10px]">{actions.length}</Badge>
      </div>
      <p className="text-[10px] text-muted-foreground">{ROLE_HOME_HONESTY}</p>

      {actions.length === 0 ? (
        <Card className="p-4 text-center flex flex-col items-center gap-1 border-dashed">
          <Sparkles className="h-6 w-6 text-muted-foreground opacity-60" />
          <p className="text-sm font-medium">All quiet</p>
          <p className="text-[11px] text-muted-foreground">
            Nothing pending right now — items appear as signals arrive.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {actions.map((a) => {
            const meta = REASON_META[a.reason];
            const Icon = meta.Icon;
            return (
              <Card key={a.action_id} className="p-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <p className="text-sm font-semibold truncate">{a.title}</p>
                  </div>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', meta.tone)}>
                    {meta.label}
                  </Badge>
                </div>
                {!compact && (
                  <p className="text-[11px] text-muted-foreground">{a.why}</p>
                )}
                <p className="text-[11px] text-primary">→ {a.recommended_action}</p>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="font-mono">{a.source_engine}</span>
                  <span className="font-mono">score {a.rank_score}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RoleHomeFeed;
